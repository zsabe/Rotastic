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

old_emergency = """shift.med=chooseRotating(male,seed,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.fed=chooseRotating(female,seed+1,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || chooseRotating(available,seed+1,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.ped=chooseRotating(available,seed+2,emergencyUsed,function(n){return n!=='Dr Abdulgafoor K.' && !dutyExempt(n,'emergency',day);}) || 'To be determined';"""
new_emergency = """shift.med=chooseRotating(male,seed,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.fed=chooseRotating(male,seed+1,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.ped=chooseRotating(male,seed+2,emergencyUsed,function(n){return n!=='Dr Abdulgafoor K.' && !dutyExempt(n,'emergency',day);}) || 'To be determined';"""
if old_emergency in s: s = s.replace(old_emergency, new_emergency, 1)
elif new_emergency not in s: raise SystemExit('Emergency assignment anchor missing')

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

# WBC cannot be assigned to anyone doing either Twilight shift on the same date.
# Apply this after the final authoritative Twilight pass so persistent amendments cannot reintroduce the clash.
wbc_guard = '''function rotasticRemoveTwilightFromWBC() {
  (currentSchedule || []).forEach(function(day) {
    const twilight = new Set();
    ['am','pm'].forEach(function(period) {
      const sh = day && day[period];
      if (!sh) return;
      [sh.timed1Doc, sh.timed2Doc].forEach(function(name) {
        if (name) twilight.add(canonicalRotaName(name));
      });
    });
    ['am','pm'].forEach(function(period) {
      const sh = day && day[period];
      if (sh && sh.wbcDoc && twilight.has(canonicalRotaName(sh.wbcDoc))) sh.wbcDoc = 'No Clinic';
    });
  });
}

'''
if 'function rotasticRemoveTwilightFromWBC()' not in s:
    anchor = 'function enforceFinalTwilightAssignments() {'
    if anchor not in s: raise SystemExit('Final Twilight function anchor missing for WBC guard')
    s = s.replace(anchor, wbc_guard + anchor, 1)

old_order = '''  applyStoredSmartRuleActions();
  enforceFinalTwilightAssignments();
  rotasticApplyPersistentScheduleAmendments();
  populateMoursiShiftDayOptions();'''
new_order = '''  applyStoredSmartRuleActions();
  enforceFinalTwilightAssignments();
  rotasticApplyPersistentScheduleAmendments();
  enforceFinalTwilightAssignments();
  rotasticRemoveTwilightFromWBC();
  populateMoursiShiftDayOptions();'''
if old_order in s: s = s.replace(old_order, new_order, 1)
else:
    current_order = '''  applyStoredSmartRuleActions();
  enforceFinalTwilightAssignments();
  rotasticApplyPersistentScheduleAmendments();
  enforceFinalTwilightAssignments();
  populateMoursiShiftDayOptions();'''
    if current_order in s: s = s.replace(current_order, new_order, 1)
    elif new_order not in s: raise SystemExit('Final Twilight/amendment ordering anchor missing')

if new_assign not in s: raise SystemExit('Female <=20 room hard block missing')
if new_emergency not in s: raise SystemExit('Male-side emergency rows not protected')
if not re.search(r"shift\.wbcDoc=chooseRotating\(wbcMaleCandidates,seed\+3,used\)\s*\|\|\s*'No Clinic';", s): raise SystemExit('WBC male-only invariant missing')
if smoking_new not in s: raise SystemExit('Smoking Cessation No Clinic invariant missing')
if new_am not in s or new_pm not in s: raise SystemExit('Final Twilight pools not protected')
if 'rotasticRemoveTwilightFromWBC();' not in s: raise SystemExit('Twilight/WBC exclusion missing')

p.write_text(s, encoding='utf-8')
print('Applied permanent rota rules including Twilight/WBC mutual exclusion.')
