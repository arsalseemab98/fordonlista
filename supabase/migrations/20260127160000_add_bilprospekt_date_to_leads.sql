-- Add bilprospekt_date per lead (when this lead's data was fetched from Bilprospekt)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bilprospekt_date DATE DEFAULT NULL;
