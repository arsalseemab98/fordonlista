#!/usr/bin/env node
/**
 * Biluppgifter för PRIVAT-annonser
 * Kontinuerlig hämtning
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rueqiiqxkazocconmnwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4';
const BILUPPGIFTER_API = process.env.BILUPPGIFTER_API_URL || 'http://localhost:3456';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '5', 10);
const PARALLEL = parseInt(process.env.PARALLEL || '5', 10);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function randomDelay(min = 100, max = 400) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, ms));
}

async function checkApiHealth() {
  try {
    const response = await fetch(`${BILUPPGIFTER_API}/health`, { timeout: 5000 });
    return { ok: response.ok };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function fetchBiluppgifter(regnr) {
  const response = await fetch(`${BILUPPGIFTER_API}/api/owner/${regnr}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

async function getPrivatAdsWithoutBiluppgifter(limit) {
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

  // Hämta privat-annonser
  const result = [];
  let page = 0;
  while (result.length < limit) {
    const { data: ads, error } = await supabase
      .from('blocket_annonser')
      .select('id, regnummer, marke, modell, arsmodell, pris, saljare_namn, saljare_typ, publicerad, region, stad')
      .eq('saljare_typ', 'privat')
      .is('borttagen', null)
      .not('regnummer', 'is', null)
      .order('publicerad', { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!ads || ads.length === 0) break;

    for (const a of ads) {
      if (!existingSet.has(a.regnummer.toUpperCase())) {
        result.push(a);
        if (result.length >= limit) break;
      }
    }
    page++;
    if (ads.length < 1000) break;
  }
  return result;
}

async function processAd(ad) {
  const regnr = ad.regnummer.toUpperCase();
  console.log(`${regnr} - ${ad.marke} ${ad.modell} ${ad.arsmodell} | ${ad.saljare_namn}`);

  try {
    const data = await fetchBiluppgifter(regnr);
    if (!data?.owner_profile) {
      console.log(`  ⚠️ Ingen data`);
      return { saved: false, skipped: true };
    }

    const profile = data.owner_profile;
    const oh0 = data.owner_history?.[0];

    const dbData = {
      regnummer: regnr,
      blocket_id: ad.id,
      owner_name: profile.name || oh0?.name || null,
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
      is_dealer: (profile.vehicles?.length || 0) >= 10,
      owner_type: 'privat',
      fetched_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('biluppgifter_data')
      .upsert(dbData, { onConflict: 'regnummer' });

    if (error) {
      console.log(`  ❌ DB: ${error.message}`);
      return { saved: false, error: error.message };
    }

    console.log(`  ✅ ${profile.name}, ${profile.age || '?'} år, ${profile.city || '?'}`);
    return { saved: true };
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    return { saved: false, error: err.message };
  }
}

async function runBatch() {
  const ads = await getPrivatAdsWithoutBiluppgifter(BATCH_SIZE);
  if (ads.length === 0) return { done: true };

  console.log(`\n👤 PRIVAT Batch: ${ads.length} annonser`);

  let success = 0, failed = 0, skipped = 0;

  for (let i = 0; i < ads.length; i += PARALLEL) {
    const chunk = ads.slice(i, i + PARALLEL);
    const results = await Promise.allSettled(chunk.map(processAd));
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.saved) success++;
        else if (r.value.skipped) skipped++;
        else failed++;
      } else {
        failed++;
      }
    }
    await randomDelay();
  }

  console.log(`━━━ BATCH: ${success} sparade, ${skipped} utan data, ${failed} fel`);
  return { done: false, success };
}

async function main() {
  console.log('👤 BILUPPGIFTER PRIVAT - KONTINUERLIG\n');

  const health = await checkApiHealth();
  if (!health.ok) {
    console.log('❌ API offline, väntar 30s...');
    await new Promise(r => setTimeout(r, 30000));
    return main();
  }
  console.log('✅ API online\n');

  let total = 0;
  while (true) {
    try {
      const result = await runBatch();
      if (result.done) {
        console.log(`\n✅ KLART! ${total} totalt. Väntar 60s...`);
        await new Promise(r => setTimeout(r, 60000));
      } else {
        total += result.success || 0;
        console.log(`   Totalt: ${total} | Nästa om 5s...\n`);
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (err) {
      console.error('❌ Fel:', err.message);
      await new Promise(r => setTimeout(r, 30000));
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
