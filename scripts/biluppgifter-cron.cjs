#!/usr/bin/env node
/**
 * Biluppgifter Cron Job
 * Hämtar biluppgifter för aktiva Blocket-annonser som saknar data
 *
 * Kör via: node scripts/biluppgifter-cron.cjs
 * Cron: Var 30:e minut, 07-18
 */

const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = 'https://rueqiiqxkazocconmnwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4';
const BILUPPGIFTER_API = process.env.BILUPPGIFTER_API_URL || 'http://localhost:3456';
const BATCH_SIZE = 10;
const DELAY_MS = 1500;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Logging
async function log(type, message, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`, details.error || '');

  // Spara till databas
  try {
    await supabase.from('biluppgifter_log').insert({
      type,
      message,
      details,
      created_at: timestamp
    });
  } catch (err) {
    console.error('Could not save log to DB:', err.message);
  }
}

// Check if biluppgifter API is available
async function checkApiHealth() {
  try {
    const response = await fetch(`${BILUPPGIFTER_API}/health`, {
      timeout: 5000
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { ok: true, status: data.status };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// Get active ads without biluppgifter
async function getAdsWithoutBiluppgifter(limit) {
  // Hämta ALLA regnummer som redan har biluppgifter
  const { data: existing } = await supabase
    .from('biluppgifter_data')
    .select('regnummer');

  const existingSet = new Set(existing?.map(e => e.regnummer.toUpperCase()) || []);

  // Hämta aktiva annonser med regnummer (fler för att hitta de som saknas)
  const { data: ads, error: adsError } = await supabase
    .from('blocket_annonser')
    .select('id, regnummer, marke, modell, arsmodell')
    .is('borttagen', null)
    .not('regnummer', 'is', null)
    .order('publicerad', { ascending: false })
    .limit(500);  // Hämta fler för att hitta de som saknas

  if (adsError) throw new Error(`Supabase error: ${adsError.message}`);
  if (!ads || ads.length === 0) return [];

  // Filtrera bort de som redan har biluppgifter
  return ads
    .filter(a => !existingSet.has(a.regnummer.toUpperCase()))
    .slice(0, limit);
}

// Fetch biluppgifter for one car
async function fetchBiluppgifter(regnr) {
  try {
    const response = await fetch(`${BILUPPGIFTER_API}/api/owner/${regnr}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`API error: ${error.message}`);
  }
}

// Fetch profile by ID (for previous owner)
async function fetchProfile(profileId) {
  try {
    const response = await fetch(`${BILUPPGIFTER_API}/api/profile/${profileId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.log(`  ⚠️ Kunde inte hämta profil ${profileId}: ${error.message}`);
    return null;
  }
}

// Find previous private owner from owner_history
function findPreviousPrivateOwner(ownerHistory) {
  if (!ownerHistory || !Array.isArray(ownerHistory)) return null;

  // Skip first entry (current owner), find first "person" (privatperson)
  for (let i = 1; i < ownerHistory.length; i++) {
    const owner = ownerHistory[i];
    if (owner.owner_class === 'person' && owner.profile_id) {
      return owner;
    }
  }
  return null;
}

// Save biluppgifter to database
async function saveBiluppgifter(blocketId, regnr, data) {
  if (!data?.owner_profile) return false;

  const profile = data.owner_profile;
  const isDealer = profile.vehicles?.length >= 10 || false;

  const dbData = {
    regnummer: regnr,
    blocket_id: blocketId,
    owner_name: profile.name || null,
    owner_age: profile.age || null,
    owner_city: profile.city || null,
    owner_address: profile.address || null,
    owner_postal_code: profile.postal_code || null,
    owner_postal_city: profile.postal_city || null,
    owner_phone: profile.phone || null,
    owner_vehicles: profile.vehicles || [],
    address_vehicles: profile.address_vehicles || [],
    mileage_history: data.mileage_history || [],
    owner_history: data.owner_history || [],
    is_dealer: isDealer,
    fetched_at: new Date().toISOString(),
    previous_owner: null
  };

  // Om handlare: hämta förra privata ägaren
  if (isDealer && data.owner_history) {
    const prevOwnerInfo = findPreviousPrivateOwner(data.owner_history);
    if (prevOwnerInfo) {
      console.log(`  🔍 Handlare! Hämtar förra ägaren: ${prevOwnerInfo.name}...`);
      const prevProfile = await fetchProfile(prevOwnerInfo.profile_id);

      if (prevProfile) {
        dbData.previous_owner = {
          name: prevProfile.name || prevOwnerInfo.name,
          profile_id: prevOwnerInfo.profile_id,
          purchase_date: prevOwnerInfo.date,
          age: prevProfile.age || null,
          city: prevProfile.city || null,
          address: prevProfile.address || null,
          postal_code: prevProfile.postal_code || null,
          postal_city: prevProfile.postal_city || null,
          phone: prevProfile.phone || null,
          vehicles: prevProfile.vehicles || []
        };
        console.log(`  ✅ Förra ägare: ${prevProfile.name}, ${prevProfile.age} år, ${prevProfile.city}, tel: ${prevProfile.phone || 'saknas'}`);
      }
    }
  }

  const { error } = await supabase
    .from('biluppgifter_data')
    .upsert(dbData, { onConflict: 'regnummer' });

  if (error) throw new Error(`DB error: ${error.message}`);
  return { saved: true, isDealer, hasPreviousOwner: !!dbData.previous_owner };
}

// Main function
async function main() {
  const startTime = Date.now();
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  await log('info', 'Biluppgifter cron started', { api_url: BILUPPGIFTER_API });

  // 1. Check API health
  const health = await checkApiHealth();
  if (!health.ok) {
    await log('error', 'Biluppgifter API not available', {
      error: health.error,
      api_url: BILUPPGIFTER_API
    });
    process.exit(1);
  }
  await log('info', 'API health check passed');

  // 2. Get ads without biluppgifter
  let ads;
  try {
    ads = await getAdsWithoutBiluppgifter(BATCH_SIZE);
  } catch (error) {
    await log('error', 'Failed to get ads', { error: error.message });
    process.exit(1);
  }

  if (ads.length === 0) {
    await log('info', 'No ads need biluppgifter', { checked: BATCH_SIZE });
    process.exit(0);
  }

  await log('info', `Found ${ads.length} ads without biluppgifter`);

  // 3. Fetch biluppgifter for each ad
  let dealers = 0;
  let withPrevOwner = 0;

  for (const ad of ads) {
    const regnr = ad.regnummer.toUpperCase();

    try {
      const data = await fetchBiluppgifter(regnr);

      if (data?.owner_profile) {
        const result = await saveBiluppgifter(ad.id, regnr, data);
        success++;

        if (result.isDealer) {
          dealers++;
          if (result.hasPreviousOwner) withPrevOwner++;
        }

        const ownerInfo = result.isDealer ? '🏪 HANDLARE' : `👤 ${data.owner_profile.name}`;
        console.log(`✅ ${regnr}: ${ownerInfo}`);
      } else {
        skipped++;
        console.log(`⚠️ ${regnr}: Ingen ägardata`);
      }
    } catch (error) {
      failed++;
      errors.push({ regnr, error: error.message });
      console.log(`❌ ${regnr}: ${error.message}`);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  // 4. Log summary
  const duration = Math.round((Date.now() - startTime) / 1000);
  await log('info', 'Biluppgifter cron completed', {
    success,
    failed,
    skipped,
    dealers,
    with_previous_owner: withPrevOwner,
    duration_seconds: duration,
    errors: errors.length > 0 ? errors : undefined
  });

  console.log(`\n✅ Klart! ${success} sparade (${dealers} handlare, ${withPrevOwner} med förra ägare), ${skipped} utan data, ${failed} fel (${duration}s)`);
}

// Run
main().catch(async (error) => {
  await log('error', 'Cron job crashed', { error: error.message });
  console.error('Fatal error:', error);
  process.exit(1);
});
