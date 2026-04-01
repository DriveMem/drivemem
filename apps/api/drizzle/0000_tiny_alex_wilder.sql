CREATE TYPE "public"."auth_provider" AS ENUM('credentials', 'google', 'github');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"password_hash" text,
	"avatar_url" text,
	"auth_provider" "auth_provider" DEFAULT 'credentials' NOT NULL,
	"storage_used" bigint DEFAULT 0 NOT NULL,
	"storage_limit" bigint DEFAULT 5368709120 NOT NULL,
	"daily_chat_count" integer DEFAULT 0 NOT NULL,
	"daily_chat_limit" integer DEFAULT 50 NOT NULL,
	"last_chat_reset_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
