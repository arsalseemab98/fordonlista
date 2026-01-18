-- Add car.info fields to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS skatt INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS co2_gkm INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS antal_agare INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS valuation_company INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS valuation_private INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS total_in_sweden INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_history JSONB;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS senaste_avställning DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS senaste_påställning DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS första_registrering DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS carinfo_fetched_at TIMESTAMP WITH TIME ZONE;

-- Add 'pending_review' status for import quarantine
-- First drop the existing constraint, then recreate with new value
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'pending_review', 'to_call', 'called', 'interested', 'booked', 'bought', 'not_interested', 'do_not_call', 'callback', 'no_answer'));

-- Add index for faster filtering on pending_review
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_carinfo_fetched ON vehicles(carinfo_fetched_at);
