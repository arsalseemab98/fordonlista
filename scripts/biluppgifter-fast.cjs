#!/usr/bin/env node
/**
 * SNABB biluppgifter-hämtning
 * Kör ALLA annonser (handlare + privat) med hög parallellism
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rueqiiqxkazocconmnwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4';
const BILUPPGIFTER_API = process.env.BILUPPGIFTER_API_URL || 'http://localhost:3456';

// SNABB CONFIG
const PARALLEL = 20;  // 20 samtidiga requests
const BATCH_SIZE = 100;  // 100 per batch
const BATCH_DELAY = 500;  // 0.5s mellan batchar

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchBiluppgifter(regnr) {
  const response = await fetch(`${BILUPPGIFTER_API}/api/owner/${regnr}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function namesMatch(name1, name2) {
  if (!name1 || !name2) return false;
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  const w1 = n1.split(' ')[0];
  const w2 = n2.split(' ')[0];
  if (w1.length > 3 && w1 === w2) return true;
  return false;
}

async function getAllAdsWithoutBiluppgifter() {
  console.log('Hämtar lista över annonser utan biluppgifter...');

  // Hämta alla redan hämtade
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
  console.log(`  ${existingSet.size} redan hämtade`);

  // Hämta ALLA aktiva annonser (handlare + privat)
  const result = [];
  let page = 0;
  while (true) {
    const { data: ads, error } = await supabase
      .from('blocket_annonser')
      .select('id, regnummer, marke, modell, arsmodell, pris, saljare_namn, saljare_typ, publicerad')
      .is('borttagen', null)
      .not('regnummer', 'is', null)
      .order('publicerad', { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!ads || ads.length === 0) break;

    for (const a of ads) {
      if (!existingSet.has(a.regnummer.toUpperCase())) {
        result.push(a);
      }
    }
    page++;
    if (ads.length < 1000) break;
  }

  return result;
}

async function processAd(ad) {
  const regnr = ad.regnummer.toUpperCase();

  try {
    const data = await fetchBiluppgifter(regnr);
    if (!data?.owner_profile) {
      return { regnr, saved: false, skipped: true };
    }

    const profile = data.owner_profile;
    const oh0 = data.owner_history?.[0];
    const ownerName = profile.name || oh0?.name || null;
    const isDealer = (profile.vehicles?.length || 0) >= 10;

    // Bestäm owner_type
    let ownerType = 'privat';
    if (ad.saljare_typ === 'handlare') {
      if (ownerName && ad.saljare_namn && !namesMatch(ad.saljare_namn, ownerName)) {
        ownerType = 'formedling';
      } else {
        ownerType = 'handlare';
      }
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
      owner_vehicles: profile.vehicles || [],
      address_vehicles: profile.address_vehicles || [],
      mileage_history: data.mileage_history || [],
      owner_history: data.owner_history || [],
      is_dealer: isDealer,
      owner_type: ownerType,
      fetched_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('biluppgifter_data')
      .upsert(dbData, { onConflict: 'regnummer' });

    if (error) {
      return { regnr, saved: false, error: error.message };
    }

    return { regnr, saved: true, ownerType };
  } catch (err) {
    return { regnr, saved: false, error: err.message };
  }
}

async function main() {
  console.log('⚡ BILUPPGIFTER SNABB-HÄMTNING\n');
  console.log(`   Parallel: ${PARALLEL}`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Batch delay: ${BATCH_DELAY}ms\n`);

  const startTime = Date.now();

  // Hämta alla som saknas
  const ads = await getAllAdsWithoutBiluppgifter();
  console.log(`\n📋 ${ads.length} annonser att hämta\n`);

  if (ads.length === 0) {
    console.log('✅ Allt redan hämtat!');
    return;
  }

  let success = 0, failed = 0, skipped = 0;
  const stats = { handlare: 0, formedling: 0, privat: 0 };
  let processed = 0;

  // Kör i batchar
  for (let i = 0; i < ads.length; i += BATCH_SIZE) {
    const batch = ads.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(ads.length / BATCH_SIZE);

    // Kör PARALLEL samtidigt inom varje batch
    for (let j = 0; j < batch.length; j += PARALLEL) {
      const chunk = batch.slice(j, j + PARALLEL);
      const results = await Promise.allSettled(chunk.map(processAd));

      for (const r of results) {
        processed++;
        if (r.status === 'fulfilled') {
          if (r.value.saved) {
            success++;
            if (r.value.ownerType) stats[r.value.ownerType]++;
          } else if (r.value.skipped) {
            skipped++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const rate = Math.round(processed / elapsed * 60) || 0;
    const eta = Math.round((ads.length - processed) / (rate / 60)) || 0;

    console.log(`Batch ${batchNum}/${totalBatches}: ${success} ok, ${skipped} skip, ${failed} fel | ${rate}/min | ETA ${eta}s`);

    if (i + BATCH_SIZE < ads.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log('\n' + '═'.repeat(50));
  console.log('KLAR!');
  console.log(`  Totalt: ${processed}`);
  console.log(`  Sparade: ${success}`);
  console.log(`  Utan data: ${skipped}`);
  console.log(`  Fel: ${failed}`);
  console.log(`  🏪 ${stats.handlare} handlare | 🔄 ${stats.formedling} förmedling | 👤 ${stats.privat} privat`);
  console.log(`  ⏱️ ${duration}s (${Math.round(success / duration * 60)}/min)`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
