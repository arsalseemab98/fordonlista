-- Increase column sizes to handle longer values from car.info
-- fuel_type can be "Bensin (E10-kompatibel)" (22 chars) etc.

ALTER TABLE vehicles ALTER COLUMN fuel_type TYPE VARCHAR(50);
ALTER TABLE vehicles ALTER COLUMN color TYPE VARCHAR(50);
ALTER TABLE vehicles ALTER COLUMN transmission TYPE VARCHAR(50);
