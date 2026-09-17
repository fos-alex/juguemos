-- The sounds the parent acts out in a story, as its legend shows them
-- (JUG-170). Stories written before have none.
ALTER TABLE "stories" ADD COLUMN "sounds" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_sounds_check" CHECK (jsonb_typeof("stories"."sounds") = 'array');