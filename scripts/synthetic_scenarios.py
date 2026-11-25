"""
CampusFlow — Controlled Synthetic Validation Scenarios (TASK-201)
Tests 7 controlled scheduling scenarios against the existing Greedy and CP-SAT solvers
without modifying optimizer logic or any database.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "optimizer"))

from solver.models import (
    OptimizeRequest,
    SubjectInput,
    FacultyInput,
    RoomInput,
    SectionInput,
    ConstraintConfig,
)
from solver.greedy import run_greedy
from solver.cpsat import run_cpsat


def base_subjects():
    return [
        SubjectInput(id="s-daa", code="SYNTH-DAA", name="DAA", weekly_hours=4),
        SubjectInput(id="s-dbms", code="SYNTH-DBMS", name="DBMS", weekly_hours=4),
        SubjectInput(id="s-cn", code="SYNTH-CN", name="CN", weekly_hours=3),
        SubjectInput(id="s-os", code="SYNTH-OS", name="OS", weekly_hours=3),
        SubjectInput(id="s-toc", code="SYNTH-TOC", name="TOC", weekly_hours=3),
        SubjectInput(id="s-daal", code="SYNTH-DAAL", name="DAA Lab", weekly_hours=2, is_lab=True, lab_duration_hours=2),
        SubjectInput(id="s-dbmsl", code="SYNTH-DBMSL", name="DBMS Lab", weekly_hours=2, is_lab=True, lab_duration_hours=2),
    ]


def base_rooms():
    return [
        RoomInput(id="r-1", name="CR-301", capacity=70, is_lab=False),
        RoomInput(id="r-2", name="CR-302", capacity=70, is_lab=False),
        RoomInput(id="r-3", name="CR-303", capacity=70, is_lab=False),
        RoomInput(id="r-4", name="CR-304", capacity=70, is_lab=False),
        RoomInput(id="r-5", name="CR-305", capacity=70, is_lab=False),
        RoomInput(id="l-1", name="LAB-1", capacity=65, is_lab=True),
        RoomInput(id="l-2", name="LAB-2", capacity=65, is_lab=True),
    ]


def base_faculty():
    return [
        FacultyInput(id="f-1", name="Synth Fac 01", subject_ids=["s-daa", "s-daal"], max_weekly_hours=18, unavailable_slots=["MON-1"]),
        FacultyInput(id="f-2", name="Synth Fac 02", subject_ids=["s-daa", "s-os"], max_weekly_hours=18),
        FacultyInput(id="f-3", name="Synth Fac 03", subject_ids=["s-dbms", "s-dbmsl"], max_weekly_hours=18, unavailable_slots=["FRI-7"]),
        FacultyInput(id="f-4", name="Synth Fac 04", subject_ids=["s-dbms", "s-os"], max_weekly_hours=18),
        FacultyInput(id="f-5", name="Synth Fac 05", subject_ids=["s-cn"], max_weekly_hours=18),
        FacultyInput(id="f-6", name="Synth Fac 06", subject_ids=["s-toc"], max_weekly_hours=18),
        FacultyInput(id="f-7", name="Synth Fac 07", subject_ids=["s-daal", "s-dbmsl"], max_weekly_hours=18),
        FacultyInput(id="f-8", name="Synth Fac 08", subject_ids=["s-cn", "s-toc"], max_weekly_hours=18),
    ]


def make_sections(count: int):
    subj_ids = [s.id for s in base_subjects()]
    return [
        SectionInput(id=f"sec-{i}", label=f"CSE-{chr(65 + i)}", student_count=60, subject_ids=subj_ids)
        for i in range(count)
    ]


def build_scenarios():
    # 1. Feasible 4-section CSE timetable
    s1 = OptimizeRequest(
        sections=make_sections(4),
        subjects=base_subjects(),
        faculty=base_faculty(),
        rooms=base_rooms(),
    )

    # 2. Deliberately infeasible: Faculty clash / oversubscription (1 faculty for 40h > 35 slots)
    s2 = OptimizeRequest(
        sections=[
            SectionInput(id=f"sec-{i}", label=f"CSE-{chr(65 + i)}", student_count=60, subject_ids=["s-daa", "s-dbms", "s-cn"])
            for i in range(4)
        ],
        subjects=[
            SubjectInput(id="s-daa", code="DAA", name="DAA", weekly_hours=4),
            SubjectInput(id="s-dbms", code="DBMS", name="DBMS", weekly_hours=4),
            SubjectInput(id="s-cn", code="CN", name="CN", weekly_hours=3),
        ],
        faculty=[FacultyInput(id="f-only", name="Single Overloaded Faculty", subject_ids=["s-daa", "s-dbms", "s-cn"], max_weekly_hours=44)],
        rooms=base_rooms(),
    )

    # 3. Deliberately infeasible: Room clash / contention (1 room for 44h > 35 slots)
    s3 = OptimizeRequest(
        sections=[
            SectionInput(id=f"sec-{i}", label=f"CSE-{chr(65 + i)}", student_count=60, subject_ids=["s-daa", "s-dbms", "s-cn"])
            for i in range(4)
        ],
        subjects=[
            SubjectInput(id="s-daa", code="DAA", name="DAA", weekly_hours=4),
            SubjectInput(id="s-dbms", code="DBMS", name="DBMS", weekly_hours=4),
            SubjectInput(id="s-cn", code="CN", name="CN", weekly_hours=3),
        ],
        faculty=base_faculty(),
        rooms=[RoomInput(id="r-only", name="Single Room", capacity=70, is_lab=False)],
    )

    # 4. Unavailable faculty member (blocked across all slots of MON..FRI)
    all_slots = [f"{d}-{p}" for d in ["MON", "TUE", "WED", "THU", "FRI"] for p in range(1, 8)]
    s4 = OptimizeRequest(
        sections=[SectionInput(id="sec-0", label="CSE-A", student_count=60, subject_ids=["s-daa"])],
        subjects=[SubjectInput(id="s-daa", code="DAA", name="DAA", weekly_hours=4)],
        faculty=[FacultyInput(id="f-unavail", name="Unavailable Faculty", subject_ids=["s-daa"], max_weekly_hours=18, unavailable_slots=all_slots)],
        rooms=[RoomInput(id="r-1", name="CR-301", capacity=70, is_lab=False)],
    )

    # 5. Invalid lab allocation (3-hr contiguous lab when periods_per_day=2)
    s5 = OptimizeRequest(
        sections=[SectionInput(id="sec-0", label="CSE-A", student_count=60, subject_ids=["s-lab3"])],
        subjects=[SubjectInput(id="s-lab3", code="LAB3", name="3h Lab", weekly_hours=3, is_lab=True, lab_duration_hours=3)],
        faculty=[FacultyInput(id="f-lab", name="Lab Faculty", subject_ids=["s-lab3"], max_weekly_hours=18)],
        rooms=[RoomInput(id="l-1", name="LAB-1", capacity=65, is_lab=True)],
        periods_per_day=2,
    )

    # 6. Workload violation (faculty cap=4h, required=12h)
    s6 = OptimizeRequest(
        sections=[SectionInput(id="sec-0", label="CSE-A", student_count=60, subject_ids=["s-daa", "s-dbms", "s-cn"])],
        subjects=[
            SubjectInput(id="s-daa", code="DAA", name="DAA", weekly_hours=4),
            SubjectInput(id="s-dbms", code="DBMS", name="DBMS", weekly_hours=4),
            SubjectInput(id="s-cn", code="CN", name="CN", weekly_hours=4),
        ],
        faculty=[FacultyInput(id="f-lowcap", name="Low Cap Faculty", subject_ids=["s-daa", "s-dbms", "s-cn"], max_weekly_hours=4)],
        rooms=[RoomInput(id="r-1", name="CR-301", capacity=70, is_lab=False)],
    )

    # 7. Incremental scheduling scenario (3 base sections + 1 added section = 4 sections)
    s7 = OptimizeRequest(
        sections=make_sections(3) + [
            SectionInput(id="sec-3", label="CSE-D (Incremental)", student_count=60, subject_ids=[s.id for s in base_subjects()])
        ],
        subjects=base_subjects(),
        faculty=base_faculty(),
        rooms=base_rooms(),
    )

    return [
        ("1_feasible_4sec", s1),
        ("2_faculty_clash", s2),
        ("3_room_clash", s3),
        ("4_unavailable_faculty", s4),
        ("5_invalid_lab", s5),
        ("6_workload_violation", s6),
        ("7_incremental_4sec", s7),
    ]


def main():
    print("=" * 72)
    print("CAMPUSFLOW — CONTROLLED SYNTHETIC SCENARIO VALIDATION (TASK-201)")
    print("=" * 72)
    for name, req in build_scenarios():
        t0 = time.time()
        g = run_greedy(req)
        tg = time.time() - t0

        t1 = time.time()
        c = run_cpsat(req, time_limit_seconds=10, relax_soft=False)
        tc = time.time() - t1

        print(
            f"[{name}] Greedy: {g.solver_status} (hard={g.hard_violations}, soft={g.soft_violations}, slots={len(g.slots)}, {tg:.2f}s) | "
            f"CP-SAT: {c.solver_status} (hard={c.hard_violations}, obj={c.objective_score}, slots={len(c.slots)}, {tc:.2f}s)"
        )


if __name__ == "__main__":
    main()
