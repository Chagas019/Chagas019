ALTER TABLE "follow" ADD COLUMN "approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "auto_approve_followers" boolean DEFAULT false NOT NULL;