CREATE TABLE "household_materials" (
	"family_id" uuid NOT NULL,
	"material" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_materials_family_id_material_pk" PRIMARY KEY("family_id","material")
);
--> statement-breakpoint
ALTER TABLE "toys" ADD COLUMN "aliases" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "toys" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "toys" ADD COLUMN "kid_id" uuid;--> statement-breakpoint
ALTER TABLE "toys" ADD COLUMN "shared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "toys" ADD COLUMN "favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "toys" ADD COLUMN "link_group" uuid;--> statement-breakpoint
ALTER TABLE "household_materials" ADD CONSTRAINT "household_materials_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "toys" ADD CONSTRAINT "toys_kid_id_kids_id_fk" FOREIGN KEY ("kid_id") REFERENCES "public"."kids"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "toys" ADD CONSTRAINT "toys_owner_check" CHECK (not ("toys"."shared" and "toys"."kid_id" is not null));