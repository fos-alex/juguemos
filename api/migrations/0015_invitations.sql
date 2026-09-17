-- Invitations to join Ludi (JUG-34): one per email, with the SHA-256 of the
-- token its link carries.
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_email_unique" UNIQUE("email"),
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash")
);
