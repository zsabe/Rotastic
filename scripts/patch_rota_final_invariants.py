from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Scheduling-only final invariant. UI markup/styles are intentionally untouched.
# Dedicated scheduler/validation helpers only; do not alter canonicalRotaName or UI/dropdown name handling.
identity=r'''/* ROTASTIC_SCHEDULER_RIDA_GANI_HELPERS_V3 */
const ROTASTIC_RIDA = 'Dr Rida C.';
const ROTASTIC_GANI = 'Dr Gani M.';
function isRidaVariant(doctorName){
  if(!doctorName)return false;
  return /^dr\.?\s*rida\s*c?\.?/i.test(String(doctorName).trim());
}
function isGaniVariant(doctorName){
  if(!doctorName)return false;
  return /(gani|ghani)/i.test(String(doctorName).trim());
}
function rotasticSchedulerCanonicalDoctor(doctor){
  if(!doctor)return '';
  const d=String(doctor).trim();
  if(isRidaVariant(d))return ROTASTIC_RIDA;
  if(isGaniVariant(d))return ROTASTIC_GANI;
  return d;
}
function getAuthoritativeGroupForScheduler(doctorName,day){
  if(isRidaVariant(doctorName))return 1;
  if(isGaniVariant(doctorName))return 2;
  return typeof rotasticAuthoritativeGroup==='function'?rotasticAuthoritativeGroup(doctorName):1;
}
'''
# Remove previous scheduler helper block if a prior integration already contains it.
for marker in ['/* ROTASTIC_SCHEDULER_RIDA_GANI_HELPERS_V2 */','/* ROTASTIC_SCHEDULER_RIDA_GANI_HELPERS_V3 */']:
    old_start=s.find(marker)
    if old_start>=0:
        old_end=s.find('function rotasticSurfaceMissingPhysicians(){',old_start)
        if old_end<0: raise SystemExit('scheduler helper block boundary missing')
        s=s[:old_start]+s[old_end:]
if '/* ROTASTIC_SCHEDULER_RIDA_GANI_HELPERS_V3 */' not in s:
    anchor='function rotasticSurfaceMissingPhysicians(){'
    pos=s.find(anchor)
    if pos<0: raise SystemExit('surface invariant anchor missing')
    s=s[:pos]+identity+s[pos:]

# Remove our previous canonicalRotaName hook if present. The app's original canonical/UI name function stays untouched.
old_hook="\n  const __rg=rotasticCanonicalRidaGani(name);\n  if(__rg===ROTASTIC_RIDA||__rg===ROTASTIC_GANI)return __rg;"
s=s.replace(old_hook,'')

# Keep the existing authoritative function protected too: scheduler callers and legacy callers agree on Rida/Gani.
gstart=s.find('function rotasticAuthoritativeGroup(')
if gstart<0: raise SystemExit('authoritative group anchor missing')
gbrace=s.find('{',gstart)
if gbrace<0: raise SystemExit('authoritative group body missing')
gneedle="\n  if(isRidaVariant(doctor))return 1;\n  if(isGaniVariant(doctor))return 2;"
if gneedle not in s[gbrace:gbrace+1000]:
    s=s[:gbrace+1]+gneedle+s[gbrace+1:]

surface=r'''function rotasticSurfaceMissingPhysicians(){
  const RIDA=ROTASTIC_RIDA,GANI=ROTASTIC_GANI;
  const roster=['Dr Abdulgafoor K.','Dr Abdulrashid S.','Dr Aminullah Z.','Dr Bilal C.','Dr Enan M.','Dr Fahima N.','Dr Faisal C.','Dr Fazila K.',GANI,'Dr Husam S','Dr Imran A.','Dr Laila A.','Dr Laith A.','Dr Maher A.','Dr Maya S.','Dr Mohamed M.','Dr Mohammed S.','Dr Muhammad K.','Dr Oula T.',RIDA,'Dr Saba T.','Dr Saima N.','Dr Salah M.','Dr Selman E.','Dr Shadi T','Dr Syed I.','Dr Tayseer A.','Dr Zaid SE.'];
  const bilal=/^Dr\.?\s+Bilal\b/i,fahima=/^Dr\.?\s+Fahima\b/i;
  const female=/\b(?:Rida|Tayseer|Taysir|Oula|Ola|Saba|Fazila|Laila|Layla|Leila|Maya|Saima|Fahima)\b/i;
  const leaveAliases=['Dr Bilal C.',GANI,'Dr Ghani M.','Dr Gani Shafi','Dr Ghani Shafi','دكتور GANI','دكتور GHANI'];
  function canonical(doc){return rotasticSchedulerCanonicalDoctor(doc);}
  function group(doc){return getAuthoritativeGroupForScheduler(doc);}
  function unavailable(doc,day){doc=canonical(doc);if(doc===RIDA)return rotasticExplicitOff(RIDA,day);return fahima.test(doc)||bilal.test(doc)||doc===GANI||rotasticExplicitOff(doc,day)||rotasticDoctorUnavailable(doc,day);}
  function rotationPeriod(day,doc){
    doc=canonical(doc);const g=getAuthoritativeGroupForScheduler(doc,day),iso=rotasticDayISO(day)||'',d=Number(iso.slice(-2));
    if(d>=1&&d<=3)return g===1?'am':'pm';
    if(d>=4&&d<=5)return g===2?'am':'pm';
    const score={am:0,pm:0};
    ['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;const vals=[];rotasticNormalFields().forEach(function(f){if(sh[f])vals.push(sh[f]);});if(sh.rooms)vals.push(...Object.values(sh.rooms));if(Array.isArray(sh.noRoomDocs))vals.push(...sh.noRoomDocs);vals.forEach(function(x){if(group(x)===g)score[p]++;});});
    if(score.am!==score.pm)return score.am>score.pm?'am':'pm';
    return g===2?'pm':'am';
  }
  function visible(day,doc){doc=canonical(doc);const k=rotasticDoctorKey(doc);for(const p of ['am','pm']){const sh=day&&day[p];if(!sh)continue;for(const f of rotasticNormalFields())if(rotasticDoctorKey(canonical(sh[f]))===k)return true;if(sh.rooms&&Object.values(sh.rooms).some(v=>rotasticDoctorKey(canonical(v))===k))return true;if(Array.isArray(sh.noRoomDocs)&&sh.noRoomDocs.some(v=>rotasticDoctorKey(canonical(v))===k))return true;}return false;}
  function occupied(sh,room){return !!(sh&&sh.rooms&&sh.rooms[String(room)]);}
  function purgeRida(day){for(const p of ['am','pm']){const sh=day&&day[p];if(!sh)continue;for(const f of rotasticNormalFields())if(isRidaVariant(sh[f]))sh[f]='';if(sh.rooms)for(const room of Object.keys(sh.rooms))if(isRidaVariant(sh.rooms[room]))delete sh.rooms[room];if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs=sh.noRoomDocs.filter(x=>!isRidaVariant(x));}}
  function place(day,doc){doc=canonical(doc);const p=rotationPeriod(day,doc),sh=day&&day[p];if(!sh)return false;if(!sh.rooms)sh.rooms={};const rooms=female.test(String(doc||''))?['21','22','24','25','26','27','32']:['9','10','12','13','14','39','21','22','24','25','26','27'];for(const room of rooms){if(!occupied(sh,room)){sh.rooms[room]=doc;return true;}}if(!Array.isArray(sh.noRoomDocs))sh.noRoomDocs=[];if(!sh.noRoomDocs.some(x=>rotasticDoctorKey(canonical(x))===rotasticDoctorKey(doc)))sh.noRoomDocs.push(doc);return true;}
  function rebuildRida(day){purgeRida(day);if(!unavailable(RIDA,day))place(day,RIDA);}
  function repairEmergency(day,p){const sh=day&&day[p];if(!sh)return;const purgeField=function(f,pred){const v=sh[f];if(v&&pred(v)){const doc=canonical(v);sh[f]='';place(day,doc);}};['med','maleER','erMale','emergencyMale'].forEach(f=>purgeField(f,x=>female.test(String(x||''))));['fed','femaleER','erFemale','emergencyFemale'].forEach(f=>purgeField(f,x=>!female.test(String(x||''))));['wbcDoc','wbc'].forEach(f=>purgeField(f,x=>x!=='No Clinic'&&female.test(String(x||''))));['ancDoc','anc'].forEach(f=>purgeField(f,x=>x!=='No Clinic'&&!female.test(String(x||''))));['timed1Doc','timed2Doc','nineFour1','nineFour2','twoEight1','twoEight2','twilight1','twilight2'].forEach(f=>purgeField(f,x=>female.test(String(x||''))));}
  (currentSchedule||[]).forEach(function(day){leaveAliases.forEach(doc=>rotasticPurgeDoctorEverywhere(day,doc));rotasticPurgeExplicitOff(day);purgeRida(day);repairEmergency(day,'am');repairEmergency(day,'pm');roster.forEach(function(doc){doc=canonical(doc);if(doc===RIDA)return;if(unavailable(doc,day)||visible(day,doc))return;place(day,doc);});rebuildRida(day);leaveAliases.forEach(doc=>rotasticPurgeDoctorEverywhere(day,doc));rotasticPurgeExplicitOff(day);repairEmergency(day,'am');repairEmergency(day,'pm');if(!unavailable(RIDA,day)&&!visible(day,RIDA))rebuildRida(day);roster.forEach(function(doc){doc=canonical(doc);if(!unavailable(doc,day)&&!visible(day,doc))throw new Error('ROTASTIC missing available physician: '+doc+' '+(rotasticDayISO(day)||''));});});
}'''

start=s.find('function rotasticSurfaceMissingPhysicians(){')
if start<0: raise SystemExit('surface invariant anchor missing')
m=re.search(r'\r?\nfunction\s+[A-Za-z_$][\w$]*\s*\(',s[start+1:])
if not m: raise SystemExit('surface invariant boundary missing')
end=start+1+m.start()
s=s[:start]+surface+s[end:]

call='  rotasticAssignAllAvailablePhysicians();'
pos=s.find(call)
if pos<0: raise SystemExit('assign-all call missing')
window_end=min(len(s),pos+1800)
window=s[pos:window_end]
window=re.sub(r'\r?\n\s*rotasticSurfaceMissingPhysicians\(\);','',window)
window=re.sub(r'\r?\n\s*\(currentSchedule\|\|\[\]\)\.forEach\(rotasticPurgeExplicitOff\);','',window)
idx=window.rfind('rotasticEnforceExclusiveShiftAssignments();')
if idx>=0: insert=idx+len('rotasticEnforceExclusiveShiftAssignments();')
else: insert=window.find('\n')
window=window[:insert]+'\n  rotasticSurfaceMissingPhysicians();\n  (currentSchedule||[]).forEach(rotasticPurgeExplicitOff);'+window[insert:]
s=s[:pos]+window+s[window_end:]

for token in ['ROTASTIC_SCHEDULER_RIDA_GANI_HELPERS_V3','isRidaVariant','isGaniVariant','getAuthoritativeGroupForScheduler','if(isRidaVariant(doctorName))return 1','if(isGaniVariant(doctorName))return 2','rebuildRida(day)','ROTASTIC missing available physician']:
    if token not in s: raise SystemExit('missing invariant '+token)
if 'const __rg=rotasticCanonicalRidaGani(name)' in s: raise SystemExit('UI/global canonicalRotaName hook still present')

p.write_text(s,encoding='utf-8')
print('Scheduler-only authoritative grouping added: Rida Group 1, Gani/Ghani Group 2; UI naming untouched.')
