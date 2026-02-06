const{createClient}=require('@supabase/supabase-js');
const sb=createClient('https://rueqiiqxkazocconmnwp.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZXFpaXF4a2F6b2Njb25tbndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDc2NDAsImV4cCI6MjA4Mzk4MzY0MH0.GkUFYJyIHhD62ELsI8NLEQoQjMp2X2_r4RaE-lA06A4');

async function main(){
  const regs=['NKO497','HEB70G','YOP726','CYZ53L','LLM91K'];
  for(const reg of regs){
    const{data}=await sb.from('biluppgifter_data').select('regnummer,owner_name,dealer_since,previous_owner,owner_history').eq('regnummer',reg).single();
    if(!data) continue;

    const prev=data.previous_owner;
    const oh=data.owner_history||[];

    console.log('═'.repeat(60));
    console.log('  '+reg+' — Handlare: '+data.owner_name);
    console.log('═'.repeat(60));

    if(!prev){
      console.log('  Ingen lead/tidigare ägare\n');
      continue;
    }

    const leadName=prev.name||'';
    console.log('');
    console.log('  LEAD: '+leadName);
    console.log('  Typ:    '+(prev.lead_type||'?'));
    console.log('  Ålder:  '+(prev.age||'-'));
    console.log('  Telefon:'+(prev.phone||' -'));
    console.log('  Adress: '+(prev.address||'-'));
    console.log('  Ort:    '+(prev.postal_code||'')+' '+(prev.postal_city||''));

    // Find lead's ownership period from owner_history
    let leadIdx=-1;
    const firstWord=leadName.split(' ')[0].toLowerCase();
    for(let i=0;i<oh.length;i++){
      if(oh[i].name && oh[i].name.toLowerCase().includes(firstWord)){
        leadIdx=i;
        break;
      }
    }

    let leadFrom=null, leadTo=null;
    if(leadIdx>=0){
      leadFrom=oh[leadIdx].date;
      if(leadIdx>0) leadTo=oh[leadIdx-1].date;
    }

    console.log('');
    console.log('  ÄGANDE:');
    if(prev.purchase_date) console.log('    Köpte bilen:  '+prev.purchase_date);
    if(leadFrom) console.log('    Ägde från:    '+leadFrom);
    if(leadTo)   console.log('    Ägde till:    '+leadTo);

    if(leadFrom && leadTo){
      const from=new Date(leadFrom);
      const to=new Date(leadTo);
      const days=Math.round((to-from)/(1000*60*60*24));
      const months=Math.round(days/30.44);
      const years=Math.floor(months/12);
      const remMonths=months%12;
      let dur=days+' dagar';
      if(years>0) dur+=' (~'+years+' år '+(remMonths>0?remMonths+' mån':'') +')';
      else if(months>0) dur+=' (~'+months+' månader)';
      console.log('    => Ägde bilen i '+dur);
    } else if(leadFrom && data.dealer_since){
      const from=new Date(leadFrom);
      const to=new Date(data.dealer_since);
      const days=Math.round((to-from)/(1000*60*60*24));
      const months=Math.round(days/30.44);
      const years=Math.floor(months/12);
      const remMonths=months%12;
      let dur=days+' dagar';
      if(years>0) dur+=' (~'+years+' år '+(remMonths>0?remMonths+' mån':'') +')';
      else if(months>0) dur+=' (~'+months+' månader)';
      console.log('    => Ägde bilen i ~'+dur+' (till handlare övertog)');
    }

    // Show lead's vehicles
    const pv=prev.vehicles||[];
    console.log('');
    if(pv.length>0){
      console.log('  LEADETS FORDON ('+pv.length+' st):');
      for(const v of pv){
        const parts=[];
        if(v.reg_number) parts.push(v.reg_number);
        parts.push([v.brand,v.model,v.year].filter(Boolean).join(' '));
        if(v.vehicle_type) parts.push(v.vehicle_type);
        if(v.owned_since) parts.push('ägd sedan '+v.owned_since);
        if(v.status) parts.push(v.status);
        console.log('    • '+parts.join(' | '));
      }
    } else {
      console.log('  LEADETS FORDON: inga registrerade');
    }
    console.log('');
  }
}
main().catch(console.error);
