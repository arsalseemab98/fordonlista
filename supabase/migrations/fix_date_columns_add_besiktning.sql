-- Fix date columns: Change from DATE to TEXT to support Swedish date formats
-- car.info returns dates in various formats like "15 oktober 2023" which can't be parsed as DATE

-- Change DATE columns to TEXT
ALTER TABLE vehicles ALTER COLUMN senaste_avställning TYPE TEXT;
ALTER TABLE vehicles ALTER COLUMN senaste_påställning TYPE TEXT;
ALTER TABLE vehicles ALTER COLUMN första_registrering TYPE TEXT;

-- Add besiktning (inspection) field
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS besiktning_till TEXT;

-- Add index for besiktning queries
CREATE INDEX IF NOT EXISTS idx_vehicles_besiktning ON vehicles(besiktning_till);
