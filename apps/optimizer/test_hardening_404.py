"""
TASK-404 Regression Suite:
1. CP-SAT solver status & timeout handling (OPTIMAL, FEASIBLE, TIMEOUT/UNKNOWN, INFEASIBLE, MODEL_INVALID)
2. Monotonic timing breakdown metrics
3. Greedy HC-7 overload fallback fix
"""
import os
import sys
from unittest.mock import patch

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(__file__))

from ortools.sat.python import cp_model
from solver.models import (
    OptimizeRequest,
    SubjectInput,
    FacultyInput,
    RoomInput,
    SectionInput,
)
from solver.cpsat import run_cpsat
from solver.greedy import run_greedy


def _simple_req():
    return OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"])],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=1)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=18)],
        rooms=[RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False)],
        days=["MON"],
        periods_per_day=2,
    )


def test_status_1_optimal_and_timing_fields():
    res = run_cpsat(_simple_req(), time_limit_seconds=10)
    assert res.solver_status == "OPTIMAL"
    assert res.hard_violations == 0
    assert len(res.slots) == 1
    for key in (
        "preprocess_time_s",
        "model_build_time_s",
        "search_time_s",
        "extraction_time_s",
        "validation_metrics_time_s",
        "total_time_s",
        "num_variables",
        "num_constraints",
    ):
        assert key in res.metrics, f"Missing timing/model metric: {key}"
    print("Status 1 (OPTIMAL + monotonic timing fields): PASS")


def test_status_2_feasible_incumbent_preserved():
    # Simulate CP-SAT hitting time limit after finding a feasible incumbent (status == FEASIBLE)
    orig_solve = cp_model.CpSolver.Solve

    def fake_solve(self, model, solution_callback=None):
        orig_solve(self, model)
        return cp_model.FEASIBLE

    with patch.object(cp_model.CpSolver, "Solve", new=fake_solve):
        res = run_cpsat(_simple_req(), time_limit_seconds=1)
    assert res.solver_status == "FEASIBLE", f"Expected FEASIBLE, got {res.solver_status}"
    assert len(res.slots) == 1, "Feasible incumbent must be extracted"
    assert res.hard_violations == 0
    assert "sc3_consecutive_same_subject_pairs" in res.metrics
    print("Status 2 (FEASIBLE incumbent extracted & validated): PASS")


def test_status_3_unknown_timeout_no_incumbent():
    with patch.object(cp_model.CpSolver, "Solve", return_value=cp_model.UNKNOWN):
        res = run_cpsat(_simple_req(), time_limit_seconds=1)
    assert res.solver_status == "TIMEOUT", f"Expected TIMEOUT, got {res.solver_status}"
    assert len(res.slots) == 0, "No schedule should be fabricated on TIMEOUT"
    assert any(v.constraint == "SOLVER_TIMEOUT" for v in res.violations)
    assert not any(v.constraint == "SOLVER_INFEASIBLE" for v in res.violations)
    print("Status 3 (UNKNOWN -> TIMEOUT, no fabricated schedule): PASS")


def test_status_4_infeasible():
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"])],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=2)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=1)],
        rooms=[RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False)],
        days=["MON"],
        periods_per_day=2,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status == "INFEASIBLE"
    assert len(res.slots) == 0
    assert any(v.constraint == "SOLVER_INFEASIBLE" for v in res.violations)
    print("Status 4 (INFEASIBLE): PASS")


def test_status_5_model_invalid():
    with patch.object(cp_model.CpSolver, "Solve", return_value=cp_model.MODEL_INVALID):
        res = run_cpsat(_simple_req(), time_limit_seconds=1)
    assert res.solver_status == "MODEL_INVALID"
    assert len(res.slots) == 0
    assert any(v.constraint == "MODEL_INVALID" for v in res.violations)
    print("Status 5 (MODEL_INVALID diagnostics): PASS")


def test_greedy_hc7_overload_fallback_fixed():
    # Previously, Greedy's overload fallback did NOT check unavailable_slots and assigned MON-1!
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"])],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=1)],
        faculty=[
            FacultyInput(
                id="f1",
                name="Unavailable Fac",
                subject_ids=["s1"],
                max_weekly_hours=18,
                unavailable_slots=["MON-1", "MON-2"],
            )
        ],
        rooms=[RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False)],
        days=["MON"],
        periods_per_day=2,
    )
    res = run_greedy(req)
    assert len(res.slots) == 0, f"Greedy violated HC-7 unavailable_slots: {res.slots}"
    assert res.hard_violations == 1
    assert any(v.constraint == "COVERAGE_INCOMPLETE" for v in res.violations)
    print("Greedy HC-7 overload fallback fix: PASS (0 unavailable slots assigned)")


if __name__ == "__main__":
    test_status_1_optimal_and_timing_fields()
    test_status_2_feasible_incumbent_preserved()
    test_status_3_unknown_timeout_no_incumbent()
    test_status_4_infeasible()
    test_status_5_model_invalid()
    test_greedy_hc7_overload_fallback_fixed()
    print("ALL TASK-404 HARDENING TESTS PASSED")
