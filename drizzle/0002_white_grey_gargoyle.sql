CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_type` text NOT NULL,
	`lead_id` text,
	`proposal_id` text,
	`parent_run_id` text,
	`input_json` text NOT NULL,
	`output_text` text,
	`status` text DEFAULT 'streaming' NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`cache_read_tokens` integer,
	`cache_creation_tokens` integer,
	`cost_usd` real,
	`error` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `agent_runs_created_idx` ON `agent_runs` ("created_at" DESC);--> statement-breakpoint
CREATE INDEX `agent_runs_lead_created_idx` ON `agent_runs` (`lead_id`,"created_at" DESC);--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `proposals_lead_created_idx` ON `proposals` (`lead_id`,"created_at" DESC);--> statement-breakpoint
DROP INDEX `activities_lead_occurred_idx`;--> statement-breakpoint
CREATE INDEX `activities_lead_occurred_idx` ON `activities` (`lead_id`,"occurred_at" DESC);--> statement-breakpoint
DROP INDEX `clients_created_idx`;--> statement-breakpoint
CREATE INDEX `clients_created_idx` ON `clients` ("created_at" DESC);--> statement-breakpoint
DROP INDEX `leads_created_idx`;--> statement-breakpoint
CREATE INDEX `leads_created_idx` ON `leads` ("created_at" DESC);