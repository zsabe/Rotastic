/* ROTASTIC stability UI — 2026-10-26. Functional fixes only; existing design is preserved. */
(function(){
'use strict';

const later=(fn,ms=0)=>setTimeout(()=>{try{fn();}catch(e){console.warn('ROTASTIC stability UI:',e)}},ms);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const canonical=name=>{try{return typeof canonicalRotaName==='function'?canonicalRotaName(name):String(name||'').trim()}catch(_){return String(name||'').trim()}};
const qatarDayKey=value=>{
  try{
    const d=value instanceof Date?value:new Date(value||Date.now());
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
    const m={};p.forEach(x=>{if(x.type!=='literal')m[x.type]=x.value});return `${m.year}-${m.month}-${m.day}`;
  }catch(_){return ''}
};

/* Feedback is retired from the product UI. Historical backend data is left intact. */
function removeFeedbackUI(){
  document.getElementById('tabFeedback')?.remove();
  document.querySelectorAll('[data-rotastic-tab="feedback"],[data-tab="feedback"]').forEach(el=>el.remove());
  [...document.querySelectorAll('button,a')].forEach(el=>{
    const label=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(/^feedback$/i.test(label)||/^shift feedback$/i.test(label))el.remove();
  });
}

/* Broadcasting controls only exist in Admin View. Announcements remain readable to colleagues. */
function enforceAnnouncementRole(){
  const admin=typeof isAdminViewActive==='function'&&isAdminViewActive();
  const announcementTab=document.getElementById('tabAnnouncements');
  document.querySelectorAll('[data-rotastic-tab="announcements"],[data-tab="announcements"]').forEach(el=>el.classList.toggle('hidden',!admin));
  if(announcementTab)announcementTab.classList.toggle('hidden',!admin);
  ['settingsBroadcastCard','adminAnnouncementText','settingsAnnouncementText','announcementAuthorBadge','announcementAdminStatus'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const card=el.closest('.clean-card');if(card)card.classList.toggle('hidden',!admin);
    if('disabled' in el)el.disabled=!admin;
  });
}

/* Prevent announcement content from drifting outside its existing card geometry. */
function constrainAnnouncements(){
  document.querySelectorAll('[id*="announcement" i],[class*="announcement" i]').forEach(el=>{
    if(el.matches('input,textarea,button'))return;
    el.style.maxWidth='100%';el.style.minWidth='0';el.style.boxSizing='border-box';el.style.overflowWrap='anywhere';
  });
}

/* Secure doctor-email directory: emails stay in Supabase, not public source. */
async function refreshPhysicianEmailDirectory(){
  const current=Storage.getJSON('rotastic_physician_email_directory',{})||{};
  if(!window.rotasticBackendClient)return current;
  try{
    if(typeof rotasticBackendEnsureSession==='function')await rotasticBackendEnsureSession();
    const r=await rotasticBackendClient.rpc('rotastic_list_authorized_physicians');
    if(r?.error)throw r.error;
    const full=typeof ROTASTIC_FULL_DOCTOR_NAMES==='object'&&ROTASTIC_FULL_DOCTOR_NAMES?ROTASTIC_FULL_DOCTOR_NAMES:{};
    (Array.isArray(r?.data)?r.data:[]).forEach(row=>{
      const name=String(row?.physician_name||'').trim();
      const email=String(row?.email||'').trim().toLowerCase();
      if(!name||!/@phcc\.gov\.qa$/i.test(email))return;
      current[name]=email;
      Object.keys(full).forEach(short=>{
        if(String(full[short]||'').trim().toLowerCase()===name.toLowerCase())current[short]=email;
      });
    });
    Storage.setJSON('rotastic_physician_email_directory',current);
  }catch(e){console.warn('Secure physician directory:',e?.message||e)}
  return current;
}
function emailForPhysician(name){
  const secure=Storage.getJSON('rotastic_physician_email_directory',{})||{};
  let email=String(secure[name]||'').trim().toLowerCase();
  if(!email){try{email=String(getKnownPhysicianEmail(name)||'').trim().toLowerCase()}catch(_){}}
  return /@phcc\.gov\.qa$/i.test(email)?email:'';
}
window.rotasticRefreshPhysicianEmailDirectory=refreshPhysicianEmailDirectory;

const originalPopulateAccess=typeof populateAccessCodeDoctorSelect==='function'?populateAccessCodeDoctorSelect:null;
if(originalPopulateAccess){
  populateAccessCodeDoctorSelect=function(){const r=originalPopulateAccess.apply(this,arguments);refreshPhysicianEmailDirectory();return r};
  window.populateAccessCodeDoctorSelect=populateAccessCodeDoctorSelect;
}

/* First-time setup now uses the secure RPC directly and the stored backend directory. */
window.createSelectedAccessCode=async function(){
  if(!(typeof canManageAdminAccess==='function'&&canManageAdminAccess())){alert('Access codes can only be created from an unlocked permanent Admin View.');return false;}
  const kind=document.getElementById('accessCodeType')?.value||'first_time';
  const physicianName=String(document.getElementById('accessCodeDoctorSelect')?.value||'').trim();
  if(!physicianName){alert('Select a physician first.');return false;}
  try{
    if(typeof rotasticBackendEnsureSession==='function')await rotasticBackendEnsureSession();
    if(!window.rotasticBackendClient||!window.rotasticBackendUser)throw new Error('Verified Admin sign-in is required.');
    await refreshPhysicianEmailDirectory();
    const email=emailForPhysician(physicianName);
    if(!email)throw new Error('No PHCC email is stored for '+physicianName+'.');
    if(kind==='first_time'){
      const result=await rotasticBackendClient.rpc('rotastic_issue_registration_code_v2',{p_email:email,p_physician_name:physicianName,p_valid_minutes:1440});
      if(result?.error)throw result.error;
      const row=Array.isArray(result?.data)?result.data[0]:result?.data;
      const code=String(row?.registration_code||'');
      if(!/^\d{6}$/.test(code))throw new Error('The setup-code service did not return a valid code.');
      showIssuedAccessCode('first_time',physicianName,email,code,row?.expires_at);return true;
    }
    const minutes=Math.max(5,parseInt(document.getElementById('tempAdminDurationMinutes')?.value||'480',10)||480);
    const result=await rotasticBackendClient.rpc('rotastic_issue_admin_access_code',{p_minutes:minutes,p_target_physician:physicianName});
    if(result?.error)throw result.error;
    const row=Array.isArray(result?.data)?result.data[0]:result?.data;
    const code=String(row?.admin_code||'');
    if(!/^\d{8}$/.test(code))throw new Error('The Admin access service did not return a valid code.');
    showIssuedAccessCode('admin',physicianName,email,code,row?.expires_at);try{await renderTempAdminCodeManager()}catch(_){};return true;
  }catch(e){alert(String(e?.message||'Could not create this access code.'));return false;}
};

/* Notification centre: badge = unread notifications from today. History is retained for 3 days. */
function isMine(n){
  if(!n||!activeUserDocName)return false;
  const recipient=String(n.recipient||'').trim();
  if(recipient===activeUserDocName||recipient==='*'||/^all(?:\s|$)/i.test(recipient))return true;
  return recipient.split(' + ').map(x=>x.trim()).includes(activeUserDocName);
}
function todayNotifications(){
  const today=qatarDayKey(new Date());
  return (Storage.getJSON('rotastic_notification_queue',[])||[])
    .filter(n=>isMine(n)&&qatarDayKey(n.createdAt||Date.now())===today)
    .sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
}
function purgeNotificationHistory(){
  const cutoff=Date.now()-3*24*60*60*1000;
  const q=Storage.getJSON('rotastic_notification_queue',[])||[];
  const keep=q.filter(n=>new Date(n.createdAt||0).getTime()>=cutoff);
  if(keep.length!==q.length)Storage.setJSON('rotastic_notification_queue',keep);
  try{if(window.rotasticBackendClient&&window.rotasticBackendUser)rotasticBackendClient.rpc('rotastic_cleanup_my_notifications')}catch(_){}
}
function notificationButtons(){
  return [...document.querySelectorAll('button,a')].filter(el=>{
    const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(/enable device notifications/i.test(text)||el.id==='rotasticNotificationClose')return false;
    return /^notifications?$/i.test(text)||Boolean(el.querySelector('.fa-bell'));
  });
}
function updateNotificationBadge(){
  const count=todayNotifications().filter(n=>!n.read).length;
  notificationButtons().forEach(btn=>{
    if(getComputedStyle(btn).position==='static')btn.style.position='relative';
    let badge=btn.querySelector('.rotastic-missed-badge');
    if(!badge){badge=document.createElement('span');badge.className='rotastic-missed-badge';btn.appendChild(badge)}
    badge.textContent=count>99?'99+':String(count);badge.classList.toggle('hidden',count===0);
    if(!btn.dataset.rotasticNotificationCenter){btn.dataset.rotasticNotificationCenter='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openNotificationCenter()},true)}
  });
}
function notificationCenter(){
  let overlay=document.getElementById('rotasticNotificationCenterOverlay');if(overlay)return overlay;
  overlay=document.createElement('div');overlay.id='rotasticNotificationCenterOverlay';overlay.className='hidden fixed inset-0 z-[10080] bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto no-print';
  overlay.innerHTML='<div class="max-w-xl mx-auto mt-16 clean-card p-4 sm:p-5"><div class="flex items-center justify-between gap-3 mb-4"><div><div class="text-[10px] uppercase tracking-[0.18em] text-cyan-300 font-black">Today</div><h3 class="text-lg font-black text-white">Notifications</h3></div><button id="rotasticNotificationClose" type="button" class="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-slate-300"><i class="fa-solid fa-xmark"></i></button></div><div id="rotasticNotificationTodayList" class="space-y-2"></div></div>';
  document.body.appendChild(overlay);overlay.querySelector('#rotasticNotificationClose').onclick=()=>overlay.classList.add('hidden');overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.add('hidden')});return overlay;
}
async function openNotificationCenter(){
  purgeNotificationHistory();const overlay=notificationCenter();const items=todayNotifications();const list=overlay.querySelector('#rotasticNotificationTodayList');
  list.innerHTML=items.length?items.map(n=>'<div class="rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div class="flex justify-between gap-3"><div class="text-xs font-black text-white">'+esc(n.title||'ROTASTIC')+'</div><div class="text-[9px] text-slate-500 whitespace-nowrap">'+new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Qatar',hour:'2-digit',minute:'2-digit'}).format(new Date(n.createdAt||Date.now()))+'</div></div><div class="text-[11px] text-slate-300 mt-1 leading-relaxed">'+esc(n.message||'')+'</div></div>').join(''):'<div class="text-sm text-slate-500 text-center py-8">No notifications today.</div>';
  overlay.classList.remove('hidden');
  const q=Storage.getJSON('rotastic_notification_queue',[])||[];items.forEach(n=>{n.read=true;if(n.backendId&&typeof rotasticBackendMarkNotificationRead==='function')rotasticBackendMarkNotificationRead(n.backendId)});Storage.setJSON('rotastic_notification_queue',q);updateNotificationBadge();
}
window.openNotificationCenter=openNotificationCenter;

const originalShowNotifications=typeof showNotificationsForCurrentUser==='function'?showNotificationsForCurrentUser:null;
if(originalShowNotifications){
  showNotificationsForCurrentUser=function(){
    if(!activeUserDocName)return;purgeNotificationHistory();
    const relevant=(Storage.getJSON('rotastic_notification_queue',[])||[]).filter(n=>!n.read&&isMine(n));
    const now=Date.now();const launch=relevant.filter(n=>{const t=new Date(n.createdAt||0).getTime();return t&&t<=now&&(now-t)<=3*60*60*1000});
    try{rotasticQueueLaunchTickerNotifications(launch)}catch(_){}
    updateNotificationBadge();
  };
  window.showNotificationsForCurrentUser=showNotificationsForCurrentUser;
}

/* 20 deterministic, shift-specific finish messages. */
const GOOD_VIBES=[
'Beautiful work today — thank you for giving your best. 🌟','Shift complete. Your hard work mattered today — thank you. 🙌','Well done today. Time to recharge — you earned it. 🌙','Thank you for the care, patience and energy you brought today. 💙','Another shift done with purpose. Great work. ✨','You made a difference today. Thank you for your hard work. 🌿','Strong work today — now give yourself some well-earned rest. 💫','Thank you for showing up and giving your best today. 👏','Shift finished — excellent effort and teamwork today. 🤝','Great job today. Your patients and team appreciate you. 😊','You got through another busy shift — well done and thank you. 🌈','Thank you for bringing calm, skill and care to the shift today. 🩺','That is today’s shift done — brilliant work. ⭐','Well played today. Rest, reset and come back refreshed. 🌼','Thank you for the energy you gave the team today. 💪','A good shift completed by a good doctor — thank you. 🌟','Your contribution counted today. Thank you and enjoy your downtime. ☕','Shift complete. Be proud of the work you did today. 💙','Thank you for another day of dependable, compassionate work. 🙏','Done for today — great effort, great care, now enjoy the rest of your day. 🎉'];
function vibeIndex(name,date,period){let h=0;String(name+'|'+date+'|'+period).split('').forEach(c=>h=(h*31+c.charCodeAt(0))>>>0);return h%GOOD_VIBES.length}
async function scheduleFinishVibes(schedule){
  if(!window.rotasticBackendClient||!window.rotasticBackendUser||!Array.isArray(schedule)||!schedule.length)return;
  try{
    const items=[],dates=[];
    schedule.filter(d=>d?.isoDate).forEach(day=>{dates.push(day.isoDate);['am','pm'].forEach(period=>{
      const shift=day[period]||{};let doctors=[];try{doctors=typeof rotasticCollectShiftDoctors==='function'?rotasticCollectShiftDoctors(day,period):[]}catch(_){}
      const seen=new Set();doctors.forEach(name=>{name=String(name||'').trim();if(!name)return;const key=canonical(name).toLowerCase();if(seen.has(key))return;seen.add(key);
        try{if(typeof rotasticDoctorIsOnDisplayedLeave==='function'&&rotasticDoctorIsOnDisplayedLeave(name,day))return}catch(_){}
        const timed=typeof doctorMatches==='function'&&(doctorMatches(shift.timed1Doc,name)||doctorMatches(shift.timed2Doc,name));
        const end=timed?(period==='am'?960:1200):(period==='am'?840:1320);const hh=String(Math.floor(end/60)).padStart(2,'0'),mm=String(end%60).padStart(2,'0');const when=`${day.isoDate}T${hh}:${mm}:00+03:00`;if(new Date(when).getTime()<=Date.now())return;
        items.push({recipient_name:name,title:'Shift complete — thank you 💙',message:GOOD_VIBES[vibeIndex(name,day.isoDate,period)],notification_type:'shift-finish',scheduled_for:when,dedupe_key:`shift-finish|${day.isoDate}|${period}|${key}|${end}`,metadata:{schedule_date:day.isoDate,period,shift_end_minutes:end}})
      });
    })});
    for(let i=0;i<items.length||i===0;i+=400){const r=await rotasticBackendClient.rpc('rotastic_schedule_shift_reminders',{p_items:items.slice(i,i+400),p_dates:i===0?[...new Set(dates)]:[]});if(r?.error)throw r.error;if(!items.length)break;}
  }catch(e){console.warn('Shift-finish notifications:',e?.message||e)}
}

function wrapScheduleMutation(name){
  const fn=window[name];if(typeof fn!=='function'||fn.__rotasticFinishWrapped)return;
  const wrapped=async function(){const r=await fn.apply(this,arguments);later(()=>scheduleFinishVibes(window.currentSchedule||[]),10);return r};wrapped.__rotasticFinishWrapped=true;window[name]=wrapped;
}
['generateDutyScheduleFromPlanner','confirmScheduleAmendment','generateAutomaticWeeklyDraftIfDue'].forEach(wrapScheduleMutation);

/* Colleague metrics: only the signed-in doctor's own row, plus PDF. Admin keeps full existing dashboard. */
function myMetricRow(){try{return (typeof buildDutyStats==='function'?buildDutyStats():[]).find(r=>canonical(r.doctor)===canonical(activeUserDocName))||null}catch(_){return null}}
function ensureMyMetricsPanel(){
  const tab=document.getElementById('tabMetrics');if(!tab)return null;let p=document.getElementById('rotasticMyMetricsPanel');if(p)return p;p=document.createElement('div');p.id='rotasticMyMetricsPanel';p.className='space-y-4';tab.insertBefore(p,tab.firstChild);return p;
}
function renderMyMetrics(){
  const admin=typeof isAdminViewActive==='function'&&isAdminViewActive();document.body.classList.toggle('rotastic-colleague-metrics',!admin);if(admin)return;
  if(!activeUserDocName)return;const panel=ensureMyMetricsPanel();if(!panel)return;const r=myMetricRow();
  const values=r?[['Total shifts',r.shifts||0],['AM shifts',r.amShifts||0],['PM shifts',r.pmShifts||0],['Emergency',(r.maleER||0)+(r.femaleER||0)+(r.paedsER||0)],['Clinic duties',(r.wbc||0)+(r.ancNcd||0)+(r.roomClinics||0)],['Code Blue',(r.codeBlueLead||0)+(r.codeBlueResponder||0)],['Twilight',(r.twilightAM||0)+(r.twilightPM||0)]]:[];
  const max=Math.max(1,...values.map(v=>Number(v[1])||0));
  panel.innerHTML='<div class="clean-card p-4 sm:p-5" id="rotasticMyMetricsReport"><div class="flex items-start justify-between gap-3"><div><div class="text-[10px] uppercase tracking-[0.18em] text-teal-300 font-black">My metrics</div><h2 class="text-lg font-black text-white mt-1">'+esc(activeUserDocName)+'</h2></div><button type="button" id="rotasticMyMetricsPdf" class="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-[10px] font-black text-slate-200"><i class="fa-solid fa-file-pdf mr-1.5"></i>PDF</button></div>'+(r?'<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">'+values.slice(0,4).map(v=>'<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div class="text-[9px] uppercase tracking-wider text-slate-500 font-bold">'+esc(v[0])+'</div><div class="text-2xl font-black text-white mt-1">'+v[1]+'</div></div>').join('')+'</div><div class="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3"><div class="text-[10px] uppercase tracking-wider text-slate-400 font-black mb-3">Duty mix</div>'+values.map(v=>'<div class="mb-2"><div class="flex justify-between text-[10px] text-slate-300 mb-1"><span>'+esc(v[0])+'</span><strong>'+v[1]+'</strong></div><div class="h-2 rounded-full bg-slate-800 overflow-hidden"><div class="h-full rounded-full bg-teal-500" style="width:'+Math.max(2,(Number(v[1])||0)/max*100)+'%"></div></div></div>').join('')+'</div>':'<div class="text-sm text-slate-500 py-8">No rota metrics are available for you in the current schedule.</div>')+'</div>';
  panel.querySelector('#rotasticMyMetricsPdf').onclick=function(){const report=document.getElementById('rotasticMyMetricsReport');if(window.html2pdf&&report){html2pdf().set({margin:8,filename:'ROTASTIC-'+String(activeUserDocName).replace(/\s+/g,'-')+'-metrics.pdf',html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(report).save()}else window.print()};
}
function exposeMetricsTab(){document.querySelectorAll('[data-rotastic-tab="metrics"],[data-tab="metrics"]').forEach(el=>el.classList.remove('hidden'));renderMyMetrics()}

/* Local account label reflects verified app identity instead of saying Not signed in. */
function refreshIdentityLabel(){
  const name=String((typeof activeUserDocName!=='undefined'&&activeUserDocName)||Storage.get('rotastic_user_doc_name','')||'').trim();if(!name)return;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){
    const text=String(node.nodeValue||'');if(/^\s*Not signed in\s*$/i.test(text))node.nodeValue=text.replace(/Not signed in/i,name);else if(/Logged in as\s*:?\s*Not signed in/i.test(text))node.nodeValue=text.replace(/Not signed in/i,name);
  }
}

function refreshAll(){removeFeedbackUI();enforceAnnouncementRole();constrainAnnouncements();purgeNotificationHistory();updateNotificationBadge();exposeMetricsTab();refreshIdentityLabel()}

const style=document.createElement('style');style.id='rotastic-stability-ui-style';style.textContent='.rotastic-missed-badge{position:absolute;right:-4px;top:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#ef4444;color:#fff;font-size:10px;font-weight:900;line-height:18px;text-align:center;z-index:3}.rotastic-colleague-metrics #tabMetrics>:not(#rotasticMyMetricsPanel){display:none!important}#rotasticMyMetricsPanel{display:block!important}';document.head.appendChild(style);

document.addEventListener('DOMContentLoaded',()=>{
  notificationCenter();refreshAll();later(refreshAll,300);later(refreshAll,1200);later(refreshPhysicianEmailDirectory,1500);
  setInterval(()=>{purgeNotificationHistory();updateNotificationBadge();refreshIdentityLabel()},60000);
});
const observer=new MutationObserver(()=>later(refreshAll,40));if(document.documentElement)observer.observe(document.documentElement,{subtree:true,childList:true});

})();
