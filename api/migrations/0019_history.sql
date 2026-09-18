ALTER TABLE "activities" ADD COLUMN "played_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "read_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- A story saved before JUG-188 was last read when it was written, as far as
-- anyone knows.
UPDATE "stories" SET "read_at" = "created_at";
