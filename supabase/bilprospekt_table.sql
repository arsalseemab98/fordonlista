-- Bilprospekt Prospects Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS bilprospekt_prospects (
    id SERIAL PRIMARY KEY,
    bp_id INTEGER UNIQUE NOT NULL,
    reg_number VARCHAR(10) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    fuel VARCHAR(30),
    color VARCHAR(30),
    car_year INTEGER,
    date_acquired DATE,
    owner_name VARCHAR(255),
    owner_type VARCHAR(20),
    owner_gender VARCHAR(1),
    owner_birth_year INTEGER,
    address VARCHAR(255),
    zip VARCHAR(10),
    municipality VARCHAR(100),
    region VARCHAR(100),
    region_code VARCHAR(10),
    kaross VARCHAR(100),
    transmission VARCHAR(20),
    engine_power INTEGER,
    mileage INTEGER,
    weight INTEGER,
    leasing BOOLEAN DEFAULT FALSE,
    credit BOOLEAN DEFAULT FALSE,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bilprospekt_brand ON bilprospekt_prospects(brand);
CREATE INDEX IF NOT EXISTS idx_bilprospekt_region ON bilprospekt_prospects(region_code);
CREATE INDEX IF NOT EXISTS idx_bilprospekt_fuel ON bilprospekt_prospects(fuel);
CREATE INDEX IF NOT EXISTS idx_bilprospekt_municipality ON bilprospekt_prospects(municipality);
CREATE INDEX IF NOT EXISTS idx_bilprospekt_year ON bilprospekt_prospects(car_year);

-- Sample data (20 VOLVO prospects from Norrbotten 2018-2025)
INSERT INTO bilprospekt_prospects (bp_id, reg_number, brand, model, fuel, color, car_year, date_acquired, owner_name, owner_type, owner_gender, owner_birth_year, address, zip, municipality, region, region_code, kaross, transmission, engine_power, mileage, weight, leasing, credit) VALUES
(857999, 'RBX09Y', 'VOLVO', 'XC60', 'LADDHYBRID', 'LGRÅ', 2025, '2025-05-12', 'Kvinna, 80, LULEÅ', 'private', 'K', 1946, 'TÄRNGRÄND 5', '97455', 'LULEÅ', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 186, NULL, 2660, FALSE, TRUE),
(868710, 'DXS65E', 'VOLVO', 'XC60', 'ELHYBRID', 'SILVER', 2022, '2025-10-13', 'Man, 79, LULEÅ', 'private', 'M', 1947, 'SKOMAKARGATAN 32 B', '97241', 'LULEÅ', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 184, 434, 2450, FALSE, TRUE),
(868712, 'NJA12D', 'VOLVO', 'XC40', 'EL', 'SILVER', 2022, '2024-07-12', 'Man, 79, PITEÅ', 'private', 'M', 1947, 'STORFORSVÄGEN 81', '94471', 'PITEÅ', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', NULL, 450, 2480, FALSE, FALSE),
(820115, 'HRS67R', 'VOLVO', 'XC60', 'ELHYBRID', 'MBLÅ', 2020, '2021-04-14', 'Kvinna, 80, BODEN', 'private', 'K', 1946, 'FÖRBANDSVÄGEN 3', '96143', 'BODEN', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 184, 352, 2450, FALSE, FALSE),
(861244, 'GOF48D', 'VOLVO', 'XC40', 'BENSIN', 'RÖD', 2020, '2020-12-02', 'Man, 80, KALIX', 'private', 'M', 1946, 'OSKARSSTIGEN 2', '95251', 'KALIX', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 120, 0, 2120, FALSE, FALSE),
(878690, 'GXK902', 'VOLVO', 'XC40', 'BENSIN', 'SVART', 2020, '2020-12-03', 'Man, 79, KALIX', 'private', 'M', 1947, 'SMEDSGATAN 26', '95263', 'KALIX', 'Norrbottens län', '25', 'Stationsvagn', 'Manuell', 95, 187, 2060, FALSE, FALSE),
(806968, 'ZXR00J', 'VOLVO', 'XC60', 'LADDHYBRID', 'GRÅ', 2022, '2022-11-03', 'Man, 80, LULEÅ', 'private', 'M', 1946, 'ARMÉVÄGEN 21', '97443', 'LULEÅ', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 186, 470, 2660, FALSE, FALSE),
(807602, 'FDU812', 'VOLVO', 'V60 CROSS COUNTRY', 'DIESEL', 'LBLÅ', 2018, '2018-03-23', 'Man, 80, LULEÅ', 'private', 'M', 1946, 'FÄLTSPATSTIGEN 44', '97753', 'LULEÅ', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 140, 858, 2300, FALSE, FALSE),
(874940, 'TLR153', 'VOLVO', 'XC40', 'DIESEL', 'SVART', 2018, '2020-11-10', 'Kvinna, 79, KALIX', 'private', 'K', 1947, 'MÅRDSTIGEN 1', '95242', 'KALIX', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 110, 516, 2240, FALSE, FALSE),
(873318, 'CWP747', 'VOLVO', 'XC40', 'EL', 'VIT', 2021, '2022-12-22', 'Man, 79, PITEÅ', 'private', 'M', 1947, 'NYGATAN 24', '94131', 'PITEÅ', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', NULL, 298, 2650, FALSE, FALSE),
(853000, 'ECX67Z', 'VOLVO', 'V90 CROSS COUNTRY', 'DIESEL', 'GRÅ', 2019, '2021-01-27', 'Man, 80, LULEÅ', 'private', 'M', 1946, 'KVARTSSTIGEN 34', '97753', 'LULEÅ', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 140, 1177, 2420, FALSE, FALSE),
(842483, 'JMP03Y', 'VOLVO', 'XC60', 'LADDHYBRID', 'SILVER', 2024, '2025-02-14', 'Man, 80, BODEN', 'private', 'M', 1946, 'VIKTORIAGATAN 9 A', '96136', 'BODEN', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 186, NULL, 2660, FALSE, TRUE),
(858709, 'WBZ61U', 'VOLVO', 'XC60', 'LADDHYBRID', 'RÖD', 2025, '2025-04-30', 'Man, 80, BODEN', 'private', 'M', 1946, 'TEGNERGATAN 8', '96133', 'BODEN', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 186, NULL, 2660, FALSE, FALSE),
(863151, 'PRU43T', 'VOLVO', 'XC60', 'ELHYBRID', 'RÖD', 2020, '2021-08-04', 'Man, 79, ROSVIK', 'private', 'M', 1947, 'MARMORGRÄND 12', '94534', 'ROSVIK', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 184, NULL, 2450, FALSE, FALSE),
(865315, 'NDK63A', 'VOLVO', 'XC40', 'ELHYBRID', 'VIT', 2020, '2025-09-18', 'Man, 79, LULEÅ', 'private', 'M', 1947, 'TRANMYRVÄGEN 9', '97592', 'LULEÅ', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 145, 2130, 2280, FALSE, FALSE),
(863503, 'HCH347', 'VOLVO', 'V40', 'DIESEL', 'GRÅ', 2018, '2020-03-25', 'Man, 79, ÖJEBYN', 'private', 'M', 1947, 'KARLBERGSVÄGEN 19', '94331', 'ÖJEBYN', 'Norrbottens län', '25', 'Flerbruk', 'Manuell', 88, 857, 1920, FALSE, FALSE),
(863823, 'NJW945', 'VOLVO', 'XC60', 'DIESEL', 'GRÅ', 2018, '2021-04-27', 'Man, 79, NORRFJÄRDEN', 'private', 'M', 1947, 'STUGGATAN 26', '94531', 'NORRFJÄRDEN', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 140, 557, 2450, FALSE, FALSE),
(843603, 'JEL71E', 'VOLVO', 'XC60', 'LADDHYBRID', 'RÖD', 2022, '2022-09-19', 'Man, 80, HAPARANDA', 'private', 'M', 1946, 'LAESTADIUS VÄG 20', '95334', 'HAPARANDA', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 186, 122, 2660, FALSE, FALSE),
(846485, 'RWA06A', 'VOLVO', 'XC60', 'ELHYBRID', 'VIT', 2022, '2025-04-14', 'Man, 80, LULEÅ', 'private', 'M', 1946, 'ANTBERGSVÄGEN 1', '97596', 'LULEÅ', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 145, 697, 2540, FALSE, FALSE),
(847647, 'RAL47W', 'VOLVO', 'V60 CROSS COUNTRY', 'ELHYBRID', 'LGRÅ', 2023, '2025-05-12', 'Man, 80, PITEÅ', 'private', 'M', 1946, 'NORRA STENARMEN 79', '94143', 'PITEÅ', 'Norrbottens län', '25', 'Stationsvagn', 'Automat', 145, NULL, 2410, FALSE, TRUE)
ON CONFLICT (bp_id) DO UPDATE SET
  reg_number = EXCLUDED.reg_number,
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  fuel = EXCLUDED.fuel,
  color = EXCLUDED.color,
  car_year = EXCLUDED.car_year,
  date_acquired = EXCLUDED.date_acquired,
  owner_name = EXCLUDED.owner_name,
  updated_at = NOW();

-- Enable RLS
ALTER TABLE bilprospekt_prospects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read for all (anon and authenticated)
CREATE POLICY "Allow read for all" ON bilprospekt_prospects
    FOR SELECT USING (true);

-- Policy: Allow all for authenticated users
CREATE POLICY "Allow all for authenticated" ON bilprospekt_prospects
    FOR ALL TO authenticated USING (true);

-- Comment
COMMENT ON TABLE bilprospekt_prospects IS 'Vehicle prospects imported from Bilprospekt MCP API. Data updates weekly.';
