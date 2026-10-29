from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Scheduling-only source patch. Do not change the live UI or locked export design.
if 'id="weeklyClinicSmoking"' not in s:
    raise SystemExit('Smoking Cessation weekly clinic control missing from index.html')

room_anchor = "function findFemale(list){ return list.filter(function(n){return DOCTOR_GENDER[n]==='female';}); }"
room_helper = """function rotasticIsFemalePhysician(name) {
  const canonical = canonicalRotaName(name);
  if (DOCTOR_GENDER[canonical] === 'female') return true;
  const first = String(canonical || name || '').replace(/^Dr\\.?\\s+/i,'').trim().split(/\\s+/)[0].toLowerCase();
  return ['rida','taysir','tayseer','ola','oula','saba','fazila','laila','layla','leila','maya','saima','fahima'].includes(first);
}
function findFemale(list){ return list.filter(function(n){return rotasticIsFemalePhysician(n);}); }"""
if 'function rotasticIsFemalePhysician(name)' not in s:
    if room_anchor not in s: raise SystemExit('Gender helper anchor missing')
    s = s.replace(room_anchor, room_helper, 1)

s = s.replace("function findMale(list){ return list.filter(function(n){return DOCTOR_GENDER[n]==='male' || !DOCTOR_GENDER[n];}); }", "function findMale(list){ return list.filter(function(n){return !rotasticIsFemalePhysician(n);}); }", 1)
s = s.replace("if (DOCTOR_GENDER[doctor] === 'female') return 'female';", "if (rotasticIsFemalePhysician(doctor)) return 'female';")
s = s.replace("if (DOCTOR_GENDER[doctor] === 'female') {", "if (rotasticIsFemalePhysician(doctor)) {")
s = s.replace("DOCTOR_GENDER[canonicalRotaName(n)] === 'female'", "rotasticIsFemalePhysician(n)")
s = s.replace("DOCTOR_GENDER[canonicalRotaName(n)] !== 'female'", "!rotasticIsFemalePhysician(n)")
s = s.replace("DOCTOR_GENDER[currentDoctor] === 'female'", "rotasticIsFemalePhysician(currentDoctor)")
s = s.replace("DOCTOR_GENDER[currentDoctor] !== 'female'", "!rotasticIsFemalePhysician(currentDoctor)")
s = s.replace("DOCTOR_GENDER[name] === 'female'", "rotasticIsFemalePhysician(name)")
s = s.replace("DOCTOR_GENDER[name] !== 'female'", "!rotasticIsFemalePhysician(name)")

old_assign = "function assignIfFreeRoom(shift, room, doc, suffix){ if(!doc) return false; if(!shift.rooms) shift.rooms=blankRooms(); const v=shift.rooms[room]; if(v && v!=='-' && v!=='No Clinic') return false; shift.rooms[room]=doc+(suffix||''); return true; }"
new_assign = "function assignIfFreeRoom(shift, room, doc, suffix){ if(!doc) return false; const roomNo=Number(room); if(Number.isFinite(roomNo) && roomNo<=20 && rotasticIsFemalePhysician(doc)) return false; if(!shift.rooms) shift.rooms=blankRooms(); const v=shift.rooms[room]; if(v && v!=='-' && v!=='No Clinic') return false; shift.rooms[room]=doc+(suffix||''); return true; }"
if old_assign in s: s = s.replace(old_assign, new_assign, 1)
elif new_assign not in s: raise SystemExit('Room assignment invariant anchor missing')

# Emergency overlays: male ER male-only, female ER female-only, paeds either gender subject to existing exemptions.
old_emergency = """shift.med=chooseRotating(male,seed,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.fed=chooseRotating(female,seed+1,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || chooseRotating(available,seed+1,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.ped=chooseRotating(available,seed+2,emergencyUsed,function(n){return n!=='Dr Abdulgafoor K.' && !dutyExempt(n,'emergency',day);}) || 'To be determined';"""
correct_emergency = """shift.med=chooseRotating(male,seed,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.fed=chooseRotating(female,seed+1,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.ped=chooseRotating(available,seed+2,emergencyUsed,function(n){return n!=='Dr Abdulgafoor K.' && !dutyExempt(n,'emergency',day);}) || 'To be determined';"""
wrong_emergency = """shift.med=chooseRotating(male,seed,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.fed=chooseRotating(male,seed+1,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.ped=chooseRotating(male,seed+2,emergencyUsed,function(n){return n!=='Dr Abdulgafoor K.' && !dutyExempt(n,'emergency',day);}) || 'To be determined';"""
if wrong_emergency in s: s = s.replace(wrong_emergency, correct_emergency, 1)
elif old_emergency in s: s = s.replace(old_emergency, correct_emergency, 1)
elif correct_emergency not in s: raise SystemExit('Emergency assignment anchor missing')

s = re.sub(r"shift\.wbcDoc=chooseRotating\(wbcMaleCandidates,seed\+3,used\)\s*\|\|\s*chooseRotating\(wbcCandidates,seed\+3,used\)\s*\|\|\s*'No Clinic';", "shift.wbcDoc=chooseRotating(wbcMaleCandidates,seed+3,used) || 'No Clinic';", s, count=1)
s = s.replace("DOCTOR_GENDER[name] === 'female' &&\n      canonicalRotaName(name)", "rotasticIsFemalePhysician(name) &&\n      canonicalRotaName(name)", 1)

smoking_old = "  if (!smoker) return;\n  shift.smokingDoc = smoker;"
smoking_new = "  if (!smoker) { shift.smokingDoc = 'No Clinic'; return; }\n  shift.smokingDoc = smoker;"
if smoking_old in s: s = s.replace(smoking_old, smoking_new, 1)
elif smoking_new not in s: raise SystemExit('Smoking Cessation fallback anchor missing')

female_helper_anchor = 'function uniquePlannedAvailableForTwilight(list, scheduleDay) {'
female_helper = '''function rotasticIsFemaleTwilightDoctor(name) {
      return rotasticIsFemalePhysician(name);
    }

    '''
if 'function rotasticIsFemaleTwilightDoctor(name)' not in s:
    if female_helper_anchor not in s: raise SystemExit('Twilight availability helper anchor missing')
    s = s.replace(female_helper_anchor, female_helper + female_helper_anchor, 1)
else:
    start = s.find('function rotasticIsFemaleTwilightDoctor(name)')
    end = s.find('function uniquePlannedAvailableForTwilight', start)
    if start >= 0 and end > start: s = s[:start] + female_helper + s[end:]

s = s.replace(".filter(function(n){return n!=='Dr Mohamed M.';});", ".filter(function(n){return n!=='Dr Mohamed M.' && !rotasticIsFemaleTwilightDoctor(n);});", 2)
s = s.replace(".filter(function(n){return n!=='Dr Mohamed M.' && DOCTOR_GENDER[canonicalRotaName(n)]!=='female';});", ".filter(function(n){return n!=='Dr Mohamed M.' && !rotasticIsFemaleTwilightDoctor(n);});", 2)

old_am = "const amCandidates = plannedCandidates(amGroupNo, day).filter(function(doctor){ return !amBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
old_pm = "const pmCandidates = plannedCandidates(pmGroupNo, day).filter(function(doctor){ return !pmBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
new_am = "const amCandidates = plannedCandidates(amGroupNo, day).filter(function(doctor){ return !rotasticIsFemaleTwilightDoctor(doctor) && !amBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
new_pm = "const pmCandidates = plannedCandidates(pmGroupNo, day).filter(function(doctor){ return !rotasticIsFemaleTwilightDoctor(doctor) && !pmBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
if old_am in s: s = s.replace(old_am, new_am, 1)
elif new_am not in s: raise SystemExit('Final AM Twilight candidate pool anchor missing')
if old_pm in s: s = s.replace(old_pm, new_pm, 1)
elif new_pm not in s: raise SystemExit('Final PM Twilight candidate pool anchor missing')

# Final authoritative pass: one NORMAL assignment per physician per shift.
# Emergency and Code Blue are overlays and are deliberately not de-duplicated against normal clinics/rooms.
exclusive_guard = '''function rotasticEnforceExclusiveShiftAssignments() {
  const normalFields = ['timed1Doc','timed2Doc','wbcDoc','ancDoc','ncdDoc','wicDoc','hearingDoc','htDoc','isolationDoc','isoDoc','smokingDoc','iucdDoc','sdiDoc'];
  (currentSchedule || []).forEach(function(day) {
    ['am','pm'].forEach(function(period) {
      const sh = day && day[period];
      if (!sh) return;
      const seen = new Set();
      function key(v) { return v && /^Dr\\.?\\s+/i.test(String(v)) ? canonicalRotaName(String(v).replace(/\\s*\\([^)]*\\)\\s*$/,'')) : ''; }
      function reserve(v) { const k=key(v); if(!k) return false; if(seen.has(k)) return true; seen.add(k); return false; }

      // Twilight is a normal assignment and must be unique.
      if (reserve(sh.timed1Doc)) sh.timed1Doc='';
      if (reserve(sh.timed2Doc)) sh.timed2Doc='';

      // WBC is exclusive from every other NORMAL assignment, especially Twilight.
      const wbcKey=key(sh.wbcDoc);
      if (wbcKey && seen.has(wbcKey)) sh.wbcDoc='No Clinic';
      else if (wbcKey) seen.add(wbcKey);

      normalFields.slice(3).forEach(function(field) {
        const v=sh[field]; if(reserve(v)) sh[field]='';
      });

      if (sh.rooms && typeof sh.rooms==='object') {
        Object.keys(sh.rooms).forEach(function(room) {
          const v=sh.rooms[room], k=key(v); if(!k) return;
          if (seen.has(k)) sh.rooms[room]='-'; else seen.add(k);
        });
      }
      // sh.med / sh.fed / sh.ped are Emergency overlays and may coexist with one normal assignment.
      // day.cbAM / day.cbPM are Code Blue overlays and are likewise allowed alongside one normal assignment.
    });
  });
}

'''
start = s.find('function rotasticEnforceExclusiveShiftAssignments()')
if start >= 0:
    end = s.find('function enforceFinalTwilightAssignments() {', start)
    if end <= start: raise SystemExit('Could not replace exclusivity guard')
    s = s[:start] + exclusive_guard + s[end:]
else:
    anchor='function enforceFinalTwilightAssignments() {'
    if anchor not in s: raise SystemExit('Final Twilight function anchor missing')
    s=s.replace(anchor,exclusive_guard+anchor,1)

if 'rotasticEnforceExclusiveShiftAssignments();' not in s:
    order_anchor='  enforceFinalTwilightAssignments();\n  populateMoursiShiftDayOptions();'
    if order_anchor in s: s=s.replace(order_anchor,'  enforceFinalTwilightAssignments();\n  rotasticEnforceExclusiveShiftAssignments();\n  populateMoursiShiftDayOptions();',1)
    else: raise SystemExit('Final exclusivity call anchor missing')

if new_assign not in s: raise SystemExit('Female <=20 room hard block missing')
if correct_emergency not in s: raise SystemExit('Gender-correct Emergency overlays missing')
if not re.search(r"shift\.wbcDoc=chooseRotating\(wbcMaleCandidates,seed\+3,used\)\s*\|\|\s*'No Clinic';", s): raise SystemExit('WBC male-only invariant missing')
if smoking_new not in s: raise SystemExit('Smoking Cessation No Clinic invariant missing')
if new_am not in s or new_pm not in s: raise SystemExit('Final Twilight pools not protected')
if 'rotasticEnforceExclusiveShiftAssignments();' not in s: raise SystemExit('Final shift exclusivity invariant missing')

p.write_text(s, encoding='utf-8')
print('Applied normal-duty exclusivity with Emergency and Code Blue overlays preserved.')
