const{createClient}=require('@supabase/supabase-js');
const sb=createClient('https://rueqiiqxkazocconmnwp.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4');

const REG = process.argv[2] || 'XZW253';

async function main(){
  const{data:ad}=await sb.from('blocket_annonser').select('*').eq('regnummer',REG).single();
  const{data:bil}=await sb.from('biluppgifter_data').select('*').eq('regnummer',REG).single();

  console.log('═'.repeat(60));
  console.log('  '+REG+' — UNDERSÖKNING');
  console.log('═'.repeat(60));

  console.log('\n┌─ BLOCKET ANNONS ───────────────────────────');
  if(ad){
    console.log('│ Märke:       '+(ad.marke||'?')+' '+(ad.modell||''));
    console.log('│ Årsmodell:   '+(ad.arsmodell||'?'));
    console.log('│ Pris:        '+((ad.pris||0).toLocaleString())+' kr');
    console.log('│ Miltal:      '+(ad.miltal||'?'));
    console.log('│ Säljare:     '+(ad.saljare_namn||'?'));
    console.log('│ Säljartyp:   '+(ad.saljare_typ||'?'));
    console.log('│ Region:      '+(ad.region||'?')+' / '+(ad.kommun||''));
    console.log('│ Publicerad:  '+(ad.publicerad||'?'));
    console.log('│ URL:         '+(ad.url||'-'));
  } else {
    console.log('│ FINNS EJ I BLOCKET-TABELLEN');
  }
  console.log('└────────────────────────────────────────────');

  console.log('\n┌─ BILUPPGIFTER DATA ────────────────────────');
  if(bil){
    console.log('│ Ägare:       '+(bil.owner_name||'?'));
    console.log('│ owner_type:  '+(bil.owner_type||'NULL'));
    console.log('│ is_dealer:   '+bil.is_dealer);
    console.log('│ is_company:  '+bil.is_company);
    console.log('│ Ålder:       '+(bil.owner_age||'-'));
    console.log('│ Telefon:     '+(bil.owner_phone||'-'));
    console.log('│ Adress:      '+(bil.owner_address||'-'));
    console.log('│ Postnr/Ort:  '+(bil.owner_postal_code||'')+' '+(bil.owner_postal_city||''));
    console.log('│ dealer_since:'+(bil.dealer_since||'-'));
    console.log('│ fetched_at:  '+(bil.fetched_at||'-'));

    const oh=bil.owner_history||[];
    if(oh.length>0){
      console.log('│');
      console.log('│ ÄGARKEDJA ('+oh.length+' poster):');
      for(let i=0;i<oh.length;i++){
        const o=oh[i];
        const tag=i===0?'  ← nuvarande':'';
        console.log('│  ['+i+'] '+(o.name||'?')+' ('+(o.owner_class||'?')+') sedan '+(o.date||'?')+tag);
        if(o.details) console.log('│       '+o.details);
      }
    }

    const prev=bil.previous_owner;
    if(prev){
      console.log('│');
      console.log('│ PREVIOUS_OWNER:');
      console.log('│  Namn:    '+prev.name);
      console.log('│  Typ:     '+(prev.lead_type||'?'));
      console.log('│  Ålder:   '+(prev.age||'-'));
      console.log('│  Telefon: '+(prev.phone||'-'));
      console.log('│  Adress:  '+(prev.address||'-'));
      console.log('│  Ort:     '+(prev.postal_code||'')+' '+(prev.postal_city||''));
      const pv=prev.vehicles||[];
      if(pv.length>0){
        console.log('│  Fordon ('+pv.length+' st):');
        for(const v of pv.slice(0,10)){
          console.log('│    • '+(v.reg_number||'?')+' | '+(v.brand||'')+' '+(v.model||'')+' '+(v.year||'')+' | '+(v.vehicle_type||'')+' | '+(v.status||''));
        }
      }
    } else {
      console.log('│');
      console.log('│ PREVIOUS_OWNER: null (ingen lead)');
    }

    const ov=bil.owner_vehicles||[];
    if(ov.length>0){
      console.log('│');
      console.log('│ ÄGARENS FORDON ('+ov.length+' st):');
      for(const v of ov.slice(0,10)){
        console.log('│  • '+(v.reg_number||'?')+' | '+(v.brand||'')+' '+(v.model||'')+' '+(v.year||'')+' | '+(v.vehicle_type||'')+' | '+(v.status||''));
      }
      if(ov.length>10) console.log('│  ... +'+(ov.length-10)+' till');
    }
  } else {
    console.log('│ FINNS EJ I BILUPPGIFTER-TABELLEN');
  }
  console.log('└────────────────────────────────────────────');
}
main().catch(console.error);
