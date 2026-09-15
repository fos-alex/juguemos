CREATE TABLE "audit_transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"family_id" uuid,
	"source" text NOT NULL,
	"text" text NOT NULL,
	"redacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_transcripts_source_check" CHECK ("audit_transcripts"."source" in ('family_text', 'voice_note'))
);
--> statement-breakpoint
ALTER TABLE "audit_transcripts" ADD CONSTRAINT "audit_transcripts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_transcripts" ADD CONSTRAINT "audit_transcripts_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_transcripts_user_id_idx" ON "audit_transcripts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_transcripts_family_id_idx" ON "audit_transcripts" USING btree ("family_id");
