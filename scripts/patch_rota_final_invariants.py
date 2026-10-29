from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Scheduling-only final invariant. UI markup/styles are intentionally untouched.
# Dr Rida is rebuilt here as one canonical physician identity rather than relying on
# legacy profile/availability state that may exist elsewhere in the monolithic app.
surface=r'''function rotasticSurfaceMissingPhysicians(){
  const RIDA='Dr Rida C.';
  const roster=['Dr Abdulgafoor K.','Dr Abdulrashid S.','Dr Aminullah Z.','Dr Bilal C.','Dr Enan M.','Dr Fahima N.','Dr Faisal C.','Dr Fazila K.','Dr Gani M.','Dr Husam S','Dr Imran A.','Dr Laila A.','Dr Laith A.','Dr Maher A.','Dr Maya S.','Dr Mohamed M.','Dr Mohammed S.','Dr Muhammad K.','Dr Oula T.',RIDA,'Dr Saba T.','Dr Saima N.','Dr Salah M.','Dr Selman E.','Dr Shadi T','Dr Syed I.','Dr Tayseer A.','Dr Zaid SE.'];
  const gani=/\\b(?:gani|ghani)\\b/i,bilal=/^Dr\\.?\\s+Bilal\\b/i,fahima=/^Dr\\.?\\s+Fahima\\b/i,rida=/^Dr\\.?\\s+Rida\\b/i;
  const female=/\\b(?:Rida|Tayseer|Taysir|Oula|Ola|Saba|Fazila|Laila|Layla|Leila|Maya|Saima|Fahima)\\b/i;
  const leaveAliases=['Dr Bilal C.','Dr Gani M.','Dr Ghani M.','Dr Gani Shafi','Dr Ghani Shafi','دكتور GANI','دكتور GHANI'];
  function canonical(doc){return rida.test(String(doc||''))?RIDA:doc;}
  function group(doc){if(rida.test(String(doc||'')))return 1;return rotasticAuthoritativeGroup(doc);}
  function unavailable(doc,day){doc=canonical(doc);if(rida.test(doc))return rotasticExplicitOff(RIDA,day);return fahima.test(doc)||bilal.test(doc)||gani.test(doc)||rotasticExplicitOff(doc,day)||rotasticDoctorUnavailable(doc,day);}
  function rotationPeriod(day,doc){
    doc=canonical(doc);const g=group(doc),iso=rotasticDayISO(day)||'',d=Number(iso.slice(-2));
    if(d>=1&&d<=3)return g===1?'am':'pm';
    if(d>=4&&d<=5)return g===2?'am':'pm';
    const score={am:0,pm:0};
    ['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;const vals=[];rotasticNormalFields().forEach(function(f){if(sh[f])vals.push(sh[f]);});if(sh.rooms)vals.push(...Object.values(sh.rooms));if(Array.isArray(sh.noRoomDocs))vals.push(...sh.noRoomDocs);vals.forEach(function(x){if(group(x)===g)score[p]++;});});
    if(score.am!==score.pm)return score.am>score.pm?'am':'pm';
    return g===2?'pm':'am';
  }
  function visible(day,doc){doc=canonical(doc);const k=rotasticDoctorKey(doc);for(const p of ['am','pm']){const sh=day&&day[p];if(!sh)continue;for(const f of rotasticNormalFields())if(rotasticDoctorKey(canonical(sh[f]))===k)return true;if(sh.rooms&&Object.values(sh.rooms).some(v=>rotasticDoctorKey(canonical(v))===k))return true;if(Array.isArray(sh.noRoomDocs)&&sh.noRoomDocs.some(v=>rotasticDoctorKey(canonical(v))===k))return true;}return false;}
  function occupied(sh,room){return !!(sh&&sh.rooms&&sh.rooms[String(room)]);}
  function purgeRida(day){
    for(const p of ['am','pm']){const sh=day&&day[p];if(!sh)continue;for(const f of rotasticNormalFields())if(rida.test(String(sh[f]||'')))sh[f]='';if(sh.rooms)for(const room of Object.keys(sh.rooms))if(rida.test(String(sh.rooms[room]||'')))delete sh.rooms[room];if(Array.isArray(sh.noRoomDocs))sh.noRoomDocs=sh.noRoomDocs.filter(x=>!rida.test(String(x||'')));}
  }
  function place(day,doc){
    doc=canonical(doc);const p=rotationPeriod(day,doc),sh=day&&day[p];if(!sh)return false;
    if(!sh.rooms)sh.rooms={};
    const rooms=female.test(String(doc||''))?['21','22','24','25','26','27','32']:['9','10','12','13','14','39','21','22','24','25','26','27'];
    for(const room of rooms){if(!occupied(sh,room)){sh.rooms[room]=doc;return true;}}
    if(!Array.isArray(sh.noRoomDocs))sh.noRoomDocs=[];
    if(!sh.noRoomDocs.some(x=>rotasticDoctorKey(canonical(x))===rotasticDoctorKey(doc)))sh.noRoomDocs.push(doc);
    return true;
  }
  function rebuildRida(day){purgeRida(day);if(!unavailable(RIDA,day))place(day,RIDA);}
  function repairEmergency(day,p){
    const sh=day&&day[p];if(!sh)return;
    const purgeField=function(f,pred){const v=sh[f];if(v&&pred(v)){const doc=canonical(v);sh[f]='';place(day,doc);}};
    ['med','maleER','erMale','emergencyMale'].forEach(f=>purgeField(f,x=>female.test(String(x||''))));
    ['fed','femaleER','erFemale','emergencyFemale'].forEach(f=>purgeField(f,x=>!female.test(String(x||''))));
    ['wbcDoc','wbc'].forEach(f=>purgeField(f,x=>x!=='No Clinic'&&female.test(String(x||''))));
    ['ancDoc','anc'].forEach(f=>purgeField(f,x=>x!=='No Clinic'&&!female.test(String(x||''))));
    ['timed1Doc','timed2Doc','nineFour1','nineFour2','twoEight1','twoEight2','twilight1','twilight2'].forEach(f=>purgeField(f,x=>female.test(String(x||''))));
  }
  (currentSchedule||[]).forEach(function(day){
    leaveAliases.forEach(doc=>rotasticPurgeDoctorEverywhere(day,doc));
    rotasticPurgeExplicitOff(day);
    purgeRida(day);
    repairEmergency(day,'am');repairEmergency(day,'pm');
    roster.forEach(function(doc){if(rida.test(String(doc||'')))return;if(unavailable(doc,day)||visible(day,doc))return;place(day,doc);});
    rebuildRida(day);
    leaveAliases.forEach(doc=>rotasticPurgeDoctorEverywhere(day,doc));
    rotasticPurgeExplicitOff(day);
    repairEmergency(day,'am');repairEmergency(day,'pm');
    if(!unavailable(RIDA,day)&&!visible(day,RIDA))rebuildRida(day);
    roster.forEach(function(doc){if(!unavailable(doc,day)&&!visible(day,doc))throw new Error('ROTASTIC missing available physician: '+canonical(doc)+' '+(rotasticDayISO(day)||''));});
  });
}'''

start=s.find('function rotasticSurfaceMissingPhysicians(){')
if start<0: raise SystemExit('surface invariant anchor missing')
end=s.find('\\nfunction ',start+1)
if end<0: raise SystemExit('surface invariant boundary missing')
s=s[:start]+surface+s[end:]

call='  rotasticAssignAllAvailablePhysicians();'
pos=s.find(call)
if pos<0: raise SystemExit('assign-all call missing')
window_end=min(len(s),pos+1400)
window=s[pos:window_end]
window=re.sub(r'\\n\\s*rotasticSurfaceMissingPhysicians\\(\\);','',window)
window=re.sub(r'\\n\\s*\\(currentSchedule\\|\\|\\[\\]\\)\\.forEach\\(rotasticPurgeExplicitOff\\);','',window)
idx=window.rfind('rotasticEnforceExclusiveShiftAssignments();')
if idx>=0: insert=idx+len('rotasticEnforceExclusiveShiftAssignments();')
else: insert=window.find('\\n')
window=window[:insert]+'\\n  rotasticSurfaceMissingPhysicians();\\n  (currentSchedule||[]).forEach(rotasticPurgeExplicitOff);'+window[insert:]
s=s[:pos]+window+s[window_end:]

for token in ["const RIDA='Dr Rida C.'","return 1","purgeRida(day)","rebuildRida(day)",'rotationPeriod(day,doc)','repairEmergency','ROTASTIC missing available physician','Dr Ghani M.']:
    if token not in s: raise SystemExit('missing invariant '+token)

p.write_text(s,encoding='utf-8')
print('Dr Rida rebuilt as one canonical active female Group 1 physician; full-roster rules retained; UI unchanged.')
