from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Smart Box / scheduling logic only. No UI, CSS, navigation or markup changes.
marker='/* ROTASTIC_SMARTBOX_WEEK_COMMANDS_V2 */'
if marker not in s:
    anchor='function rotasticNormalizeSimpleEnglishRule(raw) {'
    pos=s.find(anchor)
    if pos<0: raise SystemExit('Smart Rules parser anchor missing')
    code=r'''/* ROTASTIC_SMARTBOX_WEEK_COMMANDS_V2 */
function rotasticSmartWeekKey(){
  const el=document.getElementById('cycleStartDate');
  return String((el&&el.value)||(currentSchedule&&currentSchedule[0]&&currentSchedule[0].isoDate)||'').slice(0,10);
}
function rotasticGetWeeklyGroupOverrides(){
  const all=Storage.getJSON('rotastic_weekly_group_overrides',{})||{};
  return all[rotasticSmartWeekKey()]||{};
}
function rotasticSetWeeklyGroupOverride(doctor,group){
  const key=rotasticSmartWeekKey(); if(!key)return false;
  const all=Storage.getJSON('rotastic_weekly_group_overrides',{})||{};
  const row=all[key]||{}; row[canonicalRotaName(doctor)]=Number(group); all[key]=row;
  Storage.setJSON('rotastic_weekly_group_overrides',all); return true;
}
function rotasticParseWeeklyPhysicianCommand(raw){
  const text=String(raw||'').replace(/\s+/g,' ').trim();
  if(!/\bthis\s+week\b/i.test(text))return null;
  const doctors=smartRuleFindDoctors(text);
  if(!doctors.length)return null;
  let m=text.match(/\bgroup\s*(one|1|two|2)\b/i);
  if(m&&/\b(move|work|working|with|to)\b/i.test(text))return {action:'group',group:/^(one|1)$/i.test(m[1])?1:2,doctors:doctors};
  if(/\b(not\s+off|working|on\s+duty|available)\b/i.test(text))return {action:'working',doctors:doctors};
  if(/\boff\b|\bon\s+leave\b|\bunavailable\b/i.test(text))return {action:'off',doctors:doctors};
  return null;
}
function rotasticWeekDates(){return (currentSchedule||[]).map(function(d){return String(d&&d.isoDate||'').slice(0,10);}).filter(Boolean);}
function rotasticCancelWeekAbsence(doctor){
  const dates=new Set(rotasticWeekDates());
  const keys=['rotastic_leave_submissions'];
  keys.forEach(function(key){
    const rows=Storage.getJSON(key,[]); if(!Array.isArray(rows))return;
    const kept=rows.filter(function(r){
      const who=r&&String(r.doctor||r.physician||r.name||'');
      if(!doctorMatches(who,doctor))return true;
      const start=String(r.startDate||r.date||'').slice(0,10), end=String(r.endDate||start).slice(0,10);
      return !Array.from(dates).some(function(d){return d>=start&&d<=end;});
    });
    Storage.setJSON(key,kept);
  });
}
async function rotasticApplyWeeklyPhysicianCommand(cmd){
  if(!cmd||!Array.isArray(cmd.doctors)||!cmd.doctors.length)return false;
  const doctors=cmd.doctors.map(canonicalRotaName).filter(Boolean);
  if(cmd.action==='group'){
    doctors.forEach(function(d){rotasticSetWeeklyGroupOverride(d,cmd.group);});
    if(typeof generateDutySchedule==='function')generateDutySchedule();
    return {ok:true,message:doctors.join(', ')+' will work with Group '+cmd.group+' this week.'};
  }
  if(cmd.action==='working'){
    doctors.forEach(rotasticCancelWeekAbsence);
    if(typeof generateDutySchedule==='function')generateDutySchedule();
    return {ok:true,message:doctors.join(', ')+' marked working / not off this week.'};
  }
  if(cmd.action==='off'){
    const phrase=doctors.join(', ')+' are off whole week';
    const result=await interpretScheduleAmendment(phrase);
    if(!result||!result.ok||!result.action)return result||{ok:false,message:'Could not apply weekly OFF.'};
    result.action.scope='week';
    if(!applyScheduleAmendmentAction(result.action))return {ok:false,message:'Could not apply weekly OFF.'};
    return {ok:true,message:doctors.join(', ')+' marked off this week.'};
  }
  return false;
}
'''
    s=s[:pos]+code+s[pos:]

# Make "this week" a first-class whole-week phrase for the existing interpreter.
old="return /\\b(whole|entire|full)\\s+(working\\s+)?week\\b|\\ball\\s+week\\b|\\bfor\\s+the\\s+week\\b/i.test(text);"
new="return /\\bthis\\s+week\\b|\\b(whole|entire|full)\\s+(working\\s+)?week\\b|\\ball\\s+week\\b|\\bfor\\s+the\\s+week\\b/i.test(text);"
if old in s: s=s.replace(old,new,1)
elif new not in s: raise SystemExit('whole-week phrase anchor missing')

# Weekly group override must be seen by both the normal generator and the final invariant layer.
auth="function rotasticAuthoritativeGroup(name) { const k=canonicalRotaName(name); if (/^Dr\\.?\\s+Gani\\b/i.test(String(k||name||''))) return 2; return ROTASTIC_GROUP_2.has(k) ? 2 : 1; }"
auth_new="function rotasticAuthoritativeGroup(name) { const k=canonicalRotaName(name); const o=(typeof rotasticGetWeeklyGroupOverrides==='function'?rotasticGetWeeklyGroupOverrides():{}); if(o&&Number(o[k])) return Number(o[k]); if (/^Dr\\.?\\s+Gani\\b/i.test(String(k||name||''))) return 2; return ROTASTIC_GROUP_2.has(k) ? 2 : 1; }"
if auth in s: s=s.replace(auth,auth_new,1)
elif auth_new not in s: raise SystemExit('authoritative group anchor missing')

# Apply the same override to editable auto-rule groups without persisting a permanent group move.
ret="  return {\n    group1: group1,\n    group2: group2,"
ret_new="  const weekOverrides=(typeof rotasticGetWeeklyGroupOverrides==='function'?rotasticGetWeeklyGroupOverrides():{});\n  Object.keys(weekOverrides||{}).forEach(function(name){const g=Number(weekOverrides[name]);group1=group1.filter(function(x){return !doctorMatches(x,name);});group2=group2.filter(function(x){return !doctorMatches(x,name);});if(g===1)group1.push(name);if(g===2)group2.push(name);});\n  return {\n    group1: group1,\n    group2: group2,"
if ret in s: s=s.replace(ret,ret_new,1)
elif 'const weekOverrides=(typeof rotasticGetWeeklyGroupOverrides' not in s: raise SystemExit('auto-rule return anchor missing')

# Route only recognized weekly sentences through the adapter at the start of Smart Rules submission.
hook_anchor="  const scope = String(document.getElementById('smartRotaRuleScope')?.value || 'rota');\n  if (!raw) return;"
hook_new="  const scope = String(document.getElementById('smartRotaRuleScope')?.value || 'rota');\n  if (!raw) return;\n  const __weekCmd=rotasticParseWeeklyPhysicianCommand(rawOriginal);\n  if(__weekCmd){\n    const __result=await rotasticApplyWeeklyPhysicianCommand(__weekCmd);\n    const __ok=!!(__result&&__result.ok);\n    if(status){status.className='mt-3 p-3 rounded-xl text-[11px] border '+(__ok?'bg-emerald-950/40 border-emerald-500/30 text-emerald-200':'bg-amber-950/40 border-amber-500/30 text-amber-200');status.textContent=(__result&&__result.message)||'Weekly command could not be applied.';status.classList.remove('hidden');}\n    if(__ok&&input)input.value='';\n    if(__ok&&typeof renderScheduleView==='function')renderScheduleView();\n    return;\n  }"
if hook_anchor in s: s=s.replace(hook_anchor,hook_new,1)
elif 'const __weekCmd=rotasticParseWeeklyPhysicianCommand(rawOriginal);' not in s: raise SystemExit('Smart Rules submit anchor missing')

for token in ['ROTASTIC_SMARTBOX_WEEK_COMMANDS_V2','rotasticApplyWeeklyPhysicianCommand','rotastic_weekly_group_overrides','not\\s+off','this\\s+week']:
    if token not in s: raise SystemExit('missing Smart Box invariant '+token)
p.write_text(s,encoding='utf-8')
print('Smart Box weekly OFF, working/not-off and Group 1/2 overrides integrated; UI unchanged.')
