CREATE TABLE "story_plots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"title" text NOT NULL,
	"teaser" text NOT NULL,
	"minutes" smallint NOT NULL,
	"premise" text NOT NULL,
	"mood" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_plots_title_check" CHECK ("story_plots"."title" <> ''),
	CONSTRAINT "story_plots_teaser_check" CHECK ("story_plots"."teaser" <> ''),
	CONSTRAINT "story_plots_minutes_check" CHECK ("story_plots"."minutes" between 2 and 6),
	CONSTRAINT "story_plots_premise_check" CHECK ("story_plots"."premise" <> ''),
	CONSTRAINT "story_plots_mood_check" CHECK ("story_plots"."mood" in ('calm', 'lively'))
);
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "plot_id" uuid;--> statement-breakpoint
ALTER TABLE "story_plots" ADD CONSTRAINT "story_plots_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_plots_family_id_idx" ON "story_plots" USING btree ("family_id");--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_plot_id_story_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."story_plots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stories_family_id_plot_id_key" ON "stories" USING btree ("family_id","plot_id") WHERE "stories"."plot_id" is not null;--> statement-breakpoint
CREATE INDEX "stories_family_id_created_at_idx" ON "stories" USING btree ("family_id","created_at");