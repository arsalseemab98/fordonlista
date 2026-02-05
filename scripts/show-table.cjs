const{createClient}=require('@supabase/supabase-js');
const sb=createClient('https://rueqiiqxkazocconmnwp.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4');

async function show(){
  const{data}=await sb.from('biluppgifter_data')
    .select('regnummer,owner_name,owner_type,owner_age,owner_phone,owner_postal_city,is_dealer,previous_owner,owner_history')
    .not('owner_name','is',null)
    .order('fetched_at',{ascending:false})
    .limit(500);
  const shuffled=data.sort(()=>Math.random()-0.5).slice(0,20);

  const regs=shuffled.map(s=>s.regnummer);
  const{data:ads}=await sb.from('blocket_annonser')
    .select('regnummer,marke,modell,arsmodell,pris,saljare_namn')
    .in('regnummer',regs);
  const adMap={};
  for(const a of(ads||[]))adMap[a.regnummer?.toUpperCase()]=a;

  for(let i=0;i<shuffled.length;i++){
    const r=shuffled[i];
    const ad=adMap[r.regnummer]||{};
    const prev=r.previous_owner;
    const oh0=(r.owner_history||[])[0];

    let lead='-';
    if(prev) lead=prev.name+' ('+( prev.lead_type||'?')+', '+(prev.age ? prev.age+' ar' : 'foretag')+', '+(prev.phone||'inget tel')+')';
    if(r.owner_type==='formedling' && !prev) lead='= agaren ar leadet';
    if(r.owner_type==='sold') lead='SALD till '+(oh0 ? oh0.name : '?');

    console.log((i+1)+'. '+r.regnummer+' | '+(ad.marke||'?')+' '+(ad.modell||'')+' '+(ad.arsmodell||'')+' | '+((ad.pris||0).toLocaleString())+' kr');
    console.log('   Blocket:    '+(ad.saljare_namn||'?'));
    console.log('   Biluppgift: '+r.owner_name+' ['+( r.owner_type||'?').toUpperCase()+']'+(r.is_dealer ? ' (dealer)' : ''));
    console.log('   Lead:       '+lead);
    console.log('');
  }
}
show().catch(console.error);
