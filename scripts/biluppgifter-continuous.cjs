#!/usr/bin/env node
/**
 * Biluppgifter KONTINUERLIG - Handlare + Privat
 * Kör tills allt är hämtat, sedan väntar på nya annonser
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rueqiiqxkazocconmnwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4';
const BILUPPGIFTER_API = process.env.BILUPPGIFTER_API_URL || 'http://localhost:3456';

const PARALLEL = 10;
const BATCH_SIZE = 50;
const BATCH_DELAY = 1000;
const IDLE_DELAY = 60000; // 1 min när klart

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkApiHealth() {
  try {
    const r = await fetch(`${BILUPPGIFTER_API}/health`, { timeout: 5000 });
    return { ok: r.ok };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

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

async function getAdsWithoutBiluppgifter(limit) {
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

  const result = [];
  let page = 0;
  while (result.length < limit) {
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

  try {
    const data = await fetchBiluppgifter(regnr);
    if (!data?.owner_profile) {
      // Spara tom post så vi inte försöker igen
      await supabase.from('biluppgifter_data').upsert({
        regnummer: regnr,
        blocket_id: ad.id,
        owner_type: 'no_data',
        fetched_at: new Date().toISOString()
      }, { onConflict: 'regnummer' });
      return { regnr, saved: false, skipped: true };
    }

    const profile = data.owner_profile;
    const oh0 = data.owner_history?.[0];
    const ownerName = profile.name || oh0?.name || null;
    const isDealer = (profile.vehicles?.length || 0) >= 10;

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

    if (error) return { regnr, saved: false, error: error.message };
    return { regnr, saved: true, ownerType, typ: ad.saljare_typ };
  } catch (err) {
    return { regnr, saved: false, error: err.message };
  }
}

async function runBatch() {
  const ads = await getAdsWithoutBiluppgifter(BATCH_SIZE);
  if (ads.length === 0) return { done: true };

  let success = 0, failed = 0, skipped = 0;
  const stats = { handlare: 0, formedling: 0, privat: 0 };

  for (let j = 0; j < ads.length; j += PARALLEL) {
    const chunk = ads.slice(j, j + PARALLEL);
    const results = await Promise.allSettled(chunk.map(processAd));

    for (const r of results) {
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

  const timestamp = new Date().toLocaleTimeString('sv-SE');
  console.log(`[${timestamp}] ✅ ${success} | ⏭️ ${skipped} | ❌ ${failed} | 🏪${stats.handlare} 🔄${stats.formedling} 👤${stats.privat}`);

  return { done: false, success, failed, skipped };
}

async function main() {
  console.log('🔄 BILUPPGIFTER KONTINUERLIG\n');

  const health = await checkApiHealth();
  if (!health.ok) {
    console.log('❌ API offline, väntar 30s...');
    await new Promise(r => setTimeout(r, 30000));
    return main();
  }
  console.log('✅ API online\n');

  let totalSuccess = 0;

  while (true) {
    try {
      const result = await runBatch();

      if (result.done) {
        console.log(`\n✅ Allt hämtat (${totalSuccess} totalt). Väntar ${IDLE_DELAY/1000}s på nya...`);
        await new Promise(r => setTimeout(r, IDLE_DELAY));
        totalSuccess = 0;
      } else {
        totalSuccess += result.success || 0;
        await new Promise(r => setTimeout(r, BATCH_DELAY));
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
