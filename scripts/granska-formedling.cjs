#!/usr/bin/env node
/**
 * Manuell granskning av förmedlingsbolag
 * Avgör vilka som är bilhandlare
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const sb = createClient(
  'https://rueqiiqxkazocconmnwp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD02ELsI8NLEQoQjMp2X2_r4RaE-lA06A4'
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('\n🔍 Hämtar förmedlingsbolag med länkar...\n');

  // Hämta alla förmedlingsägare med regnummer
  const { data, error } = await sb
    .from('biluppgifter_data')
    .select('owner_name, owner_type, is_dealer, regnummer')
    .eq('owner_type', 'formedling')
    .not('owner_name', 'is', null);

  if (error) {
    console.error('❌ Fel:', error.message);
    process.exit(1);
  }

  // Hämta blocket-URLs för alla regnummer
  const regnrs = [...new Set(data.map(d => d.regnummer))];
  const { data: blocketData } = await sb
    .from('blocket_annonser')
    .select('regnummer, url, saljare_namn')
    .in('regnummer', regnrs);

  const blocketMap = {};
  for (const b of (blocketData || [])) {
    blocketMap[b.regnummer] = { url: b.url, saljare: b.saljare_namn };
  }

  // Gruppera per ägare och samla info
  const ownerMap = {};
  for (const row of data) {
    if (!ownerMap[row.owner_name]) {
      ownerMap[row.owner_name] = {
        name: row.owner_name,
        count: 0,
        is_dealer: row.is_dealer,
        regnummer: [],
        blocket_urls: [],
        saljare: new Set()
      };
    }
    ownerMap[row.owner_name].count++;
    ownerMap[row.owner_name].regnummer.push(row.regnummer);

    const blocket = blocketMap[row.regnummer];
    if (blocket) {
      ownerMap[row.owner_name].blocket_urls.push(blocket.url);
      if (blocket.saljare) ownerMap[row.owner_name].saljare.add(blocket.saljare);
    }
  }

  // Sortera efter antal bilar (flest först)
  const owners = Object.values(ownerMap).sort((a, b) => b.count - a.count);
  const toReview = owners;

  console.log(`📋 ${toReview.length} förmedlingsbolag att granska\n`);
  console.log('Kommandon:');
  console.log('  j = Ja, är bilhandlare');
  console.log('  n = Nej, inte bilhandlare');
  console.log('  s = Skippa (osäker)');
  console.log('  q = Avsluta\n');
  console.log('─'.repeat(80) + '\n');

  let reviewed = 0;
  let markedDealer = 0;
  let markedNotDealer = 0;
  let skipped = 0;

  for (let i = 0; i < toReview.length; i++) {
    const owner = toReview[i];
    const current = owner.is_dealer === true ? '✓ handlare' : owner.is_dealer === false ? '✗ ej handlare' : '? okänd';
    const firstReg = owner.regnummer[0];
    const biluppgifterUrl = `https://biluppgifter.se/fordon/${firstReg}`;
    const blocketUrl = owner.blocket_urls[0] || '-';
    const saljare = [...owner.saljare].join(', ') || '-';

    console.log(`[${i + 1}/${toReview.length}] 📌 ${owner.name}`);
    console.log(`         ${owner.count} bil${owner.count > 1 ? 'ar' : ''} | Status: ${current}`);
    console.log(`         Blocket säljare: ${saljare}`);
    console.log(`         🔗 Biluppgifter: ${biluppgifterUrl}`);
    console.log(`         🔗 Blocket: ${blocketUrl}`);

    const answer = await ask('         Handlare? (j/n/s/q): ');

    if (answer.toLowerCase() === 'q') {
      console.log('\n⏹️  Avslutar...');
      break;
    }

    if (answer.toLowerCase() === 'j') {
      const { error: updateError } = await sb
        .from('biluppgifter_data')
        .update({ is_dealer: true })
        .eq('owner_name', owner.name);

      if (updateError) {
        console.log(`         ❌ Fel: ${updateError.message}`);
      } else {
        console.log('         ✅ Markerad som handlare\n');
        markedDealer++;
      }
      reviewed++;
    } else if (answer.toLowerCase() === 'n') {
      const { error: updateError } = await sb
        .from('biluppgifter_data')
        .update({ is_dealer: false })
        .eq('owner_name', owner.name);

      if (updateError) {
        console.log(`         ❌ Fel: ${updateError.message}`);
      } else {
        console.log('         ❌ Markerad som EJ handlare\n');
        markedNotDealer++;
      }
      reviewed++;
    } else {
      console.log('         ⏭️  Skippade\n');
      skipped++;
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('📊 Sammanfattning:');
  console.log(`   Granskade: ${reviewed}`);
  console.log(`   Markerade som handlare: ${markedDealer}`);
  console.log(`   Markerade som EJ handlare: ${markedNotDealer}`);
  console.log(`   Skippade: ${skipped}`);
  console.log(`   Kvar: ${toReview.length - reviewed - skipped}`);

  rl.close();
}

main().catch(err => {
  console.error('❌ Fel:', err);
  rl.close();
  process.exit(1);
});
