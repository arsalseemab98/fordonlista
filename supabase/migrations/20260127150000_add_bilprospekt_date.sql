-- Add bilprospekt_updated_at to preferences table
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS bilprospekt_updated_at DATE DEFAULT NULL;
