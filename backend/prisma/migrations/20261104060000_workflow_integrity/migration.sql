-- Enforce the DBML invariants shared by intake, review and future assignments.
ALTER TABLE "users" ADD CONSTRAINT "users_role_department_check"
CHECK (("role" = 'TECH_STAFF' AND "department_id" IS NOT NULL)
    OR ("role" IN ('STUDENT', 'ADMIN') AND "department_id" IS NULL));

ALTER TABLE "media" ADD CONSTRAINT "media_single_owner_check"
CHECK (num_nonnulls("user_id", "report_id", "resolution_id") <= 1);

ALTER TABLE "locations" ADD CONSTRAINT "locations_building_floor_consistency"
FOREIGN KEY ("building_id", "floor_id") REFERENCES "floors" ("building_id", "id")
ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "incident_reports" ADD CONSTRAINT "reports_building_location_consistency"
FOREIGN KEY ("building_id", "location_id") REFERENCES "locations" ("building_id", "id")
ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "incident_assignments_one_current_per_incident"
ON "incident_assignments" ("incident_id") WHERE "is_current" = true;

ALTER TABLE "incident_histories" ADD CONSTRAINT "histories_assignment_incident_consistency"
FOREIGN KEY ("incident_id", "assignment_id") REFERENCES "incident_assignments" ("incident_id", "id")
ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "incident_histories" ADD CONSTRAINT "histories_resolution_incident_consistency"
FOREIGN KEY ("incident_id", "resolution_id") REFERENCES "incident_resolutions" ("incident_id", "id")
ON DELETE RESTRICT ON UPDATE NO ACTION;
