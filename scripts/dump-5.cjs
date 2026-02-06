const{createClient}=require('@supabase/supabase-js');
const sb=createClient('https://rueqiiqxkazocconmnwp.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4');

async function main(){
  const regs=['OZS881','GYK076','GKL66B','AJA00L','ELA355'];
  for(const reg of regs){
    const{data}=await sb.from('biluppgifter_data').select('*').eq('regnummer',reg).single();
    if(!data) continue;
    console.log('═'.repeat(60));
    console.log('  '+reg+' — RAW DATABASE');
    console.log('═'.repeat(60));
    // Print every field
    for(const[key,val] of Object.entries(data)){
      if(key==='owner_history'||key==='previous_owner'||key==='owner_vehicles'||key==='address_vehicles'||key==='mileage_history'){
        // Print complex objects nicely
        if(!val||( Array.isArray(val)&&val.length===0)){
          console.log('  '+key+': (tom)');
        } else {
          console.log('  '+key+':');
          console.log(JSON.stringify(val,null,4).split('\n').map(l=>'    '+l).join('\n'));
        }
      } else {
        console.log('  '+key+': '+JSON.stringify(val));
      }
    }
    console.log('');
  }
}
main().catch(console.error);
