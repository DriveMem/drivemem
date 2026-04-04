ALTER TABLE "shares" ALTER COLUMN "file_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shares" ADD COLUMN "type" text DEFAULT 'file' NOT NULL;--> statement-breakpoint
ALTER TABLE "shares" ADD COLUMN "report_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shares" ADD CONSTRAINT "shares_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
