"""
Test CP-SAT solver directly.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from test_optimizer import request
from solver.cpsat import run_cpsat

print("Testing CP-SAT solver...")
result = run_cpsat(request, time_limit_seconds=10)
print(f"CP-SAT Status: {result.solver_status}")
print(f"Objective Score: {result.objective_score}")
print(f"Hard Violations: {result.hard_violations}")
print(f"Soft Violations: {result.soft_violations}")
print(f"Slots Assigned: {len(result.slots)}")
if result.slots:
    print("First 5 slots:")
    for s in result.slots[:5]:
        print(f"  {s.day} P{s.period} | {s.section_label} | {s.subject_code} | {s.faculty_name} | {s.room_name}")
print("CP-SAT Test completed.")

