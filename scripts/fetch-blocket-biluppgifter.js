/**
 * Hämta Blocket-annonser och berika med Biluppgifter-data
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rueqiiqxkazocconmnwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4';
const BILUPPGIFTER_API = 'http://localhost:3456';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hämta aktiva Blocket-annonser med regnummer
async function getBlocketAds(limit = 10) {
  const { data, error } = await supabase
    .from('blocket_annonser')
    .select('id, blocket_id, regnummer, marke, modell, arsmodell, pris, miltal, stad, region')
    .is('borttagen', null)
    .not('regnummer', 'is', null)
    .order('publicerad', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Supabase error:', error.message);
    return [];
  }
  return data;
}

// Hämta Biluppgifter för ett regnummer
async function fetchBiluppgifter(regnr) {
  try {
    const response = await fetch(`${BILUPPGIFTER_API}/api/owner/${regnr}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`❌ Biluppgifter fel för ${regnr}:`, error.message);
    return null;
  }
}

// Spara biluppgifter till databasen
async function saveBiluppgifter(blocketId, regnr, data) {
  if (!data?.owner_profile) return false;

  const profile = data.owner_profile;

  const { error } = await supabase
    .from('biluppgifter_data')
    .upsert({
      regnummer: regnr,
      blocket_id: blocketId,
      owner_name: profile.name,
      owner_age: profile.age,
      owner_city: profile.city,
      owner_address: profile.address,
      owner_postal_code: profile.postal_code,
      owner_postal_city: profile.postal_city,
      owner_vehicles: profile.vehicles,
      address_vehicles: profile.address_vehicles,
      fetched_at: new Date().toISOString()
    }, { onConflict: 'regnummer' });

  if (error) {
    console.error(`❌ Kunde inte spara ${regnr}:`, error.message);
    return false;
  }
  return true;
}

// Huvudfunktion
async function main() {
  console.log('🚗 Hämtar Blocket-annonser...\n');

  const ads = await getBlocketAds(5);

  if (ads.length === 0) {
    console.log('Inga annonser hittades');
    return;
  }

  console.log(`📋 ${ads.length} annonser med regnummer:\n`);

  for (const ad of ads) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🚙 ${ad.marke} ${ad.modell} ${ad.arsmodell}`);
    console.log(`   Reg: ${ad.regnummer} | Pris: ${ad.pris?.toLocaleString()} kr`);
    console.log(`   Miltal: ${ad.miltal?.toLocaleString()} mil | ${ad.stad || ad.region}`);

    console.log(`\n   🔍 Hämtar biluppgifter...`);
    const bu = await fetchBiluppgifter(ad.regnummer);

    if (bu?.owner_profile) {
      const p = bu.owner_profile;
      console.log(`   ✅ Ägare: ${p.name}, ${p.age} år`);
      console.log(`   📍 ${p.address}, ${p.postal_code} ${p.postal_city}`);
      if (p.personnummer) console.log(`   🆔 ${p.personnummer}`);
      if (p.vehicles?.length > 0) {
        console.log(`   🚗 Äger ${p.vehicles.length} fordon`);
      }
      if (bu.owner_history?.length > 0) {
        console.log(`   📜 ${bu.owner_history.length} tidigare ägare`);
      }

      // Spara till databas
      const saved = await saveBiluppgifter(ad.blocket_id, ad.regnummer, bu);
      if (saved) console.log(`   💾 Sparad i databasen`);
    } else {
      console.log(`   ⚠️ Ingen ägarinfo hittades`);
    }

    console.log('');

    // Vänta lite mellan requests
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Klart!');
}

main().catch(console.error);
