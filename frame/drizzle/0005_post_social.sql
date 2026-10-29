ALTER TYPE "public"."content_status" ADD VALUE 'draft';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'mention';--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "credits" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "comments_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "pinned_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "post_tags_idx" ON "post" USING gin ("tags");