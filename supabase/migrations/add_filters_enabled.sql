-- Add filters_enabled column to preferences table
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS filters_enabled BOOLEAN DEFAULT true;
