CREATE TABLE "affirmation_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"affirmation_id" integer NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"completed_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"booklet_id" integer NOT NULL,
	"day_number" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booklets" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"description" text,
	"cover_color" text DEFAULT '#1976D2',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"start_hour" integer DEFAULT 8 NOT NULL,
	"end_hour" integer DEFAULT 21 NOT NULL,
	"interval_minutes" integer DEFAULT 30 NOT NULL,
	CONSTRAINT "notification_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_active_date" date,
	"total_affirmed" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_streaks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"display_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "affirmation_completions" ADD CONSTRAINT "affirmation_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affirmation_completions" ADD CONSTRAINT "affirmation_completions_affirmation_id_affirmations_id_fk" FOREIGN KEY ("affirmation_id") REFERENCES "public"."affirmations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affirmations" ADD CONSTRAINT "affirmations_booklet_id_booklets_id_fk" FOREIGN KEY ("booklet_id") REFERENCES "public"."booklets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;