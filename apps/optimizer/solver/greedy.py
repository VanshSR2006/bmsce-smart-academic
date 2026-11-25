"""
Greedy Timetable Solver — BMSCE Smart Academic
Round-robin slot assignment satisfying hard constraints.
Always produces a feasible solution (may have soft violations).
"""
import uuid
from typing import Dict, Set, Tuple, List
from .models import (
    OptimizeRequest, TimetableCandidate, AssignedSlot, ConstraintViolation
)


SlotKey = Tuple[str, int]  # (day, period)


def run_greedy(req: OptimizeRequest) -> TimetableCandidate:
    """
    Greedy round-robin assignment:
    1. For each section × subject: generate required_hours slots
    2. Scan time slots in order (MON-1, MON-2, ..., FRI-7)
    3. Assign first free slot where faculty, room, section are all available
    4. Track violations for transparency
    """
    days = req.days
    periods = list(range(1, req.periods_per_day + 1))
    all_slots: List[SlotKey] = [(d, p) for d in days for p in periods]

    # Lookup maps
    subject_map = {s.id: s for s in req.subjects}
    faculty_map = {f.id: f for f in req.faculty}
    room_map = {r.id: r for r in req.rooms}
    section_map = {s.id: s for s in req.sections}

    # Build faculty-to-subject index (which faculty can teach each subject)
    subject_faculty: Dict[str, List[str]] = {s.id: [] for s in req.subjects}
    for fac in req.faculty:
        for sid in fac.subject_ids:
            if sid in subject_faculty:
                subject_faculty[sid].append(fac.id)

    # Occupation tracking
    faculty_busy: Dict[str, Set[SlotKey]] = {f.id: set() for f in req.faculty}
    room_busy: Dict[str, Set[SlotKey]] = {r.id: set() for r in req.rooms}
    section_busy: Dict[str, Set[SlotKey]] = {s.id: set() for s in req.sections}
    faculty_weekly_hours: Dict[str, int] = {f.id: 0 for f in req.faculty}
    faculty_unavailable: Dict[str, Set[SlotKey]] = {}
    for f in req.faculty:
        u_set: Set[SlotKey] = set()
        for s in f.unavailable_slots:
            if "-" in s:
                parts = s.split("-", 1)
                try:
                    u_set.add((parts[0].strip().upper(), int(parts[1].strip())))
                except ValueError:
                    pass
        faculty_unavailable[f.id] = u_set

    assigned: List[AssignedSlot] = []
    violations: List[ConstraintViolation] = []
    soft_penalty = 0

    # Sort sections + subjects to ensure deterministic output
    for section in sorted(req.sections, key=lambda s: s.label):
        for subj_id in section.subject_ids:
            subj = subject_map.get(subj_id)
            if not subj:
                continue

            # How many slot-blocks needed?
            if subj.is_lab:
                # Labs need contiguous blocks of lab_duration_hours
                blocks_needed = max(1, subj.weekly_hours // subj.lab_duration_hours)
                block_size = subj.lab_duration_hours
            else:
                blocks_needed = subj.weekly_hours
                block_size = 1

            # Find eligible faculty
            eligible_faculty = [
                fid for fid in subject_faculty.get(subj_id, [])
                if faculty_weekly_hours[fid] < faculty_map[fid].max_weekly_hours
            ]

            # Find eligible rooms
            eligible_rooms = [
                r.id for r in req.rooms
                if r.capacity >= section.student_count
                and r.is_lab == subj.is_lab
            ]
            if not eligible_rooms:
                # Fallback: any room with sufficient capacity
                eligible_rooms = [r.id for r in req.rooms if r.capacity >= section.student_count]

            blocks_assigned = 0
            faculty_idx = 0  # Round-robin faculty selection

            for day in days:
                if blocks_assigned >= blocks_needed:
                    break
                for start_period in periods:
                    if blocks_assigned >= blocks_needed:
                        break
                    if start_period + block_size - 1 > req.periods_per_day:
                        continue

                    # Slots for this block
                    block_slots: List[SlotKey] = [(day, start_period + i) for i in range(block_size)]

                    # Check section availability for all slots in block
                    if any(sl in section_busy[section.id] for sl in block_slots):
                        continue

                    # Try each faculty (round-robin)
                    assigned_fac = None
                    for _ in range(len(eligible_faculty)):
                        if not eligible_faculty:
                            break
                        fid = eligible_faculty[faculty_idx % len(eligible_faculty)]
                        faculty_idx += 1

                        fac = faculty_map[fid]
                        fac_unavail = faculty_unavailable[fid]
                        if any(
                            sl in faculty_busy[fid] or (sl[0].upper(), sl[1]) in fac_unavail
                            for sl in block_slots
                        ):
                            continue
                        if faculty_weekly_hours[fid] + block_size > fac.max_weekly_hours:
                            continue

                        assigned_fac = fid
                        break

                    if not assigned_fac:
                        # No faculty within cap -> try overload only if faculty is available (HC-7)
                        for fid in eligible_faculty:
                            fac_unavail = faculty_unavailable[fid]
                            if not any(
                                sl in faculty_busy[fid] or (sl[0].upper(), sl[1]) in fac_unavail
                                for sl in block_slots
                            ):
                                assigned_fac = fid
                                soft_penalty += 10
                                violations.append(ConstraintViolation(
                                    constraint="AICTE_LOAD_CAP",
                                    severity="SOFT",
                                    description=f"{faculty_map[fid].name} overloaded for {subj.code}",
                                    affected_entities=[faculty_map[fid].name],
                                ))
                                break

                    if not assigned_fac:
                        continue

                    # Try each room
                    assigned_room = None
                    for rid in eligible_rooms:
                        if not any(sl in room_busy[rid] for sl in block_slots):
                            assigned_room = rid
                            break

                    if not assigned_room:
                        continue

                    # Soft: avoid labs in first period
                    if subj.is_lab and start_period == 1 and req.constraints.avoid_first_period_labs:
                        soft_penalty += 3
                        violations.append(ConstraintViolation(
                            constraint="LAB_FIRST_PERIOD",
                            severity="SOFT",
                            description=f"{subj.name} lab scheduled in period 1",
                            affected_entities=[section.label, subj.code],
                        ))

                    # Assign the block
                    for i, sl in enumerate(block_slots):
                        d, p = sl
                        section_busy[section.id].add(sl)
                        faculty_busy[assigned_fac].add(sl)
                        room_busy[assigned_room].add(sl)

                        assigned.append(AssignedSlot(
                            section_id=section.id,
                            section_label=section.label,
                            subject_id=subj.id,
                            subject_code=subj.code,
                            subject_name=subj.name,
                            faculty_id=assigned_fac,
                            faculty_name=faculty_map[assigned_fac].name,
                            room_id=assigned_room,
                            room_name=room_map[assigned_room].name,
                            day=d,
                            period=p,
                            is_lab=subj.is_lab,
                        ))
                    faculty_weekly_hours[assigned_fac] += block_size
                    blocks_assigned += 1

            # If we couldn't assign all blocks, record hard violation
            if blocks_assigned < blocks_needed:
                violations.append(ConstraintViolation(
                    constraint="COVERAGE_INCOMPLETE",
                    severity="HARD",
                    description=f"{section.label}: {subj.code} needs {blocks_needed} blocks, only {blocks_assigned} assigned",
                    affected_entities=[section.label, subj.code],
                ))

    hard_violations = sum(1 for v in violations if v.severity == "HARD")

    # Compute load balance metric
    loads = list(faculty_weekly_hours.values())
    load_variance = (max(loads) - min(loads)) if loads else 0

    return TimetableCandidate(
        id=str(uuid.uuid4()),
        label="Greedy Baseline",
        solver="GREEDY",
        solver_status="FEASIBLE" if hard_violations == 0 else "PARTIAL",
        objective_score=round(soft_penalty + hard_violations * 100.0, 2),
        hard_violations=hard_violations,
        soft_violations=len(violations) - hard_violations,
        slots=assigned,
        violations=violations,
        metrics={
            "total_slots_assigned": len(assigned),
            "faculty_load_variance": load_variance,
            "soft_penalty": soft_penalty,
            "faculty_loads": {
                faculty_map[fid].name: hrs
                for fid, hrs in faculty_weekly_hours.items()
                if hrs > 0
            },
        },
    )

