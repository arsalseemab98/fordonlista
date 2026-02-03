-- Add ownership change tracking to blocket_salda
-- If no ownership change after 90 days, car wasn't actually sold

ALTER TABLE blocket_salda
ADD COLUMN IF NOT EXISTS agarbyte_gjort BOOLEAN DEFAULT NULL;

-- NULL = inte kollat än
-- TRUE = ägarbyte bekräftat (ny ägare skiljer sig från säljare)
-- FALSE = inget ägarbyte (samma ägare efter 90 dagar = inte såld)

COMMENT ON COLUMN blocket_salda.agarbyte_gjort IS 'NULL=ej kollat, TRUE=ägarbyte bekräftat, FALSE=inget ägarbyte (inte såld)';

-- Index för att filtrera
CREATE INDEX IF NOT EXISTS blocket_salda_agarbyte_idx ON blocket_salda(agarbyte_gjort);
