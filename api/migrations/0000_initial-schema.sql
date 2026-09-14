CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"template_id" uuid,
	"title" text NOT NULL,
	"minutes" smallint NOT NULL,
	"place" text NOT NULL,
	"why" text NOT NULL,
	"needs" text NOT NULL,
	"steps" text[] NOT NULL,
	"easier" text NOT NULL,
	"harder" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"minutes" smallint NOT NULL,
	"place" text NOT NULL,
	"min_age_months" smallint NOT NULL,
	"max_age_months" smallint NOT NULL,
	"energy" text NOT NULL,
	"categories" text[] NOT NULL,
	"small_space" boolean NOT NULL,
	"materials" text[] DEFAULT '{}' NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"safety" text[] DEFAULT '{}' NOT NULL,
	"why" text NOT NULL,
	"needs" text NOT NULL,
	"steps" text[] NOT NULL,
	"easier" text NOT NULL,
	"harder" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_templates_slug_unique" UNIQUE("slug"),
	CONSTRAINT "activity_templates_minutes_check" CHECK ("activity_templates"."minutes" > 0),
	CONSTRAINT "activity_templates_place_check" CHECK ("activity_templates"."place" in ('indoor', 'outdoor')),
	CONSTRAINT "activity_templates_min_age_months_check" CHECK ("activity_templates"."min_age_months" >= 0),
	CONSTRAINT "activity_templates_age_range_check" CHECK ("activity_templates"."max_age_months" >= "activity_templates"."min_age_months"),
	CONSTRAINT "activity_templates_energy_check" CHECK ("activity_templates"."energy" in ('low', 'medium', 'high')),
	CONSTRAINT "activity_templates_categories_check" CHECK (cardinality("activity_templates"."categories") > 0 and "activity_templates"."categories" <@ array['move', 'create', 'pretend', 'explore', 'learn', 'low_energy', 'helpers', 'out_and_about']),
	CONSTRAINT "activity_templates_steps_check" CHECK (cardinality("activity_templates"."steps") > 0)
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"family_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_members_family_id_user_id_pk" PRIMARY KEY("family_id","user_id"),
	CONSTRAINT "family_members_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interests_label_check" CHECK ("interests"."label" <> '')
);
--> statement-breakpoint
CREATE TABLE "kids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"name" text NOT NULL,
	"age_years" smallint,
	"age_set_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kids_name_check" CHECK ("kids"."name" <> ''),
	CONSTRAINT "kids_age_years_check" CHECK ("kids"."age_years" between 0 and 17),
	CONSTRAINT "kids_age_check" CHECK (("kids"."age_years" is null) = ("kids"."age_set_on" is null))
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pets_name_check" CHECK ("pets"."name" <> '')
);
--> statement-breakpoint
CREATE TABLE "toys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "toys_name_check" CHECK ("toys"."name" <> '')
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"template_id" uuid,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"teaser" text NOT NULL,
	"minutes" smallint NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stories_source_check" CHECK ("stories"."source" in ('template', 'generated')),
	CONSTRAINT "stories_parts_check" CHECK (jsonb_typeof("stories"."parts") = 'array')
);
--> statement-breakpoint
CREATE TABLE "story_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"teaser" text NOT NULL,
	"minutes" smallint NOT NULL,
	"mood" text NOT NULL,
	"min_age_months" smallint NOT NULL,
	"max_age_months" smallint NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_templates_slug_unique" UNIQUE("slug"),
	CONSTRAINT "story_templates_minutes_check" CHECK ("story_templates"."minutes" > 0),
	CONSTRAINT "story_templates_mood_check" CHECK ("story_templates"."mood" in ('calm', 'lively')),
	CONSTRAINT "story_templates_min_age_months_check" CHECK ("story_templates"."min_age_months" >= 0),
	CONSTRAINT "story_templates_age_range_check" CHECK ("story_templates"."max_age_months" >= "story_templates"."min_age_months"),
	CONSTRAINT "story_templates_parts_check" CHECK (jsonb_typeof("story_templates"."parts") = 'array')
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_template_id_activity_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."activity_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interests" ADD CONSTRAINT "interests_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids" ADD CONSTRAINT "kids_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "toys" ADD CONSTRAINT "toys_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_template_id_story_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."story_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_family_id_created_at_idx" ON "activities" USING btree ("family_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "interests_family_id_idx" ON "interests" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "kids_family_id_idx" ON "kids" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "pets_family_id_idx" ON "pets" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "toys_family_id_idx" ON "toys" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stories_family_id_template_id_key" ON "stories" USING btree ("family_id","template_id") WHERE "stories"."template_id" is not null;