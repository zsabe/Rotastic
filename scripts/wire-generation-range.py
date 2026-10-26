from pathlib import Path
import re, subprocess

p = Path('index.html')
s = p.read_text()

pat = re.compile(r"async function generateDutyScheduleFromPlanner\(\) \{.*?\n\}\n\n\n// Final safety pass for Twilight", re.S)
if not pat.search(s):
    raise SystemExit('generateDutyScheduleFromPlanner block not found')

replacement = """async function generateDutyScheduleFromPlanner() {
  await rotasticRefreshGenerationLock();
  if (!rotasticGuardNewGeneration(true)) return false;
  const weekSelect = document.getElementById('cycleStartDate');
  const groupInput = document.getElementById('wednesdayAMOBGroup');
  const rangeSelect = document.getElementById('rotasticGenerationRange');
  const firstWeekISO = weekSelect ? weekSelect.value : '';
  const baseGroup = getWednesdayAMOBGroupValue();
  const weeks = Math.max(1, parseInt(rangeSelect ? rangeSelect.value : '1', 10) || 1);

  if (!firstWeekISO) {
    alert('Please choose the week commencing Sunday.');
    if (weekSelect) weekSelect.focus();
    return false;
  }
  if (!baseGroup) {
    if (groupInput) {
      groupInput.focus();
      groupInput.classList.add('ring-2','ring-rose-500/70','rounded');
      setTimeout(function(){ groupInput.classList.remove('ring-2','ring-rose-500/70','rounded'); },1800);
    }
    alert('Please select or enter which group is on AM on Wednesday before generating the schedule.');
    return false;
  }

  function addDaysISO(iso, days) {
    const d = new Date(iso + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0,10);
  }

  const generatedSeries = [];
  for (let i = 0; i < weeks; i++) {
    const weekISO = addDaysISO(firstWeekISO, i * 7);
    let group = baseGroup;
    try {
      if (i > 0 && typeof getRecommendedWednesdayAMGroupForWeek === 'function') {
        group = getRecommendedWednesdayAMGroupForWeek(weekISO) || group;
      }
    } catch (e) {}

    if (weekSelect) weekSelect.value = weekISO;
    if (groupInput) groupInput.value = group;
    Storage.set('rotastic_selected_week_commencing', weekISO);
    Storage.set('rotastic_wednesday_am_ob_group', group);
    Storage.set('rotastic_wednesday_am_group', group);
    generateDutySchedule();
    generatedSeries.push({
      weekStart: weekISO,
      wednesdayAMGroup: group,
      schedule: JSON.parse(JSON.stringify(currentSchedule || []))
    });
  }

  Storage.setJSON('rotastic_generated_schedule_series', generatedSeries);
  if (generatedSeries.length) {
    const first = generatedSeries[0];
    currentSchedule = JSON.parse(JSON.stringify(first.schedule || []));
    if (weekSelect) weekSelect.value = first.weekStart;
    if (groupInput) groupInput.value = first.wednesdayAMGroup || baseGroup;
    Storage.set('rotastic_selected_week_commencing', first.weekStart);
    Storage.set('rotastic_wednesday_am_ob_group', first.wednesdayAMGroup || baseGroup);
    Storage.set('rotastic_wednesday_am_group', first.wednesdayAMGroup || baseGroup);
  }

  switchTab('schedule');
  renderScheduleView();
  return true;
}


// Final safety pass for Twilight"""

s = pat.sub(replacement, s, count=1)
required = [
    'id="tickerContent"',
    'You are off today',
    'id="topActionGrid"',
    'id="topExportBtn"',
    'id="notificationBellBtn"',
    'id="scheduleMatrixContainer"',
    'id="rotasticGenerationRange"'
]
missing = [x for x in required if x not in s]
if missing:
    raise SystemExit('baseline anchor missing: ' + ', '.join(missing))

p.write_text(s)

# Syntax-check only the exact function being introduced.
check = replacement.split("\n\n\n// Final safety pass for Twilight", 1)[0]
fn = Path('/tmp/generateDutyScheduleFromPlanner.js')
fn.write_text(check)
r = subprocess.run(['node', '--check', str(fn)], capture_output=True, text=True)
if r.returncode:
    print(r.stderr)
    raise SystemExit('generation function failed syntax check')

print('Generation function syntax check passed')
