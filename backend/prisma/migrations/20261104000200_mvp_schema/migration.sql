-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('PENDING_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReportHistoryAction" AS ENUM ('CREATED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IncidentHistoryAction" AS ENUM ('CREATED', 'ASSIGNED', 'REASSIGNED', 'ACCEPTED', 'RESOLVED', 'REOPENED');

-- CreateEnum
CREATE TYPE "IncidentUrgency" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- Preserve existing USER records by renaming the enum value in place.
ALTER TYPE "Role" RENAME VALUE 'USER' TO 'STUDENT';
ALTER TYPE "Role" ADD VALUE 'TECH_STAFF';

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "report_id" TEXT,
ADD COLUMN     "resolution_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "department_id" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "role" SET DEFAULT 'STUDENT';

-- CreateTable
CREATE TABLE "email_activation_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "invalidated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_activation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "default_department_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor_number" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "floor_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "urgency" INTEGER,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_report_histories" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" "ReportHistoryAction" NOT NULL,
    "from_status" "ReportStatus",
    "to_status" "ReportStatus" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_report_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_assignments" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "accepted_by_id" TEXT,
    "accepted_at" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_progress_notes" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_progress_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_resolutions" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "resolved_by_id" TEXT NOT NULL,
    "resolution_note" TEXT NOT NULL,
    "resolved_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_histories" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "resolution_id" TEXT,
    "action" "IncidentHistoryAction" NOT NULL,
    "from_status" "IncidentStatus",
    "to_status" "IncidentStatus",
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_activation_tokens_token_hash_key" ON "email_activation_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_activation_tokens_user_id_expires_at_idx" ON "email_activation_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE INDEX "buildings_default_department_id_idx" ON "buildings"("default_department_id");

-- CreateIndex
CREATE UNIQUE INDEX "floors_building_id_name_key" ON "floors"("building_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "floors_building_id_id_key" ON "floors"("building_id", "id");

-- CreateIndex
CREATE INDEX "locations_building_id_floor_id_idx" ON "locations"("building_id", "floor_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_building_id_id_key" ON "locations"("building_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "incident_reports_student_id_created_at_idx" ON "incident_reports"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "incident_reports_status_created_at_idx" ON "incident_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "incident_reports_category_id_idx" ON "incident_reports"("category_id");

-- CreateIndex
CREATE INDEX "incident_reports_building_id_location_id_idx" ON "incident_reports"("building_id", "location_id");

-- CreateIndex
CREATE INDEX "incident_report_histories_report_id_created_at_idx" ON "incident_report_histories"("report_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_report_id_key" ON "incidents"("report_id");

-- CreateIndex
CREATE INDEX "incident_assignments_department_id_is_current_idx" ON "incident_assignments"("department_id", "is_current");

-- CreateIndex
CREATE INDEX "incident_assignments_accepted_by_id_is_current_idx" ON "incident_assignments"("accepted_by_id", "is_current");

-- CreateIndex
CREATE INDEX "incident_assignments_incident_id_idx" ON "incident_assignments"("incident_id");

-- CreateIndex
CREATE INDEX "incident_progress_notes_incident_id_created_at_idx" ON "incident_progress_notes"("incident_id", "created_at");

-- CreateIndex
CREATE INDEX "incident_resolutions_incident_id_resolved_at_idx" ON "incident_resolutions"("incident_id", "resolved_at");

-- CreateIndex
CREATE INDEX "incident_histories_incident_id_created_at_idx" ON "incident_histories"("incident_id", "created_at");

-- CreateIndex
CREATE INDEX "incident_histories_assignment_id_idx" ON "incident_histories"("assignment_id");

-- CreateIndex
CREATE INDEX "incident_histories_resolution_id_idx" ON "incident_histories"("resolution_id");

-- CreateIndex
CREATE INDEX "media_user_id_idx" ON "media"("user_id");

-- CreateIndex
CREATE INDEX "media_report_id_idx" ON "media"("report_id");

-- CreateIndex
CREATE INDEX "media_resolution_id_idx" ON "media"("resolution_id");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_activation_tokens" ADD CONSTRAINT "email_activation_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_default_department_id_fkey" FOREIGN KEY ("default_department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_building_id_floor_id_fkey" FOREIGN KEY ("building_id", "floor_id") REFERENCES "floors"("building_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_resolution_id_fkey" FOREIGN KEY ("resolution_id") REFERENCES "incident_resolutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_building_id_location_id_fkey" FOREIGN KEY ("building_id", "location_id") REFERENCES "locations"("building_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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


-- Business invariants from the supplied DBML notes.
ALTER TABLE "users" ADD CONSTRAINT "users_role_department_check"
CHECK (("role"::text = 'TECH_STAFF' AND "department_id" IS NOT NULL)
    OR ("role"::text IN ('STUDENT', 'ADMIN') AND "department_id" IS NULL));

ALTER TABLE "media" ADD CONSTRAINT "media_single_owner_check"
CHECK ("report_id" IS NULL OR "resolution_id" IS NULL);

CREATE UNIQUE INDEX "incident_assignments_one_current_per_incident"
ON "incident_assignments" ("incident_id") WHERE "is_current" = true;
