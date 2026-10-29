from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Dr Gani M. is authoritative Group 2. Correct the generator group set after the base scheduling patch.
group2 = "const ROTASTIC_GROUP_2 = new Set(['Dr Husam S','Dr Maher A.','Dr Zaid SE.','Dr Selman E.','Dr Syed I.','Dr Abdulrashid S.','Dr Oula T.','Dr Tayseer A.','Dr Saba T.','Dr Bilal C.','Dr Laith A.','Dr Gani M.'].map(canonicalRotaName));"
s, n = re.subn(r"const ROTASTIC_GROUP_2 = new Set\(\[.*?\]\.map\(canonicalRotaName\)\);", group2, s, count=1)
if n != 1:
    raise SystemExit('Authoritative Group 2 set missing')

start = s.find('function rotasticEnforceExclusiveShiftAssignments()')
end = s.find('function enforceFinalTwilightAssignments() {', start)
if start < 0 or end <= start:
    raise SystemExit('Final rota invariant anchor missing')

block = r'''function rotasticDoctorKey(v) {
  if (!v || !/^Dr\.?\s+/i.test(String(v))) return '';
  return canonicalRotaName(String(v).replace(/\s*\([^)]*\)\s*$/,''));
}
function rotasticNormalFields() {
  return ['timed1Doc','timed2Doc','wbcDoc','ancDoc','ncdDoc','wicDoc','hearingDoc','htDoc','isolationDoc','isoDoc','smokingDoc','iucdDoc','sdiDoc'];
}
function rotasticClearNormalDoctor(sh, doctorKey, keepTwilight) {
  if (!sh || !doctorKey) return;
  rotasticNormalFields().forEach(function(field) {
    if (keepTwilight && (field==='timed1Doc' || field==='timed2Doc')) return;
    if (rotasticDoctorKey(sh[field])===doctorKey) sh[field] = field==='wbcDoc' ? 'No Clinic' : '';
  });
  if (sh.rooms && typeof sh.rooms==='object') Object.keys(sh.rooms).forEach(function(room) {
    if (rotasticDoctorKey(sh.rooms[room])===doctorKey) sh.rooms[room]='-';
  });
  if (Array.isArray(sh.noRoomDocs)) sh.noRoomDocs=sh.noRoomDocs.filter(function(v){return rotasticDoctorKey(v)!==doctorKey;});
}
function rotasticEnforceExclusiveShiftAssignments() {
  (currentSchedule || []).forEach(function(day) {
    const twilight = new Set();
    ['am','pm'].forEach(function(period) {
      const sh=day&&day[period]; if(!sh)return;
      ['timed1Doc','timed2Doc'].forEach(function(field){const k=rotasticDoctorKey(sh[field]);if(k)twilight.add(k);});
    });
    twilight.forEach(function(k){
      ['am','pm'].forEach(function(period){rotasticClearNormalDoctor(day&&day[period],k,true);});
    });
    const seen = new Set(twilight);
    ['am','pm'].forEach(function(period) {
      const sh=day&&day[period]; if(!sh)return;
      rotasticNormalFields().slice(2).forEach(function(field) {
        const k=rotasticDoctorKey(sh[field]); if(!k)return;
        if(seen.has(k)) sh[field]=field==='wbcDoc'?'No Clinic':''; else seen.add(k);
      });
      if(sh.rooms&&typeof sh.rooms==='object') Object.keys(sh.rooms).forEach(function(room){
        const k=rotasticDoctorKey(sh.rooms[room]);if(!k)return;
        if(seen.has(k))sh.rooms[room]='-';else seen.add(k);
      });
      if(Array.isArray(sh.noRoomDocs)) sh.noRoomDocs=sh.noRoomDocs.filter(function(v){const k=rotasticDoctorKey(v);if(!k||seen.has(k))return false;seen.add(k);return true;});
    });
  });
}
function rotasticAssignAllAvailablePhysicians() {
  const fahima=/^Dr\.?\s+Fahima\b/i;
  function existing(day){
    const out=new Set();
    ['am','pm'].forEach(function(period){const sh=day&&day[period];if(!sh)return;rotasticNormalFields().forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(k)out.add(k);});if(sh.rooms)Object.values(sh.rooms).forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.add(k);});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs.forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.add(k);});});
    return out;
  }
  (currentSchedule||[]).forEach(function(day){
    const byPeriod={am:[],pm:[]};
    ['am','pm'].forEach(function(period){
      const list=typeof getAvailableDoctorsForShift==='function'?getAvailableDoctorsForShift(day,period):(typeof getAvailableDoctors==='function'?getAvailableDoctors(day,period):[]);
      byPeriod[period]=(list||[]).filter(function(doc){return doc&&!fahima.test(doc)&&!doctorIsOnLeaveForDay(doc,day);});
    });
    const used=existing(day);
    const all=[];
    byPeriod.am.concat(byPeriod.pm).forEach(function(doc){const k=canonicalRotaName(doc);if(!all.some(function(x){return canonicalRotaName(x)===k;}))all.push(doc);});
    all.sort(function(a,b){const aa=/^Dr\.?\s+Abdulgafoor\b/i.test(a)?-1:0;const bb=/^Dr\.?\s+Abdulgafoor\b/i.test(b)?-1:0;return aa-bb;});
    all.forEach(function(doc){
      const k=canonicalRotaName(doc);if(used.has(k))return;
      const eligible=[];if(byPeriod.am.some(function(x){return canonicalRotaName(x)===k;}))eligible.push('am');if(byPeriod.pm.some(function(x){return canonicalRotaName(x)===k;}))eligible.push('pm');
      for(const period of eligible){
        const sh=day&&day[period];if(!sh)continue;
        let rooms;
        if(rotasticIsFemalePhysician(doc)) rooms=['21','22','24','25','26','27','39'];
        else if(/^Dr\.?\s+Abdulgafoor\b/i.test(doc)) rooms=['39','21','22','24','25','26','27','14','13','12','10','9'];
        else rooms=['21','22','24','25','26','27','14','13','12','10','9','39'];
        for(const room of rooms){if(assignIfFreeRoom(sh,room,doc,'')){used.add(k);return;}}
      }
      const period=eligible[0];const sh=period&&day&&day[period];
      if(sh){if(!sh.noRoomDocs)sh.noRoomDocs=[];if(!sh.noRoomDocs.some(function(x){return canonicalRotaName(x)===k;})){sh.noRoomDocs.push(doc);used.add(k);}}
    });
  });
}

'''
s = s[:start] + block + s[end:]

old = "  enforceFinalTwilightAssignments();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticAssignAllAvailablePhysicians();\n  rotasticEnforceExclusiveShiftAssignments();\n  populateMoursiShiftDayOptions();"
if old not in s:
    raise SystemExit('Final invariant call order missing')

for token in ['Dr Husam S','Dr Maher A.','Dr Zaid SE.','Dr Selman E.','Dr Syed I.','Dr Abdulrashid S.','Dr Oula T.','Dr Tayseer A.','Dr Saba T.','Dr Bilal C.','Dr Laith A.','Dr Gani M.']:
    if token not in s: raise SystemExit('Missing Group 2 member: '+token)
if 'rotasticIsFemaleTwilightDoctor' not in s: raise SystemExit('Female Twilight guard missing')
if "shift.wbcDoc=chooseRotating(wbcMaleCandidates,seed+3,used) || 'No Clinic';" not in s: raise SystemExit('WBC male-only guard missing')

p.write_text(s, encoding='utf-8')
print('Applied day-wide normal-duty uniqueness and authoritative Group 2 including Dr Gani M.; UI unchanged.')
