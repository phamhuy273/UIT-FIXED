-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN', 'TECH_STAFF');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('PENDING_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReportHistoryAction" AS ENUM ('CREATED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncidentHistoryAction" AS ENUM ('CREATED', 'ASSIGNED', 'REASSIGNED', 'REJECTED', 'RESOLVED', 'REOPENED');

-- CreateEnum
CREATE TYPE "IncidentUrgency" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "full_name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "avatar_url" TEXT,
    "department_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_activation_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "invalidated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_activation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "default_department_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" SERIAL NOT NULL,
    "building_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "floor_number" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "building_id" INTEGER NOT NULL,
    "floor_id" INTEGER,
    "name" TEXT NOT NULL,
    "location_type" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "format" TEXT,
    "bytes" INTEGER,
    "user_id" INTEGER,
    "report_id" INTEGER,
    "resolution_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "building_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "urgency" "IncidentUrgency",
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_report_histories" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "action" "ReportHistoryAction" NOT NULL,
    "from_status" "ReportStatus",
    "to_status" "ReportStatus" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_report_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    "urgency" "IncidentUrgency" NOT NULL,
    "deadline" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_assignments" (
    "id" SERIAL NOT NULL,
    "incident_id" INTEGER NOT NULL,
    "department_id" INTEGER NOT NULL,
    "assigned_by_id" INTEGER NOT NULL,
    "assignee_id" INTEGER NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ended_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_progress_notes" (
    "id" SERIAL NOT NULL,
    "incident_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_progress_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_resolutions" (
    "id" SERIAL NOT NULL,
    "incident_id" INTEGER NOT NULL,
    "resolved_by_id" INTEGER NOT NULL,
    "resolution_note" TEXT NOT NULL,
    "resolved_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_histories" (
    "id" SERIAL NOT NULL,
    "incident_id" INTEGER NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "assignment_id" INTEGER,
    "resolution_id" INTEGER,
    "action" "IncidentHistoryAction" NOT NULL,
    "from_status" "IncidentStatus",
    "to_status" "IncidentStatus",
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_activation_tokens_token_hash_key" ON "email_activation_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_activation_tokens_user_id_idx" ON "email_activation_tokens"("user_id");

-- CreateIndex
CREATE INDEX "email_activation_tokens_expires_at_idx" ON "email_activation_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "buildings_default_department_id_idx" ON "buildings"("default_department_id");

-- CreateIndex
CREATE UNIQUE INDEX "floors_building_id_name_key" ON "floors"("building_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "floors_building_id_id_key" ON "floors"("building_id", "id");

-- CreateIndex
CREATE INDEX "locations_building_id_idx" ON "locations"("building_id");

-- CreateIndex
CREATE INDEX "locations_floor_id_idx" ON "locations"("floor_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_building_id_id_key" ON "locations"("building_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "media_public_id_key" ON "media"("public_id");

-- CreateIndex
CREATE INDEX "media_user_id_idx" ON "media"("user_id");

-- CreateIndex
CREATE INDEX "media_report_id_idx" ON "media"("report_id");

-- CreateIndex
CREATE INDEX "media_resolution_id_idx" ON "media"("resolution_id");

-- CreateIndex
CREATE INDEX "incident_reports_student_id_idx" ON "incident_reports"("student_id");

-- CreateIndex
CREATE INDEX "incident_reports_category_id_idx" ON "incident_reports"("category_id");

-- CreateIndex
CREATE INDEX "incident_reports_building_id_idx" ON "incident_reports"("building_id");

-- CreateIndex
CREATE INDEX "incident_reports_location_id_idx" ON "incident_reports"("location_id");

-- CreateIndex
CREATE INDEX "incident_reports_status_idx" ON "incident_reports"("status");

-- CreateIndex
CREATE INDEX "incident_reports_created_at_idx" ON "incident_reports"("created_at");

-- CreateIndex
CREATE INDEX "incident_report_histories_report_id_idx" ON "incident_report_histories"("report_id");

-- CreateIndex
CREATE INDEX "incident_report_histories_actor_id_idx" ON "incident_report_histories"("actor_id");

-- CreateIndex
CREATE INDEX "incident_report_histories_created_at_idx" ON "incident_report_histories"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_report_id_key" ON "incidents"("report_id");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_urgency_idx" ON "incidents"("urgency");

-- CreateIndex
CREATE INDEX "incidents_deadline_idx" ON "incidents"("deadline");

-- CreateIndex
CREATE INDEX "incident_assignments_incident_id_idx" ON "incident_assignments"("incident_id");

-- CreateIndex
CREATE INDEX "incident_assignments_department_id_idx" ON "incident_assignments"("department_id");

-- CreateIndex
CREATE INDEX "incident_assignments_assigned_by_id_idx" ON "incident_assignments"("assigned_by_id");

-- CreateIndex
CREATE INDEX "incident_assignments_assignee_id_idx" ON "incident_assignments"("assignee_id");

-- CreateIndex
CREATE UNIQUE INDEX "incident_assignments_incident_id_id_key" ON "incident_assignments"("incident_id", "id");

-- CreateIndex
CREATE INDEX "incident_progress_notes_incident_id_idx" ON "incident_progress_notes"("incident_id");

-- CreateIndex
CREATE INDEX "incident_progress_notes_author_id_idx" ON "incident_progress_notes"("author_id");

-- CreateIndex
CREATE INDEX "incident_progress_notes_created_at_idx" ON "incident_progress_notes"("created_at");

-- CreateIndex
CREATE INDEX "incident_resolutions_incident_id_idx" ON "incident_resolutions"("incident_id");

-- CreateIndex
CREATE INDEX "incident_resolutions_resolved_by_id_idx" ON "incident_resolutions"("resolved_by_id");

-- CreateIndex
CREATE INDEX "incident_resolutions_resolved_at_idx" ON "incident_resolutions"("resolved_at");

-- CreateIndex
CREATE UNIQUE INDEX "incident_resolutions_incident_id_id_key" ON "incident_resolutions"("incident_id", "id");

-- CreateIndex
CREATE INDEX "incident_histories_incident_id_idx" ON "incident_histories"("incident_id");

-- CreateIndex
CREATE INDEX "incident_histories_actor_id_idx" ON "incident_histories"("actor_id");

-- CreateIndex
CREATE INDEX "incident_histories_assignment_id_idx" ON "incident_histories"("assignment_id");

-- CreateIndex
CREATE INDEX "incident_histories_resolution_id_idx" ON "incident_histories"("resolution_id");

-- CreateIndex
CREATE INDEX "incident_histories_created_at_idx" ON "incident_histories"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_activation_tokens" ADD CONSTRAINT "email_activation_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_default_department_id_fkey" FOREIGN KEY ("default_department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_resolution_id_fkey" FOREIGN KEY ("resolution_id") REFERENCES "incident_resolutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_report_histories" ADD CONSTRAINT "incident_report_histories_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_report_histories" ADD CONSTRAINT "incident_report_histories_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_progress_notes" ADD CONSTRAINT "incident_progress_notes_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_progress_notes" ADD CONSTRAINT "incident_progress_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_resolutions" ADD CONSTRAINT "incident_resolutions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_resolutions" ADD CONSTRAINT "incident_resolutions_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_histories" ADD CONSTRAINT "incident_histories_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_histories" ADD CONSTRAINT "incident_histories_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_histories" ADD CONSTRAINT "incident_histories_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "incident_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_histories" ADD CONSTRAINT "incident_histories_resolution_id_fkey" FOREIGN KEY ("resolution_id") REFERENCES "incident_resolutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
