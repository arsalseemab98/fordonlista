#!/usr/bin/env node
/**
 * Biluppgifter Handlare-Only Cron
 * BARA handlar-annonser från Blocket → biluppgifter
 *
 * Kör via: node scripts/biluppgifter-handlare.cjs
 * Cron: Var 30:e minut, 07-18
 */

const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = 'https://rueqiiqxkazocconmnwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4';
const BILUPPGIFTER_API = process.env.BILUPPGIFTER_API_URL || 'http://localhost:3456';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '5', 10);

// Randomiserade delays
const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 8000;
const PROFILE_DELAY_MIN = 2000;
const PROFILE_DELAY_MAX = 5000;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let knownDealerNames = new Set();

// ═══════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════

function randomDelay(min = MIN_DELAY_MS, max = MAX_DELAY_MS) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, ms));
}

function stripAccents(str) {
  return str
    .replace(/[éèêë]/g, 'e')
    .replace(/[åä]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[üú]/g, 'u')
    .replace(/[ïí]/g, 'i')
    .replace(/[ñ]/g, 'n');
}

function normalizeName(name) {
  if (!name) return '';
  return stripAccents(name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,\-&]/g, ' ').replace(/\s+/g, ' ').trim());
}

// Filtrera bort vanliga ord som inte hjälper matchning
const STOP_WORDS = new Set(['ab', 'hb', 'kb', 'i', 'och', 'the', 'bil', 'bilar', 'motor', 'service']);

function getSignificantWords(normalized) {
  return normalized.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function namesMatch(name1, name2) {
  if (!name1 || !name2) return false;
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Första-ord match (t.ex. "riddermark" = "riddermark")
  const w1 = n1.split(' ')[0];
  const w2 = n2.split(' ')[0];
  if (w1.length > 3 && w1 === w2) return true;

  // Första-ord startsWith (t.ex. "arnes" starts with "arne") - max 2 tecken skillnad
  if (w1.length > 3 && w2.length > 3) {
    const lenDiff = Math.abs(w1.length - w2.length);
    if (lenDiff <= 2 && (w1.startsWith(w2) || w2.startsWith(w1))) return true;
  }

  // Ordöverlapp: om ≥50% av signifikanta ord matchar
  const sig1 = getSignificantWords(n1);
  const sig2 = getSignificantWords(n2);
  if (sig1.length >= 2 && sig2.length >= 2) {
    const set2 = new Set(sig2);
    const overlap = sig1.filter(w => set2.has(w)).length;
    const minLen = Math.min(sig1.length, sig2.length);
    if (overlap >= Math.ceil(minLen * 0.5) && overlap >= 2) return true;
  }

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

function classifyVehicleType(model) {
  if (!model) return 'Okänd';
  const m = model.toLowerCase();
  if (/\b(mc|motorcykel|harley|ducati|yamaha\s*(mt|yz|xv|xt|xjr|fz)|kawasaki\s*(z|ninja|vulcan|vn|zx|er|versys|w\d)|honda\s*(cb|cbr|crf|vfr|vt|vtx|gl\d|nc\d|ctx)|suzuki\s*(gsx|sv|dr|dl|vs|vl|boulevard)|bmw\s*(r\s?\d{3,4}|f\s?\d{3}|g\s?\d{3}|s\s?\d{4}|k\s?\d{4}|c\s?\d{3})|ktm|husqvarna\s*(fe|te|fc|tc|svartpilen|vitpilen)|triumph|indian|aprilia|moto\s?guzzi|royal\s?enfield|vespa|piaggio)\b/.test(m)) return 'MC';
  if (/\b(snöskoter|skoter|ski.?doo|lynx|polaris\s*(indy|rush|switchback|pro|sks|rmk|assault|voyag)|arctic\s?cat|yamaha\s*(sidewinder|viper|venture|sr\s?viper))\b/.test(m)) return 'Snöskoter';
  if (/\b(atv|fyrhjuling|quad|utv|side.?by.?side|polaris\s*(ranger|sportsman|rzr)|can.?am\s*(outlander|renegade|maverick)|cfmoto)\b/.test(m)) return 'ATV';
  if (/\b(husvagn|husbil|caravan|motorhome|hobby|fendt|adria|knaus|dethleffs|bürstner|hymer|carado|sunlight|eura\s?mobil)\b/.test(m)) return 'Husvagn/Husbil';
  if (/\b(släpvagn|släp|trailer|båttrailer|brenderup|thule|respo|fogelsta|niewiadow)\b/.test(m)) return 'Släpvagn';
  if (/\b(transport|skåpbil|lätt\s?lastbil|sprinter|crafter|master|movano|ducato|boxer|transit(?!\s*connect)|daily|man\s+tg[esl]|scania|volvo\s*(fh|fm|fl|fe))\b/.test(m)) return 'Transportbil';
  if (/\b(pickup|pick.?up|l200|hilux|ranger|navara|amarok|d.?max|fullback|x.?class|gladiator|tacoma|tundra|raptor)\b/.test(m)) return 'Pickup';
  if (/\b(traktor|maskin|grävmaskin|hjullastare|dumper|new\s?holland|john\s?deere|kubota|volvo\s*(l\d|ec\d|bl\d)|caterpillar|cat\s?\d|jcb|case\s?(ih)?|valtra|fendt|claas|deutz|zetor|massey|ferguson)\b/.test(m)) return 'Maskin';
  return 'Personbil';
}

function enrichVehicles(vehicles) {
  if (!vehicles || !Array.isArray(vehicles)) return [];
  return vehicles.map(v => ({
    ...v,
    vehicle_type: classifyVehicleType(v.model || '')
  }));
}

function daysBetween(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return null;
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════

async function log(type, message, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`, details.error || '');
  try {
    await supabase.from('biluppgifter_log').insert({
      type, message, details, created_at: timestamp
    });
  } catch (err) { /* ignore */ }
}

// ═══════════════════════════════════════
// API
// ═══════════════════════════════════════

async function checkApiHealth() {
  try {
    const response = await fetch(`${BILUPPGIFTER_API}/health`, { timeout: 5000 });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function fetchBiluppgifter(regnr) {
  // Försök /api/owner/ först
  const response = await fetch(`${BILUPPGIFTER_API}/api/owner/${regnr}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  // Om owner-endpoint lyckades → returnera direkt
  if (data.owner_profile && !data.error) return data;

  // Fallback: /api/vehicle/ har ofta data även när owner misslyckas
  console.log(`  owner-endpoint saknar data, testar vehicle-endpoint...`);
  await randomDelay(PROFILE_DELAY_MIN, PROFILE_DELAY_MAX);
  const vehResponse = await fetch(`${BILUPPGIFTER_API}/api/vehicle/${regnr}`);
  if (!vehResponse.ok) return data; // ge upp
  const vehData = await vehResponse.json();

  if (!vehData?.owner?.history?.length) return data; // ingen ägarhistorik

  // Bygg om data från vehicle-endpoint
  const ownerHistory = vehData.owner.history;
  const result = {
    regnummer: regnr,
    owner_history: ownerHistory,
    mileage_history: vehData.mileage_history || [],
    owner_profile: null,
    _from_vehicle: true
  };

  // Hitta första ägare med profile_id (hoppa "Okänd")
  const firstWithProfile = ownerHistory.find(o => o.profile_id);
  if (firstWithProfile) {
    console.log(`  Hämtar profil för ${firstWithProfile.name}...`);
    const profile = await fetchProfile(firstWithProfile.profile_id);
    if (profile) {
      result.owner_profile = profile;
      result._profile_owner_index = ownerHistory.indexOf(firstWithProfile);
    }
  }

  return result;
}

async function fetchProfile(profileId) {
  try {
    await randomDelay(PROFILE_DELAY_MIN, PROFILE_DELAY_MAX);
    const response = await fetch(`${BILUPPGIFTER_API}/api/profile/${profileId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════
// KNOWN DEALERS
// ═══════════════════════════════════════

async function loadKnownDealers() {
  const { data: dealers } = await supabase
    .from('known_dealers')
    .select('name, biluppgifter_name');
  if (!dealers) return;
  for (const d of dealers) {
    if (d.name) knownDealerNames.add(normalizeName(d.name));
    if (d.biluppgifter_name) knownDealerNames.add(normalizeName(d.biluppgifter_name));
  }
  console.log(`Laddade ${knownDealerNames.size} handlarnamn (${dealers.length} handlare)\n`);
}

async function enrichKnownDealer(blocketName, biluppgifterName, profile) {
  if (!blocketName) return;
  const updateData = { updated_at: new Date().toISOString() };
  if (biluppgifterName) updateData.biluppgifter_name = biluppgifterName;
  if (profile?.address) updateData.address = profile.address;
  if (profile?.postal_code) updateData.postal_code = profile.postal_code;
  if (profile?.postal_city) updateData.postal_city = profile.postal_city;
  if (profile?.phone) updateData.phone = profile.phone;
  if (profile?.vehicles) updateData.vehicle_count = profile.vehicles.length;
  await supabase.from('known_dealers').update(updateData).eq('name', blocketName);
  if (biluppgifterName) knownDealerNames.add(normalizeName(biluppgifterName));
}

// ═══════════════════════════════════════
// CHAIN TRAVERSAL
// ═══════════════════════════════════════

function findLeadInChain(ownerHistory) {
  if (!ownerHistory || !Array.isArray(ownerHistory)) return null;
  for (let i = 1; i < ownerHistory.length; i++) {
    const owner = ownerHistory[i];
    if (isKnownDealer(owner.name || '')) {
      console.log(`     Hoppar handlare: ${owner.name}`);
      continue;
    }
    if (owner.owner_class === 'company') {
      return { ...owner, lead_type: 'foretag', chain_index: i };
    }
    if (owner.owner_class === 'person' && owner.profile_id) {
      return { ...owner, lead_type: 'privat', chain_index: i };
    }
  }
  return null;
}

function determineOwnerType(blocketSellerName, biluppgifterOwnerName, isCompany, isDealer) {
  if (biluppgifterOwnerName && blocketSellerName) {
    const match = namesMatch(blocketSellerName, biluppgifterOwnerName);
    if (!match && !isKnownDealer(biluppgifterOwnerName)) {
      return 'formedling';
    }
  }
  if (isDealer) return 'handlare';
  if (isCompany) return 'handlare';
  return 'handlare'; // Blocket säger handlare, fallback
}

// ═══════════════════════════════════════
// GET DEALER ADS
// ═══════════════════════════════════════

async function getDealerAdsWithoutBiluppgifter(limit) {
  // Hämta alla redan hämtade regnummer
  const existingSet = new Set();
  let offset = 0;
  while (true) {
    const { data: chunk } = await supabase
      .from('biluppgifter_data')
      .select('regnummer')
      .range(offset, offset + 999);
    if (!chunk || chunk.length === 0) break;
    for (const e of chunk) existingSet.add(e.regnummer.toUpperCase());
    offset += chunk.length;
    if (chunk.length < 1000) break;
  }

  // Paginera genom alla handlar-annonser tills vi har tillräckligt
  const result = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (result.length < limit) {
    const { data: ads, error } = await supabase
      .from('blocket_annonser')
      .select('id, regnummer, marke, modell, arsmodell, pris, saljare_namn, saljare_typ, publicerad, region, stad')
      .eq('saljare_typ', 'handlare')
      .is('borttagen', null)
      .not('regnummer', 'is', null)
      .order('publicerad', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!ads || ads.length === 0) break;

    for (const a of ads) {
      if (!existingSet.has(a.regnummer.toUpperCase())) {
        result.push(a);
        if (result.length >= limit) break;
      }
    }

    page++;
    if (ads.length < PAGE_SIZE) break;
  }

  return result;
}

// ═══════════════════════════════════════
// PROCESS + DETAILED OUTPUT
// ═══════════════════════════════════════

async function processAd(ad) {
  const regnr = ad.regnummer.toUpperCase();
  const sep = '━'.repeat(60);

  console.log(sep);
  console.log(`${regnr} - ${ad.marke} ${ad.modell} ${ad.arsmodell} (${(ad.pris||0).toLocaleString()} kr)`);
  console.log(`  Blocket: ${ad.saljare_namn} | ${ad.stad || ad.region || '?'}`);
  console.log(`  Publicerad: ${(ad.publicerad||'').substring(0, 10)}`);

  const data = await fetchBiluppgifter(regnr);
  if (!data?.owner_profile && !data?.owner_history?.length) {
    console.log(`  INGEN ÄGARDATA\n`);
    return { saved: false, skipped: true };
  }

  const profile = data.owner_profile || {};
  const oh0 = data.owner_history?.[0];

  // Om data kom från vehicle-endpoint och profilen är för en handlare i kedjan (inte index 0)
  const profileOwnerIdx = data._profile_owner_index || 0;
  const profileOwner = data.owner_history?.[profileOwnerIdx];

  const isCompany = (profileOwner || oh0)?.owner_class === 'company';
  const isDealer = profile.vehicles?.length >= 10;
  const ownerName = profile.name || profileOwner?.name || oh0?.name || '?';

  // Om nuvarande ägare är "Okänd" men handlaren finns i kedjan
  const currentOwnerUnknown = oh0?.owner_class === 'unknown' || oh0?.type === 'Okänd';
  let ownerType, dealerSince;

  if (currentOwnerUnknown && profileOwnerIdx > 0) {
    // Profilen vi hämtade är handlaren (inte nuvarande ägare)
    ownerType = determineOwnerType(ad.saljare_namn, ownerName, isCompany, isDealer);
    dealerSince = profileOwner?.date || oh0?.date || null;
    console.log(`  (Nuvarande ägare okänd - använder handlare från kedja: ${ownerName})`);
  } else {
    ownerType = determineOwnerType(ad.saljare_namn, ownerName, isCompany, isDealer);
    dealerSince = oh0?.date || null;
  }

  // ── HANDLARE INFO ──
  console.log(`\n  BILUPPGIFTER-ÄGARE:`);
  console.log(`     Namn:     ${ownerName}`);
  console.log(`     Typ:      ${ownerType.toUpperCase()}${isDealer ? ` (${profile.vehicles?.length} fordon)` : ''}`);
  console.log(`     Adress:   ${profile.address || '?'}, ${profile.postal_code || '?'} ${profile.postal_city || '?'}`);
  console.log(`     Telefon:  ${profile.phone || 'saknas'}`);
  if (dealerSince) {
    const days = daysBetween(dealerSince, new Date().toISOString());
    console.log(`     Ägare sedan: ${dealerSince} (${days} dagar)`);
  }

  // ── ÄGARKEDJA ──
  if (data.owner_history?.length > 1) {
    console.log(`\n  ÄGARKEDJA (${data.owner_history.length} poster):`);
    for (let i = 0; i < Math.min(data.owner_history.length, 5); i++) {
      const oh = data.owner_history[i];
      const tag = i === 0 ? ' ← nuvarande' : isKnownDealer(oh.name) ? ' ← HANDLARE (hoppar)' : '';
      console.log(`     [${i}] ${oh.name || '?'} (${oh.owner_class || '?'}) sedan ${oh.date || '?'}${tag}`);
    }
  }

  let dbData = {
    regnummer: regnr,
    blocket_id: ad.id,
    owner_name: ownerName,
    owner_age: profile.age || null,
    owner_city: profile.city || null,
    owner_address: profile.address || null,
    owner_postal_code: profile.postal_code || null,
    owner_postal_city: profile.postal_city || null,
    owner_phone: profile.phone || null,
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

  // ── FÖRMEDLING ──
  if (ownerType === 'formedling') {
    console.log(`\n  FÖRMEDLING DETEKTERAD:`);
    console.log(`     Förmedlare: ${ad.saljare_namn}`);
    console.log(`     Riktig ägare (LEAD): ${ownerName}`);
    console.log(`     Ålder:   ${profile.age || '?'}`);
    console.log(`     Adress:  ${profile.address || '?'}, ${profile.postal_code || '?'} ${profile.postal_city || '?'}`);
    console.log(`     Telefon: ${profile.phone || 'saknas'}`);

    if (profile.vehicles?.length > 0) {
      console.log(`\n  LEADETS FORDON (${profile.vehicles.length} st):`);
      for (const v of profile.vehicles) {
        const typ = classifyVehicleType(v.model);
        console.log(`     ${v.regnr || '?'} | ${v.model || '?'} ${v.year || ''} | ${typ} | ägt ${v.ownership_time || '?'} | ${v.status || ''}`);
      }
    }

    if (profile.address_vehicles?.length > 0) {
      console.log(`\n  ADRESSFORDON (${profile.address_vehicles.length} st):`);
      for (const v of profile.address_vehicles) {
        const typ = classifyVehicleType(v.model);
        console.log(`     ${v.regnr || '?'} | ${v.model || '?'} ${v.year || ''} | ${typ} | ägt ${v.ownership_time || '?'}`);
      }
    }

  // ── HANDLARE → LEAD FRÅN KEDJA ──
  } else {
    const leadInfo = findLeadInChain(data.owner_history);

    if (leadInfo && leadInfo.profile_id) {
      console.log(`\n  HÄMTAR LEAD FRÅN KEDJA [${leadInfo.chain_index}]: ${leadInfo.name}...`);
      const lp = await fetchProfile(leadInfo.profile_id);

      if (lp) {
        const leadOwned = daysBetween(leadInfo.date, dealerSince);
        dbData.previous_owner = {
          name: lp.name || leadInfo.name,
          profile_id: leadInfo.profile_id,
          purchase_date: leadInfo.date,
          lead_type: leadInfo.lead_type,
          age: lp.age || null,
          city: lp.city || null,
          address: lp.address || null,
          postal_code: lp.postal_code || null,
          postal_city: lp.postal_city || null,
          phone: lp.phone || null,
          vehicles: enrichVehicles(lp.vehicles)
        };

        console.log(`\n  LEAD (FÖRRA ÄGARE):`);
        console.log(`     Namn:     ${lp.name || leadInfo.name}`);
        console.log(`     Typ:      ${leadInfo.lead_type}`);
        console.log(`     Ålder:    ${lp.age || '?'}`);
        console.log(`     Adress:   ${lp.address || '?'}, ${lp.postal_code || '?'} ${lp.postal_city || '?'}`);
        console.log(`     Telefon:  ${lp.phone || 'saknas'}`);
        console.log(`     Ägde bilen: ${leadInfo.date || '?'} → ${dealerSince || '?'} (${leadOwned || '?'} dagar)`);

        if (lp.vehicles?.length > 0) {
          console.log(`\n  LEADETS NUVARANDE FORDON (${lp.vehicles.length} st):`);
          for (const v of lp.vehicles) {
            const typ = classifyVehicleType(v.model);
            console.log(`     ${v.regnr || '?'} | ${v.model || '?'} ${v.year || ''} | ${typ} | ägt ${v.ownership_time || '?'} | ${v.status || ''}`);
          }
        } else {
          console.log(`     Inga fordon registrerade`);
        }

        if (lp.address_vehicles?.length > 0) {
          console.log(`\n  LEADETS ADRESSFORDON (${lp.address_vehicles.length} st):`);
          for (const v of lp.address_vehicles) {
            const typ = classifyVehicleType(v.model);
            console.log(`     ${v.regnr || '?'} | ${v.model || '?'} ${v.year || ''} | ${typ} | ägt ${v.ownership_time || '?'}`);
          }
        }
      } else {
        console.log(`     Kunde inte hämta profil`);
      }
    } else {
      console.log(`\n  INGEN LEAD HITTAD I ÄGARKEDJAN`);
    }

    // Auto-berika known_dealers
    if (ad.saljare_namn) {
      await enrichKnownDealer(ad.saljare_namn, ownerName, profile);
    }
  }

  // ── SPARA ──
  const { error } = await supabase
    .from('biluppgifter_data')
    .upsert(dbData, { onConflict: 'regnummer' });

  if (error) {
    console.log(`\n  DB-FEL: ${error.message}`);
    return { saved: false, error: error.message };
  }

  console.log(`\n  SPARAT: owner_type=${ownerType}, dealer_since=${dealerSince}, lead=${dbData.previous_owner ? 'JA' : 'NEJ'}`);
  console.log('');
  return { saved: true, ownerType, hasPrevOwner: !!dbData.previous_owner };
}

// ═══════════════════════════════════════
// MAIN
// ═══════════════════════════════════════

async function main() {
  const startTime = Date.now();
  console.log('🏪 BILUPPGIFTER HANDLARE-CRON\n');

  const health = await checkApiHealth();
  if (!health.ok) {
    console.log('API ej tillgänglig: ' + health.error);
    process.exit(1);
  }

  await loadKnownDealers();

  const ads = await getDealerAdsWithoutBiluppgifter(BATCH_SIZE);
  if (ads.length === 0) {
    console.log('Inga handlar-annonser utan biluppgifter');
    process.exit(0);
  }

  await log('info', `Handlare-cron: ${ads.length} annonser`, { batch_size: BATCH_SIZE });

  let success = 0, failed = 0, skipped = 0;
  const stats = { handlare: 0, formedling: 0 };
  let withLead = 0;

  for (const ad of ads) {
    try {
      const result = await processAd(ad);
      if (result.saved) {
        success++;
        if (result.ownerType) stats[result.ownerType] = (stats[result.ownerType] || 0) + 1;
        if (result.hasPrevOwner) withLead++;
      } else if (result.skipped) {
        skipped++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      console.log(`  FEL: ${error.message}\n`);
    }
    await randomDelay();
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log('━'.repeat(60));
  console.log(`\nRESULTAT: ${success} sparade, ${skipped} utan data, ${failed} fel`);
  console.log(`  🏪 ${stats.handlare || 0} handlare | 🔄 ${stats.formedling || 0} förmedling`);
  console.log(`  ${withLead} med lead från ägarkedja`);
  console.log(`  ${duration}s totalt (snitt ${Math.round(duration / (ads.length || 1))}s/bil)`);

  await log('info', 'Handlare-cron klar', { success, failed, skipped, stats, withLead, duration });
}

main().catch(async (err) => {
  await log('error', 'Handlare-cron kraschade', { error: err.message });
  console.error('Fatal:', err);
  process.exit(1);
});
