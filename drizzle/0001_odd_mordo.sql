DROP INDEX `users_email_unique`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`type` text NOT NULL,
	`body` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activities_lead_occurred_idx` ON `activities` (`lead_id`,`occurred_at` DESC);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text,
	`email` text NOT NULL,
	`phone` text,
	`industry` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`contract_start_date` text NOT NULL,
	`mrr_cents` integer,
	`from_lead_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `clients_created_idx` ON `clients` (`created_at` DESC);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text,
	`email` text NOT NULL,
	`phone` text,
	`industry` text NOT NULL,
	`source` text NOT NULL,
	`stage` text DEFAULT 'new' NOT NULL,
	`estimated_value_cents` integer,
	`follow_up_date` text,
	`converted_at` integer,
	`converted_client_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leads_created_idx` ON `leads` (`created_at` DESC);