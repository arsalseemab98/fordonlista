const{createClient}=require('@supabase/supabase-js');
const sb=createClient('https://rueqiiqxkazocconmnwp.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4');

async function check() {
  // 1. Totalt i biluppgifter_data
  const {count: totalFetched} = await sb.from('biluppgifter_data').select('*',{count:'exact',head:true});

  // 2. Alla handlar-annonser på Blocket (aktiva)
  const {count: totalDealerAds} = await sb.from('blocket_annonser')
    .select('*',{count:'exact',head:true})
    .eq('saljare_typ','handlare')
    .is('borttagen',null)
    .not('regnummer','is',null);

  // 3. Hämta alla regnummer som redan är hämtade
  const existingSet = new Set();
  let offset = 0;
  while(true) {
    const{data:chunk}=await sb.from('biluppgifter_data').select('regnummer').range(offset,offset+999);
    if(!chunk||chunk.length===0)break;
    for(const e of chunk) existingSet.add(e.regnummer.toUpperCase());
    offset+=chunk.length;
    if(chunk.length<1000)break;
  }

  // 4. Räkna hur många handlar-annonser som SAKNAR biluppgifter
  let missing = 0;
  let page = 0;
  while(true) {
    const{data:ads}=await sb.from('blocket_annonser')
      .select('regnummer')
      .eq('saljare_typ','handlare')
      .is('borttagen',null)
      .not('regnummer','is',null)
      .range(page*1000,(page+1)*1000-1);
    if(!ads||ads.length===0)break;
    for(const a of ads) {
      if(!existingSet.has(a.regnummer.toUpperCase())) missing++;
    }
    page++;
    if(ads.length<1000)break;
  }

  // 5. Breakdown av owner_type
  const{data:types}=await sb.from('biluppgifter_data').select('owner_type');
  const counts = {};
  for(const t of types||[]) {
    const ot = t.owner_type || 'null';
    counts[ot] = (counts[ot]||0) + 1;
  }

  console.log('═══════════════════════════════════════════');
  console.log('BILUPPGIFTER STATUS');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('Blocket handlar-annonser (aktiva):  ' + totalDealerAds);
  console.log('Redan hämtade (biluppgifter_data):  ' + totalFetched);
  console.log('KVAR ATT HÄMTA:                     ' + missing);
  console.log('');
  console.log('Breakdown per owner_type:');
  for(const [k,v] of Object.entries(counts).sort((a,b)=>b[1]-a[1])) {
    console.log('  ' + k.padEnd(15) + ': ' + v);
  }
}
check().catch(console.error);
