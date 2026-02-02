-- Create table for known car dealers (bilhandlare)
-- Built from cross-referencing Blocket ads with Biluppgifter data

CREATE TABLE IF NOT EXISTS known_dealers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL, -- Lowercase, trimmed for matching
  source TEXT DEFAULT 'blocket', -- Where we learned about this dealer
  ad_count INTEGER DEFAULT 1, -- Number of ads seen from this dealer
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  regions TEXT[], -- Regions where this dealer operates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on normalized name to avoid duplicates
CREATE UNIQUE INDEX IF NOT EXISTS known_dealers_normalized_name_idx ON known_dealers(normalized_name);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS known_dealers_name_idx ON known_dealers(name);

-- Function to normalize dealer names for matching
-- "Norrlands Bil AB" -> "norrlands bil ab"
-- "NORRLANDS BIL" -> "norrlands bil"
CREATE OR REPLACE FUNCTION normalize_dealer_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '\s+', ' ', 'g'), -- Multiple spaces to single
      '^\s+|\s+$', '', 'g' -- Trim
    )
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if a name matches any known dealer
-- Uses fuzzy matching: checks if name CONTAINS any known dealer name
CREATE OR REPLACE FUNCTION is_known_dealer(owner_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  normalized TEXT;
  dealer_name TEXT;
BEGIN
  IF owner_name IS NULL THEN
    RETURN FALSE;
  END IF;

  normalized := normalize_dealer_name(owner_name);

  -- Check for exact match or if owner_name contains dealer name
  RETURN EXISTS (
    SELECT 1 FROM known_dealers
    WHERE normalized_name = normalized
       OR normalized LIKE '%' || normalized_name || '%'
       OR normalized_name LIKE '%' || normalized || '%'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get matching dealer for an owner name
CREATE OR REPLACE FUNCTION get_matching_dealer(owner_name TEXT)
RETURNS TABLE(dealer_id INTEGER, dealer_name TEXT, match_type TEXT) AS $$
DECLARE
  normalized TEXT;
BEGIN
  IF owner_name IS NULL THEN
    RETURN;
  END IF;

  normalized := normalize_dealer_name(owner_name);

  -- Exact match first
  RETURN QUERY
  SELECT id, name, 'exact'::TEXT
  FROM known_dealers
  WHERE normalized_name = normalized
  LIMIT 1;

  IF NOT FOUND THEN
    -- Partial match (owner contains dealer)
    RETURN QUERY
    SELECT id, name, 'partial'::TEXT
    FROM known_dealers
    WHERE normalized LIKE '%' || normalized_name || '%'
    ORDER BY LENGTH(normalized_name) DESC -- Prefer longer matches
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    -- Reverse partial match (dealer contains owner)
    RETURN QUERY
    SELECT id, name, 'reverse'::TEXT
    FROM known_dealers
    WHERE normalized_name LIKE '%' || normalized || '%'
    ORDER BY LENGTH(normalized_name) ASC -- Prefer shorter/more specific
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
