ALTER TABLE "files" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;