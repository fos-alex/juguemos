-- The parents, the pet's animal, and the kind of home (JUG-21). Every pet
-- saved so far is a dog, the default, until the family says otherwise.
CREATE TABLE "parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"name" text NOT NULL,
	"called_as" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parents_name_check" CHECK ("parents"."name" <> ''),
	CONSTRAINT "parents_called_as_check" CHECK ("parents"."called_as" <> '')
);
--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "home" text;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "kind" text DEFAULT 'perro' NOT NULL;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parents_family_id_idx" ON "parents" USING btree ("family_id");
