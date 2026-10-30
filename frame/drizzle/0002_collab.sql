ALTER TYPE "public"."notification_type" ADD VALUE 'collab';--> statement-breakpoint
ALTER TYPE "public"."report_target" ADD VALUE 'collab';--> statement-breakpoint
CREATE TABLE "collab_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"applicant_id" text NOT NULL,
	"message" text NOT NULL,
	"portfolio_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collab_listing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"project_type" text NOT NULL,
	"compensation" text,
	"is_volunteer" boolean DEFAULT false NOT NULL,
	"location" text,
	"mode" text NOT NULL,
	"deadline" timestamp with time zone,
	"access" text DEFAULT 'public' NOT NULL,
	"access_code" text NOT NULL,
	"contact" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collab_application" ADD CONSTRAINT "collab_application_listing_id_collab_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."collab_listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_application" ADD CONSTRAINT "collab_application_applicant_id_user_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_listing" ADD CONSTRAINT "collab_listing_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collab_application_unique" ON "collab_application" USING btree ("listing_id","applicant_id");--> statement-breakpoint
CREATE INDEX "collab_application_applicant_idx" ON "collab_application" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "collab_listing_status_idx" ON "collab_listing" USING btree ("status","access","created_at");--> statement-breakpoint
CREATE INDEX "collab_listing_author_idx" ON "collab_listing" USING btree ("author_id");