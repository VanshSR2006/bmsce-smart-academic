"""
OR-Tools CP-SAT Timetable Solver — BMSCE Smart Academic
Constraint-satisfaction solver with hard and soft constraint handling.

Hard constraints:
  HC-1: Faculty non-overlap (faculty teaches at most one class per slot)
  HC-2: Room non-overlap (room used by at most one class per slot)
  HC-3: Section non-overlap (section has at most one class per slot)
  HC-4: Coverage (each section must have required_hours slots for each subject)
  HC-5: Faculty load cap (weekly hours <= max_weekly_hours)
  HC-6: Lab contiguity (lab blocks must be consecutive within a single day)
  HC-7: Faculty availability (faculty cannot be assigned to unavailable_slots)

Soft constraints (objective penalties):
  SC-1: Avoid labs in first period (weight 5)
  SC-2: Respect daily faculty load cap (weight 8)
  SC-3: Avoid consecutive same subject for a section, excluding labs (weight 6)
  SC-4: Balance weekly teaching load across active eligible faculty (weight 3)
"""
import time
import uuid
import logging
from collections import defaultdict
from typing import Dict, List, Set, Tuple
from ortools.sat.python import cp_model
from .models import (
    OptimizeRequest, TimetableCandidate, AssignedSlot, ConstraintViolation
)
from .metrics import (
    WEIGHT_SC1_LAB_FIRST_PERIOD,
    WEIGHT_SC2_DAILY_OVERLOAD,
    WEIGHT_SC3_CONSECUTIVE_SUBJECT,
    WEIGHT_SC4_LOAD_IMBALANCE,
    compute_schedule_quality_metrics,
)

logger = logging.getLogger(__name__)


def run_cpsat(
    req: OptimizeRequest,
    time_limit_seconds: int = 25,
    relax_soft: bool = False,
) -> TimetableCandidate:
    """
    CP-SAT timetable optimizer with monotonic stage profiling and O(1) variable indexing.
    """
    t_total_start = time.monotonic()
    t_prep_start = t_total_start

    model = cp_model.CpModel()
    days = req.days
    n_days = len(days)
    periods = list(range(req.periods_per_day))  # 0-indexed internally
    day_to_idx = {d.strip().upper(): i for i, d in enumerate(days)}

    # Lookup maps
    subject_map = {s.id: s for s in req.subjects}
    faculty_map = {f.id: f for f in req.faculty}
    room_map = {r.id: r for r in req.rooms}
    section_map = {s.id: s for s in req.sections}

    # Build faculty-to-subject index
    subject_faculty: Dict[str, List[str]] = {s.id: [] for s in req.subjects}
    for fac in req.faculty:
        for sid in fac.subject_ids:
            if sid in subject_faculty:
                subject_faculty[sid].append(fac.id)

    # Parse HC-7 faculty unavailable slots once during preprocessing
    faculty_unavail_idx: Dict[str, Set[Tuple[int, int]]] = {f.id: set() for f in req.faculty}
    faculty_unavail_set: Dict[str, Set[Tuple[str, int]]] = {f.id: set() for f in req.faculty}
    for fac in req.faculty:
        for slot_str in fac.unavailable_slots:
            if "-" not in slot_str:
                continue
            day_part, period_part = slot_str.split("-", 1)
            day_key = day_part.strip().upper()
            di = day_to_idx.get(day_key)
            if di is None:
                continue
            try:
                pi = int(period_part.strip()) - 1
            except ValueError:
                continue
            if 0 <= pi < req.periods_per_day:
                faculty_unavail_idx[fac.id].add((di, pi))
                faculty_unavail_set[fac.id].add((day_key, pi + 1))

    t_prep_end = time.monotonic()
    t_build_start = t_prep_end

    # ── Decision Variables & O(1) Buckets ────────────────────────────────────
    x: Dict[Tuple, cp_model.IntVar] = {}
    by_sec_day_period: Dict[Tuple[str, int, int], List[cp_model.IntVar]] = defaultdict(list)
    by_fac_day_period: Dict[Tuple[str, int, int], List[cp_model.IntVar]] = defaultdict(list)
    by_room_day_period: Dict[Tuple[str, int, int], List[cp_model.IntVar]] = defaultdict(list)
    by_sec_subj: Dict[Tuple[str, str], List[cp_model.IntVar]] = defaultdict(list)
    by_fac: Dict[str, List[cp_model.IntVar]] = defaultdict(list)
    by_fac_day: Dict[Tuple[str, int], List[cp_model.IntVar]] = defaultdict(list)
    by_sec_subj_day_period: Dict[Tuple[str, str, int, int], List[cp_model.IntVar]] = defaultdict(list)

    # Cache eligible rooms per (section.id, subj_id)
    eligible_rooms_cache: Dict[Tuple[str, str], List[str]] = {}
    for section in req.sections:
        for subj_id in section.subject_ids:
            subj = subject_map.get(subj_id)
            if not subj:
                continue
            eligible_rooms = [
                r.id for r in req.rooms
                if r.capacity >= section.student_count and r.is_lab == subj.is_lab
            ]
            if not eligible_rooms:
                eligible_rooms = [r.id for r in req.rooms if r.capacity >= section.student_count]
            eligible_rooms_cache[(section.id, subj_id)] = eligible_rooms

            for fac_id in subject_faculty.get(subj_id, []):
                unavail_slots = faculty_unavail_idx[fac_id]
                for room_id in eligible_rooms:
                    for di in range(n_days):
                        for pi in periods:
                            # HC-7: omit variables for faculty unavailable slots
                            if (di, pi) in unavail_slots:
                                continue
                            key = (section.id, subj_id, fac_id, room_id, di, pi)
                            var = model.NewBoolVar(
                                f"x_{section.id}_{subj_id}_{fac_id}_{room_id}_{di}_{pi}"
                            )
                            x[key] = var
                            by_sec_day_period[(section.id, di, pi)].append(var)
                            by_fac_day_period[(fac_id, di, pi)].append(var)
                            by_room_day_period[(room_id, di, pi)].append(var)
                            by_sec_subj[(section.id, subj_id)].append(var)
                            by_fac[fac_id].append(var)
                            by_fac_day[(fac_id, di)].append(var)
                            by_sec_subj_day_period[(section.id, subj_id, di, pi)].append(var)

    logger.info(f"CP-SAT: {len(x)} decision variables created")

    # ── HC-3: Section non-overlap ────────────────────────────────────────────
    for slot_vars in by_sec_day_period.values():
        if len(slot_vars) > 1:
            model.AddAtMostOne(slot_vars)

    # ── HC-1: Faculty non-overlap ────────────────────────────────────────────
    for slot_vars in by_fac_day_period.values():
        if len(slot_vars) > 1:
            model.AddAtMostOne(slot_vars)

    # ── HC-2: Room non-overlap ───────────────────────────────────────────────
    for slot_vars in by_room_day_period.values():
        if len(slot_vars) > 1:
            model.AddAtMostOne(slot_vars)

    # ── HC-4: Coverage (required hours per section-subject) ──────────────────
    for section in req.sections:
        for subj_id in section.subject_ids:
            subj = subject_map.get(subj_id)
            if not subj:
                continue
            all_vars = by_sec_subj.get((section.id, subj_id), [])
            if all_vars:
                model.Add(sum(all_vars) == subj.weekly_hours)
            else:
                # Impossible coverage (no eligible faculty/room/slots) -> force INFEASIBLE
                model.Add(0 == subj.weekly_hours)

    # ── HC-5: Faculty load cap ───────────────────────────────────────────────
    for fac in req.faculty:
        all_vars = by_fac.get(fac.id, [])
        if all_vars:
            model.Add(sum(all_vars) <= fac.max_weekly_hours)

    # ── HC-6: Lab contiguity ─────────────────────────────────────────────────
    for section in req.sections:
        for subj_id in section.subject_ids:
            subj = subject_map.get(subj_id)
            if not subj or not subj.is_lab:
                continue
            block = max(1, subj.lab_duration_hours)
            if block <= 1:
                continue

            eligible_fac = subject_faculty.get(subj_id, [])
            eligible_rooms = eligible_rooms_cache.get((section.id, subj_id), [])
            max_start = req.periods_per_day - block + 1

            for fac_id in eligible_fac:
                unavail_slots = faculty_unavail_idx[fac_id]
                for room_id in eligible_rooms:
                    for di in range(n_days):
                        starts: Dict[int, cp_model.IntVar] = {}
                        for ps in range(max(0, max_start)):
                            # Only create block start if no period in block is unavailable
                            if all((di, ps + j) not in unavail_slots for j in range(block)):
                                starts[ps] = model.NewBoolVar(
                                    f"lab_start_{section.id}_{subj_id}_{fac_id}_{room_id}_{di}_{ps}"
                                )
                        for pi in periods:
                            x_var = x.get((section.id, subj_id, fac_id, room_id, di, pi))
                            if x_var is None:
                                continue
                            covering = [
                                starts[ps]
                                for ps in range(max(0, pi - block + 1), min(pi + 1, max(0, max_start)))
                                if ps in starts
                            ]
                            if covering:
                                model.Add(x_var == sum(covering))
                            else:
                                model.Add(x_var == 0)

    # ── Soft Constraints ─────────────────────────────────────────────────────
    soft_penalties = []

    if not relax_soft:
        # SC-1: Avoid labs in period 0 (first period)
        if req.constraints.avoid_first_period_labs:
            for section in req.sections:
                for subj_id in section.subject_ids:
                    subj = subject_map.get(subj_id)
                    if not subj or not subj.is_lab:
                        continue
                    for di in range(n_days):
                        for v in by_sec_subj_day_period.get((section.id, subj_id, di, 0), []):
                            soft_penalties.append((v, WEIGHT_SC1_LAB_FIRST_PERIOD))

        # SC-2: Faculty daily load — penalize > max_daily_faculty_hours in a day
        max_daily = req.constraints.max_daily_faculty_hours
        for fac in req.faculty:
            for di in range(n_days):
                day_vars = by_fac_day.get((fac.id, di), [])
                if len(day_vars) > max_daily:
                    overload = model.NewIntVar(0, req.periods_per_day, f"overload_{fac.id}_{di}")
                    model.Add(overload >= sum(day_vars) - max_daily)
                    soft_penalties.append((overload, WEIGHT_SC2_DAILY_OVERLOAD))

        # SC-3: Consecutive same-subject penalty for theory subjects (excludes labs)
        if req.constraints.avoid_consecutive_same_subject and req.periods_per_day > 1:
            for section in req.sections:
                for subj_id in section.subject_ids:
                    subj = subject_map.get(subj_id)
                    if not subj or subj.is_lab:
                        continue
                    for di in range(n_days):
                        for pi in range(req.periods_per_day - 1):
                            vars_curr = by_sec_subj_day_period.get((section.id, subj_id, di, pi), [])
                            vars_next = by_sec_subj_day_period.get((section.id, subj_id, di, pi + 1), [])
                            if vars_curr and vars_next:
                                consec = model.NewBoolVar(
                                    f"sc3_consec_{section.id}_{subj_id}_{di}_{pi}"
                                )
                                model.Add(consec >= sum(vars_curr) + sum(vars_next) - 1)
                                soft_penalties.append((consec, WEIGHT_SC3_CONSECUTIVE_SUBJECT))

        # SC-4: Faculty workload balancing (minimize max - min weekly periods across active faculty)
        if req.constraints.balance_faculty_load:
            active_load_vars = []
            max_cap = 0
            for fac in req.faculty:
                fac_vars = by_fac.get(fac.id, [])
                if fac_vars:
                    max_cap = max(max_cap, fac.max_weekly_hours)
                    load_var = model.NewIntVar(0, fac.max_weekly_hours, f"sc4_load_{fac.id}")
                    model.Add(load_var == sum(fac_vars))
                    active_load_vars.append(load_var)
            if len(active_load_vars) >= 2 and max_cap > 0:
                max_load = model.NewIntVar(0, max_cap, "sc4_max_load")
                min_load = model.NewIntVar(0, max_cap, "sc4_min_load")
                load_spread = model.NewIntVar(0, max_cap, "sc4_load_spread")
                model.AddMaxEquality(max_load, active_load_vars)
                model.AddMinEquality(min_load, active_load_vars)
                model.Add(load_spread == max_load - min_load)
                soft_penalties.append((load_spread, WEIGHT_SC4_LOAD_IMBALANCE))

    # ── Objective: minimize weighted soft penalties ──────────────────────────
    if soft_penalties:
        total_penalty = model.NewIntVar(0, 1_000_000, "total_penalty")
        model.Add(total_penalty == sum(w * v for v, w in soft_penalties))
        model.Minimize(total_penalty)
    else:
        model.Minimize(0)

    num_constraints = len(model.Proto().constraints)
    t_build_end = time.monotonic()

    # ── Solve ────────────────────────────────────────────────────────────────
    t_search_start = time.monotonic()
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_search_workers = 4
    solver.parameters.log_search_progress = False

    status = solver.Solve(model)
    t_search_end = time.monotonic()

    status_map = {
        cp_model.OPTIMAL: "OPTIMAL",
        cp_model.FEASIBLE: "FEASIBLE",
        cp_model.INFEASIBLE: "INFEASIBLE",
        cp_model.UNKNOWN: "TIMEOUT",
        cp_model.MODEL_INVALID: "MODEL_INVALID",
    }
    solver_status = status_map.get(status, "UNKNOWN")

    # ── Extract Solution ─────────────────────────────────────────────────────
    t_extract_start = time.monotonic()
    assigned: List[AssignedSlot] = []
    violations: List[ConstraintViolation] = []

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for key, var in x.items():
            if solver.Value(var) == 1:
                sec_id, subj_id, fac_id, room_id, di, pi = key
                subj = subject_map[subj_id]
                assigned.append(AssignedSlot(
                    section_id=sec_id,
                    section_label=section_map[sec_id].label,
                    subject_id=subj_id,
                    subject_code=subj.code,
                    subject_name=subj.name,
                    faculty_id=fac_id,
                    faculty_name=faculty_map[fac_id].name,
                    room_id=room_id,
                    room_name=room_map[room_id].name,
                    day=days[di],
                    period=pi + 1,
                    is_lab=subj.is_lab,
                ))
    t_extract_end = time.monotonic()

    # ── Independent Validation & Metrics ─────────────────────────────────────
    t_val_start = time.monotonic()
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for sl in assigned:
            if (sl.day.strip().upper(), sl.period) in faculty_unavail_set.get(sl.faculty_id, set()):
                violations.append(ConstraintViolation(
                    constraint="FACULTY_UNAVAILABLE",
                    severity="HARD",
                    description=f"{sl.faculty_name} assigned to unavailable slot {sl.day}-{sl.period}",
                    affected_entities=[sl.faculty_name, sl.section_label, sl.subject_code],
                ))

        for section in req.sections:
            for subj_id in section.subject_ids:
                subj = subject_map.get(subj_id)
                if not subj:
                    continue
                count = sum(
                    1 for s in assigned
                    if s.section_id == section.id and s.subject_id == subj_id
                )
                if count != subj.weekly_hours:
                    violations.append(ConstraintViolation(
                        constraint="COVERAGE_INCOMPLETE",
                        severity="HARD",
                        description=f"{section.label}: {subj.code} has {count}/{subj.weekly_hours} slots",
                        affected_entities=[section.label, subj.code],
                    ))
                if subj.is_lab and subj.lab_duration_hours > 1:
                    block = subj.lab_duration_hours
                    lab_slots = [
                        s for s in assigned
                        if s.section_id == section.id and s.subject_id == subj_id
                    ]
                    by_day: Dict[str, List[AssignedSlot]] = {}
                    for sl in lab_slots:
                        by_day.setdefault(sl.day, []).append(sl)
                    for day_key, day_slots in by_day.items():
                        day_slots.sort(key=lambda s: s.period)
                        if len(day_slots) % block != 0:
                            violations.append(ConstraintViolation(
                                constraint="LAB_CONTIGUITY_VIOLATION",
                                severity="HARD",
                                description=f"{section.label}: {subj.code} on {day_key} has {len(day_slots)} periods (not multiple of {block})",
                                affected_entities=[section.label, subj.code],
                            ))
                            continue
                        for idx in range(0, len(day_slots), block):
                            grp = day_slots[idx:idx + block]
                            periods_seq = [g.period for g in grp]
                            expected_seq = list(range(periods_seq[0], periods_seq[0] + block))
                            same_fac = len({g.faculty_id for g in grp}) == 1
                            same_room = len({g.room_id for g in grp}) == 1
                            if periods_seq != expected_seq or not same_fac or not same_room:
                                violations.append(ConstraintViolation(
                                    constraint="LAB_CONTIGUITY_VIOLATION",
                                    severity="HARD",
                                    description=f"{section.label}: {subj.code} on {day_key} is not a contiguous {block}-period block with uniform faculty/room",
                                    affected_entities=[section.label, subj.code],
                                ))
    elif status == cp_model.UNKNOWN:
        violations.append(ConstraintViolation(
            constraint="SOLVER_TIMEOUT",
            severity="HARD",
            description=f"CP-SAT reached {time_limit_seconds}s time limit without finding a feasible incumbent.",
            affected_entities=[],
        ))
    elif status == cp_model.MODEL_INVALID:
        violations.append(ConstraintViolation(
            constraint="MODEL_INVALID",
            severity="HARD",
            description=f"CP-SAT model validation failed: {model.Validate()}",
            affected_entities=[],
        ))
    else:
        violations.append(ConstraintViolation(
            constraint="SOLVER_INFEASIBLE",
            severity="HARD",
            description=f"CP-SAT solver returned {solver_status}. Problem is over-constrained.",
            affected_entities=[],
        ))

    quality_metrics = (
        compute_schedule_quality_metrics(req, assigned)
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        else {}
    )
    t_val_end = time.monotonic()

    hard_violations = sum(1 for v in violations if v.severity == "HARD")
    soft_violations = sum(1 for v in violations if v.severity == "SOFT")
    obj_score = solver.ObjectiveValue() if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else 9999.0
    try:
        solver_wall_time = round(solver.WallTime(), 3)
    except RuntimeError:
        solver_wall_time = round(t_search_end - t_search_start, 3)

    logger.info(
        f"CP-SAT status={solver_status}, obj={obj_score:.1f}, "
        f"build={t_build_end - t_build_start:.3f}s, search={t_search_end - t_search_start:.3f}s, "
        f"total={t_val_end - t_total_start:.3f}s"
    )

    return TimetableCandidate(
        id=str(uuid.uuid4()),
        label="CP-SAT Optimized" if not relax_soft else "CP-SAT Relaxed",
        solver="CP-SAT",
        solver_status=solver_status,
        objective_score=round(obj_score, 2),
        hard_violations=hard_violations,
        soft_violations=soft_violations,
        slots=assigned,
        violations=violations,
        metrics={
            "total_slots_assigned": len(assigned),
            "solver_wall_time_s": solver_wall_time,
            "preprocess_time_s": round(t_prep_end - t_prep_start, 4),
            "model_build_time_s": round(t_build_end - t_build_start, 4),
            "search_time_s": round(t_search_end - t_search_start, 4),
            "extraction_time_s": round(t_extract_end - t_extract_start, 4),
            "validation_metrics_time_s": round(t_val_end - t_val_start, 4),
            "total_time_s": round(t_val_end - t_total_start, 4),
            "num_variables": len(x),
            "num_constraints": num_constraints,
            "objective_value": round(obj_score, 2),
            "relax_soft": relax_soft,
            **quality_metrics,
        },
    )
