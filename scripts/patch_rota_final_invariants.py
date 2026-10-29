from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Scheduling-only final invariant. UI markup/styles are intentionally untouched.
surface=r'''function rotasticSurfaceMissingPhysicians(){
  const roster=['Dr Abdulgafoor K.','Dr Abdulrashid S.','Dr Aminullah Z.','Dr Bilal C.','Dr Enan M.','Dr Fahima N.','Dr Faisal C.','Dr Fazila K.','Dr Gani M.','Dr Husam S','Dr Imran A.','Dr Laila A.','Dr Laith A.','Dr Maher A.','Dr Maya S.','Dr Mohamed M.','Dr Mohammed S.','Dr Muhammad K.','Dr Oula T.','Dr Rida C.','Dr Saba T.','Dr Saima N.','Dr Salah M.','Dr Selman E.','Dr Shadi T','Dr Syed I.','Dr Tayseer A.','Dr Zaid SE.'];
  const gani=/\b(?:gani|ghani)\b/i,bilal=/^Dr\.?\s+Bilal\b/i,fahima=/^Dr\.?\s+Fahima\b/i;
  const female=/\b(?:Rida|Tayseer|Taysir|Oula|Ola|Saba|Fazila|Laila|Layla|Leila|Maya|Saima|Fahima)\b/i;
  const leaveAliases=['Dr Bilal C.','Dr Gani M.','Dr Ghani M.','Dr Gani Shafi','Dr Ghani Shafi','دكتور GANI','دكتور GHANI'];
  function unavailable(doc,day){return fahima.test(doc)||bilal.test(doc)||gani.test(doc)||rotasticExplicitOff(doc,day)||rotasticDoctorUnavailable(doc,day);}
  function rotationPeriod(day,doc){
    const group=rotasticAuthoritativeGroup(doc),iso=rotasticDayISO(day)||'',d=Number(iso.slice(-2));
    if(d>=1&&d<=3)return group===1?'am':'pm';
    if(d>=4&&d<=5)return group===2?'am':'pm';
    const score={am:0,pm:0};
    ['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;const vals=[];rotasticNormalFields().forEach(function(f){if(sh[f])vals.push(sh[f]);});if(sh.rooms)vals.push(...Object.values(sh.rooms));if(Array.isArray(sh.noRoomDocs))vals.push(...sh.noRoomDocs);vals.forEach(function(x){if(rotasticAuthoritativeGroup(x)===group)score[p]++;});});
    if(score.am!==score.pm)return score.am>score.pm?'am':'pm';
    return group===2?'pm':'am';
  }
  function visible(day,doc){const k=rotasticDoctorKey(doc);for(const p of ['am','pm']){const sh=day&&day[p];if(!sh)continue;for(const f of rotasticNormalFields())if(rotasticDoctorKey(sh[f])===k)return true;if(sh.rooms&&Object.values(sh.rooms).some(v=>rotasticDoctorKey(v)===k))return true;if(Array.isArray(sh.noRoomDocs)&&sh.noRoomDocs.some(v=>rotasticDoctorKey(v)===k))return true;}return false;}
  function occupied(sh,room){return !!(sh&&sh.rooms&&sh.rooms[String(room)]);}
  function place(day,doc){
    const p=rotationPeriod(day,doc),sh=day&&day[p];if(!sh)return false;
    if(!sh.rooms)sh.rooms={};
    const rooms=female.test(String(doc||''))?['21','22','24','25','26','27','32']:['9','10','12','13','14','39','21','22','24','25','26','27'];
    for(const room of rooms){if(!occupied(sh,room)){sh.rooms[room]=doc;return true;}}
    if(!Array.isArray(sh.noRoomDocs))sh.noRoomDocs=[];
    if(!sh.noRoomDocs.some(x=>rotasticDoctorKey(x)===rotasticDoctorKey(doc)))sh.noRoomDocs.push(doc);
    return true;
  }
  function repairEmergency(day,p){
    const sh=day&&day[p];if(!sh)return;
    const purgeField=function(f,pred){const v=sh[f];if(v&&pred(v)){const doc=v;sh[f]='';place(day,doc);}};
    ['med','maleER','erMale','emergencyMale'].forEach(f=>purgeField(f,x=>female.test(String(x||''))));
    ['fed','femaleER','erFemale','emergencyFemale'].forEach(f=>purgeField(f,x=>!female.test(String(x||''))));
    ['wbcDoc','wbc'].forEach(f=>purgeField(f,x=>x!=='No Clinic'&&female.test(String(x||''))));
    ['ancDoc','anc'].forEach(f=>purgeField(f,x=>x!=='No Clinic'&&!female.test(String(x||''))));
    ['timed1Doc','timed2Doc','nineFour1','nineFour2','twoEight1','twoEight2','twilight1','twilight2'].forEach(f=>purgeField(f,x=>female.test(String(x||''))));
  }
  (currentSchedule||[]).forEach(function(day){
    leaveAliases.forEach(doc=>rotasticPurgeDoctorEverywhere(day,doc));
    rotasticPurgeExplicitOff(day);
    repairEmergency(day,'am');repairEmergency(day,'pm');
    roster.forEach(function(doc){if(unavailable(doc,day)||visible(day,doc))return;place(day,doc);});
    leaveAliases.forEach(doc=>rotasticPurgeDoctorEverywhere(day,doc));
    rotasticPurgeExplicitOff(day);
    repairEmergency(day,'am');repairEmergency(day,'pm');
    roster.forEach(function(doc){if(!unavailable(doc,day)&&!visible(day,doc))throw new Error('ROTASTIC missing available physician: '+doc+' '+(rotasticDayISO(day)||''));});
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
window_end=min(len(s),pos+1400)
window=s[pos:window_end]
window=re.sub(r'\n\s*rotasticSurfaceMissingPhysicians\(\);','',window)
window=re.sub(r'\n\s*\(currentSchedule\|\|\[\]\)\.forEach\(rotasticPurgeExplicitOff\);','',window)
idx=window.rfind('rotasticEnforceExclusiveShiftAssignments();')
if idx>=0: insert=idx+len('rotasticEnforceExclusiveShiftAssignments();')
else: insert=window.find('\n')
window=window[:insert]+'\n  rotasticSurfaceMissingPhysicians();\n  (currentSchedule||[]).forEach(rotasticPurgeExplicitOff);'+window[insert:]
s=s[:pos]+window+s[window_end:]

for token in ['Dr Rida C.','female.test','rotationPeriod(day,doc)','repairEmergency','ROTASTIC missing available physician','Dr Ghani M.']:
    if token not in s: raise SystemExit('missing invariant '+token)

p.write_text(s,encoding='utf-8')
print('Full-roster availability, group rotation, gender clinic/twilight rules and leave exclusions enforced; UI unchanged.')
