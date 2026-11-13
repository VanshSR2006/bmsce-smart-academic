"""
Test the BMSCE Timetable Optimizer with synthetic CSE-B data.
Run: python test_optimizer.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from solver.models import (
    OptimizeRequest, SubjectInput, FacultyInput, RoomInput, SectionInput, ConstraintConfig
)
from solver.greedy import run_greedy

# Synthetic CSE-B data matching seed data
request = OptimizeRequest(
    sections=[
        SectionInput(id="sec-cse-b", label="CSE-B", student_count=60,
                     subject_ids=["s-daa", "s-dbms", "s-cn", "s-os", "s-toc", "s-se"]),
        SectionInput(id="sec-cse-a", label="CSE-A", student_count=60,
                     subject_ids=["s-daa", "s-dbms", "s-cn", "s-os", "s-toc", "s-se"]),
    ],
    subjects=[
        SubjectInput(id="s-daa", code="22CSSPCDAA", name="Design & Analysis of Algorithms", weekly_hours=4),
        SubjectInput(id="s-dbms", code="22CSPC204", name="Database Management Systems", weekly_hours=4),
        SubjectInput(id="s-cn", code="22CSPC205", name="Computer Networks", weekly_hours=3),
        SubjectInput(id="s-os", code="22CSPC206", name="Operating Systems", weekly_hours=3),
        SubjectInput(id="s-toc", code="22CSPC207", name="Theory of Computation", weekly_hours=3),
        SubjectInput(id="s-se", code="22CSPE208", name="Software Engineering", weekly_hours=3),
    ],
    faculty=[
        FacultyInput(id="f-ramanathan", name="Dr. A. Ramanathan",
                     subject_ids=["s-daa"], max_weekly_hours=16),
        FacultyInput(id="f-sneha", name="Prof. Sneha K.",
                     subject_ids=["s-dbms"], max_weekly_hours=18),
        FacultyInput(id="f-rajeshwari", name="Dr. Rajeshwari V.",
                     subject_ids=["s-cn"], max_weekly_hours=18),
        FacultyInput(id="f-vikram", name="Prof. Vikram Sen",
                     subject_ids=["s-os"], max_weekly_hours=18),
        FacultyInput(id="f-rao", name="Dr. K. M. Rao",
                     subject_ids=["s-toc"], max_weekly_hours=18),
        FacultyInput(id="f-nandhini", name="Dr. M. Nandhini",
                     subject_ids=["s-se"], max_weekly_hours=18),
        FacultyInput(id="f-malathi", name="Prof. S. Malathi",
                     subject_ids=["s-daa", "s-se"], max_weekly_hours=18),  # Proxy
    ],
    rooms=[
        RoomInput(id="r-pj301", name="PJ-301", capacity=60),
        RoomInput(id="r-pj302", name="PJ-302", capacity=60),
        RoomInput(id="r-pj304", name="PJ-304", capacity=65),
    ],
    constraints=ConstraintConfig(
        enforce_faculty_non_overlap=True,
        enforce_room_non_overlap=True,
        enforce_section_non_overlap=True,
        max_daily_faculty_hours=4,
        avoid_first_period_labs=True,
    ),
    days=["MON", "TUE", "WED", "THU", "FRI"],
    periods_per_day=7,
)

print("=" * 60)
print("BMSCE Timetable Optimizer — Greedy Solver Test")
print("=" * 60)
print(f"Sections: {len(request.sections)}")
print(f"Subjects: {len(request.subjects)}")
print(f"Faculty:  {len(request.faculty)}")
print(f"Rooms:    {len(request.rooms)}")
print()

result = run_greedy(request)

print(f"Solver: {result.solver}")
print(f"Status: {result.solver_status}")
print(f"Objective Score: {result.objective_score}")
print(f"Hard Violations: {result.hard_violations}")
print(f"Soft Violations: {result.soft_violations}")
print(f"Slots Assigned: {len(result.slots)}")
print()
print("Faculty Loads:")
for name, hrs in result.metrics.get("faculty_loads", {}).items():
    print(f"  {name}: {hrs}h/week")
print()

if result.violations:
    print("Violations:")
    for v in result.violations:
        print(f"  [{v.severity}] {v.constraint}: {v.description}")
else:
    print("No violations — clean schedule!")

print()
print("Sample Slots (first 10):")
for slot in result.slots[:10]:
    print(f"  {slot.day} P{slot.period} | {slot.section_label} | {slot.subject_code} | {slot.faculty_name} | {slot.room_name}")

print()
print("✅ Greedy solver test complete")

