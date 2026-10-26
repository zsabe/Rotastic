from pathlib import Path

p=Path('generate-cleanup.js')
s=p.read_text(encoding='utf-8')
anchor="function addDays(iso,n){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}\n"
block=r'''
async function scheduleBackendShiftReminders(schedule){
  if(!window.rotasticBackendClient||!Array.isArray(schedule)||!schedule.length)return;
  try{
    if(typeof rotasticBackendEnsureSession==='function')await rotasticBackendEnsureSession();
    const days=schedule.filter(d=>d&&d.isoDate),dates=[...new Set(days.map(d=>d.isoDate))],items=[];
    days.forEach(day=>['am','pm'].forEach(period=>{
      const sh=day[period]||{};let doctors=[];
      try{doctors=typeof rotasticCollectShiftDoctors==='function'?rotasticCollectShiftDoctors(day,period):[]}catch(e){}
      const seen=new Set();
      doctors.forEach(name=>{
        name=String(name||'').trim();if(!name)return;
        const ck=(typeof canonicalRotaName==='function'?canonicalRotaName(name):name).toLowerCase();if(seen.has(ck))return;seen.add(ck);
        try{if(typeof rotasticDoctorIsOnDisplayedLeave==='function'&&rotasticDoctorIsOnDisplayedLeave(name,day))return}catch(e){}
        const timed=(typeof doctorMatches==='function')&&(doctorMatches(sh.timed1Doc,name)||doctorMatches(sh.timed2Doc,name));
        const start=timed?(period==='am'?540:840):(period==='am'?420:960),rem=start-60,hh=String(Math.floor(rem/60)).padStart(2,'0'),mm=String(rem%60).padStart(2,'0');
        const scheduled=day.isoDate+'T'+hh+':'+mm+':00+03:00';if(new Date(scheduled).getTime()<=Date.now())return;
        const shiftLabel=timed?(period==='am'?'09:00–16:00':'14:00–20:00'):(period==='am'?'07:00–14:00':'16:00–22:00');
        items.push({recipient_name:name,title:'Shift starts in 1 hour',message:'Your '+shiftLabel+' ROTASTIC shift starts in about 1 hour.',scheduled_for:scheduled,dedupe_key:'shift-reminder|'+day.isoDate+'|'+period+'|'+ck+'|'+start,metadata:{schedule_date:day.isoDate,period:period,shift_label:shiftLabel,start_minutes:start}});
      });
    }));
    for(let i=0;i<items.length||i===0;i+=400){
      const chunk=items.slice(i,i+400);const r=await rotasticBackendClient.rpc('rotastic_schedule_shift_reminders',{p_items:chunk,p_dates:i===0?dates:[]});
      if(r.error)throw r.error;if(items.length===0)break;
    }
  }catch(e){console.warn('Backend shift reminders:',e)}
}
'''
if 'async function scheduleBackendShiftReminders' not in s:
    if anchor not in s: raise SystemExit('addDays anchor missing')
    s=s.replace(anchor,anchor+block,1)
s=s.replace("if(weeks===1)return originalPlanner.apply(this,arguments);","if(weeks===1){const result=await originalPlanner.apply(this,arguments);await scheduleBackendShiftReminders(currentSchedule);return result;}",1)
s=s.replace("switchTab('schedule');renderScheduleView();return true;","await scheduleBackendShiftReminders(series.flatMap(x=>x.schedule||[]));switchTab('schedule');renderScheduleView();return true;",1)
old="const originalAuto=typeof generateAutomaticWeeklyDraftIfDue==='function'?generateAutomaticWeeklyDraftIfDue:null;if(originalAuto)generateAutomaticWeeklyDraftIfDue=async function(){try{const d=getMostRecentWednesday2200Qatar();if(d?.key==='2026-10-28'){renderAutoGenerationStatus();return false}}catch(e){}return originalAuto.apply(this,arguments)};"
new="const originalAuto=typeof generateAutomaticWeeklyDraftIfDue==='function'?generateAutomaticWeeklyDraftIfDue:null;if(originalAuto)generateAutomaticWeeklyDraftIfDue=async function(){try{const d=getMostRecentWednesday2200Qatar();if(d?.key==='2026-10-28'){renderAutoGenerationStatus();return false}}catch(e){}const result=await originalAuto.apply(this,arguments);if(result)await scheduleBackendShiftReminders(currentSchedule);return result;};"
if old in s:s=s.replace(old,new,1)
anchor2="const originalAuto=typeof generateAutomaticWeeklyDraftIfDue"
block2="const originalConfirmAmendment=typeof confirmScheduleAmendment==='function'?confirmScheduleAmendment:null;if(originalConfirmAmendment)confirmScheduleAmendment=function(){const r=originalConfirmAmendment.apply(this,arguments);Promise.resolve(r).then(()=>scheduleBackendShiftReminders(currentSchedule));return r;};\n\n"
if 'originalConfirmAmendment' not in s:
    if anchor2 not in s: raise SystemExit('auto anchor missing')
    s=s.replace(anchor2,block2+anchor2,1)
p.write_text(s,encoding='utf-8')
