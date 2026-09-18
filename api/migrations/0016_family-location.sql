ALTER TABLE "families" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_location_check" CHECK ("families"."location" <> '');--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_coordinates_check" CHECK (("families"."latitude" is null) = ("families"."longitude" is null)
        and ("families"."latitude" is null or ("families"."latitude" between -90 and 90 and "families"."longitude" between -180 and 180)));