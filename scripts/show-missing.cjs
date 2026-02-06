const{createClient}=require('@supabase/supabase-js');
const sb=createClient('https://rueqiiqxkazocconmnwp.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4');

async function main(){
  // Get all processed regnummer
  const buData=[];
  let off=0;
  while(true){
    const{data}=await sb.from('biluppgifter_data').select('regnummer').range(off,off+999);
    if(!data||data.length===0)break;
    buData.push(...data);
    off+=1000;
  }
  const pSet=new Set(buData.map(p=>p.regnummer));

  // Get dealer ads in pages
  const missing=[];
  off=0;
  while(true){
    const{data}=await sb.from('blocket_annonser')
      .select('regnummer,marke,modell,arsmodell,pris,saljare_namn,url')
      .eq('saljare_typ','handlare')
      .not('regnummer','is',null)
      .range(off,off+499);
    if(!data||data.length===0)break;
    for(const a of data){
      if(!pSet.has(a.regnummer)) missing.push(a);
    }
    off+=500;
  }

  // Random 20
  const sample=missing.sort(()=>Math.random()-0.5).slice(0,20);
  console.log('Totalt utan biluppgifter-data: '+missing.length+'\n');
  for(let i=0;i<sample.length;i++){
    const a=sample[i];
    console.log((i+1)+'. '+a.regnummer+' | '+(a.marke||'?')+' '+(a.modell||'')+' '+(a.arsmodell||'')+' | '+((a.pris||0).toLocaleString())+' kr');
    console.log('   Saljare: '+(a.saljare_namn||'?'));
    console.log('   URL: '+(a.url||'-'));
    console.log('');
  }
}
main().catch(console.error);
