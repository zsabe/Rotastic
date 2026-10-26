/* ROTASTIC Generate/Rota cleanup — 2026-10-26 */
(function(){
'use strict';
const txt=e=>String(e?.textContent||'').replace(/\s+/g,' ').trim();
const later=(fn,ms=0)=>setTimeout(()=>{try{fn();}catch(e){console.warn('ROTASTIC cleanup:',e)}},ms);

function removeDuplicateBoxes(){
  document.querySelectorAll('h2,h3,h4,[class*="font-bold"],[class*="font-black"]').forEach(h=>{
    const t=txt(h);
    if(/^Delegated Admin(?: View)?$/i.test(t)){const c=h.closest('.clean-card,.rac-card,.rounded-2xl');if(c)c.remove();}
    if(/^Clinical Lead\s*[—-]\s*Add\s*\/\s*Change Shift$/i.test(t)){const c=h.closest('.clean-card');if(c)c.remove();}
  });
  [...document.querySelectorAll('#tabGenerator *')].forEach(el=>{
    if(txt(el)==='Smart Rules Assistant'){
      const box=el.closest('.mt-4');
      if(box?.querySelector('#smartRotaRuleInput')) box.remove();
    }
  });
}
function cardByHeading(rx){
  const h=[...document.querySelectorAll('#tabGenerator h2,#tabGenerator h3,#tabGenerator h4')].find(x=>rx.test(txt(x)));
  return h?.closest('.clean-card')||null;
}
function consolidateRules(){
  const btn=document.querySelector('#tabGenerator button[onclick="generateDutyScheduleFromPlanner()"]');
  const gen=btn?.closest('.clean-card'), rules=cardByHeading(/^Automatic Rota Rules$/i);
  if(!gen||!rules||gen===rules||document.getElementById('rotasticCoreRulesDetails'))return;
  const d=document.createElement('details');d.id='rotasticCoreRulesDetails';d.className='mt-4 rounded-xl border border-violet-500/20 bg-violet-950/10 p-3';
  d.innerHTML='<summary class="cursor-pointer text-[11px] font-black uppercase tracking-wider text-violet-300"><i class="fa-solid fa-gears mr-1.5"></i>Core rota rules</summary><div class="pt-3"></div>';
  const body=d.lastElementChild;while(rules.firstChild)body.appendChild(rules.firstChild);gen.appendChild(d);rules.remove();
}
function ensureRange(){
  if(document.getElementById('rotasticGenerationRange'))return;
  const btn=document.querySelector('#tabGenerator button[onclick="generateDutyScheduleFromPlanner()"]');if(!btn)return;
  const w=document.createElement('div');w.className='mb-2';w.innerHTML='<label class="block text-[10px] font-bold uppercase tracking-wider text-teal-300 mb-1">Generate period</label><select id="rotasticGenerationRange" class="w-full bg-slate-900 text-white text-xs p-2.5 rounded-xl border border-slate-700 outline-none focus:border-teal-400"><option value="1">1 week</option><option value="4">1 month (4 weeks)</option><option value="13">3 months (13 weeks)</option></select>';btn.parentElement?.insertBefore(w,btn);
}
function addDays(iso,n){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}

const originalPlanner=typeof generateDutyScheduleFromPlanner==='function'?generateDutyScheduleFromPlanner:null;
if(originalPlanner) generateDutyScheduleFromPlanner=async function(){
  const weeks=Math.max(1,parseInt(document.getElementById('rotasticGenerationRange')?.value||'1',10)||1);
  if(weeks===1)return originalPlanner.apply(this,arguments);
  await rotasticRefreshGenerationLock();if(!rotasticGuardNewGeneration(true))return false;
  const weekEl=document.getElementById('cycleStartDate'), groupEl=document.getElementById('wednesdayAMOBGroup');
  const first=String(weekEl?.value||''), firstGroup=typeof getWednesdayAMOBGroupValue==='function'?getWednesdayAMOBGroupValue():String(groupEl?.value||'');
  if(!first){alert('Please choose the week commencing Sunday.');return false}if(!firstGroup){alert('Please select which group is on AM on Wednesday before generating the schedule.');return false}
  const series=[];
  for(let i=0;i<weeks;i++){
    const week=addDays(first,i*7);if(weekEl)weekEl.value=week;Storage.set('rotastic_selected_week_commencing',week);
    let group=firstGroup;try{if(typeof getRecommendedWednesdayAMGroupForWeek==='function')group=getRecommendedWednesdayAMGroupForWeek(week)||group}catch(e){}
    if(groupEl)groupEl.value=group;Storage.set('rotastic_wednesday_am_ob_group',group);Storage.set('rotastic_wednesday_am_group',group);
    generateDutySchedule();series.push({weekStart:week,wednesdayAMGroup:group,schedule:JSON.parse(JSON.stringify(currentSchedule||[]))});
  }
  Storage.setJSON('rotastic_generated_schedule_series',series);
  if(series[0]){currentSchedule=JSON.parse(JSON.stringify(series[0].schedule));if(weekEl)weekEl.value=series[0].weekStart;if(groupEl)groupEl.value=series[0].wednesdayAMGroup;Storage.set('rotastic_selected_week_commencing',series[0].weekStart)}
  switchTab('schedule');renderScheduleView();return true;
};

window.rotasticAvailableDoctorCountForDay=function(day){
  const docs=typeof DOCTORS!=='undefined'&&Array.isArray(DOCTORS)?DOCTORS:[];
  const submissions=Storage?.getJSON?.('rotastic_leave_submissions',[])||[];
  return docs.filter(d=>{
    const name=String(d?.name||'').trim();if(!name)return false;
    try{if(typeof rotasticDoctorIsOnDisplayedLeave==='function'&&rotasticDoctorIsOnDisplayedLeave(name,day))return false}catch(e){}
    const iso=String(day?.isoDate||'');
    return !submissions.some(x=>{
      if(!x||!/approved/i.test(String(x.status||''))||!x.startDate||!iso)return false;
      let same=false;try{same=typeof canonicalRotaName==='function'?canonicalRotaName(x.doc)===canonicalRotaName(name):String(x.doc||'')===name}catch(e){same=String(x.doc||'')===name}
      return same&&iso>=x.startDate&&iso<=(x.endDate||x.startDate);
    });
  }).length;
};

function enhanceRotaNav(){
  const tab=document.getElementById('tabSchedule');if(!tab||!Array.isArray(currentSchedule)||!currentSchedule.length)return;
  let nav=document.getElementById('rotasticQuickDayNav');if(!nav){nav=document.createElement('div');nav.id='rotasticQuickDayNav';nav.className='rotastic-quick-day-nav no-print';tab.insertBefore(nav,tab.firstChild)}
  const idx=typeof activeDayIndex==='number'&&activeDayIndex>=0&&activeDayIndex<currentSchedule.length?activeDayIndex:0, day=currentSchedule[idx]||currentSchedule[0];
  const series=Storage?.getJSON?.('rotastic_generated_schedule_series',[])||[];
  const currentWeek=String(document.getElementById('cycleStartDate')?.value||'');
  const jump=series.length>1?'<select id="rotasticWeekJump" class="rotastic-week-jump">'+series.map((x,i)=>'<option value="'+i+'"'+(String(x.weekStart)===currentWeek?' selected':'')+'>Week '+(i+1)+' · '+x.weekStart+'</option>').join('')+'</select>':'';
  nav.innerHTML='<button type="button" id="rotasticPrevDay"><i class="fa-solid fa-chevron-left"></i></button><div class="rotastic-current-day"><strong>'+String(day.day||'Day')+'</strong><span>'+String(day.dateLabel||day.isoDate||'')+'</span></div><button type="button" id="rotasticNextDay"><i class="fa-solid fa-chevron-right"></i></button>'+jump;
  nav.querySelector('#rotasticPrevDay').onclick=()=>filterDay((idx-1+currentSchedule.length)%currentSchedule.length);nav.querySelector('#rotasticNextDay').onclick=()=>filterDay((idx+1)%currentSchedule.length);
  const sel=nav.querySelector('#rotasticWeekJump');if(sel)sel.onchange=function(){const x=series[Number(this.value)];if(!x)return;currentSchedule=JSON.parse(JSON.stringify(x.schedule||[]));activeDayIndex=0;const w=document.getElementById('cycleStartDate');if(w)w.value=x.weekStart;const g=document.getElementById('wednesdayAMOBGroup');if(g)g.value=x.wednesdayAMGroup||'';Storage.set('rotastic_selected_week_commencing',x.weekStart);renderScheduleView()};
  tab.querySelectorAll('div,span').forEach(el=>{const t=txt(el);if(/^Room\s*\d+\b/i.test(t)&&t.length<45)el.classList.add('rotastic-readable-room')});
}
const originalRender=typeof renderScheduleView==='function'?renderScheduleView:null;if(originalRender)renderScheduleView=function(){const r=originalRender.apply(this,arguments);later(enhanceRotaNav);return r};

async function showSecureEmails(){
  const list=document.getElementById('physicianManagementList');if(!list||!window.rotasticBackendClient)return;
  try{if(typeof rotasticBackendEnsureSession==='function')await rotasticBackendEnsureSession();const r=await rotasticBackendClient.rpc('rotastic_list_authorized_physicians');if(r.error||!Array.isArray(r.data))return;
    r.data.forEach(rec=>{if(!rec?.email||!rec?.physician_name)return;const row=[...list.children].find(ch=>txt(ch).toLowerCase().includes(String(rec.physician_name).toLowerCase()));if(!row||row.querySelector('.rotastic-physician-email'))return;const e=document.createElement('div');e.className='rotastic-physician-email';e.textContent=String(rec.email).toLowerCase();(row.firstElementChild||row).appendChild(e)});
  }catch(e){console.warn('Secure physician directory:',e)}
}
const originalPhysicians=typeof renderPhysicianManagement==='function'?renderPhysicianManagement:null;if(originalPhysicians)renderPhysicianManagement=function(){const r=originalPhysicians.apply(this,arguments);later(showSecureEmails);return r};

function adminShiftAction(raw){
  if(!/\b(add|put|assign|place)\b/i.test(raw))return null;let doctor='';if(/\b(moursi|morsi|mohamed\s+m)\b/i.test(raw))doctor='Dr Mohamed M.';else if(/\bzaid\b/i.test(raw))doctor='Dr Zaid SE.';if(!doctor)return null;
  let period='';if(/\b(am|morning)\b/i.test(raw))period='am';else if(/\b(pm|evening|afternoon)\b/i.test(raw))period='pm';if(!period)return null;
  let dayIndex=-1;(currentSchedule||[]).some((d,i)=>{if([d.day,d.isoDate,d.dateLabel].filter(Boolean).some(v=>raw.toLowerCase().includes(String(v).toLowerCase()))){dayIndex=i;return true}return false});if(dayIndex<0)return null;
  const actor=String(activeUserDocName||'');if(/moursi|morsi|mohamed m/i.test(actor)&&doctor!=='Dr Mohamed M.')return{denied:true,message:'Dr Moursi can use this shortcut to add himself. Dr Zaid can add either permanent admin.'};
  return{type:'rotasticAdminShiftAdd',doctor,dayIndex,period,summary:'Add '+doctor+' to '+String(currentSchedule[dayIndex].day||currentSchedule[dayIndex].isoDate)+' '+period.toUpperCase()+' shift'};
}
const originalApply=typeof applyScheduleAmendmentAction==='function'?applyScheduleAmendmentAction:null;if(originalApply)applyScheduleAmendmentAction=function(a){
  if(a?.type==='rotasticBatch'){for(const x of a.actions||[])if(!applyScheduleAmendmentAction(x))return false;return true}
  if(a?.type==='rotasticAdminShiftAdd'){
    const day=currentSchedule?.[a.dayIndex];if(!day)return false;try{if(typeof rotasticDoctorIsOnDisplayedLeave==='function'&&rotasticDoctorIsOnDisplayedLeave(a.doctor,day)){alert(a.doctor+' is on approved leave for that day. Remove/adjust the leave first.');return false}}catch(e){}
    const sh=day[a.period]||(day[a.period]={});if(!Array.isArray(sh.noRoomDocs))sh.noRoomDocs=[];let present=false;try{present=typeof rotasticCollectShiftDoctors==='function'&&rotasticCollectShiftDoctors(day,a.period).some(n=>typeof doctorMatches==='function'?doctorMatches(n,a.doctor):n===a.doctor)}catch(e){}if(!present)sh.noRoomDocs.push(a.doctor);
    if(a.doctor==='Dr Mohamed M.'){const o=Storage.getJSON('rotastic_moursi_shift_overrides',{});o[day.isoDate]=a.period.toUpperCase();Storage.setJSON('rotastic_moursi_shift_overrides',o)}return true;
  }return originalApply.apply(this,arguments)
};
const originalAnalyse=typeof analyseScheduleAmendment==='function'?analyseScheduleAmendment:null;if(originalAnalyse)analyseScheduleAmendment=async function(){
  const input=document.getElementById('scheduleAmendmentInput'),raw=String(input?.value||'').trim(),parts=raw.split(/\n+|\s*;\s*/).map(x=>x.trim()).filter(Boolean);
  if(parts.length<=1){const a=adminShiftAction(raw);if(!a)return originalAnalyse.apply(this,arguments);if(a.denied){alert(a.message);return}const scope=typeof getScheduleAmendmentScope==='function'?getScheduleAmendmentScope():'rota';a.scope=scope;a.requestedBy=activeUserDocName;a.requestedAt=new Date().toISOString();rotasticPendingScheduleAmendment=a;document.getElementById('scheduleAmendmentSummary').textContent=a.summary;document.getElementById('scheduleAmendmentDetails').textContent='Scope: '+(typeof rotasticScopeLabel==='function'?rotasticScopeLabel(scope):scope)+' · nothing has been changed yet.';document.getElementById('scheduleAmendmentPreview').classList.remove('hidden');return}
  if(typeof canUseScheduleAmendmentAssistant==='function'&&!canUseScheduleAmendmentAssistant()){alert('Schedule amendments are available only in authorised Admin View.');return}
  const scope=typeof getScheduleAmendmentScope==='function'?getScheduleAmendmentScope():'rota',actions=[];for(const part of parts){let a=adminShiftAction(part);if(a?.denied){alert(a.message);return}if(!a){const r=await interpretScheduleAmendment(part);if(!r?.ok||!r.action){alert(r?.message||('Could not safely interpret: '+part));return}a=r.action;if(scope==='week'&&typeof rotasticBuildWeekScopedAction==='function')a=rotasticBuildWeekScopedAction(a)}a.scope=scope;actions.push(a)}
  const batch={type:'rotasticBatch',scope,actions,summary:actions.map((a,i)=>(i+1)+'. '+(a.summary||(typeof describeScheduleAmendment==='function'?describeScheduleAmendment(a):'Amendment'))).join('  '),requestedBy:activeUserDocName,requestedAt:new Date().toISOString()};rotasticPendingScheduleAmendment=batch;document.getElementById('scheduleAmendmentSummary').textContent=batch.summary;document.getElementById('scheduleAmendmentDetails').textContent='Multiple instructions understood · Scope: '+(typeof rotasticScopeLabel==='function'?rotasticScopeLabel(scope):scope)+' · confirm once to apply all.';document.getElementById('scheduleAmendmentPreview').classList.remove('hidden');
};

const originalAuto=typeof generateAutomaticWeeklyDraftIfDue==='function'?generateAutomaticWeeklyDraftIfDue:null;if(originalAuto)generateAutomaticWeeklyDraftIfDue=async function(){try{const d=getMostRecentWednesday2200Qatar();if(d?.key==='2026-10-28'){renderAutoGenerationStatus();return false}}catch(e){}return originalAuto.apply(this,arguments)};
const originalAutoStatus=typeof renderAutoGenerationStatus==='function'?renderAutoGenerationStatus:null;if(originalAutoStatus)renderAutoGenerationStatus=function(){const today=typeof getQatarTodayISO==='function'?getQatarTodayISO():'';if(today>='2026-10-26'&&today<'2026-11-04'){const e=document.getElementById('autoGenerationStatus');if(e)e.textContent='Manual exception: no automatic rota will be generated on Wednesday 28 Oct 2026. Automatic weekly generation resumes Wednesday 4 Nov at 22:00 Qatar time.';return}return originalAutoStatus.apply(this,arguments)};

function oneHourReminder(){try{
  if(!activeUserDocName)return;const iso=typeof getQatarTodayISO==='function'?getQatarTodayISO():'';if(typeof isDoctorOnLeaveToday==='function'&&isDoctorOnLeaveToday(activeUserDocName,iso))return;
  const sh=typeof getCurrentUserShiftWindow==='function'?getCurrentUserShiftWindow():null,now=typeof getQatarNowParts==='function'?getQatarNowParts():null;if(!sh||!now)return;const delta=sh.startMinutes-now.minutes;if(delta<58||delta>62)return;
  const key=[iso,activeUserDocName,sh.startMinutes].join('|');if(Storage.get('rotastic_shift_one_hour_key','')===key)return;Storage.set('rotastic_shift_one_hour_key',key);const msg='Your '+sh.label+' shift starts in about 1 hour.'+(sh.briefing?.details?' '+sh.briefing.details:'');
  if(typeof sendTargetedPush==='function')sendTargetedPush(activeUserDocName,'Shift starts in 1 hour',msg,'shift-reminder',{date:iso,shiftStartMinutes:sh.startMinutes});else{if(typeof queueInAppNotification==='function')queueInAppNotification(activeUserDocName,msg,'shift-reminder');if(typeof sendBrowserNotification==='function')sendBrowserNotification('Shift starts in 1 hour',msg)}
}catch(e){console.warn('One-hour shift reminder:',e)}}
function smallerCredit(){document.querySelectorAll('body *').forEach(e=>{if(e.children.length<=2&&/Developed by\s+Dr\.\s*Zaid Sabe Eleish/i.test(txt(e)))e.style.fontSize='8px'})}
function amendmentCopy(){const c=document.getElementById('scheduleAmendmentAssistantCard');if(!c)return;const p=c.querySelector('h3')?.parentElement?.querySelector('p');if(p)p.textContent='Write one or many instructions in normal language. ROTASTIC will interpret names, days, shifts, rooms, leave and rota rules, then show one clear confirmation before applying.';const ta=document.getElementById('scheduleAmendmentInput');if(ta)ta.placeholder='Examples: Dr Husam to Room 12 Tuesday; Dr Saima and Dr Maya on leave Wednesday; add Dr Moursi to Thursday PM'}
function init(){removeDuplicateBoxes();consolidateRules();ensureRange();amendmentCopy();smallerCredit();enhanceRotaNav();showSecureEmails();oneHourReminder()}
document.addEventListener('DOMContentLoaded',()=>{later(init);later(init,700);later(init,1800)});setInterval(oneHourReminder,60000);
const st=document.createElement('style');st.textContent='.rotastic-quick-day-nav{position:sticky;top:0;z-index:35;display:grid;grid-template-columns:42px minmax(120px,1fr) 42px;align-items:center;gap:8px;margin:0 0 10px;padding:8px;border:1px solid rgba(45,212,191,.22);border-radius:14px;background:rgba(2,6,23,.94);backdrop-filter:blur(10px)}.rotastic-quick-day-nav button{height:38px;border-radius:10px;border:1px solid rgba(148,163,184,.2);background:#0f172a;color:#e2e8f0}.rotastic-current-day{text-align:center;min-width:0}.rotastic-current-day strong{display:block;font-size:16px;color:#f8fafc;line-height:1.1}.rotastic-current-day span{display:block;font-size:10px;color:#94a3b8;margin-top:3px}.rotastic-week-jump{grid-column:1/-1;width:100%;background:#0f172a;color:#e2e8f0;border:1px solid rgba(148,163,184,.2);border-radius:9px;padding:6px 8px;font-size:10px}.rotastic-readable-room{font-size:14px!important;font-weight:900!important;color:#f8fafc!important;letter-spacing:.01em}.rotastic-physician-email{font-size:9px!important;color:#67e8f9!important;font-weight:600!important;margin-top:2px;overflow-wrap:anywhere}';document.head.appendChild(st);
})();
