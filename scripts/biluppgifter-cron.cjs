#!/usr/bin/env node
/**
 * Biluppgifter Cron Job v2
 * Hämtar biluppgifter för aktiva Blocket-annonser som saknar data
 *
 * Förbättringar:
 * - Randomiserade delays (3-8s) för att undvika rate limiting
 * - Laddar known_dealers för kedjad sökning
 * - Förmedling-detektion (Blocket säljare ≠ biluppgifter ägare)
 * - owner_type: privat, handlare, foretag, formedling
 * - Skippar alla kända handlare i ägarkedjan
 * - Auto-berikar known_dealers med biluppgifter-namn
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

// Randomiserade delays för att efterlikna mänsklig browsing
const MIN_DELAY_MS = 3000;  // 3 sekunder minimum
const MAX_DELAY_MS = 8000;  // 8 sekunder maximum
const PROFILE_DELAY_MIN = 2000;  // Extra delay före profil-hämtning
const PROFILE_DELAY_MAX = 5000;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// In-memory cache av kända handlare (laddas vid start)
let knownDealerNames = new Set();  // Normaliserade namn (lowercase)

// --- Utility ---

function randomDelay(min = MIN_DELAY_MS, max = MAX_DELAY_MS) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, ms));
}

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,\-]/g, '');
}

function namesMatch(name1, name2) {
  if (!name1 || !name2) return false;
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  // Exakt match
  if (n1 === n2) return true;
  // En innehåller den andra (ex: "Hedin Bil" vs "Hedin Automotive Bavaria AB")
  if (n1.includes(n2) || n2.includes(n1)) return true;
  // Första ordet matchar (ex: "Riddermark" i båda)
  const w1 = n1.split(' ')[0];
  const w2 = n2.split(' ')[0];
  if (w1.length > 3 && w1 === w2) return true;
  return false;
}

function isKnownDealer(name) {
  if (!name) return false;
  const normalized = normalizeName(name);
  for (const dealerName of knownDealerNames) {
    if (namesMatch(normalized, dealerName)) return true;
  }
  return false;
}

// Klassificera fordonstyp baserat på modellnamn
function classifyVehicleType(model) {
  if (!model) return 'Okänd';
  const m = model.toLowerCase();

  // MC / Motorcykel
  if (/\b(mc|motorcykel|harley|ducati|yamaha\s*(mt|yz|xv|xt|xjr|fz)|kawasaki\s*(z|ninja|vulcan|vn|zx|er|versys|w\d)|honda\s*(cb|cbr|crf|vfr|vt|vtx|gl\d|nc\d|ctx)|suzuki\s*(gsx|sv|dr|dl|vs|vl|boulevard)|bmw\s*(r\s?\d{3,4}|f\s?\d{3}|g\s?\d{3}|s\s?\d{4}|k\s?\d{4}|c\s?\d{3})|ktm|husqvarna\s*(fe|te|fc|tc|svartpilen|vitpilen)|triumph|indian|aprilia|moto\s?guzzi|royal\s?enfield|vespa|piaggio)\b/.test(m)) return 'MC';

  // Snöskoter
  if (/\b(snöskoter|skoter|ski.?doo|lynx|polaris\s*(indy|rush|switchback|pro|sks|rmk|assault|voyag)|arctic\s?cat|yamaha\s*(sidewinder|viper|venture|sr\s?viper))\b/.test(m)) return 'Snöskoter';

  // ATV / Fyrhjuling
  if (/\b(atv|fyrhjuling|quad|utv|side.?by.?side|polaris\s*(ranger|sportsman|rzr)|can.?am\s*(outlander|renegade|maverick)|cfmoto)\b/.test(m)) return 'ATV';

  // Husvagn / Husbil
  if (/\b(husvagn|husbil|caravan|motorhome|hobby|fendt|adria|knaus|dethleffs|bürstner|hymer|carado|sunlight|eura\s?mobil)\b/.test(m)) return 'Husvagn/Husbil';

  // Släpvagn
  if (/\b(släpvagn|släp|trailer|båttrailer|brenderup|thule|respo|fogelsta|niewiadow)\b/.test(m)) return 'Släpvagn';

  // Transportbil / Lätt lastbil
  if (/\b(transport|skåpbil|lätt\s?lastbil|sprinter|crafter|master|movano|ducato|boxer|transit(?!\s*connect)|daily|man\s+tg[esl]|scania|volvo\s*(fh|fm|fl|fe))\b/.test(m)) return 'Transportbil';

  // Pickup
  if (/\b(pickup|pick.?up|l200|hilux|ranger|navara|amarok|d.?max|fullback|x.?class|gladiator|tacoma|tundra|raptor)\b/.test(m)) return 'Pickup';

  // Maskin / Traktor
  if (/\b(traktor|maskin|grävmaskin|hjullastare|dumper|new\s?holland|john\s?deere|kubota|volvo\s*(l\d|ec\d|bl\d)|caterpillar|cat\s?\d|jcb|case\s?(ih)?|valtra|fendt|claas|deutz|zetor|massey|ferguson)\b/.test(m)) return 'Maskin';

  // Personbil (default)
  return 'Personbil';
}

// Berika fordonslista med typ
function enrichVehicles(vehicles) {
  if (!vehicles || !Array.isArray(vehicles)) return [];
  return vehicles.map(v => ({
    ...v,
    vehicle_type: classifyVehicleType(v.model || '')
  }));
}

// --- Logging ---

async function log(type, message, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`, details.error || '');
  try {
    await supabase.from('biluppgifter_log').insert({
      type, message, details, created_at: timestamp
    });
  } catch (err) {
    console.error('Could not save log to DB:', err.message);
  }
}

// --- API ---

async function checkApiHealth() {
  try {
    const response = await fetch(`${BILUPPGIFTER_API}/health`, { timeout: 5000 });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { ok: true, status: data.status };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function fetchBiluppgifter(regnr) {
  try {
    const response = await fetch(`${BILUPPGIFTER_API}/api/owner/${regnr}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.owner_profile && !data.error) return data;

    // Fallback: /api/vehicle/ har data även när owner misslyckas (t.ex. "Okänd" ägare)
    console.log(`  owner-endpoint saknar data, testar vehicle-endpoint...`);
    await randomDelay(PROFILE_DELAY_MIN, PROFILE_DELAY_MAX);
    const vehResponse = await fetch(`${BILUPPGIFTER_API}/api/vehicle/${regnr}`);
    if (!vehResponse.ok) return data;
    const vehData = await vehResponse.json();

    if (!vehData?.owner?.history?.length) return data;

    const ownerHistory = vehData.owner.history;
    const result = {
      regnummer: regnr,
      owner_history: ownerHistory,
      mileage_history: vehData.mileage_history || [],
      owner_profile: null,
      _from_vehicle: true
    };

    const firstWithProfile = ownerHistory.find(o => o.profile_id);
    if (firstWithProfile) {
      const profile = await fetchProfile(firstWithProfile.profile_id);
      if (profile) {
        result.owner_profile = profile;
        result._profile_owner_index = ownerHistory.indexOf(firstWithProfile);
      }
    }

    return result;
  } catch (error) {
    throw new Error(`API error: ${error.message}`);
  }
}

async function fetchProfile(profileId) {
  try {
    // Extra random delay före profil-hämtning
    await randomDelay(PROFILE_DELAY_MIN, PROFILE_DELAY_MAX);
    const response = await fetch(`${BILUPPGIFTER_API}/api/profile/${profileId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.log(`  ⚠️ Kunde inte hämta profil ${profileId}: ${error.message}`);
    return null;
  }
}

// --- Known Dealers ---

async function loadKnownDealers() {
  const { data: dealers } = await supabase
    .from('known_dealers')
    .select('name, biluppgifter_name');

  if (!dealers) return;

  for (const d of dealers) {
    if (d.name) knownDealerNames.add(normalizeName(d.name));
    if (d.biluppgifter_name) knownDealerNames.add(normalizeName(d.biluppgifter_name));
  }

  console.log(`📋 Laddade ${knownDealerNames.size} kända handlarnamn (${dealers.length} handlare)`);
}

async function enrichKnownDealer(blocketName, biluppgifterName, profile) {
  if (!blocketName) return;

  try {
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (biluppgifterName) updateData.biluppgifter_name = biluppgifterName;
    if (profile?.address) updateData.address = profile.address;
    if (profile?.postal_code) updateData.postal_code = profile.postal_code;
    if (profile?.postal_city) updateData.postal_city = profile.postal_city;
    if (profile?.phone) updateData.phone = profile.phone;
    if (profile?.vehicles) updateData.vehicle_count = profile.vehicles.length;

    await supabase
      .from('known_dealers')
      .update(updateData)
      .eq('name', blocketName);

    // Lägg till biluppgifter-namn i cache
    if (biluppgifterName) {
      knownDealerNames.add(normalizeName(biluppgifterName));
    }
  } catch (err) {
    console.log(`  ⚠️ Kunde inte berika handlare ${blocketName}: ${err.message}`);
  }
}

// --- Chain Traversal ---

/**
 * Gå igenom owner_history och hoppa alla kända handlare
 * Returnerar första icke-handlare (person eller företag)
 */
function findLeadInChain(ownerHistory) {
  if (!ownerHistory || !Array.isArray(ownerHistory)) return null;

  // Börja från index 1 (hoppa nuvarande ägare)
  for (let i = 1; i < ownerHistory.length; i++) {
    const owner = ownerHistory[i];
    const ownerName = owner.name || '';

    // Kolla om detta är en känd handlare
    if (isKnownDealer(ownerName)) {
      console.log(`  ⏭️ Hoppar handlare i kedjan: ${ownerName}`);
      continue;
    }

    // Kolla om det är ett företag med många fordon (okänd handlare)
    // Vi kan inte veta antal fordon utan att hämta profil,
    // men vi kan kolla owner_class
    if (owner.owner_class === 'company') {
      // Företag som INTE är känd handlare = potentiellt lead
      // Returnera det, men markera som företag
      return { ...owner, lead_type: 'foretag', chain_index: i };
    }

    if (owner.owner_class === 'person' && owner.profile_id) {
      return { ...owner, lead_type: 'privat', chain_index: i };
    }
  }

  return null;
}

/**
 * Bestäm owner_type baserat på Blocket-data och biluppgifter-data
 */
function determineOwnerType(blocketSellerType, blocketSellerName, biluppgifterOwnerName, isCompany, isDealer) {
  // Privatperson på Blocket = alltid privat
  if (blocketSellerType === 'privat') return 'privat';

  // Handlare på Blocket
  if (blocketSellerType === 'handlare') {
    // Jämför Blocket säljare med biluppgifter ägare
    if (biluppgifterOwnerName && blocketSellerName) {
      const match = namesMatch(blocketSellerName, biluppgifterOwnerName);

      if (!match && !isKnownDealer(biluppgifterOwnerName)) {
        // Ägaren på biluppgifter matchar INTE Blocket-säljaren
        // OCH är inte en känd handlare = FÖRMEDLING
        return 'formedling';
      }
    }

    // Blocket och biluppgifter matchar = riktig handlare
    if (isDealer) return 'handlare';
    if (isCompany) return 'handlare';  // Företag som säljer via Blocket som handlare
  }

  // Fallback
  if (isDealer) return 'handlare';
  if (isCompany) return 'foretag';
  return 'privat';
}

// --- Data Processing ---

async function getAdsWithoutBiluppgifter(limit) {
  // Hämta ALLA regnummer som redan har biluppgifter
  const { data: existing } = await supabase
    .from('biluppgifter_data')
    .select('regnummer');

  const existingSet = new Set(existing?.map(e => e.regnummer.toUpperCase()) || []);

  // Hämta aktiva annonser med regnummer + säljare-info
  const { data: ads, error: adsError } = await supabase
    .from('blocket_annonser')
    .select('id, regnummer, marke, modell, arsmodell, saljare_namn, saljare_typ, publicerad')
    .is('borttagen', null)
    .not('regnummer', 'is', null)
    .order('publicerad', { ascending: false })
    .limit(500);

  if (adsError) throw new Error(`Supabase error: ${adsError.message}`);
  if (!ads || ads.length === 0) return [];

  return ads
    .filter(a => !existingSet.has(a.regnummer.toUpperCase()))
    .slice(0, limit);
}

async function saveBiluppgifter(ad, regnr, data) {
  if (!data?.owner_profile && !data?.owner_history?.length) return false;

  const profile = data.owner_profile || {};
  const currentOwnerHistory = data.owner_history?.[0];
  const profileOwnerIdx = data._profile_owner_index || 0;
  const profileOwner = data.owner_history?.[profileOwnerIdx];
  const isCompany = (profileOwner || currentOwnerHistory)?.owner_class === 'company';
  const isDealer = profile.vehicles?.length >= 10;
  const ownerName = profile.name || profileOwner?.name || currentOwnerHistory?.name || null;

  // Bestäm owner_type
  const ownerType = determineOwnerType(
    ad.saljare_typ,
    ad.saljare_namn,
    ownerName,
    isCompany,
    isDealer
  );

  // Beräkna dealer_since (när handlaren fick bilen)
  let dealerSince = null;
  if ((ownerType === 'handlare' || ownerType === 'formedling') && currentOwnerHistory?.date) {
    dealerSince = currentOwnerHistory.date;
  }

  const dbData = {
    regnummer: regnr,
    blocket_id: ad.id,
    owner_name: ownerName,
    owner_age: profile.age || null,
    owner_city: profile.city || null,
    owner_address: profile.address || null,
    owner_postal_code: profile.postal_code || null,
    owner_postal_city: profile.postal_city || null,
    owner_phone: profile.phone || null,
    // Spara INTE owner_vehicles för handlare (onödig data)
    // Berika med vehicle_type för alla fordon
    owner_vehicles: (ownerType === 'handlare') ? [] : enrichVehicles(profile.vehicles),
    address_vehicles: (ownerType === 'handlare') ? [] : enrichVehicles(profile.address_vehicles),
    mileage_history: data.mileage_history || [],
    owner_history: data.owner_history || [],
    is_dealer: isDealer,
    owner_type: ownerType,
    dealer_since: dealerSince,
    fetched_at: new Date().toISOString(),
    previous_owner: null
  };

  // --- Hantera per owner_type ---

  if (ownerType === 'formedling') {
    // FÖRMEDLING: Nuvarande ägare (från biluppgifter) ÄR leadet
    // Blocket-säljaren är bara förmedlaren
    console.log(`  🔄 FÖRMEDLING: Blocket="${ad.saljare_namn}" men ägare="${ownerName}"`);
    console.log(`  → Ägare = lead (${ownerName}), förmedlare = ${ad.saljare_namn}`);
    // Inga extra API-anrop behövs - nuvarande ägare ÄR leadet

  } else if (ownerType === 'handlare' || (ownerType === 'foretag' && isCompany)) {
    // HANDLARE / FÖRETAG: Gå igenom ägarkedjan, hoppa alla kända handlare
    const leadInfo = findLeadInChain(data.owner_history);

    if (leadInfo && leadInfo.profile_id) {
      const label = ownerType === 'handlare' ? '🏪 Handlare' : '🏢 Företag';
      console.log(`  ${label} → Hämtar lead från kedjan: ${leadInfo.name} (index ${leadInfo.chain_index})...`);

      const leadProfile = await fetchProfile(leadInfo.profile_id);

      if (leadProfile) {
        dbData.previous_owner = {
          name: leadProfile.name || leadInfo.name,
          profile_id: leadInfo.profile_id,
          purchase_date: leadInfo.date,
          lead_type: leadInfo.lead_type,
          age: leadProfile.age || null,
          city: leadProfile.city || null,
          address: leadProfile.address || null,
          postal_code: leadProfile.postal_code || null,
          postal_city: leadProfile.postal_city || null,
          phone: leadProfile.phone || null,
          vehicles: enrichVehicles(leadProfile.vehicles)
        };
        console.log(`  ✅ Lead: ${leadProfile.name}, ${leadProfile.age || '?'} år, ${leadProfile.city || '?'}, tel: ${leadProfile.phone || 'saknas'}`);
      }
    } else {
      console.log(`  ⚠️ Ingen lead hittad i ägarkedjan`);
    }

    // Auto-berika known_dealers
    if (ownerType === 'handlare' && ad.saljare_namn) {
      await enrichKnownDealer(ad.saljare_namn, ownerName, profile);
    }
  }

  // Spara till databas
  const { error } = await supabase
    .from('biluppgifter_data')
    .upsert(dbData, { onConflict: 'regnummer' });

  if (error) throw new Error(`DB error: ${error.message}`);

  return {
    saved: true,
    ownerType,
    isDealer,
    isCompany,
    hasPreviousOwner: !!dbData.previous_owner
  };
}

// --- Main ---

async function main() {
  const startTime = Date.now();
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const stats = { privat: 0, handlare: 0, foretag: 0, formedling: 0 };
  let withPrevOwner = 0;
  const errors = [];

  await log('info', 'Biluppgifter cron v2 started', {
    api_url: BILUPPGIFTER_API,
    batch_size: BATCH_SIZE,
    delay: `${MIN_DELAY_MS}-${MAX_DELAY_MS}ms random`
  });

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

  // 2. Ladda kända handlare
  await loadKnownDealers();

  // 3. Get ads without biluppgifter
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

  // 4. Fetch biluppgifter for each ad
  for (const ad of ads) {
    const regnr = ad.regnummer.toUpperCase();

    try {
      const data = await fetchBiluppgifter(regnr);

      if (data?.owner_profile) {
        const result = await saveBiluppgifter(ad, regnr, data);
        success++;

        if (result.ownerType) stats[result.ownerType] = (stats[result.ownerType] || 0) + 1;
        if (result.hasPreviousOwner) withPrevOwner++;

        const typeLabels = {
          privat: '👤 PRIVAT',
          handlare: '🏪 HANDLARE',
          foretag: '🏢 FÖRETAG',
          formedling: '🔄 FÖRMEDLING'
        };
        const ownerLabel = typeLabels[result.ownerType] || '❓';
        const ownerName = data.owner_profile.name || data.owner_history?.[0]?.name || '?';
        console.log(`✅ ${regnr} (${ad.marke} ${ad.modell}): ${ownerLabel} - ${ownerName}`);
      } else {
        skipped++;
        console.log(`⚠️ ${regnr}: Ingen ägardata`);
      }
    } catch (error) {
      failed++;
      errors.push({ regnr, error: error.message });
      console.log(`❌ ${regnr}: ${error.message}`);
    }

    // Randomiserad delay - ser ut som mänsklig browsing
    await randomDelay();
  }

  // 5. Log summary
  const duration = Math.round((Date.now() - startTime) / 1000);
  const summary = {
    success,
    failed,
    skipped,
    owner_types: stats,
    with_previous_owner: withPrevOwner,
    duration_seconds: duration,
    avg_delay_per_car: Math.round(duration / (ads.length || 1)),
    errors: errors.length > 0 ? errors : undefined
  };

  await log('info', 'Biluppgifter cron v2 completed', summary);

  console.log(`\n📊 Resultat:`);
  console.log(`   ${success} sparade, ${skipped} utan data, ${failed} fel`);
  console.log(`   👤 ${stats.privat} privat | 🏪 ${stats.handlare} handlare | 🏢 ${stats.foretag} företag | 🔄 ${stats.formedling} förmedling`);
  console.log(`   ${withPrevOwner} med lead från ägarkedja`);
  console.log(`   ⏱️ ${duration}s (snitt ${Math.round(duration / (ads.length || 1))}s/bil)`);
}

// Run
main().catch(async (error) => {
  await log('error', 'Cron job crashed', { error: error.message });
  console.error('Fatal error:', error);
  process.exit(1);
});
