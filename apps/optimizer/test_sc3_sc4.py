"""
Focused SC-3 (Consecutive Same-Subject Penalty) & SC-4 (Faculty Workload Balancing)
Verification Suite for CP-SAT Solver (TASK-403).
"""
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(__file__))

from solver.models import (
    OptimizeRequest,
    SubjectInput,
    FacultyInput,
    RoomInput,
    SectionInput,
)
from solver.cpsat import run_cpsat
from solver.metrics import compute_schedule_quality_metrics
from test_hc7_faculty_availability import validate_hc7_independently


def test_sc3_non_adjacent_preferred_over_adjacent():
    # 2 days x 2 periods, 1 theory subject needing 2h + 1 other needing 2h -> interleaving avoids consecutive same-subject!
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1", "s2"])],
        subjects=[
            SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=2),
            SubjectInput(id="s2", code="S2", name="Sub 2", weekly_hours=2),
        ],
        faculty=[
            FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=18),
            FacultyInput(id="f2", name="Fac 2", subject_ids=["s2"], max_weekly_hours=18),
        ],
        rooms=[RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False)],
        days=["MON", "TUE"],
        periods_per_day=2,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status == "OPTIMAL"
    validate_hc7_independently(req, res)
    qm = compute_schedule_quality_metrics(req, res.slots)
    assert qm["sc3_consecutive_same_subject_pairs"] == 0, f"Expected 0 consecutive pairs, got {qm}"
    print("SC-3 Test 1 (interleaving avoids consecutive same-subject): PASS", qm)


def test_sc3_unavoidable_adjacent_remains_feasible():
    # 1 day x 2 periods, 1 theory subject needing 2h -> must be adjacent, still OPTIMAL
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"])],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=2)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=18)],
        rooms=[RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False)],
        days=["MON"],
        periods_per_day=2,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status == "OPTIMAL"
    qm = compute_schedule_quality_metrics(req, res.slots)
    assert qm["sc3_consecutive_same_subject_pairs"] == 1
    assert res.objective_score >= 6.0
    print("SC-3 Test 2 (unavoidable adjacent remains feasible with penalty): PASS", qm)


def test_sc3_different_sections_simultaneous_not_penalized():
    # 2 sections running same subject S1 simultaneously in MON-1 -> 0 SC-3 penalty
    req = OptimizeRequest(
        sections=[
            SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"]),
            SectionInput(id="sec-b", label="CSE-B", student_count=60, subject_ids=["s1"]),
        ],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=1)],
        faculty=[
            FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=18),
            FacultyInput(id="f2", name="Fac 2", subject_ids=["s1"], max_weekly_hours=18),
        ],
        rooms=[
            RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False),
            RoomInput(id="r2", name="CR-2", capacity=65, is_lab=False),
        ],
        days=["MON"],
        periods_per_day=2,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status == "OPTIMAL"
    qm = compute_schedule_quality_metrics(req, res.slots)
    assert qm["sc3_consecutive_same_subject_pairs"] == 0
    print("SC-3 Test 3 (simultaneous across sections not penalized): PASS")


def test_sc3_lab_internal_continuity_not_penalized():
    # 3-hour lab on MON (periods 2,3,4 to avoid SC-1 period 1) -> 0 SC-3 penalty!
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["lab3"])],
        subjects=[SubjectInput(id="lab3", code="LAB3", name="3h Lab", weekly_hours=3, is_lab=True, lab_duration_hours=3)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["lab3"], max_weekly_hours=18)],
        rooms=[RoomInput(id="l1", name="LAB-1", capacity=65, is_lab=True)],
        days=["MON"],
        periods_per_day=4,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status == "OPTIMAL"
    qm = compute_schedule_quality_metrics(req, res.slots)
    assert qm["sc3_consecutive_same_subject_pairs"] == 0
    assert res.objective_score == 0.0, f"Expected 0.0 penalty for 3h lab starting P2, got {res.objective_score}"
    print("SC-3 Test 4 (lab internal continuity not penalized): PASS", qm)


def test_sc4_balanced_distribution_and_inactive_excluded():
    # 2 sections x 2h = 4h of S1; 2 eligible faculty f1 & f2 + 1 ineligible f_unused
    # Balanced solution gives 2h to f1 and 2h to f2 (spread = 0, std_dev = 0)
    req = OptimizeRequest(
        sections=[
            SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"]),
            SectionInput(id="sec-b", label="CSE-B", student_count=60, subject_ids=["s1"]),
        ],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=2)],
        faculty=[
            FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=18),
            FacultyInput(id="f2", name="Fac 2", subject_ids=["s1"], max_weekly_hours=18),
            FacultyInput(id="f_unused", name="Unused Fac", subject_ids=["unoffered"], max_weekly_hours=18),
        ],
        rooms=[
            RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False),
            RoomInput(id="r2", name="CR-2", capacity=65, is_lab=False),
        ],
        days=["MON", "TUE"],
        periods_per_day=2,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status == "OPTIMAL"
    qm = compute_schedule_quality_metrics(req, res.slots)
    assert "Unused Fac" not in qm["faculty_weekly_distribution"]
    assert qm["sc4_workload_range"] == 0, f"Expected balanced 2h/2h load, got {qm}"
    assert qm["sc4_workload_std_dev"] == 0.0
    print("SC-4 Test 1 (balanced 2h/2h load & unused faculty excluded): PASS", qm)


def test_sc4_forced_unequal_remains_feasible_and_respects_cap():
    # f1 capped at 1h, f2 capped at 18h, total 4h -> f1 gets 1h, f2 gets 3h (feasible, cap respected)
    req = OptimizeRequest(
        sections=[
            SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"]),
            SectionInput(id="sec-b", label="CSE-B", student_count=60, subject_ids=["s1"]),
        ],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=2)],
        faculty=[
            FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=1),
            FacultyInput(id="f2", name="Fac 2", subject_ids=["s1"], max_weekly_hours=18),
        ],
        rooms=[
            RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False),
            RoomInput(id="r2", name="CR-2", capacity=65, is_lab=False),
        ],
        days=["MON", "TUE"],
        periods_per_day=2,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status == "OPTIMAL"
    qm = compute_schedule_quality_metrics(req, res.slots)
    assert qm["faculty_weekly_distribution"]["Fac 1"] <= 1
    assert qm["faculty_weekly_distribution"]["Fac 2"] == 3
    print("SC-4 Test 2 (forced unequal workload feasible & cap respected): PASS", qm)


if __name__ == "__main__":
    test_sc3_non_adjacent_preferred_over_adjacent()
    test_sc3_unavoidable_adjacent_remains_feasible()
    test_sc3_different_sections_simultaneous_not_penalized()
    test_sc3_lab_internal_continuity_not_penalized()
    test_sc4_balanced_distribution_and_inactive_excluded()
    test_sc4_forced_unequal_remains_feasible_and_respects_cap()
    print("ALL SC-3 & SC-4 TESTS PASSED")
