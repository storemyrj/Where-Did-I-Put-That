-- Persistent privacy preferences; permissions remain per browser/device.
ALTER TABLE users ADD COLUMN location_mode TEXT NOT NULL DEFAULT 'ask';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN microphone_enabled TEXT NOT NULL DEFAULT 'on';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN speech_language TEXT NOT NULL DEFAULT 'auto';
--> statement-breakpoint
-- Optional, explicitly captured position for an existing place; no address geocoding.
ALTER TABLE locations ADD COLUMN latitude REAL;
--> statement-breakpoint
ALTER TABLE locations ADD COLUMN longitude REAL;
--> statement-breakpoint
ALTER TABLE locations ADD COLUMN geo_precision TEXT;
