const{createClient}=require('@supabase/supabase-js');
const sb=createClient('https://rueqiiqxkazocconmnwp.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4');

async function main(){
  const{data}=await sb.from('biluppgifter_data')
    .select('*')
    .eq('owner_type','handlare')
    .not('previous_owner','is',null)
    .order('fetched_at',{ascending:false})
    .limit(200);

  const sample=data.sort(()=>Math.random()-0.5).slice(0,5);
  const regs=sample.map(s=>s.regnummer);
  const{data:ads}=await sb.from('blocket_annonser').select('*').in('regnummer',regs);
  const adMap={};
  for(const a of(ads||[]))adMap[a.regnummer]=a;

  for(let i=0;i<sample.length;i++){
    const r=sample[i];
    const a=adMap[r.regnummer]||{};

    console.log('═'.repeat(60));
    console.log(`  ${i+1}. ${r.regnummer}`);
    console.log('═'.repeat(60));

    console.log('\n  ┌─ BLOCKET ANNONS ─────────────────────────');
    console.log(`  │ Märke:       ${a.marke||'?'} ${a.modell||''}`);
    console.log(`  │ Årsmodell:   ${a.arsmodell||'?'}`);
    console.log(`  │ Pris:        ${(a.pris||0).toLocaleString()} kr`);
    console.log(`  │ Miltal:      ${a.miltal ? a.miltal.toLocaleString()+' mil' : '?'}`);
    console.log(`  │ Bränsle:     ${a.bransle||'?'}`);
    console.log(`  │ Växellåda:   ${a.vaxellada||'?'}`);
    console.log(`  │ Färg:        ${a.farg||'?'}`);
    console.log(`  │ Säljare:     ${a.saljare_namn||'?'}`);
    console.log(`  │ Region:      ${a.region||'?'} / ${a.kommun||''}`);
    console.log(`  │ Publicerad:  ${a.publicerad ? a.publicerad.substring(0,10) : '?'}`);
    console.log(`  │ URL:         ${a.url||'-'}`);
    console.log(`  └────────────────────────────────────────────`);

    console.log('\n  ┌─ BILUPPGIFTER (ÄGARE/HANDLARE) ─────────');
    console.log(`  │ Ägare:       ${r.owner_name}`);
    console.log(`  │ Typ:         ${(r.owner_type||'?').toUpperCase()}`);
    console.log(`  │ is_dealer:   ${r.is_dealer}`);
    console.log(`  │ Ålder:       ${r.owner_age||'-'}`);
    console.log(`  │ Telefon:     ${r.owner_phone||'-'}`);
    console.log(`  │ Adress:      ${r.owner_address||'-'}`);
    console.log(`  │ Postnr/Ort:  ${r.owner_postal_code||''} ${r.owner_postal_city||''}`);
    console.log(`  │ Ägare sedan: ${r.dealer_since||'-'}`);

    const ov=r.owner_vehicles||[];
    if(ov.length>0){
      console.log(`  │`);
      console.log(`  │ Handlarens fordon (${ov.length} st):`);
      for(const v of ov.slice(0,5)){
        console.log(`  │   ${v.reg_number||'?'} | ${v.brand||''} ${v.model||''} ${v.year||''} | ${v.vehicle_type||''} | ${v.status||''}`);
      }
      if(ov.length>5) console.log(`  │   ... +${ov.length-5} till`);
    }
    console.log(`  └────────────────────────────────────────────`);

    const prev=r.previous_owner;
    if(prev){
      console.log('\n  ┌─ LEAD (TIDIGARE ÄGARE) ──────────────────');
      console.log(`  │ Namn:        ${prev.name}`);
      console.log(`  │ Typ:         ${prev.lead_type||'?'}`);
      console.log(`  │ Ålder:       ${prev.age||'-'}`);
      console.log(`  │ Telefon:     ${prev.phone||'-'}`);
      console.log(`  │ Adress:      ${prev.address||'-'}`);
      console.log(`  │ Postnr/Ort:  ${prev.postal_code||''} ${prev.postal_city||''}`);

      const pv=prev.vehicles||[];
      if(pv.length>0){
        console.log(`  │`);
        console.log(`  │ Leadets fordon (${pv.length} st):`);
        for(const v of pv.slice(0,5)){
          console.log(`  │   ${v.reg_number||'?'} | ${v.brand||''} ${v.model||''} ${v.year||''} | ${v.vehicle_type||''} | ägt ${v.owned_since||'?'}`);
        }
        if(pv.length>5) console.log(`  │   ... +${pv.length-5} till`);
      }
      console.log(`  └────────────────────────────────────────────`);
    }

    const oh=r.owner_history||[];
    if(oh.length>0){
      console.log('\n  ┌─ ÄGARKEDJA ('+oh.length+' poster) ─────────────────');
      for(let j=0;j<oh.length;j++){
        const o=oh[j];
        const tag=j===0?'← nuvarande':'';
        console.log(`  │ [${j}] ${o.name||'?'} (${o.owner_class||'?'}) sedan ${o.date||'?'} ${tag}`);
      }
      console.log(`  └────────────────────────────────────────────`);
    }
    console.log('');
  }
}
main().catch(console.error);
