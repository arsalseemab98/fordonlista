#!/usr/bin/env node
/**
 * Berika known_dealers med biluppgifter-data
 * Tar en bil per handlare → hämtar företagsinfo från biluppgifter
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rueqiiqxkazocconmnwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4';
const BILUPPGIFTER_API = process.env.BILUPPGIFTER_API_URL || 'http://localhost:3456';
const DELAY_MS = 1500;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('🏪 Berikar handlare med biluppgifter-data...\n');

  // Hämta handlare som saknar biluppgifter-data
  const { data: dealers } = await supabase
    .from('known_dealers')
    .select('id, name')
    .is('biluppgifter_name', null)
    .order('ad_count', { ascending: false });

  if (!dealers || dealers.length === 0) {
    console.log('✅ Alla handlare har redan biluppgifter-data!');
    return;
  }

  console.log(`Hittade ${dealers.length} handlare utan biluppgifter-data\n`);

  let enriched = 0;
  let failed = 0;
  let noAds = 0;

  for (const dealer of dealers) {
    // Hitta en annons med regnummer för denna handlare
    const { data: ads } = await supabase
      .from('blocket_annonser')
      .select('regnummer')
      .eq('saljare_namn', dealer.name)
      .not('regnummer', 'is', null)
      .is('borttagen', null)
      .limit(1);

    if (!ads || ads.length === 0) {
      console.log(`⚠️ ${dealer.name}: Inga annonser med regnummer`);
      noAds++;
      continue;
    }

    const regnr = ads[0].regnummer.toUpperCase();

    try {
      // Hämta biluppgifter för denna bil
      const response = await fetch(`${BILUPPGIFTER_API}/api/owner/${regnr}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (!data?.owner_profile) {
        console.log(`⚠️ ${dealer.name} (${regnr}): Ingen ägardata`);
        failed++;
        await new Promise(r => setTimeout(r, DELAY_MS));
        continue;
      }

      const profile = data.owner_profile;
      const ownerHistory = data.owner_history?.[0];
      const companyName = profile.name || ownerHistory?.name || null;

      // Uppdatera known_dealers
      const { error } = await supabase
        .from('known_dealers')
        .update({
          biluppgifter_name: companyName,
          address: profile.address || null,
          postal_code: profile.postal_code || null,
          postal_city: profile.postal_city || null,
          phone: profile.phone || null,
          vehicle_count: profile.vehicles?.length || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', dealer.id);

      if (error) {
        console.log(`❌ ${dealer.name}: DB-fel: ${error.message}`);
        failed++;
      } else {
        enriched++;
        console.log(`✅ ${dealer.name} → ${companyName || '?'} | ${profile.postal_city || '?'} | ${profile.phone || 'ingen tel'} | ${profile.vehicles?.length || 0} fordon`);
      }
    } catch (error) {
      console.log(`❌ ${dealer.name} (${regnr}): ${error.message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n✅ Klart! ${enriched} berikade, ${noAds} utan annonser, ${failed} fel`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
