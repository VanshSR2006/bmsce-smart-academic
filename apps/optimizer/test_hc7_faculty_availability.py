"""
Comprehensive HC-7 (Faculty Availability) Verification Suite for CP-SAT Solver (TASK-402)
Independently validates that no faculty member is assigned to any slot in unavailable_slots,
including multi-period lab blocks.
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
    TimetableCandidate,
)
from solver.cpsat import run_cpsat
from test_hc6_lab_contiguity import validate_schedule_independently


def validate_hc7_independently(req: OptimizeRequest, cand: TimetableCandidate):
    """Independently verify no slot violates any faculty member's unavailable_slots."""
    validate_schedule_independently(req, cand)
    unavail_map = {}
    for fac in req.faculty:
        s = set()
        for item in fac.unavailable_slots:
            if "-" in item:
                d, p = item.split("-", 1)
                try:
                    s.add((d.strip().upper(), int(p.strip())))
                except ValueError:
                    pass
        unavail_map[fac.id] = s

    for sl in cand.slots:
        key = (sl.day.strip().upper(), sl.period)
        assert key not in unavail_map.get(sl.faculty_id, set()), (
            f"HC-7 violation: {sl.faculty_name} assigned to unavailable slot {key}"
        )


def test_1_faculty_unavailable_for_required_slot():
    # Single day, 2 periods; faculty unavailable MON-1, 1-hour subject -> must pick MON-2
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"])],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=1)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=18, unavailable_slots=["MON-1"])],
        rooms=[RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False)],
        days=["MON"],
        periods_per_day=2,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status in ("OPTIMAL", "FEASIBLE")
    assert res.hard_violations == 0
    validate_hc7_independently(req, res)
    assert res.slots[0].day == "MON" and res.slots[0].period == 2
    print("HC-7 Test 1 (avoids unavailable slot MON-1 -> MON-2): PASS")


def test_2_alternative_faculty_used():
    # 1 slot day (MON-1): f1 unavailable MON-1, f2 available -> must pick f2
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"])],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=1)],
        faculty=[
            FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=18, unavailable_slots=["MON-1"]),
            FacultyInput(id="f2", name="Fac 2", subject_ids=["s1"], max_weekly_hours=18, unavailable_slots=[]),
        ],
        rooms=[RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False)],
        days=["MON"],
        periods_per_day=1,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status in ("OPTIMAL", "FEASIBLE")
    assert res.hard_violations == 0
    validate_hc7_independently(req, res)
    assert res.slots[0].faculty_id == "f2"
    print("HC-7 Test 2 (uses alternative available faculty f2): PASS")


def test_3_all_eligible_faculty_unavailable_infeasible():
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"])],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=1)],
        faculty=[
            FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=18, unavailable_slots=["MON-1"]),
            FacultyInput(id="f2", name="Fac 2", subject_ids=["s1"], max_weekly_hours=18, unavailable_slots=["MON-1"]),
        ],
        rooms=[RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False)],
        days=["MON"],
        periods_per_day=1,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status == "INFEASIBLE"
    assert len(res.slots) == 0
    print("HC-7 Test 3 (all faculty unavailable -> INFEASIBLE): PASS")


def test_4_unavailability_different_day_does_not_block():
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"])],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=1)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=18, unavailable_slots=["TUE-1"])],
        rooms=[RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False)],
        days=["MON"],
        periods_per_day=1,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status in ("OPTIMAL", "FEASIBLE")
    validate_hc7_independently(req, res)
    print("HC-7 Test 4 (different day unavailability does not block): PASS")


def test_5_unavailability_different_period_does_not_block():
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["s1"])],
        subjects=[SubjectInput(id="s1", code="S1", name="Sub 1", weekly_hours=1)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["s1"], max_weekly_hours=18, unavailable_slots=["MON-2"])],
        rooms=[RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False)],
        days=["MON"],
        periods_per_day=1,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status in ("OPTIMAL", "FEASIBLE")
    validate_hc7_independently(req, res)
    print("HC-7 Test 5 (different period unavailability does not block): PASS")


def test_6_lab_overlapping_unavailable_slot():
    # 4 periods/day, 3-period lab, faculty unavailable MON-2 -> cannot place 3h lab on MON (MON-1..3 and MON-2..4 both hit MON-2)
    req_infeas = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["lab3"])],
        subjects=[SubjectInput(id="lab3", code="LAB3", name="3h Lab", weekly_hours=3, is_lab=True, lab_duration_hours=3)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["lab3"], max_weekly_hours=18, unavailable_slots=["MON-2"])],
        rooms=[RoomInput(id="l1", name="LAB-1", capacity=65, is_lab=True)],
        days=["MON"],
        periods_per_day=4,
    )
    r1 = run_cpsat(req_infeas, time_limit_seconds=10)
    assert r1.solver_status == "INFEASIBLE", f"Expected INFEASIBLE, got {r1.solver_status}"

    # With MON and TUE available, must schedule on TUE
    req_feas = OptimizeRequest(
        sections=req_infeas.sections,
        subjects=req_infeas.subjects,
        faculty=req_infeas.faculty,
        rooms=req_infeas.rooms,
        days=["MON", "TUE"],
        periods_per_day=4,
    )
    r2 = run_cpsat(req_feas, time_limit_seconds=10)
    assert r2.solver_status in ("OPTIMAL", "FEASIBLE")
    validate_hc7_independently(req_feas, r2)
    assert all(s.day == "TUE" for s in r2.slots)
    print("HC-7 Test 6 (3h lab avoids unavailable MON-2 -> scheduled on TUE): PASS")


if __name__ == "__main__":
    test_1_faculty_unavailable_for_required_slot()
    test_2_alternative_faculty_used()
    test_3_all_eligible_faculty_unavailable_infeasible()
    test_4_unavailability_different_day_does_not_block()
    test_5_unavailability_different_period_does_not_block()
    test_6_lab_overlapping_unavailable_slot()
    print("ALL HC-7 FACULTY AVAILABILITY TESTS PASSED")
