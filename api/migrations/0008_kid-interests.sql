CREATE TABLE "kid_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kid_interests_label_check" CHECK ("kid_interests"."label" <> '')
);
--> statement-breakpoint
ALTER TABLE "kid_interests" ADD CONSTRAINT "kid_interests_kid_id_kids_id_fk" FOREIGN KEY ("kid_id") REFERENCES "public"."kids"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kid_interests_kid_id_idx" ON "kid_interests" USING btree ("kid_id");--> statement-breakpoint
-- Interests move from the family to its kids (JUG-144): each family's
-- interests go to every one of its kids, in the same order, so nothing is lost.
INSERT INTO "kid_interests" ("kid_id", "position", "label")
SELECT "kids"."id", "interests"."position", "interests"."label"
FROM "interests" JOIN "kids" ON "kids"."family_id" = "interests"."family_id";--> statement-breakpoint
DROP TABLE "interests" CASCADE;
