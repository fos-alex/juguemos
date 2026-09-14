CREATE TABLE "kids_sitting_out" (
	"user_id" text NOT NULL,
	"kid_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kids_sitting_out_user_id_kid_id_pk" PRIMARY KEY("user_id","kid_id")
);
--> statement-breakpoint
ALTER TABLE "kids_sitting_out" ADD CONSTRAINT "kids_sitting_out_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids_sitting_out" ADD CONSTRAINT "kids_sitting_out_kid_id_kids_id_fk" FOREIGN KEY ("kid_id") REFERENCES "public"."kids"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "kid_ids" uuid[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "story_plots" ADD COLUMN "kid_ids" uuid[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "kid_ids" uuid[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
DROP INDEX "stories_family_id_template_id_key";--> statement-breakpoint
CREATE UNIQUE INDEX "stories_family_id_template_id_kid_ids_key" ON "stories" USING btree ("family_id","template_id","kid_ids") WHERE "stories"."template_id" is not null;
