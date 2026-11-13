-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "institutional_email" TEXT,
    "display_name" TEXT NOT NULL,
    "auth_provider" TEXT NOT NULL DEFAULT 'DEMO',
    "provider_subject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_demo" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "department_id" TEXT,
    "cluster_id" TEXT,
    "section_id" TEXT,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "demo_identifier" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "employee_code" TEXT,
    "designation" TEXT,
    "cabin_location" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clusters" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_terms" (
    "id" TEXT NOT NULL,
    "academic_year_label" TEXT NOT NULL,
    "term_label" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_demo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "degree_level" TEXT,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "cluster_id" TEXT,
    "program_id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "section_code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "student_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "batch_code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "student_count" INTEGER NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "subject_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "default_duration_periods" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_offerings" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "required_periods_per_week" DOUBLE PRECISION NOT NULL,
    "session_duration_periods" INTEGER NOT NULL,
    "expected_student_count" INTEGER NOT NULL,
    "requires_lab" BOOLEAN NOT NULL DEFAULT false,
    "requires_contiguous_slots" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "subject_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_assignments" (
    "id" TEXT NOT NULL,
    "subject_offering_id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "assignment_type" TEXT NOT NULL DEFAULT 'PRIMARY',
    "max_periods_per_week" DOUBLE PRECISION,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "faculty_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_calendar_events" (
    "id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_instructional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "academic_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bell_schedules" (
    "id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "is_default" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bell_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_periods" (
    "id" TEXT NOT NULL,
    "bell_schedule_id" TEXT NOT NULL,
    "period_number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "period_type" TEXT NOT NULL DEFAULT 'CLASS',

    CONSTRAINT "time_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduling_constraint_profiles" (
    "id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "hard_constraints" TEXT NOT NULL,
    "soft_weights" TEXT NOT NULL,
    "assumptions" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduling_constraint_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_availability" (
    "id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "availability_type" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "start_time" TEXT,
    "end_time" TEXT,
    "specific_date" TIMESTAMP(3),
    "reason" TEXT,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "faculty_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_workload_rules" (
    "id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "max_periods_per_day" INTEGER,
    "max_periods_per_week" INTEGER,
    "max_consecutive_periods" INTEGER,
    "min_break_periods" INTEGER,
    "is_demo_assumption" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "faculty_workload_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "department_id" TEXT,
    "room_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "room_type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "location_label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_demo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_features" (
    "room_id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,

    CONSTRAINT "room_features_pkey" PRIMARY KEY ("room_id","feature_id")
);

-- CreateTable
CREATE TABLE "room_availability" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "availability_type" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "specific_date" TIMESTAMP(3),
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "room_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetables" (
    "id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "cluster_id" TEXT,
    "name" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL DEFAULT 'DEPARTMENT',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_versions" (
    "id" TEXT NOT NULL,
    "timetable_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "source_type" TEXT NOT NULL DEFAULT 'MANUAL',
    "optimization_candidate_id" TEXT,
    "constraint_profile_snapshot" TEXT,
    "validation_status" TEXT NOT NULL DEFAULT 'PASSED',
    "hard_violation_count" INTEGER NOT NULL DEFAULT 0,
    "soft_penalty" DOUBLE PRECISION,
    "created_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "published_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "supersedes_version_id" TEXT,
    "change_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timetable_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_sessions" (
    "id" TEXT NOT NULL,
    "timetable_version_id" TEXT NOT NULL,
    "subject_offering_id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "start_period_number" INTEGER,
    "duration_periods" INTEGER NOT NULL DEFAULT 1,
    "session_kind" TEXT NOT NULL DEFAULT 'LECTURE',
    "group_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timetable_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_publications" (
    "id" TEXT NOT NULL,
    "timetable_version_id" TEXT NOT NULL,
    "published_by_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publication_note" TEXT,

    CONSTRAINT "timetable_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_exceptions" (
    "id" TEXT NOT NULL,
    "timetable_version_id" TEXT NOT NULL,
    "original_session_id" TEXT,
    "exception_date" TIMESTAMP(3) NOT NULL,
    "exception_type" TEXT NOT NULL,
    "replacement_faculty_id" TEXT,
    "replacement_room_id" TEXT,
    "replacement_start_time" TEXT,
    "replacement_end_time" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "reason" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "published_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optimization_runs" (
    "id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "timetable_id" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "algorithm_code" TEXT NOT NULL,
    "algorithm_version" TEXT NOT NULL DEFAULT 'v4.2-csp',
    "solver_parameters" TEXT,
    "input_snapshot" TEXT,
    "input_hash" TEXT,
    "random_seed" BIGINT,
    "time_limit_seconds" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "solver_status" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "runtime_ms" BIGINT,
    "failure_code" TEXT,
    "failure_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimization_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optimization_candidates" (
    "id" TEXT NOT NULL,
    "optimization_run_id" TEXT NOT NULL,
    "candidate_number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "solver_status" TEXT NOT NULL,
    "is_feasible" BOOLEAN NOT NULL,
    "hard_violation_count" INTEGER NOT NULL DEFAULT 0,
    "soft_penalty" DOUBLE PRECISION,
    "quality_score" DOUBLE PRECISION,
    "unscheduled_session_count" INTEGER NOT NULL DEFAULT 0,
    "metrics" TEXT NOT NULL,
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimization_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_sessions" (
    "id" TEXT NOT NULL,
    "optimization_candidate_id" TEXT NOT NULL,
    "subject_offering_id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "duration_periods" INTEGER NOT NULL DEFAULT 1,
    "session_kind" TEXT NOT NULL DEFAULT 'LECTURE',
    "group_key" TEXT,

    CONSTRAINT "candidate_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_reports" (
    "id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "validator_version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL,
    "hard_violation_count" INTEGER NOT NULL DEFAULT 0,
    "soft_warning_count" INTEGER NOT NULL DEFAULT 0,
    "sessions_checked" INTEGER NOT NULL DEFAULT 0,
    "runtime_ms" BIGINT NOT NULL DEFAULT 0,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_issues" (
    "id" TEXT NOT NULL,
    "validation_report_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "related_entity_ids" TEXT,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disruptions" (
    "id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "reported_by_id" TEXT NOT NULL,
    "disruption_type" TEXT NOT NULL,
    "affected_faculty_id" TEXT,
    "affected_room_id" TEXT,
    "affected_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSALS_READY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disruptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disruption_affected_sessions" (
    "id" TEXT NOT NULL,
    "disruption_id" TEXT NOT NULL,
    "timetable_session_id" TEXT NOT NULL,

    CONSTRAINT "disruption_affected_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_proposals" (
    "id" TEXT NOT NULL,
    "disruption_id" TEXT NOT NULL,
    "strategy_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VALID',
    "impact_metrics" TEXT,
    "validation_report_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "reviewed_by_id" TEXT,
    "review_comment" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_changes" (
    "id" TEXT NOT NULL,
    "repair_proposal_id" TEXT NOT NULL,
    "timetable_session_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "old_values" TEXT NOT NULL,
    "proposed_values" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_session_occurrences" (
    "id" TEXT NOT NULL,
    "timetable_session_id" TEXT NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL,
    "effective_faculty_id" TEXT NOT NULL,
    "effective_room_id" TEXT NOT NULL,
    "effective_start_time" TEXT NOT NULL,
    "effective_end_time" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',

    CONSTRAINT "class_session_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_spaces" (
    "id" TEXT NOT NULL,
    "class_session_occurrence_id" TEXT NOT NULL,
    "opens_at" TIMESTAMP(3) NOT NULL,
    "closes_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "retention_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_members" (
    "id" TEXT NOT NULL,
    "chat_space_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "membership_role" TEXT NOT NULL,
    "can_send_messages" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chat_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "chat_space_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "is_important" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "scan_status" TEXT NOT NULL DEFAULT 'CLEAN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_cr_requests" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'SCHEDULE',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "faculty_cr_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examination_cycles" (
    "id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exam_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examination_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examination_events" (
    "id" TEXT NOT NULL,
    "examination_cycle_id" TEXT NOT NULL,
    "subject_offering_id" TEXT NOT NULL,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 90,
    "instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examination_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examination_room_allocations" (
    "id" TEXT NOT NULL,
    "examination_event_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "allocated_student_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examination_room_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examination_publications" (
    "id" TEXT NOT NULL,
    "examination_cycle_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "published_by_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersedes_publication_id" TEXT,
    "change_summary" TEXT,

    CONSTRAINT "examination_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "scope" TEXT,
    "before_state" TEXT,
    "after_state" TEXT,
    "ip_hash" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_institutional_email_key" ON "users"("institutional_email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "user_roles_user_id_role_id_idx" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_user_id_key" ON "faculty"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "clusters_department_id_code_key" ON "clusters"("department_id", "code");

-- CreateIndex
CREATE INDEX "sections_academic_term_id_department_id_semester_number_idx" ON "sections"("academic_term_id", "department_id", "semester_number");

-- CreateIndex
CREATE UNIQUE INDEX "sections_academic_term_id_program_id_semester_number_sectio_key" ON "sections"("academic_term_id", "program_id", "semester_number", "section_code");

-- CreateIndex
CREATE UNIQUE INDEX "batches_section_id_batch_code_key" ON "batches"("section_id", "batch_code");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_department_id_subject_code_key" ON "subjects"("department_id", "subject_code");

-- CreateIndex
CREATE INDEX "subject_offerings_academic_term_id_section_id_idx" ON "subject_offerings"("academic_term_id", "section_id");

-- CreateIndex
CREATE INDEX "faculty_assignments_faculty_id_subject_offering_id_idx" ON "faculty_assignments"("faculty_id", "subject_offering_id");

-- CreateIndex
CREATE UNIQUE INDEX "time_periods_bell_schedule_id_period_number_key" ON "time_periods"("bell_schedule_id", "period_number");

-- CreateIndex
CREATE INDEX "faculty_availability_faculty_id_academic_term_id_specific_d_idx" ON "faculty_availability"("faculty_id", "academic_term_id", "specific_date", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_room_code_key" ON "rooms"("room_code");

-- CreateIndex
CREATE INDEX "rooms_department_id_room_type_is_active_idx" ON "rooms"("department_id", "room_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "features_code_key" ON "features"("code");

-- CreateIndex
CREATE INDEX "timetable_versions_timetable_id_version_number_idx" ON "timetable_versions"("timetable_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_versions_timetable_id_version_number_key" ON "timetable_versions"("timetable_id", "version_number");

-- CreateIndex
CREATE INDEX "timetable_sessions_timetable_version_id_day_of_week_start_t_idx" ON "timetable_sessions"("timetable_version_id", "day_of_week", "start_time");

-- CreateIndex
CREATE INDEX "timetable_sessions_faculty_id_day_of_week_start_time_idx" ON "timetable_sessions"("faculty_id", "day_of_week", "start_time");

-- CreateIndex
CREATE INDEX "timetable_sessions_room_id_day_of_week_start_time_idx" ON "timetable_sessions"("room_id", "day_of_week", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_publications_timetable_version_id_key" ON "timetable_publications"("timetable_version_id");

-- CreateIndex
CREATE INDEX "optimization_runs_status_created_at_idx" ON "optimization_runs"("status", "created_at");

-- CreateIndex
CREATE INDEX "optimization_candidates_optimization_run_id_is_feasible_idx" ON "optimization_candidates"("optimization_run_id", "is_feasible");

-- CreateIndex
CREATE UNIQUE INDEX "optimization_candidates_optimization_run_id_candidate_numbe_key" ON "optimization_candidates"("optimization_run_id", "candidate_number");

-- CreateIndex
CREATE INDEX "validation_issues_validation_report_id_severity_code_idx" ON "validation_issues"("validation_report_id", "severity", "code");

-- CreateIndex
CREATE INDEX "disruptions_status_affected_date_idx" ON "disruptions"("status", "affected_date");

-- CreateIndex
CREATE UNIQUE INDEX "disruption_affected_sessions_disruption_id_timetable_sessio_key" ON "disruption_affected_sessions"("disruption_id", "timetable_session_id");

-- CreateIndex
CREATE INDEX "repair_proposals_disruption_id_status_idx" ON "repair_proposals"("disruption_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "class_session_occurrences_timetable_session_id_session_date_key" ON "class_session_occurrences"("timetable_session_id", "session_date");

-- CreateIndex
CREATE UNIQUE INDEX "chat_spaces_class_session_occurrence_id_key" ON "chat_spaces"("class_session_occurrence_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_members_chat_space_id_user_id_key" ON "chat_members"("chat_space_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_messages_chat_space_id_created_at_idx" ON "chat_messages"("chat_space_id", "created_at");

-- CreateIndex
CREATE INDEX "examination_events_examination_cycle_id_exam_date_start_tim_idx" ON "examination_events"("examination_cycle_id", "exam_date", "start_time");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clusters" ADD CONSTRAINT "clusters_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_assignments" ADD CONSTRAINT "faculty_assignments_subject_offering_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_assignments" ADD CONSTRAINT "faculty_assignments_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_calendar_events" ADD CONSTRAINT "academic_calendar_events_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bell_schedules" ADD CONSTRAINT "bell_schedules_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_periods" ADD CONSTRAINT "time_periods_bell_schedule_id_fkey" FOREIGN KEY ("bell_schedule_id") REFERENCES "bell_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduling_constraint_profiles" ADD CONSTRAINT "scheduling_constraint_profiles_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduling_constraint_profiles" ADD CONSTRAINT "scheduling_constraint_profiles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_availability" ADD CONSTRAINT "faculty_availability_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_availability" ADD CONSTRAINT "faculty_availability_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_availability" ADD CONSTRAINT "faculty_availability_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_workload_rules" ADD CONSTRAINT "faculty_workload_rules_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_workload_rules" ADD CONSTRAINT "faculty_workload_rules_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_features" ADD CONSTRAINT "room_features_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_features" ADD CONSTRAINT "room_features_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_availability" ADD CONSTRAINT "room_availability_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_availability" ADD CONSTRAINT "room_availability_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_versions" ADD CONSTRAINT "timetable_versions_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "timetables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_versions" ADD CONSTRAINT "timetable_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_versions" ADD CONSTRAINT "timetable_versions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_versions" ADD CONSTRAINT "timetable_versions_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_versions" ADD CONSTRAINT "timetable_versions_supersedes_version_id_fkey" FOREIGN KEY ("supersedes_version_id") REFERENCES "timetable_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_timetable_version_id_fkey" FOREIGN KEY ("timetable_version_id") REFERENCES "timetable_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_subject_offering_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_publications" ADD CONSTRAINT "timetable_publications_timetable_version_id_fkey" FOREIGN KEY ("timetable_version_id") REFERENCES "timetable_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_publications" ADD CONSTRAINT "timetable_publications_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_timetable_version_id_fkey" FOREIGN KEY ("timetable_version_id") REFERENCES "timetable_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_original_session_id_fkey" FOREIGN KEY ("original_session_id") REFERENCES "timetable_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_replacement_faculty_id_fkey" FOREIGN KEY ("replacement_faculty_id") REFERENCES "faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_replacement_room_id_fkey" FOREIGN KEY ("replacement_room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_runs" ADD CONSTRAINT "optimization_runs_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_runs" ADD CONSTRAINT "optimization_runs_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "timetables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_runs" ADD CONSTRAINT "optimization_runs_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_candidates" ADD CONSTRAINT "optimization_candidates_optimization_run_id_fkey" FOREIGN KEY ("optimization_run_id") REFERENCES "optimization_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_sessions" ADD CONSTRAINT "candidate_sessions_optimization_candidate_id_fkey" FOREIGN KEY ("optimization_candidate_id") REFERENCES "optimization_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_sessions" ADD CONSTRAINT "candidate_sessions_subject_offering_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_sessions" ADD CONSTRAINT "candidate_sessions_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_sessions" ADD CONSTRAINT "candidate_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_sessions" ADD CONSTRAINT "candidate_sessions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_sessions" ADD CONSTRAINT "candidate_sessions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_issues" ADD CONSTRAINT "validation_issues_validation_report_id_fkey" FOREIGN KEY ("validation_report_id") REFERENCES "validation_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disruptions" ADD CONSTRAINT "disruptions_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disruptions" ADD CONSTRAINT "disruptions_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disruptions" ADD CONSTRAINT "disruptions_affected_faculty_id_fkey" FOREIGN KEY ("affected_faculty_id") REFERENCES "faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disruptions" ADD CONSTRAINT "disruptions_affected_room_id_fkey" FOREIGN KEY ("affected_room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disruption_affected_sessions" ADD CONSTRAINT "disruption_affected_sessions_disruption_id_fkey" FOREIGN KEY ("disruption_id") REFERENCES "disruptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disruption_affected_sessions" ADD CONSTRAINT "disruption_affected_sessions_timetable_session_id_fkey" FOREIGN KEY ("timetable_session_id") REFERENCES "timetable_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_proposals" ADD CONSTRAINT "repair_proposals_disruption_id_fkey" FOREIGN KEY ("disruption_id") REFERENCES "disruptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_proposals" ADD CONSTRAINT "repair_proposals_validation_report_id_fkey" FOREIGN KEY ("validation_report_id") REFERENCES "validation_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_proposals" ADD CONSTRAINT "repair_proposals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_proposals" ADD CONSTRAINT "repair_proposals_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_changes" ADD CONSTRAINT "repair_changes_repair_proposal_id_fkey" FOREIGN KEY ("repair_proposal_id") REFERENCES "repair_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_changes" ADD CONSTRAINT "repair_changes_timetable_session_id_fkey" FOREIGN KEY ("timetable_session_id") REFERENCES "timetable_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_session_occurrences" ADD CONSTRAINT "class_session_occurrences_timetable_session_id_fkey" FOREIGN KEY ("timetable_session_id") REFERENCES "timetable_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_session_occurrences" ADD CONSTRAINT "class_session_occurrences_effective_faculty_id_fkey" FOREIGN KEY ("effective_faculty_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_session_occurrences" ADD CONSTRAINT "class_session_occurrences_effective_room_id_fkey" FOREIGN KEY ("effective_room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_spaces" ADD CONSTRAINT "chat_spaces_class_session_occurrence_id_fkey" FOREIGN KEY ("class_session_occurrence_id") REFERENCES "class_session_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_chat_space_id_fkey" FOREIGN KEY ("chat_space_id") REFERENCES "chat_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_space_id_fkey" FOREIGN KEY ("chat_space_id") REFERENCES "chat_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_cr_requests" ADD CONSTRAINT "faculty_cr_requests_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_cr_requests" ADD CONSTRAINT "faculty_cr_requests_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_cr_requests" ADD CONSTRAINT "faculty_cr_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_cycles" ADD CONSTRAINT "examination_cycles_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_cycles" ADD CONSTRAINT "examination_cycles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_cycles" ADD CONSTRAINT "examination_cycles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_cycles" ADD CONSTRAINT "examination_cycles_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_events" ADD CONSTRAINT "examination_events_examination_cycle_id_fkey" FOREIGN KEY ("examination_cycle_id") REFERENCES "examination_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_events" ADD CONSTRAINT "examination_events_subject_offering_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_room_allocations" ADD CONSTRAINT "examination_room_allocations_examination_event_id_fkey" FOREIGN KEY ("examination_event_id") REFERENCES "examination_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_room_allocations" ADD CONSTRAINT "examination_room_allocations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_publications" ADD CONSTRAINT "examination_publications_examination_cycle_id_fkey" FOREIGN KEY ("examination_cycle_id") REFERENCES "examination_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_publications" ADD CONSTRAINT "examination_publications_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
