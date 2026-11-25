"""
Reproducible Optimizer Benchmark: Greedy vs CP-SAT (TASK-403)
Compares Greedy baseline and CP-SAT across 4 deterministic synthetic scenarios
using independent schedule-quality metrics (no DB access).

Note: Greedy baseline does not implement SC-2/SC-3/SC-4 soft constraints and retains
a known overload fallback that does not re-check unavailable_slots (HC-7).
"""
import os
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "optimizer"))

from solver.models import (
    OptimizeRequest,
    SubjectInput,
    FacultyInput,
    RoomInput,
    SectionInput,
)
from solver.greedy import run_greedy
from solver.cpsat import run_cpsat
from solver.metrics import compute_schedule_quality_metrics


def build_benchmark_scenarios():
    subjects = [
        SubjectInput(id="s-daa", code="DAA", name="DAA", weekly_hours=4),
        SubjectInput(id="s-dbms", code="DBMS", name="DBMS", weekly_hours=4),
        SubjectInput(id="s-cn", code="CN", name="CN", weekly_hours=3),
        SubjectInput(id="s-os", code="OS", name="OS", weekly_hours=3),
        SubjectInput(id="s-toc", code="TOC", name="TOC", weekly_hours=3),
        SubjectInput(id="s-daal", code="DAAL", name="DAA Lab", weekly_hours=2, is_lab=True, lab_duration_hours=2),
        SubjectInput(id="s-dbmsl", code="DBMSL", name="DBMS Lab", weekly_hours=2, is_lab=True, lab_duration_hours=2),
    ]
    subj_ids = [s.id for s in subjects]
    rooms = [
        RoomInput(id=f"cr-{i}", name=f"CR-30{i}", capacity=70, is_lab=False) for i in range(1, 6)
    ] + [
        RoomInput(id="lab-1", name="LAB-1", capacity=65, is_lab=True),
        RoomInput(id="lab-2", name="LAB-2", capacity=65, is_lab=True),
    ]
    faculty_base = [
        FacultyInput(id="f1", name="Fac 1", subject_ids=["s-daa", "s-daal"], max_weekly_hours=18),
        FacultyInput(id="f2", name="Fac 2", subject_ids=["s-daa", "s-os"], max_weekly_hours=18),
        FacultyInput(id="f3", name="Fac 3", subject_ids=["s-dbms", "s-dbmsl"], max_weekly_hours=18),
        FacultyInput(id="f4", name="Fac 4", subject_ids=["s-dbms", "s-os"], max_weekly_hours=18),
        FacultyInput(id="f5", name="Fac 5", subject_ids=["s-cn"], max_weekly_hours=18),
        FacultyInput(id="f6", name="Fac 6", subject_ids=["s-toc"], max_weekly_hours=18),
        FacultyInput(id="f7", name="Fac 7", subject_ids=["s-daal", "s-dbmsl"], max_weekly_hours=18),
        FacultyInput(id="f8", name="Fac 8", subject_ids=["s-cn", "s-toc"], max_weekly_hours=18),
    ]

    # 1. Single-section scenario
    b1 = OptimizeRequest(
        sections=[SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=subj_ids)],
        subjects=subjects,
        faculty=faculty_base,
        rooms=rooms,
    )

    # 2. Four-section scenario
    b2 = OptimizeRequest(
        sections=[
            SectionInput(id=f"sec-{i}", label=f"CSE-{chr(65 + i)}", student_count=60, subject_ids=subj_ids)
            for i in range(4)
        ],
        subjects=subjects,
        faculty=faculty_base,
        rooms=rooms,
    )

    # 3. Constrained faculty availability scenario
    faculty_unavail = [
        FacultyInput(
            id="f1", name="Fac 1", subject_ids=["s-daa", "s-daal"], max_weekly_hours=18,
            unavailable_slots=["MON-1", "MON-2", "TUE-1", "WED-1"],
        ),
        FacultyInput(
            id="f3", name="Fac 3", subject_ids=["s-dbms", "s-dbmsl"], max_weekly_hours=18,
            unavailable_slots=["FRI-5", "FRI-6", "FRI-7"],
        ),
    ] + faculty_base[2:]
    # Remove duplicate f3
    faculty_unavail = [faculty_unavail[0], faculty_base[1], faculty_unavail[1]] + faculty_base[3:]
    b3 = OptimizeRequest(
        sections=[
            SectionInput(id="sec-a", label="CSE-A", student_count=60, subject_ids=subj_ids),
            SectionInput(id="sec-b", label="CSE-B", student_count=60, subject_ids=subj_ids),
        ],
        subjects=subjects,
        faculty=faculty_unavail,
        rooms=rooms,
    )

    # 4. Multiple eligible faculty & workload balancing scenario
    b4 = OptimizeRequest(
        sections=[
            SectionInput(id=f"sec-{i}", label=f"CSE-{chr(65 + i)}", student_count=60, subject_ids=["s-daa", "s-dbms", "s-cn"])
            for i in range(4)
        ],
        subjects=subjects[:3],
        faculty=[
            FacultyInput(id="f1", name="Fac 1", subject_ids=["s-daa", "s-dbms", "s-cn"], max_weekly_hours=18),
            FacultyInput(id="f2", name="Fac 2", subject_ids=["s-daa", "s-dbms", "s-cn"], max_weekly_hours=18),
            FacultyInput(id="f3", name="Fac 3", subject_ids=["s-daa", "s-dbms", "s-cn"], max_weekly_hours=18),
            FacultyInput(id="f4", name="Fac 4", subject_ids=["s-daa", "s-dbms", "s-cn"], max_weekly_hours=18),
        ],
        rooms=rooms[:5],
    )

    return [
        ("1_single_section", b1),
        ("2_four_sections", b2),
        ("3_constrained_availability", b3),
        ("4_multi_eligible_balancing", b4),
    ]


def main():
    print("=" * 95)
    print("CAMPUSFLOW OPTIMIZER BENCHMARK — GREEDY vs CP-SAT (TASK-403)")
    print("=" * 95)
    for name, req in build_benchmark_scenarios():
        t0 = time.time()
        g = run_greedy(req)
        tg = time.time() - t0
        gq = compute_schedule_quality_metrics(req, g.slots)

        t1 = time.time()
        c = run_cpsat(req, time_limit_seconds=20, relax_soft=False)
        tc = time.time() - t1
        cq = compute_schedule_quality_metrics(req, c.slots) if c.slots else {}

        print(f"\n[{name}]")
        print(
            f"  Greedy : status={g.solver_status}, time={tg:.3f}s, slots={len(g.slots)}, hard={g.hard_violations}, "
            f"sc3_pairs={gq['sc3_consecutive_same_subject_pairs']}, sc4_range={gq['sc4_workload_range']}, "
            f"sc4_std={gq['sc4_workload_std_dev']}, indep_soft={gq['independent_soft_score']}"
        )
        print(
            f"  CP-SAT : status={c.solver_status}, build={c.metrics.get('model_build_time_s')}s, "
            f"search={c.metrics.get('search_time_s')}s, total={tc:.2f}s, slots={len(c.slots)}, hard={c.hard_violations}, "
            f"obj={c.objective_score}, sc3_pairs={cq.get('sc3_consecutive_same_subject_pairs')}, "
            f"sc4_range={cq.get('sc4_workload_range')}, sc4_std={cq.get('sc4_workload_std_dev')}, "
            f"indep_soft={cq.get('independent_soft_score')}"
        )


if __name__ == "__main__":
    main()
