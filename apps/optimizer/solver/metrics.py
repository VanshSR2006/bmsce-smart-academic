"""
Independent Schedule-Quality Metrics Calculator (TASK-403)
Computes schedule quality directly from extracted TimetableCandidate slots
without relying on internal solver objective values.
"""
import math
from typing import Dict, List
from .models import OptimizeRequest, AssignedSlot


WEIGHT_SC1_LAB_FIRST_PERIOD = 5
WEIGHT_SC2_DAILY_OVERLOAD = 8
WEIGHT_SC3_CONSECUTIVE_SUBJECT = 6
WEIGHT_SC4_LOAD_IMBALANCE = 3


def compute_schedule_quality_metrics(
    req: OptimizeRequest,
    slots: List[AssignedSlot],
) -> Dict:
    """Independently compute SC-1..SC-4 and workload distribution metrics from slots."""
    offered_subjects = {sid for sec in req.sections for sid in sec.subject_ids}
    active_faculty = [
        f for f in req.faculty if any(sid in offered_subjects for sid in f.subject_ids)
    ]

    # 1. SC-1: Labs starting in period 1
    sc1_lab_first_period = 0
    seen_lab_starts = set()
    for s in slots:
        if s.is_lab and s.period == 1:
            key = (s.section_id, s.subject_id, s.day)
            if key not in seen_lab_starts:
                seen_lab_starts.add(key)
                sc1_lab_first_period += 1

    # 2. SC-2: Faculty daily overload beyond max_daily_faculty_hours
    max_daily = req.constraints.max_daily_faculty_hours
    fac_day_counts: Dict[tuple, int] = {}
    for s in slots:
        k = (s.faculty_id, s.day)
        fac_day_counts[k] = fac_day_counts.get(k, 0) + 1
    sc2_daily_overload = sum(max(0, cnt - max_daily) for cnt in fac_day_counts.values())

    # 3. SC-3: Adjacent same-subject periods for the same section (excluding labs)
    sec_day_slots: Dict[tuple, Dict[int, AssignedSlot]] = {}
    for s in slots:
        sec_day_slots.setdefault((s.section_id, s.day), {})[s.period] = s

    sc3_consecutive_pairs = 0
    for (_, _), p_map in sec_day_slots.items():
        for p in sorted(p_map.keys()):
            curr_s = p_map[p]
            next_s = p_map.get(p + 1)
            if (
                next_s is not None
                and not curr_s.is_lab
                and not next_s.is_lab
                and curr_s.subject_id == next_s.subject_id
            ):
                sc3_consecutive_pairs += 1

    # 4. SC-4: Faculty weekly teaching-period distribution (active faculty only)
    fac_loads: Dict[str, int] = {f.id: 0 for f in active_faculty}
    for s in slots:
        if s.faculty_id in fac_loads:
            fac_loads[s.faculty_id] += 1

    distribution = {f.name: fac_loads[f.id] for f in active_faculty}
    load_values = list(fac_loads.values())
    if load_values:
        mean_load = sum(load_values) / len(load_values)
        variance = sum((v - mean_load) ** 2 for v in load_values) / len(load_values)
        std_dev = round(math.sqrt(variance), 3)
        workload_range = max(load_values) - min(load_values)
    else:
        std_dev = 0.0
        workload_range = 0

    independent_soft_score = (
        WEIGHT_SC1_LAB_FIRST_PERIOD * sc1_lab_first_period
        + WEIGHT_SC2_DAILY_OVERLOAD * sc2_daily_overload
        + WEIGHT_SC3_CONSECUTIVE_SUBJECT * sc3_consecutive_pairs
        + WEIGHT_SC4_LOAD_IMBALANCE * workload_range
    )

    return {
        "sc1_lab_first_period": sc1_lab_first_period,
        "sc2_daily_overload_periods": sc2_daily_overload,
        "sc3_consecutive_same_subject_pairs": sc3_consecutive_pairs,
        "faculty_weekly_distribution": distribution,
        "sc4_workload_range": workload_range,
        "sc4_workload_std_dev": std_dev,
        "independent_soft_score": float(independent_soft_score),
    }
