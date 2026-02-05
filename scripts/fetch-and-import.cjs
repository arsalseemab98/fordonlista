/**
 * Fetch from Bilprospekt API and import directly to Supabase.
 *
 * Usage:
 *   node scripts/fetch-and-import.cjs <brand> [--region 250000] [--pageSize 500] [--yearFrom 2000] [--yearTo 2015]
 *
 * Examples:
 *   node scripts/fetch-and-import.cjs FERRARI
 *   node scripts/fetch-and-import.cjs VOLVO --yearFrom 2000 --yearTo 2010
 *   node scripts/fetch-and-import.cjs TOYOTA --region 250000 --pageSize 1000
 */

// === Config ===
const BP_BASE = 'https://www.bilprospekt.se';
const BP_EMAIL = 'fakturaamlcars@gmail.com';
const BP_PASSWORD = 'Amlcars-2022';

const SUPABASE_URL = 'https://rueqiiqxkazocconmnwp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4';

const BATCH_SIZE = 100;

// === Bilprospekt API ===
let sessionCookie = null;

async function bpLogin() {
  console.log('Logging in to Bilprospekt...');
  const res = await fetch(`${BP_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `email=${encodeURIComponent(BP_EMAIL)}&password=${encodeURIComponent(BP_PASSWORD)}`,
    redirect: 'manual',
  });

  const cookies = res.headers.getSetCookie?.() || [];
  const sess = cookies.find(c => c.startsWith('SESS='));
  if (!sess) {
    // Try raw header
    const raw = res.headers.get('set-cookie') || '';
    const match = raw.match(/SESS=[^;]+/);
    if (match) {
      sessionCookie = match[0];
    } else {
      throw new Error('Login failed - no SESS cookie received');
    }
  } else {
    sessionCookie = sess.split(';')[0];
  }
  console.log(`Logged in (cookie length: ${sessionCookie.length})`);
}

async function bpSearch(body) {
  const res = await fetch(`${BP_BASE}/prospect/car/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bilprospekt search failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function bpCount(body) {
  const res = await fetch(`${BP_BASE}/prospect/numberOfResults`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  return res.json();
}

function buildSearchBody({ brand, region = '250000', pageSize = 500, page = 0, possessionTo = 180, carYearFrom, carYearTo }) {
  const body = {
    car: {
      carType: [{ val: 'PB', children: [] }],
      brands: [{ val: brand.toUpperCase(), children: [] }],
      possessionTime: { from: null, to: possessionTo },
    },
    regions: {
      regions: [{ val: region, children: [] }],
    },
    diverse: {
      type: {
        dealer: [{ val: 0 }],
        government: [{ val: 1 }],
        leasing_company: [{ val: 1 }],
        scrap: [{ val: 0 }],
        rental: [{ val: 1 }],
        filial: [{ val: 1 }],
      },
    },
    extraFilters: {},
    pageSize,
    page,
  };

  if (carYearFrom || carYearTo) {
    body.car.carYear = {};
    if (carYearFrom) body.car.carYear.from = carYearFrom;
    if (carYearTo) body.car.carYear.to = carYearTo;
  }

  return body;
}

// === Mapping ===
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
    mileage: null,
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

// === Supabase ===
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

// === Extract reg_numbers from response ===
function extractRegNumbers(data) {
  // Bilprospekt returns reg_number in each prospect object
  const regNumbers = [];
  const prospects = data.data || data || [];
  for (const p of prospects) {
    regNumbers.push(p.reg_number || null);
  }
  return regNumbers;
}

// === Main ===
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help') {
    console.log('Usage: node scripts/fetch-and-import.cjs <brand> [--region 250000] [--pageSize 500] [--yearFrom YYYY] [--yearTo YYYY]');
    process.exit(0);
  }

  const brand = args[0].toUpperCase();
  const opts = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    opts[key] = args[i + 1];
  }

  const region = opts.region || '250000';
  const pageSize = parseInt(opts.pageSize || '500', 10);
  const carYearFrom = opts.yearFrom ? parseInt(opts.yearFrom, 10) : undefined;
  const carYearTo = opts.yearTo ? parseInt(opts.yearTo, 10) : undefined;

  const yearLabel = carYearFrom || carYearTo
    ? ` (${carYearFrom || '?'}-${carYearTo || '?'})`
    : '';

  console.log(`\n=== ${brand}${yearLabel} ===`);

  // Login
  await bpLogin();

  // Build search body
  const searchBody = buildSearchBody({ brand, region, pageSize, possessionTo: 180, carYearFrom, carYearTo });

  // Get count first
  const countResult = await bpCount(searchBody);
  const totalCount = countResult?.total || countResult?.amount || '?';
  console.log(`Total prospects: ${totalCount}`);

  // Fetch all pages
  let allProspects = [];
  let allRegNumbers = [];
  let page = 0;

  while (true) {
    const body = { ...searchBody, page };
    const result = await bpSearch(body);

    const prospects = result.data || [];
    if (prospects.length === 0) break;

    const regNumbers = extractRegNumbers(result);
    allProspects.push(...prospects);
    allRegNumbers.push(...regNumbers);

    console.log(`  Page ${page}: ${prospects.length} prospects (total so far: ${allProspects.length})`);

    if (prospects.length < pageSize) break;
    page++;
  }

  console.log(`Fetched ${allProspects.length} prospects total`);

  if (allProspects.length === 0) {
    console.log('No prospects found. Done.');
    return;
  }

  // Map and deduplicate
  const seenBpIds = new Set();
  const rows = [];
  let skippedDuplicates = 0;

  for (let i = 0; i < allProspects.length; i++) {
    const regNumber = i < allRegNumbers.length ? allRegNumbers[i] : null;
    if (!regNumber) continue;

    const bpId = allProspects[i].id;
    if (seenBpIds.has(bpId)) {
      skippedDuplicates++;
      continue;
    }
    seenBpIds.add(bpId);
    rows.push(mapProspect(allProspects[i], regNumber));
  }

  console.log(`Mapped ${rows.length} unique rows (${skippedDuplicates} duplicates skipped)`);

  // Upsert to Supabase
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
      let batchInserted = 0;
      for (const row of batch) {
        try {
          await upsertBatch([row]);
          batchInserted++;
          inserted++;
        } catch (rowErr) {
          console.error(`    bp_id=${row.bp_id} reg=${row.reg_number} FAILED:`, rowErr.message);
        }
      }
      console.log(`  Batch ${batchNum} recovered: ${batchInserted}/${batch.length}`);
    }
  }

  console.log(`\n✓ ${brand}${yearLabel}: ${inserted}/${rows.length} rows upserted to Supabase`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
