"""
Comprehensive HC-6 (Lab Contiguity) Verification Suite for CP-SAT Solver (TASK-401)
Independently validates generated schedules for period count, contiguity,
single-day containment, uniform faculty/room/section, and non-overlap.
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


def validate_schedule_independently(req: OptimizeRequest, cand: TimetableCandidate):
    """Independently check hard non-overlap, coverage, and lab contiguity."""
    subj_map = {s.id: s for s in req.subjects}
    fac_slots = set()
    room_slots = set()
    sec_slots = set()

    for sl in cand.slots:
        fk = (sl.faculty_id, sl.day, sl.period)
        rk = (sl.room_id, sl.day, sl.period)
        sk = (sl.section_id, sl.day, sl.period)
        assert fk not in fac_slots, f"Faculty overlap: {fk}"
        assert rk not in room_slots, f"Room overlap: {rk}"
        assert sk not in sec_slots, f"Section overlap: {sk}"
        fac_slots.add(fk)
        room_slots.add(rk)
        sec_slots.add(sk)

    for sec in req.sections:
        for sid in sec.subject_ids:
            subj = subj_map[sid]
            slots = [s for s in cand.slots if s.section_id == sec.id and s.subject_id == sid]
            assert len(slots) == subj.weekly_hours, (
                f"{sec.label} {subj.code}: expected {subj.weekly_hours}, got {len(slots)}"
            )
            if subj.is_lab and subj.lab_duration_hours > 1:
                block = subj.lab_duration_hours
                by_day = {}
                for s in slots:
                    by_day.setdefault(s.day, []).append(s)
                for day, d_slots in by_day.items():
                    d_slots.sort(key=lambda x: x.period)
                    assert len(d_slots) % block == 0, (
                        f"Lab split across days: {sec.label} {subj.code} on {day} has {len(d_slots)} periods"
                    )
                    for i in range(0, len(d_slots), block):
                        grp = d_slots[i:i + block]
                        periods = [g.period for g in grp]
                        assert periods == list(range(periods[0], periods[0] + block)), (
                            f"Non-consecutive lab periods: {periods}"
                        )
                        assert len({g.faculty_id for g in grp}) == 1, "Lab faculty changed mid-block"
                        assert len({g.room_id for g in grp}) == 1, "Lab room changed mid-block"
                        assert len({g.section_id for g in grp}) == 1, "Lab section changed mid-block"
                        assert periods[-1] <= req.periods_per_day, "Lab crossed day boundary"


def test_a_three_period_lab_feasible():
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["lab3"])],
        subjects=[SubjectInput(id="lab3", code="LAB3", name="3h Lab", weekly_hours=3, is_lab=True, lab_duration_hours=3)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["lab3"], max_weekly_hours=18)],
        rooms=[RoomInput(id="l1", name="LAB-1", capacity=65, is_lab=True)],
        days=["MON", "TUE"],
        periods_per_day=7,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status in ("OPTIMAL", "FEASIBLE"), f"A failed: {res.solver_status}"
    assert res.hard_violations == 0
    validate_schedule_independently(req, res)
    print("Scenario A (3h lab, 7 periods/day): PASS", res.solver_status, [(s.day, s.period) for s in res.slots])


def test_b_three_period_lab_infeasible_short_day():
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["lab3"])],
        subjects=[SubjectInput(id="lab3", code="LAB3", name="3h Lab", weekly_hours=3, is_lab=True, lab_duration_hours=3)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["lab3"], max_weekly_hours=18)],
        rooms=[RoomInput(id="l1", name="LAB-1", capacity=65, is_lab=True)],
        days=["MON", "TUE", "WED"],
        periods_per_day=2,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status == "INFEASIBLE", f"B expected INFEASIBLE, got {res.solver_status}"
    assert len(res.slots) == 0
    print("Scenario B (3h lab, 2 periods/day): PASS INFEASIBLE")


def test_c_no_cross_day_block_near_end_of_day():
    # 3-period lab + 1 theory on 2 days of 3 periods each -> lab must fit cleanly on one day
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["lab3", "th1"])],
        subjects=[
            SubjectInput(id="lab3", code="LAB3", name="3h Lab", weekly_hours=3, is_lab=True, lab_duration_hours=3),
            SubjectInput(id="th1", code="TH1", name="Theory 1", weekly_hours=1, is_lab=False),
        ],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["lab3", "th1"], max_weekly_hours=18)],
        rooms=[
            RoomInput(id="l1", name="LAB-1", capacity=65, is_lab=True),
            RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False),
        ],
        days=["MON", "TUE"],
        periods_per_day=3,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status in ("OPTIMAL", "FEASIBLE")
    assert res.hard_violations == 0
    validate_schedule_independently(req, res)
    print("Scenario C (no cross-day block): PASS", res.solver_status)


def test_e_two_labs_same_faculty():
    # 2 sections, 1 faculty -> 1 day of 4 periods is INFEASIBLE; 2 days of 3 periods is OPTIMAL
    req_infeas = OptimizeRequest(
        sections=[
            SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["lab3"]),
            SectionInput(id="sec-b", label="CSE-B", student_count=60, subject_ids=["lab3"]),
        ],
        subjects=[SubjectInput(id="lab3", code="LAB3", name="3h Lab", weekly_hours=3, is_lab=True, lab_duration_hours=3)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["lab3"], max_weekly_hours=18)],
        rooms=[
            RoomInput(id="l1", name="LAB-1", capacity=65, is_lab=True),
            RoomInput(id="l2", name="LAB-2", capacity=65, is_lab=True),
        ],
        days=["MON"],
        periods_per_day=4,
    )
    r1 = run_cpsat(req_infeas, time_limit_seconds=10)
    assert r1.solver_status == "INFEASIBLE", f"E1 expected INFEASIBLE, got {r1.solver_status}"

    req_feas = OptimizeRequest(
        sections=req_infeas.sections,
        subjects=req_infeas.subjects,
        faculty=req_infeas.faculty,
        rooms=req_infeas.rooms,
        days=["MON", "TUE"],
        periods_per_day=3,
    )
    r2 = run_cpsat(req_feas, time_limit_seconds=10)
    assert r2.solver_status in ("OPTIMAL", "FEASIBLE")
    assert r2.hard_violations == 0
    validate_schedule_independently(req_feas, r2)
    print("Scenario E (two labs competing for same faculty): PASS")


def test_f_two_labs_same_room():
    # 2 sections, 2 faculty, 1 lab room -> 1 day of 4 periods is INFEASIBLE; 2 days of 3 periods is OPTIMAL
    req_infeas = OptimizeRequest(
        sections=[
            SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["lab3"]),
            SectionInput(id="sec-b", label="CSE-B", student_count=60, subject_ids=["lab3"]),
        ],
        subjects=[SubjectInput(id="lab3", code="LAB3", name="3h Lab", weekly_hours=3, is_lab=True, lab_duration_hours=3)],
        faculty=[
            FacultyInput(id="f1", name="Fac 1", subject_ids=["lab3"], max_weekly_hours=18),
            FacultyInput(id="f2", name="Fac 2", subject_ids=["lab3"], max_weekly_hours=18),
        ],
        rooms=[RoomInput(id="l1", name="LAB-1", capacity=65, is_lab=True)],
        days=["MON"],
        periods_per_day=4,
    )
    r1 = run_cpsat(req_infeas, time_limit_seconds=10)
    assert r1.solver_status == "INFEASIBLE", f"F1 expected INFEASIBLE, got {r1.solver_status}"

    req_feas = OptimizeRequest(
        sections=req_infeas.sections,
        subjects=req_infeas.subjects,
        faculty=req_infeas.faculty,
        rooms=req_infeas.rooms,
        days=["MON", "TUE"],
        periods_per_day=3,
    )
    r2 = run_cpsat(req_feas, time_limit_seconds=10)
    assert r2.solver_status in ("OPTIMAL", "FEASIBLE")
    assert r2.hard_violations == 0
    validate_schedule_independently(req_feas, r2)
    print("Scenario F (two labs competing for same room): PASS")


def test_g_theory_subjects_unaffected():
    req = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=["th4"])],
        subjects=[SubjectInput(id="th4", code="TH4", name="Theory 4h", weekly_hours=4, is_lab=False)],
        faculty=[FacultyInput(id="f1", name="Fac 1", subject_ids=["th4"], max_weekly_hours=18)],
        rooms=[RoomInput(id="r1", name="CR-1", capacity=65, is_lab=False)],
        days=["MON", "TUE", "WED"],
        periods_per_day=2,
    )
    res = run_cpsat(req, time_limit_seconds=10)
    assert res.solver_status in ("OPTIMAL", "FEASIBLE")
    assert res.hard_violations == 0
    validate_schedule_independently(req, res)
    print("Scenario G (theory subjects): PASS", res.solver_status)


if __name__ == "__main__":
    test_a_three_period_lab_feasible()
    test_b_three_period_lab_infeasible_short_day()
    test_c_no_cross_day_block_near_end_of_day()
    test_e_two_labs_same_faculty()
    test_f_two_labs_same_room()
    test_g_theory_subjects_unaffected()
    print("ALL HC-6 LAB CONTIGUITY TESTS PASSED")
