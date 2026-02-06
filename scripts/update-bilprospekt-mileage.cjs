/**
 * Update bp_aprox_mileage for all bilprospekt_prospects from Bilprospekt API.
 *
 * Usage: node scripts/update-bilprospekt-mileage.cjs
 *
 * Fetches all prospects from Bilprospekt API (region by region, year by year),
 * extracts aprox_mileage, and updates existing rows in the database.
 * Only updates bp_aprox_mileage — does NOT overwrite other fields.
 *
 * Environment variables required:
 *   BILPROSPEKT_EMAIL    - Login email
 *   BILPROSPEKT_PASSWORD - Login password
 *
 * Or pass as arguments:
 *   node scripts/update-bilprospekt-mileage.cjs email@example.com password123
 */

// Supabase config
const SUPABASE_URL = 'https://rueqiiqxkazocconmnwp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4';

// Bilprospekt config
const BASE_URL = 'https://www.bilprospekt.se';
const PAGE_SIZE = 50;
const MAX_PAGES = 180; // 9000 / 50
const BATCH_SIZE = 200;

const REGIONS = [
  { code: '25', name: 'Norrbotten' },
  { code: '24', name: 'Västerbotten' },
  { code: '22', name: 'Västernorrland' },
  { code: '23', name: 'Jämtland' },
];

const YEAR_SEGMENTS = [
  { from: 2023, to: 2026, label: '2023-2026' },
  { from: 2020, to: 2022, label: '2020-2022' },
  { from: 2017, to: 2019, label: '2017-2019' },
  { from: 2014, to: 2016, label: '2014-2016' },
  { from: 2010, to: 2013, label: '2010-2013' },
  { from: 2005, to: 2009, label: '2005-2009' },
  { from: 2000, to: 2004, label: '2000-2004' },
  { from: 1950, to: 1999, label: '<2000' },
];

const TOP_BRANDS = [
  'VOLVO', 'VOLKSWAGEN', 'TOYOTA', 'BMW', 'AUDI', 'MERCEDES-BENZ',
  'SKODA', 'KIA', 'FORD', 'HYUNDAI', 'NISSAN', 'PEUGEOT',
  'RENAULT', 'MAZDA', 'OPEL', 'SUBARU', 'SUZUKI', 'MITSUBISHI',
  'HONDA', 'CITROËN', 'TESLA', 'SEAT', 'SAAB', 'FIAT',
];

// --- Auth ---
let sessionCookies = '';

async function login(email, password) {
  const body = new URLSearchParams({ email, password });
  const resp = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    redirect: 'manual',
  });

  const cookies = [];
  resp.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      for (const part of value.split(/,(?=\s*\w+=)/)) {
        const cookiePart = part.trim().split(';')[0];
        if (cookiePart && !cookies.includes(cookiePart)) {
          cookies.push(cookiePart);
        }
      }
    }
  });

  if (cookies.length === 0) {
    throw new Error(`Login failed (status ${resp.status})`);
  }
  sessionCookies = cookies.join('; ');
  console.log('Logged in to Bilprospekt');
}

async function apiPost(path, body) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookies,
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (resp.status >= 400) {
    throw new Error(`HTTP ${resp.status}: ${text.substring(0, 200)}`);
  }
  return JSON.parse(text);
}

// --- Search ---
function buildSearchBody(region, yearFrom, yearTo, brand, page) {
  const car = {
    carType: [{ val: 'PB', children: [] }],
    possessionTime: { from: null, to: 180 },
  };
  if (yearFrom || yearTo) {
    car.carYear = { from: yearFrom || null, to: yearTo || null };
  }
  if (brand) {
    car.brands = [{ val: brand, children: [] }];
  }
  return {
    car,
    regions: { regions: [{ val: region, children: [] }] },
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
    page: page || 0,
    pageSize: PAGE_SIZE,
    sort: { direction: 'asc', type: '' },
  };
}

/**
 * Extract bp_id → aprox_mileage pairs from a search result.
 */
function extractMileageData(result) {
  const items = result.data || result.prospects || result.items || [];
  const pairs = [];

  for (const item of items) {
    const bpId = item.id || item.prospectId || item.prospect_id;
    if (!bpId) continue;

    const mileage = item.aprox_mileage
      ? parseInt(String(item.aprox_mileage), 10) || null
      : null;

    if (mileage) {
      pairs.push({ bp_id: Number(bpId), bp_aprox_mileage: mileage });
    }
  }

  return pairs;
}

/**
 * Fetch all mileage data for a segment (region + year range + optional brand).
 */
async function fetchSegmentMileage(region, yearFrom, yearTo, brand) {
  const allPairs = [];

  // First page
  const firstResult = await apiPost('/prospect/search', buildSearchBody(region, yearFrom, yearTo, brand, 0));
  const totalCount = Number(firstResult.total || firstResult.count || firstResult.totalCount || 0);

  allPairs.push(...extractMileageData(firstResult));

  const totalPages = Math.min(Math.ceil(totalCount / PAGE_SIZE), MAX_PAGES);

  // Remaining pages
  for (let page = 1; page < totalPages; page++) {
    try {
      const result = await apiPost('/prospect/search', buildSearchBody(region, yearFrom, yearTo, brand, page));
      allPairs.push(...extractMileageData(result));
      await sleep(100);
    } catch (err) {
      console.error(`    Page ${page}/${totalPages} error: ${err.message}`);
    }
  }

  return { pairs: allPairs, totalCount };
}

/**
 * Get count for a search.
 */
async function getCount(region, yearFrom, yearTo, brand) {
  const body = buildSearchBody(region, yearFrom, yearTo, brand, 0);
  body.pageSize = 1;
  const result = await apiPost('/prospect/search', body);
  return Number(result.total || result.count || result.totalCount || 0);
}

// --- Supabase ---
async function updateMileageBatch(pairs) {
  // Use individual updates since Supabase REST doesn't support bulk conditional updates
  let updated = 0;
  let errors = 0;

  for (const { bp_id, bp_aprox_mileage } of pairs) {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/bilprospekt_prospects?bp_id=eq.${bp_id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ bp_aprox_mileage }),
        }
      );
      if (resp.ok) {
        updated++;
      } else {
        errors++;
      }
    } catch {
      errors++;
    }
  }

  return { updated, errors };
}

/**
 * Batch update using RPC for efficiency - updates many rows at once.
 */
async function updateMileageBulk(pairs) {
  // Build a single SQL update using the Supabase PostgREST
  // Group by batches of BATCH_SIZE and update individually (fastest via REST)
  let totalUpdated = 0;
  let totalErrors = 0;

  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE);
    const result = await updateMileageBatch(batch);
    totalUpdated += result.updated;
    totalErrors += result.errors;

    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= pairs.length) {
      process.stdout.write(`  DB: ${totalUpdated} uppdaterade, ${totalErrors} fel\r`);
    }
  }

  return { updated: totalUpdated, errors: totalErrors };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Main ---
async function main() {
  const email = process.argv[2] || process.env.BILPROSPEKT_EMAIL;
  const password = process.argv[3] || process.env.BILPROSPEKT_PASSWORD;

  if (!email || !password) {
    console.error('Usage: node scripts/update-bilprospekt-mileage.cjs [email] [password]');
    console.error('Or set BILPROSPEKT_EMAIL and BILPROSPEKT_PASSWORD env vars');
    process.exit(1);
  }

  console.log('=== Bilprospekt Mileage Updater ===\n');

  // Step 1: Login
  await login(email, password);

  // Step 2: Count how many we have in DB without mileage
  const countResp = await fetch(
    `${SUPABASE_URL}/rest/v1/bilprospekt_prospects?bp_aprox_mileage=is.null&select=id`,
    {
      method: 'HEAD',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact',
      },
    }
  );
  const missingCount = countResp.headers.get('content-range')?.split('/')[1] || '?';
  console.log(`Prospekt utan bp_aprox_mileage: ${missingCount}\n`);

  // Step 3: Process each region × year segment
  let grandTotal = { pairs: 0, updated: 0, errors: 0 };
  const startTime = Date.now();

  for (const region of REGIONS) {
    console.log(`\n--- ${region.name} (${region.code}) ---`);

    for (const yearSeg of YEAR_SEGMENTS) {
      const label = `${region.name} ${yearSeg.label}`;

      try {
        // Get count first
        const count = await getCount(region.code, yearSeg.from, yearSeg.to, null);
        if (count === 0) {
          continue;
        }

        if (count <= 9000) {
          // Fetch directly
          process.stdout.write(`  ${yearSeg.label}: ${count} prospekt... `);
          const { pairs } = await fetchSegmentMileage(region.code, yearSeg.from, yearSeg.to, null);
          console.log(`${pairs.length} med miltal`);

          if (pairs.length > 0) {
            const result = await updateMileageBulk(pairs);
            grandTotal.pairs += pairs.length;
            grandTotal.updated += result.updated;
            grandTotal.errors += result.errors;
            console.log(`  -> ${result.updated} uppdaterade`);
          }
        } else {
          // Subdivide by brand
          console.log(`  ${yearSeg.label}: ${count} prospekt (> 9000, delar per märke)`);

          for (const brand of TOP_BRANDS) {
            const brandCount = await getCount(region.code, yearSeg.from, yearSeg.to, brand);
            if (brandCount === 0) continue;

            process.stdout.write(`    ${brand}: ${brandCount}... `);
            const { pairs } = await fetchSegmentMileage(region.code, yearSeg.from, yearSeg.to, brand);
            console.log(`${pairs.length} med miltal`);

            if (pairs.length > 0) {
              const result = await updateMileageBulk(pairs);
              grandTotal.pairs += pairs.length;
              grandTotal.updated += result.updated;
              grandTotal.errors += result.errors;
            }

            await sleep(200);
          }
        }

        await sleep(150);
      } catch (err) {
        console.error(`  ${label} ERROR: ${err.message}`);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

  console.log('\n=== Klar ===');
  console.log(`Tid: ${elapsed} sekunder`);
  console.log(`Hämtade: ${grandTotal.pairs} prospekt med miltal`);
  console.log(`Uppdaterade: ${grandTotal.updated}`);
  console.log(`Fel: ${grandTotal.errors}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
