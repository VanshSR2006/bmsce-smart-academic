"""
BMSCE Smart Academic — Optimizer Performance & Resource Benchmark
Uses standard library ctypes & tracemalloc (no external dependencies required).
"""
import sys
import os
import time
import tracemalloc
import ctypes
from ctypes import wintypes

# Add optimizer app path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'optimizer'))

from solver.models import (
    OptimizeRequest, SubjectInput, FacultyInput, RoomInput, SectionInput, ConstraintConfig
)
from solver.greedy import run_greedy
from solver.cpsat import run_cpsat

class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
    _fields_ = [
        ('cb', wintypes.DWORD),
        ('PageFaultCount', wintypes.DWORD),
        ('PeakWorkingSetSize', ctypes.c_size_t),
        ('WorkingSetSize', ctypes.c_size_t),
        ('QuotaPeakPagedPoolUsage', ctypes.c_size_t),
        ('QuotaPagedPoolUsage', ctypes.c_size_t),
        ('QuotaPeakNonPagedPoolUsage', ctypes.c_size_t),
        ('QuotaNonPagedPoolUsage', ctypes.c_size_t),
        ('PagefileUsage', ctypes.c_size_t),
        ('PeakPagefileUsage', ctypes.c_size_t),
        ('PrivateUsage', ctypes.c_size_t),
    ]

def get_current_process_memory_mb():
    try:
        class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
            _fields_ = [
                ("cb", wintypes.DWORD),
                ("PageFaultCount", wintypes.DWORD),
                ("PeakWorkingSetSize", ctypes.c_size_t),
                ("WorkingSetSize", ctypes.c_size_t),
                ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                ("PagefileUsage", ctypes.c_size_t),
                ("PeakPagefileUsage", ctypes.c_size_t),
            ]
        counters = PROCESS_MEMORY_COUNTERS()
        counters.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS)
        handle = ctypes.windll.kernel32.GetCurrentProcess()
        if ctypes.windll.psapi.GetProcessMemoryInfo(handle, ctypes.byref(counters), counters.cb):
            return counters.WorkingSetSize / (1024 * 1024)
    except Exception:
        pass
    _, peak = tracemalloc.get_traced_memory()
    return peak / (1024 * 1024)

def build_scenario(num_sections=2):
    sections = []
    subjects = []
    faculty = []
    rooms = []

    # Subjects
    sub_defs = [
        ("DAA", "Design & Analysis of Algorithms", 4),
        ("DBMS", "Database Management Systems", 4),
        ("CN", "Computer Networks", 3),
        ("OS", "Operating Systems", 3),
        ("TOC", "Theory of Computation", 3),
        ("SE", "Software Engineering", 3),
        ("AIML", "Artificial Intelligence", 3),
        ("CLOUD", "Cloud Computing", 3),
    ]

    for i, (code, name, hrs) in enumerate(sub_defs):
        subjects.append(SubjectInput(id=f"sub_{i}", code=f"22CS{code}", name=name, weekly_hours=hrs))

    # Sections
    for s in range(num_sections):
        sec_id = f"sec_cse_{chr(65 + s)}"
        sub_ids = [f"sub_{i}" for i in range(len(sub_defs))]
        sections.append(SectionInput(id=sec_id, label=f"CSE-{chr(65 + s)}", student_count=60, subject_ids=sub_ids))

    # Faculty (2 faculty per subject to allow parallel scheduling)
    for i, (code, _, _) in enumerate(sub_defs):
        for f in range(2):
            faculty.append(FacultyInput(
                id=f"fac_{code}_{f}",
                name=f"Prof. {code}-{f+1}",
                subject_ids=[f"sub_{i}"],
                max_weekly_hours=18
            ))

    # Rooms
    for r in range(max(num_sections + 2, 6)):
        rooms.append(RoomInput(id=f"room_{r+101}", code=f"CR-{r+101}", name=f"Classroom {r+101}", capacity=70, room_type="CLASSROOM"))

    return OptimizeRequest(
        sections=sections,
        subjects=subjects,
        faculty=faculty,
        rooms=rooms,
        constraints=ConstraintConfig(max_daily_hours=6, allow_saturday=False)
    )

def run_benchmark():
    tracemalloc.start()
    print("=" * 65)
    print("   BMSCE TIMETABLE OPTIMIZER RESOURCE BENCHMARK")
    print("=" * 65)

    base_mem = get_current_process_memory_mb()
    print(f"[*] Process Baseline Working Set: {base_mem:.2f} MB")

    scenarios = [
        ("Standard 2-Section Cohort (16 offerings)", 2, 10),
        ("Department 4-Section Cohort (32 offerings)", 4, 15),
        ("Large Department 6-Section Cohort (48 offerings)", 6, 20),
    ]

    results = []

    for name, num_sec, time_limit in scenarios:
        print(f"\n---> Running: {name}")
        req = build_scenario(num_sec)
        
        # Test Greedy Baseline
        t0 = time.time()
        greedy_res = run_greedy(req)
        t_greedy = time.time() - t0
        
        print(f"     Greedy: {t_greedy:.3f}s | Hard Violations: {greedy_res.hard_violations} | Score: {greedy_res.objective_score:.1f}")

        # Test CP-SAT Solver
        t1 = time.time()
        cpsat_res = run_cpsat(req, time_limit_seconds=time_limit, relax_soft=False)
        t_cpsat = time.time() - t1
        m_peak = get_current_process_memory_mb()
        
        print(f"     CP-SAT: {t_cpsat:.2f}s | Status: {cpsat_res.solver_status} | Hard Violations: {cpsat_res.hard_violations} | Score: {cpsat_res.objective_score:.1f}")
        print(f"     Memory Delta: +{m_peak - base_mem:.2f} MB | Peak Process RSS: {m_peak:.2f} MB")

        results.append({
            "name": name,
            "sections": num_sec,
            "greedy_s": round(t_greedy, 3),
            "cpsat_s": round(t_cpsat, 2),
            "peak_rss_mb": round(m_peak, 2),
            "mem_delta_mb": round(m_peak - base_mem, 2),
            "status": cpsat_res.solver_status,
            "feasible": cpsat_res.hard_violations == 0
        })

    # Test Timeout Failure & Fallback Behavior
    print("\n---> Testing Timeout Graceful Degradation (Short 2s limit on 4 sections)")
    req_timeout = build_scenario(4)
    t_to_start = time.time()
    res_to = run_cpsat(req_timeout, time_limit_seconds=2, relax_soft=False)
    t_to_duration = time.time() - t_to_start
    print(f"     Timeout result: {t_to_duration:.2f}s | Status: {res_to.solver_status} | Hard Violations: {res_to.hard_violations}")

    print("\n" + "=" * 65)
    print("   BENCHMARK SUMMARY & PLAN RECOMMENDATION")
    print("=" * 65)
    for r in results:
        print(f" • {r['name']}: {r['cpsat_s']}s CP-SAT, Peak RSS: {r['peak_rss_mb']} MB (Delta: +{r['mem_delta_mb']} MB) -> Status: {r['status']}")

    print("\n" + "=" * 65)

if __name__ == '__main__':
    run_benchmark()
