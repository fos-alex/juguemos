CREATE TABLE "story_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"event" text NOT NULL,
	"kid_ids" uuid[] DEFAULT '{}' NOT NULL,
	"band" text NOT NULL,
	"mood" text NOT NULL,
	"plot_id" uuid,
	"keyword" text,
	"casting" jsonb,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_audit_event_check" CHECK ("story_audit"."event" in ('offered', 'picked', 'written'))
);
--> statement-breakpoint
ALTER TABLE "story_plots" DROP CONSTRAINT "story_plots_minutes_check";--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "casting" jsonb;--> statement-breakpoint
ALTER TABLE "story_plots" ADD COLUMN "casting" jsonb;--> statement-breakpoint
ALTER TABLE "story_audit" ADD CONSTRAINT "story_audit_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_audit_family_id_created_at_idx" ON "story_audit" USING btree ("family_id","created_at");--> statement-breakpoint
ALTER TABLE "story_plots" ADD CONSTRAINT "story_plots_minutes_check" CHECK ("story_plots"."minutes" between 2 and 8);