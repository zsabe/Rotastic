from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Scheduling-only source patch. Do not change the live UI or locked export design.
if 'id="weeklyClinicSmoking"' not in s:
    raise SystemExit('Smoking Cessation weekly clinic control missing from index.html')

# Shared hard gender helper. DOCTOR_GENDER has historically missed/varied some names,
# so known female first names are an invariant fallback everywhere room-side matters.
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
s = s.replace("function findMale(list){ return list.filter(function(n){return DOCTOR_GENDER[n]==='male' || !DOCTOR_GENDER[n];}); }",
              "function findMale(list){ return list.filter(function(n){return !rotasticIsFemalePhysician(n);}); }", 1)
s = s.replace("if (DOCTOR_GENDER[doctor] === 'female') return 'female';", "if (rotasticIsFemalePhysician(doctor)) return 'female';")
s = s.replace("if (DOCTOR_GENDER[doctor] === 'female') {", "if (rotasticIsFemalePhysician(doctor)) {")
s = s.replace("DOCTOR_GENDER[canonicalRotaName(n)] === 'female'", "rotasticIsFemalePhysician(n)")
s = s.replace("DOCTOR_GENDER[canonicalRotaName(n)] !== 'female'", "!rotasticIsFemalePhysician(n)")
s = s.replace("DOCTOR_GENDER[currentDoctor] === 'female'", "rotasticIsFemalePhysician(currentDoctor)")
s = s.replace("DOCTOR_GENDER[currentDoctor] !== 'female'", "!rotasticIsFemalePhysician(currentDoctor)")
s = s.replace("DOCTOR_GENDER[name] === 'female'", "rotasticIsFemalePhysician(name)")
s = s.replace("DOCTOR_GENDER[name] !== 'female'", "!rotasticIsFemalePhysician(name)")

# Rooms 20 and below are male-side. The Emergency rows 10/12/13 are therefore also
# male-side locations: never place a female physician into med/fed/ped in this layout.
old_emergency = """shift.med=chooseRotating(male,seed,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.fed=chooseRotating(female,seed+1,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || chooseRotating(available,seed+1,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.ped=chooseRotating(available,seed+2,emergencyUsed,function(n){return n!=='Dr Abdulgafoor K.' && !dutyExempt(n,'emergency',day);}) || 'To be determined';"""
new_emergency = """shift.med=chooseRotating(male,seed,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.fed=chooseRotating(male,seed+1,emergencyUsed,function(n){return !dutyExempt(n,'emergency',day);}) || 'To be determined';
      shift.ped=chooseRotating(male,seed+2,emergencyUsed,function(n){return n!=='Dr Abdulgafoor K.' && !dutyExempt(n,'emergency',day);}) || 'To be determined';"""
if old_emergency in s:
    s = s.replace(old_emergency, new_emergency, 1)
elif new_emergency not in s:
    raise SystemExit('Emergency assignment anchor missing')

# WBC is male-only with no female fallback; ANC remains female-only using the hard helper.
s = s.replace("const wbcMaleCandidates=wbcCandidates.filter(function(n){return !rotasticIsFemalePhysician(n);});\n          shift.wbcDoc=chooseRotating(wbcMaleCandidates,seed+3,used) || chooseRotating(wbcCandidates,seed+3,used) || 'No Clinic';",
              "const wbcMaleCandidates=wbcCandidates.filter(function(n){return !rotasticIsFemalePhysician(n);});\n          shift.wbcDoc=chooseRotating(wbcMaleCandidates,seed+3,used) || 'No Clinic';", 1)
s = s.replace("DOCTOR_GENDER[name] === 'female' &&\n      canonicalRotaName(name)", "rotasticIsFemalePhysician(name) &&\n      canonicalRotaName(name)", 1)

# Twilight hard rule in both the initial and final authoritative paths.
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
    if start >= 0 and end > start:
        s = s[:start] + female_helper + s[end:]

s = s.replace(".filter(function(n){return n!=='Dr Mohamed M.';});", ".filter(function(n){return n!=='Dr Mohamed M.' && !rotasticIsFemaleTwilightDoctor(n);});", 2)
s = s.replace(".filter(function(n){return n!=='Dr Mohamed M.' && DOCTOR_GENDER[canonicalRotaName(n)]!=='female';});", ".filter(function(n){return n!=='Dr Mohamed M.' && !rotasticIsFemaleTwilightDoctor(n);});", 2)
s = s.replace(
    "picks.slice(0,2).forEach(function(item){\n      const shift=item.period==='AM'?day.am:day.pm;\n      if(!shift.timed1Doc) shift.timed1Doc=item.doc;\n      else shift.timed2Doc=item.doc;\n    });",
    "picks.slice(0,2).filter(function(item,index,arr){return item && !rotasticIsFemaleTwilightDoctor(item.doc) && arr.findIndex(function(x){return x && canonicalRotaName(x.doc)===canonicalRotaName(item.doc);})===index;}).forEach(function(item){\n      const shift=item.period==='AM'?day.am:day.pm;\n      if(!shift.timed1Doc) shift.timed1Doc=item.doc;\n      else shift.timed2Doc=item.doc;\n    });", 1)

old_am = "const amCandidates = plannedCandidates(amGroupNo, day).filter(function(doctor){ return !amBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
old_pm = "const pmCandidates = plannedCandidates(pmGroupNo, day).filter(function(doctor){ return !pmBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
new_am = "const amCandidates = plannedCandidates(amGroupNo, day).filter(function(doctor){ return !rotasticIsFemaleTwilightDoctor(doctor) && !amBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
new_pm = "const pmCandidates = plannedCandidates(pmGroupNo, day).filter(function(doctor){ return !rotasticIsFemaleTwilightDoctor(doctor) && !pmBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
if old_am in s: s = s.replace(old_am, new_am, 1)
elif new_am not in s: raise SystemExit('Final AM Twilight candidate pool anchor missing')
if old_pm in s: s = s.replace(old_pm, new_pm, 1)
elif new_pm not in s: raise SystemExit('Final PM Twilight candidate pool anchor missing')

old_order = '''  applyStoredSmartRuleActions();
  enforceFinalTwilightAssignments();
  rotasticApplyPersistentScheduleAmendments();
  populateMoursiShiftDayOptions();'''
new_order = '''  applyStoredSmartRuleActions();
  enforceFinalTwilightAssignments();
  rotasticApplyPersistentScheduleAmendments();
  enforceFinalTwilightAssignments();
  populateMoursiShiftDayOptions();'''
if old_order in s: s = s.replace(old_order, new_order, 1)
elif new_order not in s: raise SystemExit('Final Twilight/amendment ordering anchor missing')

# Final source invariants: no known female can be considered male, WBC has no female fallback,
# and authoritative Twilight pools remain protected.
if new_am not in s or new_pm not in s: raise SystemExit('Final Twilight pools not protected')
if "function findMale(list){ return list.filter(function(n){return !rotasticIsFemalePhysician(n);}); }" not in s: raise SystemExit('Male pool not protected')
if "shift.wbcDoc=chooseRotating(wbcMaleCandidates,seed+3,used) || 'No Clinic';" not in s: raise SystemExit('WBC male-only invariant missing')

p.write_text(s, encoding='utf-8')
print('Enforced female-side room rule, male-only <=20 duty rows, WBC male-only, and unique female-free Twilight.')
