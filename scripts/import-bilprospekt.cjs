/**
 * Import Bilprospekt MCP output JSON into Supabase bilprospekt_prospects table.
 *
 * Usage: node scripts/import-bilprospekt.cjs <json-file-path>
 *
 * Reads the MCP vehicle_search output file, transforms data to DB schema,
 * deduplicates by bp_id, and upserts in batches via Supabase REST API.
 */

const fs = require('fs');

// Supabase config
const SUPABASE_URL = 'https://rueqiiqxkazocconmnwp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4';

const BATCH_SIZE = 100;

function parseDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  if (s.length === 8 && /^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return null;
}

function parseCarYear(dateCaryear) {
  if (!dateCaryear) return null;
  const s = String(dateCaryear);
  if (s.length >= 4) {
    const year = parseInt(s.slice(0, 4), 10);
    if (year > 1900 && year < 2100) return year;
  }
  return null;
}

function mapProspect(prospect, regNumber) {
  const gender = prospect.gender || '';
  const genderOrCompany = prospect.genderOrCompany || '';

  let ownerType = null;
  if (genderOrCompany === 'Företag') ownerType = 'company';
  else if (gender === 'M' || gender === 'K') ownerType = 'private';

  let birthYear = prospect.birthYear;
  if (birthYear && (birthYear < 1900 || birthYear > 2020)) birthYear = null;

  const inService = (prospect.car_status === 'I trafik' || prospect.in_service === 'Ja') ? 'Ja' : 'Nej';

  return {
    bp_id: prospect.id,
    reg_number: regNumber,
    brand: prospect.brand || null,
    model: prospect.model || null,
    fuel: prospect.fuel || null,
    color: prospect.color || null,
    car_year: parseCarYear(prospect.date_car_year),
    date_acquired: parseDate(prospect.date_acquired),
    owner_name: prospect.fullName || (prospect.name && prospect.name.fullName) || null,
    owner_type: ownerType,
    owner_gender: gender || null,
    owner_birth_year: birthYear,
    address: prospect.address || null,
    zip: prospect.zip ? String(prospect.zip) : null,
    municipality: prospect.cityName || null,
    region: prospect.regionName || null,
    region_code: prospect.region_code ? String(prospect.region_code) : null,
    kaross: prospect.kaross || null,
    transmission: null,
    engine_power: prospect.engine_strength_hk || null,
    mileage: null, // Skip aprox_mileage — real mileage comes from biluppgifter
    weight: prospect.service_weight || null,
    leasing: prospect.leasing ? true : false,
    credit: prospect.credit ? true : false,
    seller_name: prospect.sellerName || prospect.seller_name || null,
    chassis: prospect.chassi || null,
    in_service: inService,
    cylinder_volume: prospect.cylinder_volume || null,
    fwd: prospect.fwd || null,
    new_or_old: prospect.new_or_old || null,
  };
}

async function upsertBatch(rows) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/bilprospekt_prospects?on_conflict=bp_id`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upsert failed (${response.status}): ${text}`);
  }

  return response.status;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/import-bilprospekt.cjs <json-file-path>');
    process.exit(1);
  }

  console.log(`Reading: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  // MCP output is [{type, text}] array
  let data;
  if (Array.isArray(parsed) && parsed[0] && parsed[0].text) {
    data = JSON.parse(parsed[0].text);
  } else {
    data = parsed;
  }

  const prospects = data.data || [];
  const regNumbers = data.reg_numbers || [];
  const total = data.total?.amount || data.total?.total || prospects.length;

  console.log(`Total in API: ${total}, Prospects returned: ${prospects.length}, Reg numbers: ${regNumbers.length}`);

  if (prospects.length === 0) {
    console.log('No prospects to import.');
    return;
  }

  // Map all prospects and deduplicate by bp_id (one owner can have multiple vehicles)
  const seenBpIds = new Set();
  const rows = [];
  let skippedDuplicates = 0;

  for (let i = 0; i < prospects.length; i++) {
    const regNumber = i < regNumbers.length ? regNumbers[i] : null;
    if (!regNumber) continue;

    const bpId = prospects[i].id;
    if (seenBpIds.has(bpId)) {
      skippedDuplicates++;
      continue;
    }
    seenBpIds.add(bpId);
    rows.push(mapProspect(prospects[i], regNumber));
  }

  console.log(`Mapped ${rows.length} unique rows (${skippedDuplicates} duplicate bp_ids skipped). Upserting in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const status = await upsertBatch(batch);
      inserted += batch.length;
      console.log(`  Batch ${batchNum}/${totalBatches}: ${batch.length} rows → ${status} (total: ${inserted}/${rows.length})`);
    } catch (err) {
      console.error(`  Batch ${batchNum} FAILED:`, err.message);
      // Fallback: insert one by one
      let batchInserted = 0;
      for (const row of batch) {
        try {
          await upsertBatch([row]);
          batchInserted++;
          inserted++;
        } catch (rowErr) {
          console.error(`    Row bp_id=${row.bp_id} reg=${row.reg_number} FAILED:`, rowErr.message);
        }
      }
      console.log(`  Batch ${batchNum} recovered: ${batchInserted}/${batch.length} rows`);
    }
  }

  console.log(`\nDone! ${inserted}/${rows.length} rows upserted.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
