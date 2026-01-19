-- Add columns for counting företagsannonser and privatannonser from vehicle history
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS antal_foretagsannonser INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS antal_privatannonser INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN vehicles.antal_foretagsannonser IS 'Number of times vehicle was listed in company ads (from car.info history)';
COMMENT ON COLUMN vehicles.antal_privatannonser IS 'Number of times vehicle was listed in private ads (from car.info history)';
