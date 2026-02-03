-- Separat tabell för bilar som markerades "SÅLD" men aldrig bytte ägare
-- Dessa är irrelevanta för marknadsanalys

CREATE TABLE IF NOT EXISTS blocket_ej_salda (
  id SERIAL PRIMARY KEY,
  blocket_id INTEGER REFERENCES blocket_annonser(id),
  regnummer TEXT NOT NULL,

  -- Original ägare (samma som "nuvarande" - inget ägarbyte)
  agare_namn TEXT,

  -- Annonsdata
  marke TEXT,
  modell TEXT,
  arsmodell INTEGER,
  pris INTEGER,

  -- Tidsstämplar
  annons_skapad DATE,           -- När annonsen lades upp
  annons_borttagen DATE,        -- När annonsen försvann
  liggtid_dagar INTEGER,        -- Hur länge annonsen var uppe

  -- Tracking
  check_count INTEGER DEFAULT 1,  -- Antal gånger vi kollade
  verified_at TIMESTAMPTZ DEFAULT NOW(),  -- När vi bekräftade att ej såld

  UNIQUE(regnummer, annons_borttagen)
);

-- Index
CREATE INDEX IF NOT EXISTS blocket_ej_salda_regnummer_idx ON blocket_ej_salda(regnummer);
CREATE INDEX IF NOT EXISTS blocket_ej_salda_verified_at_idx ON blocket_ej_salda(verified_at DESC);

COMMENT ON TABLE blocket_ej_salda IS 'Annonser markerade SÅLD men utan ägarbyte efter 90 dagar - irrelevanta för analys';
