const ROTASTIC_SYNC_URL='https://lodhylphktopwqlcvcvf.supabase.co';
const ROTASTIC_SYNC_KEY='sb_publishable_w7PkdZLDpZUo8bAH8hszyA_6BbzuOtf';

function qatarDate(value){
  if(!value)return null;
  const s=String(value).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const d=new Date(s); if(Number.isNaN(d.getTime()))return null;
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
}
function shiftStart(node,date,code,parent){
  const keys=code==='AM'?['amStart','am_start','amTime','am_time']:['pmStart','pm_start','pmTime','pm_time'];
  const candidates=[node?.shift_start_at,node?.shiftStart,node?.start_at,node?.startAt,node?.start,node?.time,...keys.map(k=>node?.[k]),...keys.map(k=>parent?.[k])];
  for(const raw of candidates){
    if(!raw)continue;
    const text=String(raw).trim();
    if(/^\d{1,2}:\d{2}/.test(text))return `${date}T${text.slice(0,5)}:00+03:00`;
    const d=new Date(raw); if(!Number.isNaN(d.getTime()))return d.toISOString();
  }
  return null;
}
function extract(root){
  const rows=[],seen=new Set();
  const add=(name,date,code,start,key)=>{name=String(name||'').trim();date=qatarDate(date);code=String(code||'').toUpperCase();if(!name||!date||!['AM','PM'].includes(code)||!start)return;const id=`${date}|${code}|${name}`;if(seen.has(id))return;seen.add(id);rows.push({physician_name:name,shift_date:date,shift_code:code,shift_start_at:start,source_key:key||id});};
  function walk(node,path='root',depth=0,parent=null){
    if(depth>10||node==null)return;
    if(Array.isArray(node)){node.forEach((v,i)=>walk(v,`${path}[${i}]`,depth+1,parent));return;}
    if(typeof node!=='object')return;
    const date=node.date||node.shift_date||node.shiftDate||node.day||node.dateKey;
    const code=node.shift_code||node.shiftCode||node.period||node.shift;
    const name=node.physician_name||node.physicianName||node.doctor||node.doctorName||node.name;
    if(date&&code&&name){const d=qatarDate(date);add(name,d,code,shiftStart(node,d,String(code).toUpperCase(),parent),path);}
    if(date){
      const d=qatarDate(date);
      for(const c of ['AM','PM']){
        const list=node[c]||node[c.toLowerCase()]||node[`${c.toLowerCase()}Doctors`]||node[`${c.toLowerCase()}_doctors`];
        if(Array.isArray(list))list.forEach((v,i)=>{const n=typeof v==='string'?v:(v?.physician_name||v?.physicianName||v?.doctor||v?.doctorName||v?.name);add(n,d,c,shiftStart(v,d,c,node),`${path}.${c}[${i}]`);});
      }
    }
    Object.entries(node).forEach(([k,v])=>{if(!['subscription','session','token','access_token','refresh_token'].includes(k))walk(v,`${path}.${k}`,depth+1,node);});
  }
  walk(root); return rows;
}
async function factory(){if(window.supabase?.createClient)return window.supabase.createClient;const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm');return mod.createClient;}
async function syncReleasedRota(){
  const createClient=await factory();
  const client=createClient(ROTASTIC_SYNC_URL,ROTASTIC_SYNC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await client.auth.getSession(); if(!session)return;
  const all=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i); if(!key)continue;
    let parsed; try{parsed=JSON.parse(localStorage.getItem(key));}catch{continue;}
    all.push(...extract(parsed));
  }
  const unique=[...new Map(all.map(r=>[`${r.shift_date}|${r.shift_code}|${r.physician_name}`,r])).values()];
  if(!unique.length)return;
  const first=unique.map(r=>r.shift_date).sort()[0];
  const d=new Date(`${first}T12:00:00+03:00`); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day);
  const weekStart=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const {error}=await client.rpc('rotastic_sync_released_shifts',{p_week_start:weekStart,p_shifts:unique});
  if(error && !/manager authorization required/i.test(error.message||''))console.warn('ROTASTIC schedule sync failed',error.message);
}
window.addEventListener('load',()=>syncReleasedRota().catch(()=>{}),{once:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncReleasedRota().catch(()=>{});});
setInterval(()=>syncReleasedRota().catch(()=>{}),10*60*1000);
