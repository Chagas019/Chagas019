ALTER TABLE "post" ADD COLUMN "allow_remix" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "remix_of_id" uuid;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "project_info" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_remix_of_id_post_id_fk" FOREIGN KEY ("remix_of_id") REFERENCES "public"."post"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_remix_idx" ON "post" USING btree ("remix_of_id");