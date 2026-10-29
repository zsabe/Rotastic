from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# This patch deliberately edits the real Generate panel and the real generator source.
# It does not change the rota/export design.

# 1) Put the weekly clinic controls directly in the Generate panel, immediately
#    above the existing Generate Schedule button. Defaults are all enabled.
if 'id="rotasticWeeklyClinicControls"' not in s:
    needle = '''<div class="flex items-end">
<button class="w-full px-3.5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition" onclick="generateDutyScheduleFromPlanner()" type="button">'''
    controls = '''<div id="rotasticWeeklyClinicControls" class="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
<div class="text-[10px] uppercase tracking-wider font-bold text-slate-300 mb-2">Clinics running this week</div>
<div class="grid grid-cols-2 gap-2">
<label class="flex items-center gap-2 text-xs text-slate-300"><input id="weeklyClinicANC" type="checkbox" checked class="accent-teal-500"><span>ANC</span></label>
<label class="flex items-center gap-2 text-xs text-slate-300"><input id="weeklyClinicWBC" type="checkbox" checked class="accent-teal-500"><span>Well Baby Clinic</span></label>
<label class="flex items-center gap-2 text-xs text-slate-300"><input id="weeklyClinicIUD" type="checkbox" checked class="accent-teal-500"><span>IUD / IUCD</span></label>
<label class="flex items-center gap-2 text-xs text-slate-300"><input id="weeklyClinicNCD" type="checkbox" checked class="accent-teal-500"><span>NCD</span></label>
</div>
</div>
<div class="flex items-end">
<button class="w-full px-3.5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition" onclick="generateDutyScheduleFromPlanner()" type="button">'''
    if needle not in s:
        raise SystemExit('Generate Schedule button anchor missing')
    s = s.replace(needle, controls, 1)

# 2) Source-of-truth helper read directly by generation. If a checkbox is absent
#    (e.g. older embedded template), default to enabled rather than closing clinics.
helper_anchor = 'function rotasticAssignMondaySpecialClinics(day, period, available, shift, used) {'
helper = '''function rotasticWeeklyClinicEnabled(id) {
  const map = {anc:'weeklyClinicANC', wbc:'weeklyClinicWBC', iud:'weeklyClinicIUD', ncd:'weeklyClinicNCD'};
  const el = document.getElementById(map[id]);
  return !el || !!el.checked;
}

'''
if 'function rotasticWeeklyClinicEnabled(id)' not in s:
    if helper_anchor not in s:
        raise SystemExit('Monday special clinic generator anchor missing')
    s = s.replace(helper_anchor, helper + helper_anchor, 1)

# 3) IUCD: do not consume Dr Oula when IUCD is disabled.
s = s.replace(
    "if (period === plan.iucdPeriod && available.indexOf('Dr Oula T.') !== -1 && !doctorIsOnLeaveForDay('Dr Oula T.', day)) {",
    "if (rotasticWeeklyClinicEnabled('iud') && period === plan.iucdPeriod && available.indexOf('Dr Oula T.') !== -1 && !doctorIsOnLeaveForDay('Dr Oula T.', day)) {",
    1
)

# 4) ANC / WBC / NCD: close them before candidate assignment so no physician is
#    consumed by a clinic that is not running.
s = s.replace(
    'if(clinic.wbc){',
    "if(clinic.wbc && rotasticWeeklyClinicEnabled('wbc')){",
    1
)
s = s.replace(
    "if(clinic.anc) shift.ancDoc=pickANCDoctor(day,available,used,weekIdx+dayIndex+(period==='PM'?1:0)) || 'No Clinic';",
    "if(clinic.anc) shift.ancDoc=rotasticWeeklyClinicEnabled('anc') ? (pickANCDoctor(day,available,used,weekIdx+dayIndex+(period==='PM'?1:0)) || 'No Clinic') : 'No Clinic';",
    1
)
s = s.replace(
    "if(clinic.ncd) shift.ncdDoc=chooseRotating(available,seed+4,used) || 'No Clinic';",
    "if(clinic.ncd) shift.ncdDoc=rotasticWeeklyClinicEnabled('ncd') ? (chooseRotating(available,seed+4,used) || 'No Clinic') : 'No Clinic';",
    1
)
# WBC must explicitly display No Clinic when the clinic pattern says WBC but it is disabled.
wbc_tail = "      }\n      if(clinic.anc) shift.ancDoc="
if "if(clinic.wbc && !rotasticWeeklyClinicEnabled('wbc')) shift.wbcDoc='No Clinic';" not in s:
    if wbc_tail not in s:
        raise SystemExit('WBC/ANC generator boundary missing')
    s = s.replace(wbc_tail, "      }\n      if(clinic.wbc && !rotasticWeeklyClinicEnabled('wbc')) shift.wbcDoc='No Clinic';\n      if(clinic.anc) shift.ancDoc=", 1)

# IUCD must explicitly display No Clinic in its scheduled period when disabled.
iud_plan = "  const plan = getWeeklySpecialClinicPlan(day.isoDate);\n\n  if (rotasticWeeklyClinicEnabled('iud')"
if "shift.iucdDoc = 'No Clinic';" not in s:
    if iud_plan not in s:
        raise SystemExit('IUCD plan anchor missing after gating')
    s = s.replace(
        iud_plan,
        "  const plan = getWeeklySpecialClinicPlan(day.isoDate);\n\n  if (!rotasticWeeklyClinicEnabled('iud') && period === plan.iucdPeriod) shift.iucdDoc = 'No Clinic';\n\n  if (rotasticWeeklyClinicEnabled('iud')",
        1
    )

# 5) Permanent Twilight rule in the ACTUAL generator candidate pool: females are
#    excluded before rotatingPick is ever called. This prevents assignment rather
#    than cleaning it up after generation.
s = s.replace(
    ".filter(function(n){return n!=='Dr Mohamed M.';});\n    const pmPlanned=uniquePlannedAvailableForTwilight(pmGroupNo===1?rules.group1:rules.group2,day)\n      .filter(function(n){return n!=='Dr Mohamed M.';});",
    ".filter(function(n){return n!=='Dr Mohamed M.' && DOCTOR_GENDER[canonicalRotaName(n)]!=='female';});\n    const pmPlanned=uniquePlannedAvailableForTwilight(pmGroupNo===1?rules.group1:rules.group2,day)\n      .filter(function(n){return n!=='Dr Mohamed M.' && DOCTOR_GENDER[canonicalRotaName(n)]!=='female';});",
    1
)

# 6) Bust the only loader that index.html actually references. Previous fixes changed
#    rotastic-communications.js but left index pinned to ?v=7, so phones could keep
#    executing the cached old loader.
s = s.replace('./rotastic-communications.js?v=7', './rotastic-communications.js?v=8')

p.write_text(s, encoding='utf-8')
print('Patched real Generate panel, generator clinic gates, female Twilight pool, and loader version.')
