CREATE TABLE `note_tabs` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`label` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `note_tabs_date_idx` ON `note_tabs` (`date`);--> statement-breakpoint
CREATE INDEX `note_tabs_date_position_idx` ON `note_tabs` (`date`,`position`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`tab_id` text NOT NULL,
	`date` text NOT NULL,
	`title_preview` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tab_id`) REFERENCES `note_tabs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notes_tab_position_idx` ON `notes` (`tab_id`,`position`);--> statement-breakpoint
CREATE INDEX `notes_date_updated_idx` ON `notes` (`date`,"updated_at" DESC);