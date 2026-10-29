from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Scheduling-only hotfix. UI markup/styles are intentionally untouched.
old_start=s.find('function rotasticAssignAllAvailablePhysicians(){')
old_end=s.find('\n}\n\nfunction enforceFinalTwilightAssignments() {',old_start)
if old_start<0 or old_end<0: raise SystemExit('assign-all invariant anchor missing')
old_end += 2

fn=r'''function rotasticAssignAllAvailablePhysicians(){
  const roster=[
    'Dr Abdulgafoor K.','Dr Abdulrashid S.','Dr Aminullah Z.','Dr Bilal C.','Dr Enan M.',
    'Dr Fahima N.','Dr Faisal C.','Dr Fazila K.','Dr Gani M.','Dr Husam S','Dr Imran A.',
    'Dr Laila A.','Dr Laith A.','Dr Maher A.','Dr Maya S.','Dr Mohamed M.','Dr Mohammed S.',
    'Dr Muhammad K.','Dr Oula T.','Dr Rida C.','Dr Saba T.','Dr Saima N.','Dr Salah M.',
    'Dr Selman E.','Dr Shadi T','Dr Syed I.','Dr Tayseer A.','Dr Zaid SE.'
  ];
  const group2=new Set(['Dr Husam S','Dr Maher A.','Dr Zaid SE.','Dr Selman E.','Dr Syed I.','Dr Abdulrashid S.','Dr Oula T.','Dr Tayseer A.','Dr Saba T.','Dr Bilal C.','Dr Laith A.','Dr Gani M.'].map(rotasticDoctorKey));
  const fahima=/^Dr\.?\s+Fahima\b/i;
  function existing(day){
    const out=new Set();
    ['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;rotasticNormalFields().forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(k)out.add(k);});if(sh.rooms)Object.values(sh.rooms).forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.add(k);});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs.forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.add(k);});});
    return out;
  }
  function periodKeys(day,p){const out=[];const sh=day&&day[p];if(!sh)return out;rotasticNormalFields().forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(k)out.push(k);});if(sh.rooms)Object.values(sh.rooms).forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.push(k);});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs.forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.push(k);});return out;}
  function groupPeriod(day,isG2){
    const score=function(p){return periodKeys(day,p).filter(function(k){return group2.has(k)===isG2;}).length;};
    const a=score('am'),b=score('pm');if(a!==b)return b>a?'pm':'am';
    for(const p of ['am','pm']){try{const list=typeof getAvailableDoctorsForShift==='function'?getAvailableDoctorsForShift(day,p):[];if((list||[]).some(function(d){return group2.has(rotasticDoctorKey(d))===isG2;}))return p;}catch(e){}}
    return isG2?'pm':'am';
  }
  function place(day,p,doc,used){
    const sh=day&&day[p];if(!sh)return false;const k=rotasticDoctorKey(doc);
    const rooms=rotasticIsFemalePhysician(doc)?['21','22','24','25','26','27','39']:(/^Dr\.?\s+Abdulgafoor\b/i.test(doc)?['39','21','22','24','25','26','27','14','13','12','10','9']:['21','22','24','25','26','27','14','13','12','10','9','39']);
    for(const r of rooms){if(assignIfFreeRoom(sh,r,doc,'')){used.add(k);return true;}}
    if(!sh.noRoomDocs)sh.noRoomDocs=[];if(!sh.noRoomDocs.some(function(x){return rotasticDoctorKey(x)===k;}))sh.noRoomDocs.push(doc);used.add(k);return true;
  }
  (currentSchedule||[]).forEach(function(day){
    rotasticPurgeUnavailableGani(day);
    const used=existing(day),g1=groupPeriod(day,false),g2=groupPeriod(day,true);
    roster.forEach(function(doc){
      const k=rotasticDoctorKey(doc);if(!k||fahima.test(doc)||used.has(k)||rotasticDoctorUnavailable(doc,day))return;
      place(day,group2.has(k)?g2:g1,doc,used);
    });
  });
}
'''
s=s[:old_start]+fn+s[old_end:]

# Run roster completion again after exclusivity/clinic repairs, because those repairs can remove a doctor.
needle="  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  (currentSchedule||[]).forEach(rotasticPurgeUnavailableGani);\n  populateMoursiShiftDayOptions();"
replacement="  rotasticEnforceExclusiveShiftAssignments();\n  rotasticRepairWBCAndANC();\n  rotasticAssignAllAvailablePhysicians();\n  rotasticEnforceExclusiveShiftAssignments();\n  (currentSchedule||[]).forEach(rotasticPurgeUnavailableGani);\n  populateMoursiShiftDayOptions();"
if needle not in s: raise SystemExit('final call-order anchor missing')
s=s.replace(needle,replacement,1)
for token in ['Dr Bilal C.','Dr Imran A.','Dr Rida C.','Dr Saima N.','const roster=[','groupPeriod(day,isG2)']:
  if token not in s: raise SystemExit('missing roster completion token '+token)
p.write_text(s,encoding='utf-8')
print('Applied authoritative-roster completion and off/leave filtering; UI unchanged.')
