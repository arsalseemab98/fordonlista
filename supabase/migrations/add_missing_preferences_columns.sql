-- Add missing columns to preferences table
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS max_year INTEGER DEFAULT 2025;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS min_mileage INTEGER DEFAULT 0;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS preferred_models TEXT[] DEFAULT '{}';
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS excluded_models TEXT[] DEFAULT '{}';
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS letter_cost DECIMAL(10,2) DEFAULT 12.00;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS filters_enabled BOOLEAN DEFAULT true;
