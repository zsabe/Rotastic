from pathlib import Path
import re

p=Path('index.html')
text=p.read_text()
original=text

# Colleague -> Admin must use temporary access code only.
pattern=re.compile(r"\n\s*// Safety path for a stale/cached screen: a verified Zaid/Moursi account can\n\s*// unlock Admin View with its existing personal PIN\. Normally they enter\n\s*// Admin View directly and never see this modal\.\n\s*const role = rotasticResolvedVerifiedRole\(\);\n\s*const permanentPinOk = false;\n\s*if \(permanentPinOk\) \{.*?\n\s*\}\n\n",re.S)
text,n=pattern.subn('\n',text,count=1)
if n!=1:
    raise SystemExit(f'Expected dead permanent bypass block once, found {n}')

# Make the existing 1 week / 1 month / 3 months selector functional.
gen=re.compile(r"async function generateDutyScheduleFromPlanner\(\) \{.*?\n\}\n\n\n// Final safety pass for Twilight",re.S)
replacement=r'''async function generateDutyScheduleFromPlanner() {
  await rotasticRefreshGenerationLock();
  if (!rotasticGuardNewGeneration(true)) return false;
  const weekSelect = document.getElementById('cycleStartDate');
  const groupInput = document.getElementById('wednesdayAMOBGroup');
  const rangeSelect = document.getElementById('rotasticGenerationRange');
  const firstWeekISO = weekSelect ? weekSelect.value : '';
  const firstGroup = getWednesdayAMOBGroupValue();
  const weeks = Math.max(1, parseInt(rangeSelect?.value || '1', 10) || 1);
  if (!firstWeekISO) { alert('Please choose the week commencing Sunday.'); if (weekSelect) weekSelect.focus(); return false; }
  if (!firstGroup) {
    if (groupInput) { groupInput.focus(); groupInput.classList.add('ring-2','ring-rose-500/70','rounded'); setTimeout(function(){ groupInput.classList.remove('ring-2','ring-rose-500/70','rounded'); },1800); }
    alert('Please select or enter which group is on AM on Wednesday before generating the schedule.'); return false;
  }
  function addDaysISO(iso, days) { const d=new Date(iso+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); }
  const generatedSeries=[];
  for (let i=0;i<weeks;i++) {
    const weekISO=addDaysISO(firstWeekISO,i*7); let group=firstGroup;
    try { if (i>0 && typeof getRecommendedWednesdayAMGroupForWeek==='function') group=getRecommendedWednesdayAMGroupForWeek(weekISO)||group; } catch(e) {}
    if (weekSelect) weekSelect.value=weekISO; if (groupInput) groupInput.value=group;
    Storage.set('rotastic_selected_week_commencing',weekISO); Storage.set('rotastic_wednesday_am_ob_group',group); Storage.set('rotastic_wednesday_am_group',group);
    generateDutySchedule(); generatedSeries.push({weekStart:weekISO,wednesdayAMGroup:group,schedule:JSON.parse(JSON.stringify(currentSchedule||[]))});
  }
  Storage.setJSON('rotastic_generated_schedule_series',generatedSeries);
  if (generatedSeries.length) {
    const first=generatedSeries[0]; currentSchedule=JSON.parse(JSON.stringify(first.schedule||[]));
    if (weekSelect) weekSelect.value=first.weekStart; if (groupInput) groupInput.value=first.wednesdayAMGroup||firstGroup;
    Storage.set('rotastic_selected_week_commencing',first.weekStart); Storage.set('rotastic_wednesday_am_ob_group',first.wednesdayAMGroup||firstGroup); Storage.set('rotastic_wednesday_am_group',first.wednesdayAMGroup||firstGroup);
  }
  try { if (typeof scheduleShiftNotifications==='function') await scheduleShiftNotifications(generatedSeries.flatMap(function(x){return x.schedule||[];})); } catch(e) { console.warn('ROTASTIC shift notification scheduling:',e); }
  switchTab('schedule'); renderScheduleView(); return true;
}


// Final safety pass for Twilight'''
text,n=gen.subn(replacement,text,count=1)
if n!=1:
    raise SystemExit(f'Expected generateDutyScheduleFromPlanner once, found {n}')

# One-off manual exception for 28 Oct 2026 only.
auto_decl='async function generateAutomaticWeeklyDraftIfDue() {'
if auto_decl not in text:
    raise SystemExit('Automatic weekly generation function not found')
guard="""async function generateAutomaticWeeklyDraftIfDue() {\n  try {\n    const qatarToday = typeof getQatarTodayISO === 'function' ? getQatarTodayISO() : '';\n    if (qatarToday === '2026-10-28') {\n      const status = document.getElementById('autoGenerationStatus');\n      if (status) status.textContent = 'Manual exception: no automatic rota generation on Wednesday 28 Oct 2026. Normal weekly generation resumes next Wednesday.';\n      return false;\n    }\n  } catch (e) {}\n"""
text=text.replace(auto_decl,guard,1)

# Colleague metrics use the existing personal metrics renderer.
old="""function renderMetricsView() {\n  if (!isAdminViewActive()) return;\n\n  const stats = buildDutyStats();"""
new="""function renderMetricsView() {\n  if (!isAdminViewActive()) {\n    if (typeof renderPersonalMetrics === 'function') renderPersonalMetrics();\n    return;\n  }\n  if (typeof renderPersonalMetrics === 'function') renderPersonalMetrics();\n\n  const stats = buildDutyStats();"""
if old not in text:
    raise SystemExit('renderMetricsView target not found')
text=text.replace(old,new,1)

# Three-day local notification retention, matching the backend cleanup.
marker="function todayNotifications(){const day=qatarDayKey(new Date());"
if marker not in text:
    raise SystemExit('Notification helper target not found')
retention="function purgeLocalNotificationHistory(){const cutoff=Date.now()-3*24*60*60*1000,q=Storage.getJSON('rotastic_notification_queue',[])||[],keep=q.filter(n=>{const t=new Date(n.createdAt||n.created_at||0).getTime();return t&&t>=cutoff;});if(keep.length!==q.length)Storage.setJSON('rotastic_notification_queue',keep);}\n"
text=text.replace(marker,retention+marker,1)
text=text.replace("function updateBell(){const count=todayNotifications()", "function updateBell(){purgeLocalNotificationHistory();const count=todayNotifications()",1)
text=text.replace("window.openRotasticNotificationCenter=async function(){try{", "window.openRotasticNotificationCenter=async function(){purgeLocalNotificationHistory();try{",1)

anchors=['id="tickerContent"','You are off today','id="topActionGrid"','id="topExportBtn"','id="notificationBellBtn"','id="rotasticSettingsAccountBox"','id="scheduleMatrixContainer"','id="scheduleAmendmentAssistantCard"','id="tabMetrics"']
missing=[x for x in anchors if x not in text]
if missing:
    raise SystemExit('Design/function anchors missing after patch: '+', '.join(missing))
if text==original:
    raise SystemExit('No changes made')
p.write_text(text)

sw=Path('service-worker.js')
s=sw.read_text()
s2,n=re.subn(r"rotastic-v\d+[^'\"]*",'rotastic-v242-functional-continuation',s,count=1)
if n:
    sw.write_text(s2)
