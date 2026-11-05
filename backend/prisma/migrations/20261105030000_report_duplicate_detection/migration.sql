-- Additive only. Existing reports retain unknown observation/recurrence times.
ALTER TABLE "incident_reports"
  ADD COLUMN "observed_at" TIMESTAMPTZ(3),
  ADD COLUMN "recurrence_of_incident_id" INTEGER;
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_recurrence_of_incident_id_fkey"
  FOREIGN KEY ("recurrence_of_incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "incident_reports_recurrence_of_incident_id_idx" ON "incident_reports"("recurrence_of_incident_id");

CREATE TABLE "report_confirmations" (
  "id" SERIAL PRIMARY KEY,
  "report_id" INTEGER NOT NULL,
  "student_id" INTEGER NOT NULL,
  "observed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_confirmations_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "report_confirmations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "report_confirmations_report_id_student_id_key" ON "report_confirmations"("report_id", "student_id");
CREATE INDEX "report_confirmations_student_id_created_at_idx" ON "report_confirmations"("student_id", "created_at");

CREATE TABLE "report_embeddings" (
  "report_id" INTEGER PRIMARY KEY,
  "model_version" TEXT NOT NULL,
  "content_hash" TEXT NOT NULL,
  "vector" DOUBLE PRECISION[] NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "report_embeddings_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "report_embeddings_dimension_check" CHECK (cardinality("vector") = 384)
);
