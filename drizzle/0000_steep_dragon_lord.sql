CREATE TABLE `location_history` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`location_id` text NOT NULL,
	`timestamp` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `history_item` ON `location_history` (`item_id`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`description` text,
	`photo` text,
	`current_location_id` text NOT NULL,
	`temporary_until` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `items_user` ON `items` (`user_id`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`parent_location_id` text
);
--> statement-breakpoint
CREATE INDEX `locations_user` ON `locations` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	`notifications` text DEFAULT 'off' NOT NULL
);
