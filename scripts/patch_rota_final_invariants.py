from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Scheduling-only hotfix. UI markup/styles are intentionally untouched.
start=s.find('function rotasticAssignAllAvailablePhysicians(){')
end=s.find('\n}\n\nfunction enforceFinalTwilightAssignments() {',start)
if start<0 or end<0: raise SystemExit('assign-all invariant anchor missing')
end += 2

block=r'''function rotasticDayISO(day){
  const raw=day&&(day.isoDate||day.date||day.dayDate||day.dateStr||day.dateString);
  if(!raw)return '';
  const x=String(raw),m=x.match(/(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];
  const q=x.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);if(q)return q[3]+'-'+String(q[2]).padStart(2,'0')+'-'+String(q[1]).padStart(2,'0');
  const d=new Date(raw);return isNaN(d.getTime())?'':d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function rotasticExplicitOff(doc,day){
  const iso=rotasticDayISO(day),k=rotasticDoctorKey(doc);if(!iso||!k)return false;
  if(iso>='2026-11-01'&&iso<='2026-11-05'&&rotasticIsGaniName(doc))return true;
  if((iso==='2026-11-01'||iso==='2026-11-02')&&/^Dr\.?\s+Shadi\b/i.test(doc))return true;
  if(iso>='2026-11-03'&&iso<='2026-11-05'&&/^Dr\.?\s+Imran\b/i.test(doc))return true;
  if((iso==='2026-11-04'||iso==='2026-11-05')&&/^Dr\.?\s+(?:Mohammed\s+S|Muhammad\s+Sayed|Mohamed\s+Sayed)\b/i.test(doc))return true;
  return false;
}
function rotasticPurgeDoctorEverywhere(day,doc){
  const k=rotasticDoctorKey(doc);if(!day||!k)return;
  ['am','pm'].forEach(function(p){const sh=day[p];if(!sh)return;rotasticClearNormalDoctor(sh,k,false);Object.keys(sh).forEach(function(f){if(typeof sh[f]==='string'&&rotasticDoctorKey(sh[f])===k)sh[f]='';});if(sh.rooms)Object.keys(sh.rooms).forEach(function(r){if(rotasticDoctorKey(sh.rooms[r])===k)sh.rooms[r]='-';});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs=sh.noRoomDocs.filter(function(v){return rotasticDoctorKey(v)!==k;});});
  ['cbAM','cbPM'].forEach(function(c){const x=day[c];if(!x)return;Object.keys(x).forEach(function(f){if(rotasticDoctorKey(x[f])===k)x[f]='';});});
  if(day.codeBlue)Object.keys(day.codeBlue).forEach(function(p){const x=day.codeBlue[p];if(x&&typeof x==='object')Object.keys(x).forEach(function(f){if(rotasticDoctorKey(x[f])===k)x[f]='';});});
}
function rotasticPurgeExplicitOff(day){
  ['Dr Gani M.','Dr Shadi T','Dr Imran A.','Dr Mohammed S.'].forEach(function(doc){if(rotasticExplicitOff(doc,day))rotasticPurgeDoctorEverywhere(day,doc);});
}
function rotasticAssignAllAvailablePhysicians(){
  const roster=['Dr Abdulgafoor K.','Dr Abdulrashid S.','Dr Aminullah Z.','Dr Bilal C.','Dr Enan M.','Dr Fahima N.','Dr Faisal C.','Dr Fazila K.','Dr Gani M.','Dr Husam S','Dr Imran A.','Dr Laila A.','Dr Laith A.','Dr Maher A.','Dr Maya S.','Dr Mohamed M.','Dr Mohammed S.','Dr Muhammad K.','Dr Oula T.','Dr Rida C.','Dr Saba T.','Dr Saima N.','Dr Salah M.','Dr Selman E.','Dr Shadi T','Dr Syed I.','Dr Tayseer A.','Dr Zaid SE.'];
  const group2=new Set(['Dr Husam S','Dr Maher A.','Dr Zaid SE.','Dr Selman E.','Dr Syed I.','Dr Abdulrashid S.','Dr Oula T.','Dr Tayseer A.','Dr Saba T.','Dr Bilal C.','Dr Laith A.','Dr Gani M.'].map(rotasticDoctorKey));
  const fahima=/^Dr\.?\s+Fahima\b/i;
  function existing(day){const out=new Set();['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;rotasticNormalFields().forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(k)out.add(k);});if(sh.rooms)Object.values(sh.rooms).forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.add(k);});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs.forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.add(k);});});return out;}
  function periodKeys(day,p){const out=[];const sh=day&&day[p];if(!sh)return out;rotasticNormalFields().forEach(function(f){const k=rotasticDoctorKey(sh[f]);if(k)out.push(k);});if(sh.rooms)Object.values(sh.rooms).forEach(function(v){const k=rotasticDoctorKey(v);if(k)out.push(k);});return out;}
  function groupPeriod(day,isG2){const score=function(p){return periodKeys(day,p).filter(function(k){return group2.has(k)===isG2;}).length;};const a=score('am'),b=score('pm');if(a!==b)return b>a?'pm':'am';return isG2?'pm':'am';}
  function place(day,p,doc,used){const sh=day&&day[p];if(!sh)return false;const k=rotasticDoctorKey(doc),rooms=rotasticIsFemalePhysician(doc)?['21','22','24','25','26','27','39']:['21','22','24','25','26','27','14','13','12','10','9','39'];for(const r of rooms){if(assignIfFreeRoom(sh,r,doc,'')){used.add(k);return true;}}if(!sh.noRoomDocs)sh.noRoomDocs=[];if(!sh.noRoomDocs.some(function(x){return rotasticDoctorKey(x)===k;}))sh.noRoomDocs.push(doc);used.add(k);return true;}
  (currentSchedule||[]).forEach(function(day){rotasticPurgeExplicitOff(day);const used=existing(day),g1=groupPeriod(day,false),g2p=groupPeriod(day,true);roster.forEach(function(doc){const k=rotasticDoctorKey(doc);if(!k||fahima.test(doc)||used.has(k)||rotasticExplicitOff(doc,day)||rotasticDoctorUnavailable(doc,day))return;place(day,group2.has(k)?g2p:g1,doc,used);});rotasticPurgeExplicitOff(day);});
}
function rotasticSurfaceMissingPhysicians(){
  const targets=['Dr Bilal C.','Dr Rida C.','Dr Saima N.','Dr Imran A.'];
  function visible(doc){const k=rotasticDoctorKey(doc);let n=0;(currentSchedule||[]).forEach(function(day){['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;rotasticNormalFields().forEach(function(f){if(rotasticDoctorKey(sh[f])===k)n++;});if(sh.rooms)Object.values(sh.rooms).forEach(function(v){if(rotasticDoctorKey(v)===k)n++;});});});return n;}
  targets.forEach(function(doc){if(visible(doc)>0)return;const k=rotasticDoctorKey(doc);for(const day of (currentSchedule||[])){if(rotasticExplicitOff(doc,day)||rotasticDoctorUnavailable(doc,day))continue;for(const p of ['am','pm']){const sh=day&&day[p];if(!sh||!Array.isArray(sh.noRoomDocs)||!sh.noRoomDocs.some(function(x){return rotasticDoctorKey(x)===k;}))continue;const rooms=rotasticIsFemalePhysician(doc)?['21','22','24','25','26','27','39']:['21','22','24','25','26','27','14','13','12','10','9','39'];for(const r of rooms){const displaced=sh.rooms&&sh.rooms[r];if(!rotasticDoctorKey(displaced))continue;if(visible(displaced)<2)continue;sh.rooms[r]=doc;sh.noRoomDocs=sh.noRoomDocs.filter(function(x){return rotasticDoctorKey(x)!==k;});sh.noRoomDocs.push(displaced);return;}}}});
}
'''
s=s[:start]+block+s[end:]

needle="  rotasticAssignAllAvailablePhysicians();\n  rotasticEnforceExclusiveShiftAssignments();\n  (currentSchedule||[]).forEach(rotasticPurgeUnavailableGani);\n  populateMoursiShiftDayOptions();"
replacement="  rotasticAssignAllAvailablePhysicians();\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticSurfaceMissingPhysicians();\n  (currentSchedule||[]).forEach(rotasticPurgeExplicitOff);\n  (currentSchedule||[]).forEach(rotasticPurgeUnavailableGani);\n  populateMoursiShiftDayOptions();"
if needle not in s: raise SystemExit('final call-order anchor missing')
s=s.replace(needle,replacement,1)
for token in ['rotasticExplicitOff','rotasticPurgeExplicitOff','rotasticSurfaceMissingPhysicians','Dr Bilal C.','Dr Rida C.','Dr Saima N.','Dr Imran A.']:
  if token not in s: raise SystemExit('missing invariant '+token)
p.write_text(s,encoding='utf-8')
print('Applied explicit November OFF purge and weekly visibility repair; UI unchanged.')
