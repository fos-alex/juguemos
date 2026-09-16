CREATE TABLE "story_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"title" text NOT NULL,
	"storyline" text NOT NULL,
	"setting" text DEFAULT '' NOT NULL,
	"characters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"casting" jsonb,
	"kid_ids" uuid[] DEFAULT '{}' NOT NULL,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_series_title_check" CHECK ("story_series"."title" <> ''),
	CONSTRAINT "story_series_characters_check" CHECK (jsonb_typeof("story_series"."characters") = 'array')
);
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "episode" smallint;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "story_series" ADD CONSTRAINT "story_series_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_series_family_id_idx" ON "story_series" USING btree ("family_id");--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_series_id_story_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."story_series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stories_series_id_episode_key" ON "stories" USING btree ("series_id","episode") WHERE "stories"."series_id" is not null;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_episode_check" CHECK ("stories"."episode" is null or "stories"."episode" >= 1);