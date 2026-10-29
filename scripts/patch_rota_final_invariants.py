from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Dr Gani M. is authoritative Group 2.
group2 = "const ROTASTIC_GROUP_2 = new Set(['Dr Husam S','Dr Maher A.','Dr Zaid SE.','Dr Selman E.','Dr Syed I.','Dr Abdulrashid S.','Dr Oula T.','Dr Tayseer A.','Dr Saba T.','Dr Bilal C.','Dr Laith A.','Dr Gani M.'].map(canonicalRotaName));"
s, n = re.subn(r"const ROTASTIC_GROUP_2 = new Set\(\[.*?\]\.map\(canonicalRotaName\)\);", group2, s, count=1)
if n != 1: raise SystemExit('Authoritative Group 2 set missing')

start=s.find('function rotasticEnforceExclusiveShiftAssignments()')
end=s.find('function enforceFinalTwilightAssignments() {',start)
if start<0 or end<=start: raise SystemExit('Final rota invariant anchor missing')

block=r'''function rotasticDoctorKey(v) {
  if (!v || !/^Dr\.?\s+/i.test(String(v))) return '';
  return canonicalRotaName(String(v).replace(/\s*\([^)]*\)\s*$/,''));
}
function rotasticNormalFields(){return ['timed1Doc','timed2Doc','wbcDoc','ancDoc','ncdDoc','wicDoc','hearingDoc','htDoc','isolationDoc','isoDoc','smokingDoc','iucdDoc','sdiDoc'];}
function rotasticDayTwilight(day){
  const out=new Set();
  ['am','pm'].forEach(function(period){const sh=day&&day[period];if(!sh)return;['timed1Doc','timed2Doc'].forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(k)out.add(k);});});
  return out;
}
function rotasticClearNormalDoctor(sh,k,keepTwilight){
  if(!sh||!k)return;
  rotasticNormalFields().forEach(function(f){if(keepTwilight&&(f==='timed1Doc'||f==='timed2Doc'))return;if(rotasticDoctorKey(sh[f])===k)sh[f]=f==='wbcDoc'?'No Clinic':'';});
  if(sh.rooms)Object.keys(sh.rooms).forEach(function(r){if(rotasticDoctorKey(sh.rooms[r])===k)sh.rooms[r]='-';});
  if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs=sh.noRoomDocs.filter(function(v){return rotasticDoctorKey(v)!==k;});
}
function rotasticEnforceExclusiveShiftAssignments(){
  (currentSchedule||[]).forEach(function(day){
    const twilight=rotasticDayTwilight(day);
    twilight.forEach(function(k){['am','pm'].forEach(function(p){rotasticClearNormalDoctor(day&&day[p],k,true);});});
    const seen=new Set(twilight);
    ['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;rotasticNormalFields().slice(2).forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(!k)return;if(seen.has(k))sh[f]=f==='wbcDoc'?'No Clinic':'';else seen.add(k);});if(sh.rooms)Object.keys(sh.rooms).forEach(function(r){const k=rotasticDoctorKey(sh.rooms[r]);if(!k)return;if(seen.has(k))sh.rooms[r]='-';else seen.add(k);});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs=sh.noRoomDocs.filter(function(v){const k=rotasticDoctorKey(v);if(!k||seen.has(k))return false;seen.add(k);return true;});});
  });
}
function rotasticRepairWBCAndANC(){
  (currentSchedule||[]).forEach(function(day){
    const twilight=rotasticDayTwilight(day);
    /* First remove WBC from ANY Twilight doctor, regardless of AM/PM side. */
    ['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;const k=rotasticDoctorKey(sh.wbcDoc);if(k&&twilight.has(k))sh.wbcDoc='No Clinic';});
    ['am','pm'].forEach(function(period){
      const sh=day&&day[period];if(!sh)return;
      const list=typeof getAvailableDoctorsForShift==='function'?getAvailableDoctorsForShift(day,period):(typeof getAvailableDoctors==='function'?getAvailableDoctors(day,period):[]);
      const available=(list||[]).filter(function(doc){return doc&&!doctorIsOnLeaveForDay(doc,day);});
      const occupied=new Set(twilight);
      ['am','pm'].forEach(function(p){const q=day&&day[p];if(!q)return;rotasticNormalFields().slice(2).forEach(function(f){if(f==='wbcDoc')return;const k=rotasticDoctorKey(q[f]);if(k)occupied.add(k);});if(q.rooms)Object.values(q.rooms).forEach(function(v){const k=rotasticDoctorKey(v);if(k)occupied.add(k);});if(Array.isArray(q.noRoomDocs))q.noRoomDocs.forEach(function(v){const k=rotasticDoctorKey(v);if(k)occupied.add(k);});});
      const enabled=typeof rotasticWeeklyClinicEnabled!=='function'||rotasticWeeklyClinicEnabled('wbc');
      let wk=rotasticDoctorKey(sh.wbcDoc);
      if(wk&&twilight.has(wk)){sh.wbcDoc='No Clinic';wk='';}
      if(enabled&&!wk){const next=available.find(function(doc){const k=canonicalRotaName(doc);return !rotasticIsFemalePhysician(doc)&&!twilight.has(k)&&!occupied.has(k)&&!dutyExempt(doc,'wbc',day);});if(next){sh.wbcDoc=next;wk=canonicalRotaName(next);occupied.add(wk);}}
      if(!enabled)sh.wbcDoc='No Clinic';
      const finalWbc=rotasticDoctorKey(sh.wbcDoc);if(finalWbc&&sh.rooms)Object.keys(sh.rooms).forEach(function(r){if(rotasticDoctorKey(sh.rooms[r])===finalWbc)sh.rooms[r]='-';});
      const anc=rotasticDoctorKey(sh.ancDoc);if(anc&&sh.rooms)Object.keys(sh.rooms).forEach(function(r){if(r!=='32'&&rotasticDoctorKey(sh.rooms[r])===anc)sh.rooms[r]='-';});
      sh.ancRoom=sh.ancDoc&&sh.ancDoc!=='No Clinic'?'32':'';sh.wbcRoom='';
    });
    /* Hard postcondition: Twilight and WBC must be two different people. */
    const finalTwilight=rotasticDayTwilight(day);['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;const k=rotasticDoctorKey(sh.wbcDoc);if(k&&finalTwilight.has(k))throw new Error('Invalid rota: Twilight physician also assigned WBC: '+k);});
  });
}
function rotasticAssignAllAvailablePhysicians(){
  const fahima=/^Dr\.?\s+Fahima\b/i;
  function existing(day){const out=new Set();['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;rotasticNormalFields().forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(k)out.add(k);});if(sh.rooms)Object.values(sh.rooms).forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.add(k);});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs.forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.add(k);});});return out;}
  (currentSchedule||[]).forEach(function(day){const byPeriod={am:[],pm:[]};['am','pm'].forEach(function(p){const list=typeof getAvailableDoctorsForShift==='function'?getAvailableDoctorsForShift(day,p):(typeof getAvailableDoctors==='function'?getAvailableDoctors(day,p):[]);byPeriod[p]=(list||[]).filter(function(doc){return doc&&!fahima.test(doc)&&!doctorIsOnLeaveForDay(doc,day);});});const used=existing(day),all=[];byPeriod.am.concat(byPeriod.pm).forEach(function(doc){const k=canonicalRotaName(doc);if(!all.some(function(x){return canonicalRotaName(x)===k;}))all.push(doc);});all.sort(function(a,b){return (/^Dr\.?\s+Abdulgafoor\b/i.test(a)?-1:0)-(/^Dr\.?\s+Abdulgafoor\b/i.test(b)?-1:0);});all.forEach(function(doc){const k=canonicalRotaName(doc);if(used.has(k))return;const eligible=[];if(byPeriod.am.some(function(x){return canonicalRotaName(x)===k;}))eligible.push('am');if(byPeriod.pm.some(function(x){return canonicalRotaName(x)===k;}))eligible.push('pm');for(const p of eligible){const sh=day&&day[p];if(!sh)continue;let rooms;if(rotasticIsFemalePhysician(doc))rooms=['21','22','24','25','26','27','39'];else if(/^Dr\.?\s+Abdulgafoor\b/i.test(doc))rooms=['39','21','22','24','25','26','27','14','13','12','10','9'];else rooms=['21','22','24','25','26','27','14','13','12','10','9','39'];for(const r of rooms){if(assignIfFreeRoom(sh,r,doc,'')){used.add(k);return;}}}const p=eligible[0],sh=p&&day&&day[p];if(sh){if(!sh.noRoomDocs)sh.noRoomDocs=[];if(!sh.noRoomDocs.some(function(x){return canonicalRotaName(x)===k;})){sh.noRoomDocs.push(doc);used.add(k);}}});});
}

'''
s=s[:start]+block+s[end:]
old="  enforceFinalTwilightAssignments();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  rotasticAssignAllAvailablePhysicians();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  populateMoursiShiftDayOptions();"
new="  enforceFinalTwilightAssignments();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  rotasticAssignAllAvailablePhysicians();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  populateMoursiShiftDayOptions();"
if old in s:s=s.replace(old,new,1)
elif new not in s:raise SystemExit('Final invariant call order missing')
for token in ['Dr Husam S','Dr Maher A.','Dr Zaid SE.','Dr Selman E.','Dr Syed I.','Dr Abdulrashid S.','Dr Oula T.','Dr Tayseer A.','Dr Saba T.','Dr Bilal C.','Dr Laith A.','Dr Gani M.']:
  if token not in s:raise SystemExit('Missing Group 2 member: '+token)
if "throw new Error('Invalid rota: Twilight physician also assigned WBC: '+k)" not in s:raise SystemExit('Twilight/WBC hard postcondition missing')
if "sh.ancRoom=sh.ancDoc&&sh.ancDoc!=='No Clinic'?'32':''" not in s:raise SystemExit('ANC room invariant missing')
if "sh.wbcRoom=''" not in s:raise SystemExit('WBC room invariant missing')
p.write_text(s,encoding='utf-8')
print('Applied day-wide Twilight/WBC hard exclusion and final postcondition; UI unchanged.')
