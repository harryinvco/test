ALTER TABLE `note_tabs` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `note_tabs_updated_idx` ON `note_tabs` ("updated_at" DESC);--> statement-breakpoint
ALTER TABLE `notes` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `notes_updated_idx` ON `notes` ("updated_at" DESC);