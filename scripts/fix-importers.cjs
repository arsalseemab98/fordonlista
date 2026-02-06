const{createClient}=require('@supabase/supabase-js');
const sb=createClient('https://rueqiiqxkazocconmnwp.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4');

const PATTERNS=['finans sverige','northern europe','motor sweden','sweden ab',
  'nordic ab','group sverige','kia sweden','hyundai motor','subaru nordic',
  'volkswagen finans','mercedes-benz finans','bmw northern','nissan nordic',
  'toyota sweden','volvo car','polestar','ford motor'];

function isImporter(name){
  if(!name)return false;
  const n=name.toLowerCase();
  return PATTERNS.some(p=>n.includes(p));
}

async function main(){
  // Get all records with previous_owner
  const allWithLead=[];
  let off=0;
  while(true){
    const{data}=await sb.from('biluppgifter_data').select('regnummer,previous_owner').not('previous_owner','is',null).range(off,off+499);
    if(!data||data.length===0) break;
    allWithLead.push(...data);
    off+=500;
  }
  console.log('Records with leads: '+allWithLead.length);

  let cleared=0;
  for(const rec of allWithLead){
    const leadName=rec.previous_owner?.name||'';
    if(isImporter(leadName)){
      await sb.from('biluppgifter_data').update({previous_owner:null}).eq('regnummer',rec.regnummer);
      cleared++;
      console.log('  Cleared: '+leadName+' ('+rec.regnummer+')');
    }
  }
  console.log('\nTotalt rensade importer-leads: '+cleared);

  // Final counts
  const{count:h}=await sb.from('biluppgifter_data').select('*',{count:'exact',head:true}).eq('owner_type','handlare');
  const{count:f}=await sb.from('biluppgifter_data').select('*',{count:'exact',head:true}).eq('owner_type','formedling');
  const{count:s}=await sb.from('biluppgifter_data').select('*',{count:'exact',head:true}).eq('owner_type','sold');
  const{count:leads}=await sb.from('biluppgifter_data').select('*',{count:'exact',head:true}).not('previous_owner','is',null);
  console.log('\nHandlare: '+h+', Förmedling: '+f+', Sålda: '+s+', Med lead: '+leads);
}
main().catch(console.error);
