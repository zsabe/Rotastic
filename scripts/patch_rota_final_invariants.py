from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Scheduling-only final invariant. UI markup/styles are intentionally untouched.
# This pass is deliberately last: it purges unavailable doctors, then guarantees
# every available roster physician has a normal assignment on the correct group shift.
surface=r'''function rotasticSurfaceMissingPhysicians(){
  const roster=['Dr Abdulgafoor K.','Dr Abdulrashid S.','Dr Aminullah Z.','Dr Bilal C.','Dr Enan M.','Dr Fahima N.','Dr Faisal C.','Dr Fazila K.','Dr Gani M.','Dr Husam S','Dr Imran A.','Dr Laila A.','Dr Laith A.','Dr Maher A.','Dr Maya S.','Dr Mohamed M.','Dr Mohammed S.','Dr Muhammad K.','Dr Oula T.','Dr Rida C.','Dr Saba T.','Dr Saima N.','Dr Salah M.','Dr Selman E.','Dr Shadi T','Dr Syed I.','Dr Tayseer A.','Dr Zaid SE.'];
  const gani=/\b(?:gani|ghani)\b/i,bilal=/^Dr\.?\s+Bilal\b/i,fahima=/^Dr\.?\s+Fahima\b/i;
  const leaveAliases=['Dr Bilal C.','Dr Gani M.','Dr Ghani M.','Dr Gani Shafi','Dr Ghani Shafi','دكتور GANI','دكتور GHANI'];
  function unavailable(doc,day){return fahima.test(doc)||bilal.test(doc)||gani.test(doc)||rotasticExplicitOff(doc,day)||rotasticDoctorUnavailable(doc,day);}
  function groupPeriod(day,doc){
    const want=rotasticAuthoritativeGroup(doc),score={am:0,pm:0};
    ['am','pm'].forEach(function(p){const sh=day&&day[p];if(!sh)return;const vals=[];rotasticNormalFields().forEach(function(f){if(sh[f])vals.push(sh[f]);});if(sh.rooms)vals.push(...Object.values(sh.rooms));if(Array.isArray(sh.noRoomDocs))vals.push(...sh.noRoomDocs);vals.forEach(function(x){if(rotasticAuthoritativeGroup(x)===want)score[p]++;});});
    if(score.am!==score.pm)return score.am>score.pm?'am':'pm';
    return want===2?'pm':'am';
  }
  function visible(day,doc){const k=rotasticDoctorKey(doc);for(const p of ['am','pm']){const sh=day&&day[p];if(!sh)continue;for(const f of rotasticNormalFields())if(rotasticDoctorKey(sh[f])===k)return true;if(sh.rooms&&Object.values(sh.rooms).some(v=>rotasticDoctorKey(v)===k))return true;if(Array.isArray(sh.noRoomDocs)&&sh.noRoomDocs.some(v=>rotasticDoctorKey(v)===k))return true;}return false;}
  (currentSchedule||[]).forEach(function(day){
    leaveAliases.forEach(doc=>rotasticPurgeDoctorEverywhere(day,doc));
    rotasticPurgeExplicitOff(day);
    roster.forEach(function(doc){
      if(unavailable(doc,day)||visible(day,doc))return;
      const p=groupPeriod(day,doc),sh=day&&day[p];if(!sh)return;
      const k=rotasticDoctorKey(doc);
      /* noRoomDocs is an actual generated normal assignment and the export prioritizes it. */
      if(!Array.isArray(sh.noRoomDocs))sh.noRoomDocs=[];
      if(!sh.noRoomDocs.some(x=>rotasticDoctorKey(x)===k))sh.noRoomDocs.push(doc);
    });
    leaveAliases.forEach(doc=>rotasticPurgeDoctorEverywhere(day,doc));
    rotasticPurgeExplicitOff(day);
    /* Hard assertion: never silently publish a day missing an available physician. */
    roster.forEach(function(doc){if(!unavailable(doc,day)&&!visible(day,doc))throw new Error('ROTASTIC missing available physician: '+doc+' '+(rotasticDayISO(day)||''));});
  });
}'''

start=s.find('function rotasticSurfaceMissingPhysicians(){')
if start<0: raise SystemExit('surface invariant anchor missing')
end=s.find('\nfunction ',start+1)
if end<0: raise SystemExit('surface invariant boundary missing')
s=s[:start]+surface+s[end:]

# Force the final pass after exclusivity/repair work. Remove duplicate nearby calls first.
call='  rotasticAssignAllAvailablePhysicians();'
pos=s.find(call)
if pos<0: raise SystemExit('assign-all call missing')
window_end=min(len(s),pos+1400)
window=s[pos:window_end]
window=re.sub(r'\n\s*rotasticSurfaceMissingPhysicians\(\);','',window)
window=re.sub(r'\n\s*\(currentSchedule\|\|\[\]\)\.forEach\(rotasticPurgeExplicitOff\);','',window)
# Put validation after the last exclusivity call in this generator window.
idx=window.rfind('rotasticEnforceExclusiveShiftAssignments();')
if idx>=0:
    insert=idx+len('rotasticEnforceExclusiveShiftAssignments();')
else:
    insert=window.find('\n')
window=window[:insert]+'\n  rotasticSurfaceMissingPhysicians();\n  (currentSchedule||[]).forEach(rotasticPurgeExplicitOff);'+window[insert:]
s=s[:pos]+window+s[window_end:]

for token in ['Dr Laila A.','Dr Rida C.','groupPeriod(day,doc)','ROTASTIC missing available physician','Dr Ghani M.']:
    if token not in s: raise SystemExit('missing invariant '+token)

p.write_text(s,encoding='utf-8')
print('Final generator invariant guarantees every available physician on the actual group shift and purges Bilal/Gani-Ghani leave; UI unchanged.')
