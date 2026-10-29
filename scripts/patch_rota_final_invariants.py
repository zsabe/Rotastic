from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Scheduling-only invariants. Do not touch UI markup/styles.
group2 = "const ROTASTIC_GROUP_2 = new Set(['Dr Husam S','Dr Maher A.','Dr Zaid SE.','Dr Selman E.','Dr Syed I.','Dr Abdulrashid S.','Dr Oula T.','Dr Tayseer A.','Dr Saba T.','Dr Bilal C.','Dr Laith A.','Dr Gani M.'].map(canonicalRotaName));"
s, n = re.subn(r"const ROTASTIC_GROUP_2 = new Set\(\[.*?\]\.map\(canonicalRotaName\)\);", group2, s, count=1)
if n != 1: raise SystemExit('Authoritative Group 2 set missing')

start=s.find('function rotasticDoctorKey(v)')
if start < 0: start=s.find('function rotasticEnforceExclusiveShiftAssignments()')
end=s.find('function enforceFinalTwilightAssignments() {',start)
if start<0 or end<=start: raise SystemExit('Final rota invariant anchor missing')

block=r'''function rotasticIsGaniName(v){
  return /(?:^|\b)(?:Dr\.?\s*)?(?:Gani|Ghani)(?:\s+(?:M\.?|Shafi))?\b/i.test(String(v||'')) || /دكتور\s*(?:GANI|GHANI)/i.test(String(v||''));
}
function rotasticDoctorKey(v){
  if(!v)return '';
  if(rotasticIsGaniName(v))return canonicalRotaName('Dr Gani M.');
  if(!/^Dr\.?\s+/i.test(String(v)))return '';
  return canonicalRotaName(String(v).replace(/\s*\([^)]*\)\s*$/,''));
}
function rotasticNormalFields(){return ['timed1Doc','timed2Doc','wbcDoc','ancDoc','ncdDoc','wicDoc','hearingDoc','htDoc','isolationDoc','isoDoc','smokingDoc','iucdDoc','sdiDoc'];}
function rotasticDayTwilight(day){const out=new Set();['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;['timed1Doc','timed2Doc'].forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(k)out.add(k);});});return out;}
function rotasticClearNormalDoctor(sh,k,keepTwilight){if(!sh||!k)return;rotasticNormalFields().forEach(function(f){if(keepTwilight&&(f==='timed1Doc'||f==='timed2Doc'))return;if(rotasticDoctorKey(sh[f])===k)sh[f]=f==='wbcDoc'?'No Clinic':'';});if(sh.rooms)Object.keys(sh.rooms).forEach(function(r){if(rotasticDoctorKey(sh.rooms[r])===k)sh.rooms[r]='-';});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs=sh.noRoomDocs.filter(function(v){return rotasticDoctorKey(v)!==k;});}
function rotasticDoctorUnavailable(doc,day){
  const aliases=rotasticIsGaniName(doc)?['Dr Gani M.','Dr Ghani M.','Dr Gani Shafi','Dr Ghani Shafi','Dr Gani','Dr Ghani','دكتور GANI','دكتور GHANI']:[doc];
  return aliases.some(function(n){try{if(typeof doctorIsOnLeaveForDay==='function'&&doctorIsOnLeaveForDay(n,day))return true;}catch(e){}try{if(typeof doctorIsOffForDay==='function'&&doctorIsOffForDay(n,day))return true;}catch(e){}return false;});
}
function rotasticPurgeUnavailableGani(day){
  if(!day||!rotasticDoctorUnavailable('Dr Gani M.',day))return false;
  const k=canonicalRotaName('Dr Gani M.');
  ['am','pm'].forEach(function(p){const sh=day[p];if(!sh)return;rotasticClearNormalDoctor(sh,k,false);Object.keys(sh).forEach(function(f){if(typeof sh[f]==='string'&&rotasticDoctorKey(sh[f])===k)sh[f]='';});if(sh.rooms)Object.keys(sh.rooms).forEach(function(r){if(rotasticDoctorKey(sh.rooms[r])===k)sh.rooms[r]='-';});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs=sh.noRoomDocs.filter(function(v){return rotasticDoctorKey(v)!==k;});});
  return true;
}
function rotasticEnforceGaniGroup2Shift(){const gani=canonicalRotaName('Dr Gani M.');(currentSchedule||[]).forEach(function(day){if(rotasticPurgeUnavailableGani(day))return;function keys(sh){const out=[];if(!sh)return out;rotasticNormalFields().forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(k)out.push(k);});if(sh.rooms)Object.values(sh.rooms).forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.push(k);});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs.forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.push(k);});return out;}const ak=keys(day.am),pk=keys(day.pm),ga=ak.includes(gani),gp=pk.includes(gani);if(!ga&&!gp)return;const score=function(x){return x.filter(function(k){return k!==gani&&ROTASTIC_GROUP_2.has(k);}).length;};const a=score(ak),p=score(pk);if(a===p)return;const target=p>a?'pm':'am',wrong=target==='pm'?'am':'pm';if((target==='pm'&&gp)||(target==='am'&&ga)){rotasticClearNormalDoctor(day[wrong],gani,false);return;}rotasticClearNormalDoctor(day[wrong],gani,false);const sh=day[target];if(!sh)return;for(const r of ['21','22','24','25','26','27','14','13','12','10','9','39'])if(assignIfFreeRoom(sh,r,'Dr Gani M.',''))return;if(!sh.noRoomDocs)sh.noRoomDocs=[];sh.noRoomDocs.push('Dr Gani M.');});}
function rotasticEnforceExclusiveShiftAssignments(){(currentSchedule||[]).forEach(function(day){const twilight=rotasticDayTwilight(day);twilight.forEach(function(k){['am','pm'].forEach(function(p){rotasticClearNormalDoctor(day&&day[p],k,true);});});const seen=new Set(twilight);['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;rotasticNormalFields().slice(2).forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(!k)return;if(seen.has(k))sh[f]=f==='wbcDoc'?'No Clinic':'';else seen.add(k);});if(sh.rooms)Object.keys(sh.rooms).forEach(function(r){const k=rotasticDoctorKey(sh.rooms[r]);if(!k)return;if(seen.has(k))sh.rooms[r]='-';else seen.add(k);});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs=sh.noRoomDocs.filter(function(v){const k=rotasticDoctorKey(v);if(!k||seen.has(k))return false;seen.add(k);return true;});});});}
function rotasticRepairWBCAndANC(){(currentSchedule||[]).forEach(function(day){const twilight=rotasticDayTwilight(day);['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;const k=rotasticDoctorKey(sh.wbcDoc);if(k&&twilight.has(k))sh.wbcDoc='No Clinic';});['am','pm'].forEach(function(period){const sh=day&&day[period];if(!sh)return;const list=typeof getAvailableDoctorsForShift==='function'?getAvailableDoctorsForShift(day,period):(typeof getAvailableDoctors==='function'?getAvailableDoctors(day,period):[]);const available=(list||[]).filter(function(doc){return doc&&!rotasticDoctorUnavailable(doc,day);});const occupied=new Set(twilight);['am','pm'].forEach(function(p){const q=day&&day[p];if(!q)return;rotasticNormalFields().slice(2).forEach(function(f){if(f==='wbcDoc')return;const k=rotasticDoctorKey(q[f]);if(k)occupied.add(k);});if(q.rooms)Object.values(q.rooms).forEach(function(v){const k=rotasticDoctorKey(v);if(k)occupied.add(k);});if(Array.isArray(q.noRoomDocs))q.noRoomDocs.forEach(function(v){const k=rotasticDoctorKey(v);if(k)occupied.add(k);});});const enabled=typeof rotasticWeeklyClinicEnabled!=='function'||rotasticWeeklyClinicEnabled('wbc');let wk=rotasticDoctorKey(sh.wbcDoc);if(wk&&twilight.has(wk)){sh.wbcDoc='No Clinic';wk='';}if(enabled&&!wk){const next=available.find(function(doc){const k=rotasticDoctorKey(doc);return !rotasticIsFemalePhysician(doc)&&!twilight.has(k)&&!occupied.has(k)&&!dutyExempt(doc,'wbc',day);});if(next){sh.wbcDoc=next;wk=rotasticDoctorKey(next);occupied.add(wk);}}if(!enabled)sh.wbcDoc='No Clinic';const fw=rotasticDoctorKey(sh.wbcDoc);if(fw&&sh.rooms)Object.keys(sh.rooms).forEach(function(r){if(rotasticDoctorKey(sh.rooms[r])===fw)sh.rooms[r]='-';});const anc=rotasticDoctorKey(sh.ancDoc);if(anc&&sh.rooms)Object.keys(sh.rooms).forEach(function(r){if(r!=='32'&&rotasticDoctorKey(sh.rooms[r])===anc)sh.rooms[r]='-';});sh.ancRoom=sh.ancDoc&&sh.ancDoc!=='No Clinic'?'32':'';sh.wbcRoom='';});const ft=rotasticDayTwilight(day);['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;const k=rotasticDoctorKey(sh.wbcDoc);if(k&&ft.has(k))throw new Error('Invalid rota: Twilight physician also assigned WBC: '+k);});});}
function rotasticAssignAllAvailablePhysicians(){
  const fahima=/^Dr\.?\s+Fahima\b/i;
  function existing(day){const out=new Set();['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;rotasticNormalFields().forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(k)out.add(k);});if(sh.rooms)Object.values(sh.rooms).forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.add(k);});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs.forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.add(k);});});return out;}
  (currentSchedule||[]).forEach(function(day){rotasticPurgeUnavailableGani(day);const by={am:[],pm:[]};['am','pm'].forEach(function(p){const list=typeof getAvailableDoctorsForShift==='function'?getAvailableDoctorsForShift(day,p):(typeof getAvailableDoctors==='function'?getAvailableDoctors(day,p):[]);by[p]=(list||[]).filter(function(doc){return doc&&!fahima.test(doc)&&!rotasticDoctorUnavailable(doc,day);});});const used=existing(day),all=[];by.am.concat(by.pm).forEach(function(doc){const k=rotasticDoctorKey(doc);if(k&&!all.some(function(x){return rotasticDoctorKey(x)===k;}))all.push(doc);});all.forEach(function(doc){const k=rotasticDoctorKey(doc);if(!k||used.has(k))return;const eligible=[];if(by.am.some(function(x){return rotasticDoctorKey(x)===k;}))eligible.push('am');if(by.pm.some(function(x){return rotasticDoctorKey(x)===k;}))eligible.push('pm');for(const p of eligible){const sh=day[p];if(!sh)continue;const rooms=rotasticIsFemalePhysician(doc)?['21','22','24','25','26','27','39']:(/^Dr\.?\s+Abdulgafoor\b/i.test(doc)?['39','21','22','24','25','26','27','14','13','12','10','9']:['21','22','24','25','26','27','14','13','12','10','9','39']);for(const r of rooms){if(assignIfFreeRoom(sh,r,doc,'')){used.add(k);return;}}}const p=eligible[0],sh=p&&day[p];if(sh){if(!sh.noRoomDocs)sh.noRoomDocs=[];if(!sh.noRoomDocs.some(function(x){return rotasticDoctorKey(x)===k;})){sh.noRoomDocs.push(doc);used.add(k);}}});});
}

'''
s=s[:start]+block+s[end:]
old="  enforceFinalTwilightAssignments();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  rotasticAssignAllAvailablePhysicians();\n  rotasticEnforceGaniGroup2Shift();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  rotasticEnforceGaniGroup2Shift();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  populateMoursiShiftDayOptions();"
new="  enforceFinalTwilightAssignments();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  rotasticAssignAllAvailablePhysicians();\n  rotasticEnforceGaniGroup2Shift();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  rotasticEnforceGaniGroup2Shift();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  (currentSchedule||[]).forEach(rotasticPurgeUnavailableGani);\n  populateMoursiShiftDayOptions();"
if old in s:s=s.replace(old,new,1)
elif new not in s:raise SystemExit('Final invariant call order missing')
for token in ['Dr Husam S','Dr Maher A.','Dr Zaid SE.','Dr Selman E.','Dr Syed I.','Dr Abdulrashid S.','Dr Oula T.','Dr Tayseer A.','Dr Saba T.','Dr Bilal C.','Dr Laith A.','Dr Gani M.']:
  if token not in s:raise SystemExit('Missing Group 2 member: '+token)
for token in ['Ghani','rotasticDoctorUnavailable','rotasticPurgeUnavailableGani','rotasticAssignAllAvailablePhysicians']:
  if token not in s:raise SystemExit('Missing invariant: '+token)
p.write_text(s,encoding='utf-8')
print('Enforced Gani/Ghani alias off/leave exclusion and assignment of all available physicians; UI unchanged.')
