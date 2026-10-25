/* PHCC-minimal rota availability bridge.
   Fetches only date/shift/doctor for assignments marked unavailable. No reason or
   sickness metadata is exposed to the rota UI, and nothing is persisted locally. */
(function () {
  'use strict';
  const URL='https://lodhylphktopwqlcvcvf.supabase.co';
  const KEY='sb_publishable_w7PkdZLDpZUo8bAH8hszyA_6BbzuOtf';
  let clientPromise=null;
  let lastFingerprint=null;
  let timer=null;

  const norm=v=>String(v||'').replace(/\s+/g,' ').trim().toLowerCase();
  const sameDoctor=(a,b)=>{
    try { if (typeof doctorMatches==='function') return doctorMatches(a,b); } catch (_) {}
    return norm(a).replace(/^dr\.?\s+/,'')===norm(b).replace(/^dr\.?\s+/,'');
  };

  async function client(){
    if(clientPromise)return clientPromise;
    clientPromise=(async()=>{
      const createClient=window.supabase?.createClient || (await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm')).createClient;
      return createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    })();
    return clientPromise;
  }

  function qatarDate(d){
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  }

  function clearFromCb(day,period,name){
    const cb=period==='am' ? day?.cbAM : day?.cbPM;
    if(!cb)return;
    ['tl','tm2','tm3'].forEach(k=>{if(sameDoctor(cb[k],name))cb[k]='-';});
  }

  function maskRow(row){
    if(typeof currentSchedule==='undefined' || !Array.isArray(currentSchedule))return false;
    const period=String(row.shift_code||'').toLowerCase();
    if(period!=='am'&&period!=='pm')return false;
    const day=currentSchedule.find(d=>String(d?.isoDate||d?.date||'')===String(row.shift_date||''));
    if(!day)return false;
    const shift=day[period];
    if(shift){
      try {
        if(typeof clearDoctorFromShift==='function') clearDoctorFromShift(shift,row.physician_name);
        else {
          Object.keys(shift).forEach(k=>{if(typeof shift[k]==='string'&&sameDoctor(shift[k],row.physician_name))shift[k]='-';});
          Object.keys(shift.rooms||{}).forEach(k=>{if(sameDoctor(shift.rooms[k],row.physician_name))shift.rooms[k]='-';});
        }
      } catch (_) {}
    }
    clearFromCb(day,period,row.physician_name);
    const leadKey=period==='am'?'shiftLeadAM':'shiftLeadPM';
    if(sameDoctor(day[leadKey],row.physician_name))day[leadKey]='';
    return true;
  }

  async function applyUnavailable(){
    try{
      const c=await client();
      const {data:{session}}=await c.auth.getSession();
      if(!session)return;
      const from=new Date(); from.setDate(from.getDate()-1);
      const to=new Date(); to.setDate(to.getDate()+14);
      const {data,error}=await c.rpc('rotastic_unavailable_assignments',{p_from:qatarDate(from),p_to:qatarDate(to)});
      if(error){if(!/verified PHCC authentication required/i.test(error.message||''))console.warn('ROTASTIC availability sync:',error.message);return;}
      const rows=Array.isArray(data)?data:[];
      const fingerprint=rows.map(r=>`${r.shift_date}|${r.shift_code}|${r.physician_name}`).sort().join('~');

      // If an unavailable assignment becomes available again, reload the authoritative
      // local rota source once so the original name can be restored cleanly.
      if(lastFingerprint!==null && fingerprint!==lastFingerprint){
        const oldSet=new Set(lastFingerprint?lastFingerprint.split('~'):[]);
        const newSet=new Set(fingerprint?fingerprint.split('~'):[]);
        const removed=[...oldSet].some(x=>!newSet.has(x));
        if(removed){location.reload();return;}
      }
      lastFingerprint=fingerprint;

      let changed=false;
      rows.forEach(row=>{changed=maskRow(row)||changed;});
      if(changed){
        try { if(typeof renderScheduleView==='function') renderScheduleView(); } catch (_) {}
      }
    }catch(e){console.warn('ROTASTIC availability bridge unavailable',e?.message||e);}
  }

  window.addEventListener('load',()=>{
    setTimeout(()=>applyUnavailable(),350);
    timer=setInterval(applyUnavailable,60*1000);
  },{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')applyUnavailable();});
})();
