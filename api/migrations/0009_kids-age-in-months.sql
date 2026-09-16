-- A kid's age was whole years; it is now months (JUG-145). The day it was given stays.
ALTER TABLE "kids" DROP CONSTRAINT "kids_age_years_check";--> statement-breakpoint
ALTER TABLE "kids" RENAME COLUMN "age_years" TO "age_months";--> statement-breakpoint
UPDATE "kids" SET "age_months" = "age_months" * 12 WHERE "age_months" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "kids" ADD CONSTRAINT "kids_age_months_check" CHECK ("kids"."age_months" between 0 and 215);
