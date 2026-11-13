"""
Pydantic models for the BMSCE Timetable Optimizer API.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# ─── Input Models ────────────────────────────────────────────────────────────

class SubjectInput(BaseModel):
    id: str
    code: str
    name: str
    weekly_hours: int = Field(ge=1, le=10)
    is_lab: bool = False
    lab_duration_hours: int = 2  # Contiguous hours for lab


class FacultyInput(BaseModel):
    id: str
    name: str
    subject_ids: List[str]  # Subjects this faculty can teach
    max_weekly_hours: int = 18
    unavailable_slots: List[str] = []  # e.g. ["MON-1", "FRI-7"]


class RoomInput(BaseModel):
    id: str
    name: str
    capacity: int
    is_lab: bool = False


class SectionInput(BaseModel):
    id: str
    label: str  # e.g. "CSE-B"
    student_count: int
    subject_ids: List[str]  # Subjects this section studies


class ConstraintConfig(BaseModel):
    # Hard constraints (always enforced)
    enforce_faculty_non_overlap: bool = True
    enforce_room_non_overlap: bool = True
    enforce_section_non_overlap: bool = True
    enforce_lab_contiguity: bool = True

    # Soft constraints (minimized in objective)
    max_daily_faculty_hours: int = 4
    avoid_first_period_labs: bool = True
    balance_faculty_load: bool = True
    avoid_consecutive_same_subject: bool = True

    # Solver config
    time_limit_seconds: int = 30


class OptimizeRequest(BaseModel):
    sections: List[SectionInput]
    subjects: List[SubjectInput]
    faculty: List[FacultyInput]
    rooms: List[RoomInput]
    constraints: ConstraintConfig = ConstraintConfig()
    # Working days and periods
    days: List[str] = ["MON", "TUE", "WED", "THU", "FRI"]
    periods_per_day: int = 7


# ─── Output Models ───────────────────────────────────────────────────────────

class AssignedSlot(BaseModel):
    section_id: str
    section_label: str
    subject_id: str
    subject_code: str
    subject_name: str
    faculty_id: str
    faculty_name: str
    room_id: str
    room_name: str
    day: str
    period: int  # 1-indexed
    is_lab: bool = False


class ConstraintViolation(BaseModel):
    constraint: str
    severity: str  # "HARD" | "SOFT"
    description: str
    affected_entities: List[str] = []


class TimetableCandidate(BaseModel):
    id: str
    label: str
    solver: str  # "GREEDY" | "CP-SAT"
    solver_status: str  # "FEASIBLE" | "OPTIMAL" | "INFEASIBLE" | "TIMEOUT"
    objective_score: float  # Lower is better (penalty sum)
    hard_violations: int
    soft_violations: int
    slots: List[AssignedSlot]
    violations: List[ConstraintViolation] = []
    metrics: Dict[str, Any] = {}


class OptimizeResponse(BaseModel):
    candidates: List[TimetableCandidate]
    elapsed_seconds: float
    feasible: bool


class HealthResponse(BaseModel):
    status: str
    solver: str
    mode: str

