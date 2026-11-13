"""
Controlled Benchmark for BMSCE Timetable Optimizer
Queries the live Optimizer daemon via HTTP and measures process resources.
"""
import urllib.request
import json
import time
import subprocess

def get_process_metrics():
    ps_cmd = 'Get-Process -Name python -ErrorAction SilentlyContinue | Select-Object Id, CPU, WorkingSet64 | ConvertTo-Json'
    res = subprocess.run(['powershell', '-Command', ps_cmd], capture_output=True, text=True)
    try:
        data = json.loads(res.stdout)
        if isinstance(data, list):
            # Sum working set across python processes
            total_ws_mb = sum(p.get('WorkingSet64', 0) for p in data) / (1024 * 1024)
            return {"count": len(data), "total_ws_mb": round(total_ws_mb, 2), "processes": data}
        elif isinstance(data, dict):
            return {"count": 1, "total_ws_mb": round(data.get('WorkingSet64', 0) / (1024 * 1024), 2), "processes": [data]}
    except Exception:
        pass
    return {"count": 0, "total_ws_mb": 0.0, "processes": []}

def make_request(num_sections=1):
    sub_defs = [
        ("s-daa", "22CSSPCDAA", "Design & Analysis of Algorithms", 4),
        ("s-dbms", "22CSPC204", "Database Management Systems", 4),
        ("s-cn", "22CSPC205", "Computer Networks", 3),
        ("s-os", "22CSPC206", "Operating Systems", 3),
        ("s-toc", "22CSPC207", "Theory of Computation", 3),
        ("s-se", "22CSPE208", "Software Engineering", 3),
    ]

    subjects = [{"id": s[0], "code": s[1], "name": s[2], "weekly_hours": s[3]} for s in sub_defs]
    faculty = [
        {"id": "f-1", "name": "Dr. Ramanathan", "subject_ids": ["s-daa"], "max_weekly_hours": 18},
        {"id": "f-2", "name": "Prof. Sneha", "subject_ids": ["s-dbms"], "max_weekly_hours": 18},
        {"id": "f-3", "name": "Dr. Rajeshwari", "subject_ids": ["s-cn"], "max_weekly_hours": 18},
        {"id": "f-4", "name": "Prof. Vikram", "subject_ids": ["s-os"], "max_weekly_hours": 18},
        {"id": "f-5", "name": "Dr. Rao", "subject_ids": ["s-toc"], "max_weekly_hours": 18},
        {"id": "f-6", "name": "Prof. Divya", "subject_ids": ["s-se"], "max_weekly_hours": 18},
    ]

    sections = []
    for i in range(num_sections):
        char = chr(65 + i)
        sections.append({
            "id": f"sec-{char.lower()}",
            "label": f"CSE-{char}",
            "student_count": 60,
            "subject_ids": [s[0] for s in sub_defs]
        })

    rooms = [
        {"id": f"r-{i}", "code": f"CR-40{i}", "name": f"Classroom 40{i}", "capacity": 70, "room_type": "CLASSROOM"}
        for i in range(1, max(num_sections + 2, 5))
    ]

    return {
        "sections": sections,
        "subjects": subjects,
        "faculty": faculty,
        "rooms": rooms,
        "constraints": {
            "max_daily_hours": 6,
            "allow_saturday": False
        }
    }

def run_test():
    print("=" * 60)
    print("   BMSCE TIMETABLE OPTIMIZER LIVE BENCHMARK")
    print("=" * 60)

    pre_metrics = get_process_metrics()
    print(f"[*] Baseline Python Process Working Set: {pre_metrics['total_ws_mb']} MB across {pre_metrics['count']} process(es)")

    scenarios = [
        ("Scenario 1: Single Section (CSE-B, 20 hrs)", 1),
        ("Scenario 2: Dual Section (CSE-A & CSE-B, 40 hrs)", 2),
    ]

    for label, n_sec in scenarios:
        print(f"\n---> Executing {label}...")
        payload = make_request(n_sec)
        req_data = json.dumps(payload).encode('utf-8')
        
        t0 = time.time()
        req = urllib.request.Request(
            "http://localhost:8000/optimize",
            data=req_data,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                elapsed = time.time() - t0
                body = json.loads(resp.read().decode('utf-8'))
                
                post_metrics = get_process_metrics()
                print(f"     Status: HTTP {resp.status} in {elapsed:.2f}s (Engine reported: {body.get('elapsed_seconds')}s)")
                print(f"     Candidates Generated: {len(body.get('candidates', []))}")
                print(f"     Feasible: {body.get('feasible')}")
                
                for idx, c in enumerate(body.get('candidates', [])):
                    print(f"       • Candidate {idx} [{c.get('label')}]: status={c.get('solver_status')}, hard_violations={c.get('hard_violations')}, score={c.get('objective_score')}")

                print(f"     Process Working Set After Run: {post_metrics['total_ws_mb']} MB (Delta: +{round(post_metrics['total_ws_mb'] - pre_metrics['total_ws_mb'], 2)} MB)")

        except Exception as e:
            print(f"     FAILED: {e}")

    print("\n" + "=" * 60)
    print("   BENCHMARK COMPLETED SUCCESSFULLY")
    print("=" * 60)

if __name__ == '__main__':
    run_test()

