/* Compact, assignment-accurate Personal View. Loaded after the base app. */
(()=>{
'use strict';
if(window.__rotasticCompactPersonalInstalled)return;
window.__rotasticCompactPersonalInstalled=true;
const WISHES=[
'One patient at a time. You’ve got this.','May your coffee stay warm and your shift stay calm.','Your kindness makes a difference.','A calm moment can change someone’s day.','You bring care to every conversation.','Small wins count today.','Wishing you a smooth and steady shift.','Your effort matters, even on busy days.','Remember to take a sip of water.','Good teamwork makes tough shifts easier.','You can handle today, one step at a time.','May the paperwork be merciful.','A little patience goes a long way.','You make a difference in quiet ways.','Here’s to kind patients and helpful colleagues.','Take pride in the care you give.','One thoughtful decision at a time.','You’re doing meaningful work today.','May your breaks be uninterrupted.','Keep your sense of humour close.','Your presence can be reassuring.','A fresh day, a fresh opportunity to help.','May your shift bring more smiles than surprises.','Even small gestures of care matter.','Here’s to a balanced, productive day.','Steady hands, kind words, clear thinking.','You deserve a peaceful finish today.','Good care starts with listening.','May today be lighter than expected.','Thank you for showing up with care.'
];
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const same=(a,b)=>{try{return typeof window.doctorMatches==='function'?window.doctorMatches(a,b):String(a).trim().toLowerCase()===String(b).trim().toLowerCase()}catch(_){return String(a).trim().toLowerCase()===String(b).trim().toLowerCase()}};
function wrap(){
 const original=window.buildMyShiftMainView;
 if(typeof original!=='function'||original.__rotasticCompact)return;
 const replacement=function(){
  try{
   const doctor=window.activeUserDocName||'';
   const day=typeof window.getMyShiftDay==='function'?window.getMyShiftDay():null;
   const date=typeof window.getQatarTodayISO==='function'?window.getQatarTodayISO():new Date().toISOString().slice(0,10);
   if(!doctor||!day||(typeof window.getMyShiftLeaveForDate==='function'&&window.getMyShiftLeaveForDate(doctor,date)))return original();
   const timing=window.getDoctorShiftTiming?.(day,doctor);
   if(!timing)return original();
   const shift=day[timing.period];
   if(!shift)return original();
   const rooms=window.getRoomAssignmentsForDoctor?.(shift,doctor)||[];
   const specials=Array.isArray(shift.specialAssignments)?shift.specialAssignments.filter(x=>same(x.doctor,doctor)).map(x=>x.clinic):[];
   const clinics=specials.length?specials:(window.collectSpecialClinicDuties?.(shift,doctor)||[]);
   const uniqueClinics=[...new Set(clinics.map(x=>String(x).trim().replace(/^WBC$/i,'Well Baby').replace(/\s*clinic\s*$/i,'').replace(/[👶🤰🩺]/gu,'').trim()).filter(Boolean))];
   const lead=day[timing.period==='am'?'shiftLeadAM':'shiftLeadPM']||shift.shiftLead||'';
   const windowInfo=window.getActiveUserShiftWindowForDay?.(day,doctor);
   const hours=windowInfo?.label||(timing.period==='am'?'07:00–14:00':'16:00–22:00');
   const dateLabel=window.getQatarLongDateText?.(date)||date;
   const roomLabel=rooms.length?rooms.join(' / '):'—';
   const hash=[...date].reduce((n,c)=>n*31+c.charCodeAt(0),0)>>>0;
   const wish=WISHES[hash%WISHES.length];
   const duties=window.collectEmergencyDuties?.(shift,doctor)||[];
   const blue=window.collectCodeBlueDuties?.(timing.period==='am'?day.cbAM:day.cbPM,doctor)||[];
   return `<div class="clean-card my-shift-presence-card rotastic-duty-poster rounded-2xl p-5 sm:p-6 border border-sky-500/20">
    <div class="text-[10px] uppercase tracking-widest text-sky-300 font-black">Personal View · ${escapeHTML(dateLabel)}</div>
    <div class="flex items-center justify-between gap-4 mt-4 pb-4 border-b border-slate-800">
      <div><div class="text-xl font-black text-white">${timing.period==='am'?'AM':'PM'} Shift</div><div class="text-sm text-slate-300 mt-1">${escapeHTML(hours)}</div></div>
      <div class="text-right"><div class="text-[10px] text-sky-300 uppercase font-bold">Your room</div><div class="text-2xl font-black text-white">${escapeHTML(roomLabel)}</div></div>
    </div>
    <div class="mt-4 space-y-2 text-sm text-slate-200">
      ${uniqueClinics.length?`<div>🩺 You are covering ${escapeHTML(uniqueClinics.join(' and '))} clinic${uniqueClinics.length>1?'s':''} today.</div>`:''}
      <div>⭐ <strong>Shift Lead:</strong> ${escapeHTML(lead||'Not assigned')}</div>
      ${duties.length?`<div>🚑 ${escapeHTML(duties.join(' · '))}</div>`:''}
      ${blue.length?`<div>💙 Code Blue: ${escapeHTML(blue.join(' · '))}</div>`:''}
    </div>
    <div class="mt-4 rounded-xl bg-slate-900/70 border border-slate-800 px-4 py-3 text-sm text-slate-300">☕ ${escapeHTML(wish)}</div>
   </div>`;
  }catch(e){console.warn('ROTASTIC compact Personal View fallback',e);return original()}
 };
 replacement.__rotasticCompact=true;
 window.buildMyShiftMainView=replacement;
}
const style=document.createElement('style');
style.textContent=`.rotastic-duty-poster{position:relative;isolation:isolate;overflow:hidden;min-height:340px;background:linear-gradient(125deg,rgba(8,24,44,.82),rgba(7,27,43,.87) 55%,rgba(11,34,43,.92)),radial-gradient(ellipse at 75% 15%,#43b9b1 0%,transparent 52%),linear-gradient(150deg,#12364d,#07101e)!important;box-shadow:inset 0 0 0 1px rgba(116,232,216,.12),0 15px 45px rgba(0,0,0,.16)}.rotastic-duty-poster:before{content:'';position:absolute;z-index:-1;right:-55px;top:-80px;width:310px;height:310px;border-radius:50%;border:24px solid rgba(107,220,201,.12);box-shadow:0 0 0 50px rgba(115,206,225,.045),0 0 0 105px rgba(115,206,225,.035)}.rotastic-duty-poster:after{content:'✦';position:absolute;z-index:-1;right:28px;bottom:18px;font-size:130px;line-height:1;color:rgba(142,227,211,.09);transform:rotate(-14deg)}.rotastic-duty-poster>div{position:relative}`;
(document.head||document.documentElement).appendChild(style);
wrap();
document.addEventListener('DOMContentLoaded',wrap,{once:true});
setTimeout(wrap,500);
setInterval(wrap,3000);
})();