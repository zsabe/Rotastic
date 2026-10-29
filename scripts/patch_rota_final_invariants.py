from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Scheduling-only hotfix. UI markup/styles are intentionally untouched.
roster=['Dr Abdulgafoor K.','Dr Abdulrashid S.','Dr Aminullah Z.','Dr Bilal C.','Dr Enan M.','Dr Fahima N.','Dr Faisal C.','Dr Fazila K.','Dr Gani M.','Dr Husam S','Dr Imran A.','Dr Laila A.','Dr Laith A.','Dr Maher A.','Dr Maya S.','Dr Mohamed M.','Dr Mohammed S.','Dr Muhammad K.','Dr Oula T.','Dr Rida C.','Dr Saba T.','Dr Saima N.','Dr Salah M.','Dr Selman E.','Dr Shadi T','Dr Syed I.','Dr Tayseer A.','Dr Zaid SE.']

surface=r'''function rotasticSurfaceMissingPhysicians(){
  const roster=['Dr Abdulgafoor K.','Dr Abdulrashid S.','Dr Aminullah Z.','Dr Bilal C.','Dr Enan M.','Dr Fahima N.','Dr Faisal C.','Dr Fazila K.','Dr Gani M.','Dr Husam S','Dr Imran A.','Dr Laila A.','Dr Laith A.','Dr Maher A.','Dr Maya S.','Dr Mohamed M.','Dr Mohammed S.','Dr Muhammad K.','Dr Oula T.','Dr Rida C.','Dr Saba T.','Dr Saima N.','Dr Salah M.','Dr Selman E.','Dr Shadi T','Dr Syed I.','Dr Tayseer A.','Dr Zaid SE.'];
  const fahima=/^Dr\.?\s+Fahima\b/i;
  const gani=/\b(?:gani|ghani)\b/i;
  const bilal=/^Dr\.?\s+Bilal\b/i;
  function weeklyLeave(doc){return gani.test(String(doc||''))||bilal.test(String(doc||''));}
  function visibleOnDay(day,doc){const k=rotasticDoctorKey(doc);let n=0;['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;rotasticNormalFields().forEach(function(f){if(rotasticDoctorKey(sh[f])===k)n++;});if(sh.rooms)Object.values(sh.rooms).forEach(function(v){if(rotasticDoctorKey(v)===k)n++;});if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs.forEach(function(v){if(rotasticDoctorKey(v)===k)n++;});});return n;}
  (currentSchedule||[]).forEach(function(day){
    /* Bilal and every Gani/Ghani/Shafi alias are on leave for this whole week. */
    ['Dr Bilal C.','Dr Gani M.','Dr Gani Shafi','Dr Ghani Shafi','دكتور GANI','دكتور GHANI'].forEach(function(doc){rotasticPurgeDoctorEverywhere(day,doc);});
    roster.forEach(function(doc){
      if(fahima.test(doc)||weeklyLeave(doc)||rotasticExplicitOff(doc,day)||rotasticDoctorUnavailable(doc,day))return;
      if(visibleOnDay(day,doc)>0)return;
      const k=rotasticDoctorKey(doc),g2=rotasticAuthoritativeGroup(doc)===2;
      const p=g2?'pm':'am',sh=day&&day[p];if(!sh)return;
      const rooms=rotasticIsFemalePhysician(doc)?['21','22','24','25','26','27','39']:['21','22','24','25','26','27','14','13','12','10','9','39'];
      for(const r of rooms){if(assignIfFreeRoom(sh,r,doc,''))return;}
      if(!sh.noRoomDocs)sh.noRoomDocs=[];
      if(!sh.noRoomDocs.some(function(x){return rotasticDoctorKey(x)===k;}))sh.noRoomDocs.push(doc);
    });
    ['Dr Bilal C.','Dr Gani M.','Dr Gani Shafi','Dr Ghani Shafi','دكتور GANI','دكتور GHANI'].forEach(function(doc){rotasticPurgeDoctorEverywhere(day,doc);});
    rotasticPurgeExplicitOff(day);
  });
}'''

start=s.find('function rotasticSurfaceMissingPhysicians(){')
if start<0: raise SystemExit('surface invariant anchor missing')
end=s.find('\nfunction ',start+1)
if end<0: raise SystemExit('surface invariant boundary missing')
s=s[:start]+surface+s[end:]

call='  rotasticAssignAllAvailablePhysicians();'
pos=s.find(call)
if pos<0: raise SystemExit('assign-all call missing')
window=s[pos:pos+900]
if 'rotasticSurfaceMissingPhysicians();' not in window:
    line_end=s.find('\n',pos)
    s=s[:line_end]+'\n  rotasticEnforceExclusiveShiftAssignments();\n  rotasticSurfaceMissingPhysicians();\n  (currentSchedule||[]).forEach(rotasticPurgeExplicitOff);'+s[line_end:]

for token in ['rotasticSurfaceMissingPhysicians','Dr Husam S','Dr Rida C.','Dr Imran A.','Dr Gani Shafi','Dr Ghani Shafi','weeklyLeave(doc)']:
    if token not in s: raise SystemExit('missing invariant '+token)

p.write_text(s,encoding='utf-8')
print('Enforced weekly Bilal/Gani-Ghani leave and day-by-day coverage for every other available physician; UI unchanged.')
