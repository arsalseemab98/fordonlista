-- Pending table for sold cars waiting for ownership verification
-- Tracks cars that have been checked but ownership hasn't changed yet

CREATE TABLE IF NOT EXISTS blocket_salda_pending (
  id SERIAL PRIMARY KEY,
  blocket_id INTEGER REFERENCES blocket_annonser(id),
  regnummer TEXT NOT NULL,

  -- Original ägare (från biluppgifter_data när annonsen var aktiv)
  original_owner TEXT,

  -- Tracking
  first_checked_at TIMESTAMPTZ DEFAULT NOW(),  -- När vi först kollade
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),   -- Senast vi kollade
  check_count INTEGER DEFAULT 1,                -- Antal gånger vi kollat

  -- Bildata (för referens)
  marke TEXT,
  modell TEXT,
  arsmodell INTEGER,
  pris INTEGER,
  sold_at TIMESTAMPTZ,  -- När annonsen försvann från Blocket

  UNIQUE(regnummer)
);

-- Index för snabba sökningar
CREATE INDEX IF NOT EXISTS blocket_salda_pending_last_checked_idx
  ON blocket_salda_pending(last_checked_at);
CREATE INDEX IF NOT EXISTS blocket_salda_pending_sold_at_idx
  ON blocket_salda_pending(sold_at);

COMMENT ON TABLE blocket_salda_pending IS 'Sålda bilar som väntar på ägarbyte-verifiering';
