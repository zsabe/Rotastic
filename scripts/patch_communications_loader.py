from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# This patch edits scheduling logic only. It does not change the live rota UI or export design.
# Existing weekly clinic controls/gates must remain present.
if 'id="weeklyClinicSmoking"' not in s:
    raise SystemExit('Smoking Cessation weekly clinic control missing from index.html')

# The initial automatic-population Twilight path already has a hard female filter.
# Keep/upgrade it for idempotence.
female_helper_anchor = 'function uniquePlannedAvailableForTwilight(list, scheduleDay) {'
female_helper = '''function rotasticIsFemaleTwilightDoctor(name) {
      const canonical = canonicalRotaName(name);
      if (DOCTOR_GENDER[canonical] === 'female') return true;
      const first = String(canonical || name || '').replace(/^Dr\\.?\\s+/i,'').trim().split(/\\s+/)[0].toLowerCase();
      return ['rida','taysir','tayseer','ola','oula','saba','fazila','laila','layla','leila','maya','saima','fahima'].includes(first);
    }

    '''
if 'function rotasticIsFemaleTwilightDoctor(name)' not in s:
    if female_helper_anchor not in s:
        raise SystemExit('Twilight availability helper anchor missing')
    s = s.replace(female_helper_anchor, female_helper + female_helper_anchor, 1)

s = s.replace(".filter(function(n){return n!=='Dr Mohamed M.';});", ".filter(function(n){return n!=='Dr Mohamed M.' && !rotasticIsFemaleTwilightDoctor(n);});", 2)
s = s.replace(".filter(function(n){return n!=='Dr Mohamed M.' && DOCTOR_GENDER[canonicalRotaName(n)]!=='female';});", ".filter(function(n){return n!=='Dr Mohamed M.' && !rotasticIsFemaleTwilightDoctor(n);});", 2)
s = s.replace(
    "picks.slice(0,2).forEach(function(item){\n      const shift=item.period==='AM'?day.am:day.pm;\n      if(!shift.timed1Doc) shift.timed1Doc=item.doc;\n      else shift.timed2Doc=item.doc;\n    });",
    "picks.slice(0,2).filter(function(item){return item && !rotasticIsFemaleTwilightDoctor(item.doc);}).forEach(function(item){\n      const shift=item.period==='AM'?day.am:day.pm;\n      if(!shift.timed1Doc) shift.timed1Doc=item.doc;\n      else shift.timed2Doc=item.doc;\n    });",
    1
)

# CRITICAL: enforceFinalTwilightAssignments() is the later authoritative calculation.
# It was rebuilding candidate pools after the first protected path and could reintroduce women.
old_am = "const amCandidates = plannedCandidates(amGroupNo, day).filter(function(doctor){ return !amBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
old_pm = "const pmCandidates = plannedCandidates(pmGroupNo, day).filter(function(doctor){ return !pmBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
new_am = "const amCandidates = plannedCandidates(amGroupNo, day).filter(function(doctor){ return !rotasticIsFemaleTwilightDoctor(doctor) && !amBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
new_pm = "const pmCandidates = plannedCandidates(pmGroupNo, day).filter(function(doctor){ return !rotasticIsFemaleTwilightDoctor(doctor) && !pmBlocked.has(canonicalRotaName(doctor)) && !dutyExempt(doctor, 'twilight', day); });"
if old_am in s:
    s = s.replace(old_am, new_am, 1)
elif new_am not in s:
    raise SystemExit('Final AM Twilight candidate pool anchor missing')
if old_pm in s:
    s = s.replace(old_pm, new_pm, 1)
elif new_pm not in s:
    raise SystemExit('Final PM Twilight candidate pool anchor missing')

# Persistent amendments run after the authoritative Twilight calculation. Re-run the
# authoritative calculation after amendments so stale/manual stored Twilight values
# cannot be the final generated result.
old_order = '''  applyStoredSmartRuleActions();
  enforceFinalTwilightAssignments();
  rotasticApplyPersistentScheduleAmendments();
  populateMoursiShiftDayOptions();'''
new_order = '''  applyStoredSmartRuleActions();
  enforceFinalTwilightAssignments();
  rotasticApplyPersistentScheduleAmendments();
  enforceFinalTwilightAssignments();
  populateMoursiShiftDayOptions();'''
if old_order in s:
    s = s.replace(old_order, new_order, 1)
elif new_order not in s:
    raise SystemExit('Final Twilight/amendment ordering anchor missing')

# Fail loudly unless the final authoritative pools are protected.
if new_am not in s or new_pm not in s:
    raise SystemExit('Final authoritative Twilight pools are not female-filtered')

p.write_text(s, encoding='utf-8')
print('Protected final authoritative Twilight pools and re-enforced Twilight after persistent amendments.')
