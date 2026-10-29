from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# This patch deliberately edits the real Generate panel and the real generator source.
# It does not change the rota/export design.

# Existing weekly clinic controls and generator gates are already applied in index.html.
# Keep this patch idempotent and enforce the permanent Twilight restriction at the
# actual source-of-truth candidate pool every time the workflow runs.

# Hard rule: a female physician is never eligible for any Twilight assignment.
# Use a name-based fallback as well as DOCTOR_GENDER so custom/stale gender metadata
# cannot allow a known female physician into 9-4 / 2-8.
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

# Upgrade both old and already-gender-filtered candidate expressions to the hard helper.
s = s.replace(".filter(function(n){return n!=='Dr Mohamed M.';});", ".filter(function(n){return n!=='Dr Mohamed M.' && !rotasticIsFemaleTwilightDoctor(n);});", 2)
s = s.replace(".filter(function(n){return n!=='Dr Mohamed M.' && DOCTOR_GENDER[canonicalRotaName(n)]!=='female';});", ".filter(function(n){return n!=='Dr Mohamed M.' && !rotasticIsFemaleTwilightDoctor(n);});", 2)

# Final generation-time invariant: even if a future candidate path changes, reject
# a female pick before writing timed1Doc/timed2Doc. This is not post-render cleanup.
s = s.replace(
    "picks.slice(0,2).forEach(function(item){\n      const shift=item.period==='AM'?day.am:day.pm;\n      if(!shift.timed1Doc) shift.timed1Doc=item.doc;\n      else shift.timed2Doc=item.doc;\n    });",
    "picks.slice(0,2).filter(function(item){return item && !rotasticIsFemaleTwilightDoctor(item.doc);}).forEach(function(item){\n      const shift=item.period==='AM'?day.am:day.pm;\n      if(!shift.timed1Doc) shift.timed1Doc=item.doc;\n      else shift.timed2Doc=item.doc;\n    });",
    1
)

# Preserve the already-deployed weekly clinic selector including Smoking Cessation.
# Fail loudly if it disappeared from the generated source so this patch cannot silently regress it.
if 'id="weeklyClinicSmoking"' not in s:
    raise SystemExit('Smoking Cessation weekly clinic control missing from index.html')

p.write_text(s, encoding='utf-8')
print('Hard-blocked female physicians from Twilight candidate selection and assignment.')
