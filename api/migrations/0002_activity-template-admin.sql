ALTER TABLE "activity_templates" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_templates" ADD COLUMN "deleted_at" timestamp with time zone;