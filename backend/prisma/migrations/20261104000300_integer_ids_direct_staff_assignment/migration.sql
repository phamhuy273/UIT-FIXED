-- Integer IDs replace UUIDs. Refuse to rewrite a populated database.
-- A populated database needs a separate migration with an explicit ID mapping.
BEGIN;
LOCK TABLE "users", "email_activation_tokens", "departments", "buildings", "floors", "locations", "categories", "media", "incident_reports", "incident_report_histories", "incidents", "incident_assignments", "incident_progress_notes", "incident_resolutions", "incident_histories" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "users")
    OR EXISTS (SELECT 1 FROM "email_activation_tokens")
    OR EXISTS (SELECT 1 FROM "departments")
    OR EXISTS (SELECT 1 FROM "buildings")
    OR EXISTS (SELECT 1 FROM "floors")
    OR EXISTS (SELECT 1 FROM "locations")
    OR EXISTS (SELECT 1 FROM "categories")
    OR EXISTS (SELECT 1 FROM "media")
    OR EXISTS (SELECT 1 FROM "incident_reports")
    OR EXISTS (SELECT 1 FROM "incident_report_histories")
    OR EXISTS (SELECT 1 FROM "incidents")
    OR EXISTS (SELECT 1 FROM "incident_assignments")
    OR EXISTS (SELECT 1 FROM "incident_progress_notes")
    OR EXISTS (SELECT 1 FROM "incident_resolutions")
    OR EXISTS (SELECT 1 FROM "incident_histories") THEN
    RAISE EXCEPTION 'Cannot convert UUID IDs on a populated database. Prepare a data-preserving ID mapping migration first.';
  END IF;
END $$;

-- AlterEnum
ALTER TYPE "ReportStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "ReportHistoryAction" ADD VALUE 'CANCELLED';

-- AlterEnum
CREATE TYPE "IncidentHistoryAction_new" AS ENUM ('CREATED', 'ASSIGNED', 'REASSIGNED', 'REJECTED', 'RESOLVED', 'REOPENED');
ALTER TABLE "incident_histories" ALTER COLUMN "action" TYPE "IncidentHistoryAction_new" USING ("action"::text::"IncidentHistoryAction_new");
ALTER TYPE "IncidentHistoryAction" RENAME TO "IncidentHistoryAction_old";
ALTER TYPE "IncidentHistoryAction_new" RENAME TO "IncidentHistoryAction";
DROP TYPE "IncidentHistoryAction_old";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_department_id_fkey";

-- DropForeignKey
ALTER TABLE "email_activation_tokens" DROP CONSTRAINT "email_activation_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "buildings" DROP CONSTRAINT "buildings_default_department_id_fkey";

-- DropForeignKey
ALTER TABLE "floors" DROP CONSTRAINT "floors_building_id_fkey";

-- DropForeignKey
ALTER TABLE "locations" DROP CONSTRAINT "locations_building_id_fkey";

-- DropForeignKey
ALTER TABLE "locations" DROP CONSTRAINT "locations_building_id_floor_id_fkey";

-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "media_user_id_fkey";

-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "media_report_id_fkey";

-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "media_resolution_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_reports" DROP CONSTRAINT "incident_reports_student_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_reports" DROP CONSTRAINT "incident_reports_category_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_reports" DROP CONSTRAINT "incident_reports_building_id_location_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_report_histories" DROP CONSTRAINT "incident_report_histories_report_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_report_histories" DROP CONSTRAINT "incident_report_histories_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_report_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_assignments" DROP CONSTRAINT "incident_assignments_incident_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_assignments" DROP CONSTRAINT "incident_assignments_department_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_assignments" DROP CONSTRAINT "incident_assignments_assigned_by_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_assignments" DROP CONSTRAINT "incident_assignments_accepted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_progress_notes" DROP CONSTRAINT "incident_progress_notes_incident_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_progress_notes" DROP CONSTRAINT "incident_progress_notes_author_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_resolutions" DROP CONSTRAINT "incident_resolutions_incident_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_resolutions" DROP CONSTRAINT "incident_resolutions_resolved_by_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_histories" DROP CONSTRAINT "incident_histories_incident_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_histories" DROP CONSTRAINT "incident_histories_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_histories" DROP CONSTRAINT "incident_histories_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "incident_histories" DROP CONSTRAINT "incident_histories_resolution_id_fkey";

-- DropIndex
DROP INDEX "email_activation_tokens_user_id_expires_at_idx";

-- DropIndex
DROP INDEX "departments_name_key";

-- DropIndex
DROP INDEX "floors_building_id_id_key";

-- DropIndex
DROP INDEX "locations_building_id_floor_id_idx";

-- DropIndex
DROP INDEX "locations_building_id_id_key";

-- DropIndex
DROP INDEX "categories_name_key";

-- DropIndex
DROP INDEX "incident_reports_student_id_created_at_idx";

-- DropIndex
DROP INDEX "incident_reports_status_created_at_idx";

-- DropIndex
DROP INDEX "incident_reports_building_id_location_id_idx";

-- DropIndex
DROP INDEX "incident_report_histories_report_id_created_at_idx";

-- DropIndex
DROP INDEX "incident_assignments_department_id_is_current_idx";

-- DropIndex
DROP INDEX "incident_assignments_accepted_by_id_is_current_idx";

-- DropIndex
DROP INDEX "incident_progress_notes_incident_id_created_at_idx";

-- DropIndex
DROP INDEX "incident_resolutions_incident_id_resolved_at_idx";

-- DropIndex
DROP INDEX "incident_histories_incident_id_created_at_idx";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "email" SET DATA TYPE VARCHAR,
ALTER COLUMN "password" SET DATA TYPE VARCHAR,
ALTER COLUMN "full_name" SET DATA TYPE VARCHAR,
ALTER COLUMN "avatar_url" SET DATA TYPE VARCHAR,
DROP COLUMN "department_id",
ADD COLUMN     "department_id" INTEGER,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "email_activation_tokens" DROP CONSTRAINT "email_activation_tokens_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER NOT NULL,
ALTER COLUMN "token_hash" SET DATA TYPE VARCHAR,
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "used_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "invalidated_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "email_activation_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "departments" DROP CONSTRAINT "departments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "buildings" DROP CONSTRAINT "buildings_pkey",
ADD COLUMN     "description" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR,
ALTER COLUMN "address" SET DATA TYPE VARCHAR,
DROP COLUMN "default_department_id",
ADD COLUMN     "default_department_id" INTEGER,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "buildings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "floors" DROP CONSTRAINT "floors_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "building_id",
ADD COLUMN     "building_id" INTEGER NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "floors_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "locations" DROP CONSTRAINT "locations_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "building_id",
ADD COLUMN     "building_id" INTEGER NOT NULL,
DROP COLUMN "floor_id",
ADD COLUMN     "floor_id" INTEGER,
ALTER COLUMN "name" SET DATA TYPE VARCHAR,
ALTER COLUMN "location_type" SET DATA TYPE VARCHAR,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "categories" DROP CONSTRAINT "categories_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "media" DROP CONSTRAINT "media_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "public_id" SET DATA TYPE VARCHAR,
ALTER COLUMN "url" SET DATA TYPE VARCHAR,
ALTER COLUMN "format" SET DATA TYPE VARCHAR,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER,
DROP COLUMN "report_id",
ADD COLUMN     "report_id" INTEGER,
DROP COLUMN "resolution_id",
ADD COLUMN     "resolution_id" INTEGER,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "incident_reports" DROP CONSTRAINT "incident_reports_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "student_id",
ADD COLUMN     "student_id" INTEGER NOT NULL,
DROP COLUMN "category_id",
ADD COLUMN     "category_id" INTEGER NOT NULL,
DROP COLUMN "building_id",
ADD COLUMN     "building_id" INTEGER NOT NULL,
DROP COLUMN "location_id",
ADD COLUMN     "location_id" INTEGER NOT NULL,
ALTER COLUMN "title" SET DATA TYPE VARCHAR,
DROP COLUMN "urgency",
ADD COLUMN     "urgency" "IncidentUrgency",
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "incident_report_histories" DROP CONSTRAINT "incident_report_histories_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "report_id",
ADD COLUMN     "report_id" INTEGER NOT NULL,
DROP COLUMN "actor_id",
ADD COLUMN     "actor_id" INTEGER NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "incident_report_histories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_pkey",
ADD COLUMN     "deadline" TIMESTAMPTZ(6),
ADD COLUMN     "urgency" "IncidentUrgency" NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "report_id",
ADD COLUMN     "report_id" INTEGER NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "incidents_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "incident_assignments" DROP CONSTRAINT "incident_assignments_pkey",
DROP COLUMN "accepted_at",
DROP COLUMN "accepted_by_id",
ADD COLUMN     "assignee_id" INTEGER NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "incident_id",
ADD COLUMN     "incident_id" INTEGER NOT NULL,
DROP COLUMN "department_id",
ADD COLUMN     "department_id" INTEGER NOT NULL,
DROP COLUMN "assigned_by_id",
ADD COLUMN     "assigned_by_id" INTEGER NOT NULL,
ALTER COLUMN "ended_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "incident_assignments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "incident_progress_notes" DROP CONSTRAINT "incident_progress_notes_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "incident_id",
ADD COLUMN     "incident_id" INTEGER NOT NULL,
DROP COLUMN "author_id",
ADD COLUMN     "author_id" INTEGER NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "incident_progress_notes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "incident_resolutions" DROP CONSTRAINT "incident_resolutions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "incident_id",
ADD COLUMN     "incident_id" INTEGER NOT NULL,
DROP COLUMN "resolved_by_id",
ADD COLUMN     "resolved_by_id" INTEGER NOT NULL,
ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "incident_resolutions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "incident_histories" DROP CONSTRAINT "incident_histories_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "incident_id",
ADD COLUMN     "incident_id" INTEGER NOT NULL,
DROP COLUMN "actor_id",
ADD COLUMN     "actor_id" INTEGER NOT NULL,
DROP COLUMN "assignment_id",
ADD COLUMN     "assignment_id" INTEGER,
DROP COLUMN "resolution_id",
ADD COLUMN     "resolution_id" INTEGER,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "incident_histories_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "email_activation_tokens_user_id_idx" ON "email_activation_tokens"("user_id");

-- CreateIndex
CREATE INDEX "email_activation_tokens_expires_at_idx" ON "email_activation_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "buildings_default_department_id_idx" ON "buildings"("default_department_id");

-- CreateIndex
CREATE UNIQUE INDEX "floors_building_id_name_key" ON "floors"("building_id", "name");

-- CreateIndex
CREATE INDEX "locations_building_id_idx" ON "locations"("building_id");

-- CreateIndex
CREATE INDEX "locations_floor_id_idx" ON "locations"("floor_id");

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
ALTER TABLE "email_activation_tokens" ADD CONSTRAINT "email_activation_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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


-- Reinstate DBML invariants after replacing the ID columns.
ALTER TABLE "users" ADD CONSTRAINT "users_role_department_check"
CHECK (("role"::text = 'TECH_STAFF' AND "department_id" IS NOT NULL)
    OR ("role"::text IN ('STUDENT', 'ADMIN') AND "department_id" IS NULL));

ALTER TABLE "media" ADD CONSTRAINT "media_single_owner_check"
CHECK (num_nonnulls("user_id", "report_id", "resolution_id") <= 1);

CREATE UNIQUE INDEX "incident_assignments_one_current_per_incident"
ON "incident_assignments" ("incident_id") WHERE "is_current" = true;
COMMIT;
