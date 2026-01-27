-- Add mileage history (from besiktning/inspection readings) to vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage_history jsonb DEFAULT NULL;
