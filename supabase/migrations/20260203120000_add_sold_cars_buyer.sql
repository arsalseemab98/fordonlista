-- Table for tracking sold cars and their buyers
-- Links Blocket sold listings with new owner data from Biluppgifter

CREATE TABLE IF NOT EXISTS blocket_salda (
  id SERIAL PRIMARY KEY,
  blocket_id INTEGER REFERENCES blocket_annonser(id),
  regnummer TEXT NOT NULL,

  -- Säljdata (från Blocket)
  slutpris INTEGER,                    -- Sista pris på Blocket
  liggtid_dagar INTEGER,               -- Dagar från publicering till såld
  saljare_typ TEXT,                    -- 'handlare' / 'privat'
  saljare_namn TEXT,                   -- Om handlare, vilken?
  sold_at TIMESTAMPTZ,                 -- När annonsen försvann

  -- Bildata (från Blocket)
  marke TEXT,
  modell TEXT,
  arsmodell INTEGER,
  miltal INTEGER,

  -- Köpardata (från Biluppgifter - NY ägare)
  kopare_namn TEXT,
  kopare_typ TEXT,                     -- 'privatperson' / 'företag' / 'handlare'
  kopare_is_dealer BOOLEAN DEFAULT FALSE,
  kopare_alder INTEGER,
  kopare_adress TEXT,
  kopare_postnummer TEXT,
  kopare_postort TEXT,
  kopare_telefon TEXT,

  -- Köparens fordon (JSONB array)
  kopare_fordon JSONB DEFAULT '[]',    -- [{ regnr, model, year, ownership_time }]

  -- Fordon på köparens adress (JSONB array)
  adress_fordon JSONB DEFAULT '[]',    -- [{ regnr, model, year, status }]

  -- Metadata
  buyer_fetched_at TIMESTAMPTZ,        -- När vi hämtade köpardata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unik constraint
  UNIQUE(regnummer, sold_at)
);

-- Index för snabba sökningar
CREATE INDEX IF NOT EXISTS blocket_salda_regnummer_idx ON blocket_salda(regnummer);
CREATE INDEX IF NOT EXISTS blocket_salda_sold_at_idx ON blocket_salda(sold_at DESC);
CREATE INDEX IF NOT EXISTS blocket_salda_kopare_typ_idx ON blocket_salda(kopare_typ);
CREATE INDEX IF NOT EXISTS blocket_salda_kopare_is_dealer_idx ON blocket_salda(kopare_is_dealer);

-- Kommentar
COMMENT ON TABLE blocket_salda IS 'Sålda bilar från Blocket med köpardata från Biluppgifter';
