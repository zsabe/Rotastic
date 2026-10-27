from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')
before = s

for marker in ['id="topActionGrid"', 'id="rotasticLiveMini"', 'id="driveTimeBtn"', 'id="weatherBadge"', 'personal-poster-card']:
    if marker not in s:
        raise SystemExit('Missing protected working-view anchor: ' + marker)

# ---- LIVE / ETA / Weather row ----
live_re = re.compile(r'<div class="rotastic-live-mini" id="rotasticLiveMini">.*?</div>', re.S)
live_matches = list(live_re.finditer(s))
if len(live_matches) != 1:
    raise SystemExit(f'Expected exactly one LIVE block, found {len(live_matches)}')
live_block = live_matches[0].group(0)

row_start = s.find('<div class="live-rota-meta-row')
grid_start = s.find('id="topActionGrid"')
if row_start < 0 or grid_start < 0 or row_start > grid_start:
    raise SystemExit('Could not locate metadata row before action grid')

row_region = s[row_start:grid_start]
if 'id="rotasticLiveMini"' not in row_region:
    s = s[:live_matches[0].start()] + s[live_matches[0].end():]
    row_start = s.find('<div class="live-rota-meta-row')
    grid_start = s.find('id="topActionGrid"')
    row_region = s[row_start:grid_start]
    exp = re.search(r'<button[^>]*id="topExportCard"[^>]*>.*?</button>', row_region, re.S)
    if not exp:
        exp = re.search(r'<button[^>]*onclick="toggleRotaExportMenu\(\)"[^>]*>.*?</button>', row_region, re.S)
    if not exp:
        raise SystemExit('No visible Export card found in metadata row to swap with LIVE')
    abs_a = row_start + exp.start()
    abs_b = row_start + exp.end()
    s = s[:abs_a] + live_block + s[abs_b:]

# ---- Action row: remove Refresh, preserve Export ----
grid_id = s.find('id="topActionGrid"')
grid_open = s.rfind('<div', 0, grid_id)
grid_end = min(len(s), grid_open + 5000)
grid_region = s[grid_open:grid_end]
refresh_button_re = re.compile(r'<button[^>]*onclick="refreshLiveRota\(\)"[^>]*>.*?</button>', re.S)
refresh = refresh_button_re.search(grid_region)
export_in_grid = re.search(r'<button[^>]*onclick="toggleRotaExportMenu\(\)"[^>]*>.*?</button>', grid_region, re.S)

if refresh:
    if export_in_grid:
        replacement = ''
    else:
        old = refresh.group(0)
        cls = re.search(r'class="([^"]*)"', old)
        class_text = cls.group(1) if cls else 'rota-action-btn w-full'
        replacement = (
            f'<button class="{class_text}" id="topExportCard" onclick="toggleRotaExportMenu()" type="button">\n'
            '<i class="fa-solid fa-arrow-up-from-bracket text-[12px]"></i><span>Export</span><i class="fa-solid fa-chevron-down text-[8px] opacity-70"></i>\n'
            '</button>'
        )
    a = grid_open + refresh.start()
    b = grid_open + refresh.end()
    s = s[:a] + replacement + s[b:]
else:
    # It is fine for the refreshLiveRota function itself to remain; only its visible button is removed.
    if not re.search(r'<button[^>]*onclick="toggleRotaExportMenu\(\)"[^>]*>.*?</button>', grid_region, re.S):
        raise SystemExit('Neither Refresh nor Export action found in top action grid')

# ---- Scoped visual override only ----
css = '''
<style id="requested-ui-only-20261027">
/* Only the requested LIVE / ETA / temperature strip and personal poster size. */
.live-rota-meta-row {
  grid-template-columns: auto minmax(76px, 1fr) auto !important;
  align-items: center !important;
  gap: 7px !important;
}
.live-rota-meta-row .rotastic-live-mini {
  min-height: 24px !important;
  height: 24px !important;
  padding: 0 6px !important;
  margin: 0 !important;
  align-self: center !important;
}
.live-rota-meta-row .live-drive-slot {
  min-height: 24px !important;
  height: 24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  overflow: visible !important;
}
.live-rota-meta-row #driveTimeBtn {
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  height: 24px !important;
  min-height: 24px !important;
  padding: 0 2px !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  gap: 4px !important;
  font-size: 10px !important;
  line-height: 1 !important;
}
.live-rota-meta-row #driveTimeBtnText {
  font-size: 10px !important;
  line-height: 1 !important;
  white-space: nowrap !important;
}
.live-rota-meta-row #driveTimeBtnSub {
  display: none !important;
}
.live-rota-meta-row #weatherBadge {
  width: auto !important;
  min-width: 0 !important;
  min-height: 24px !important;
  height: 24px !important;
  max-height: 24px !important;
  padding: 0 2px !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  font-size: 10px !important;
  line-height: 1 !important;
}
.live-rota-meta-row #weatherCondition {
  display: none !important;
}
.personal-poster-card,
.personal-poster-content {
  min-height: clamp(520px, calc(100svh - 310px), 650px) !important;
}
@media (orientation: landscape) and (max-height: 700px) {
  .personal-poster-card,
  .personal-poster-content {
    min-height: 285px !important;
  }
}
</style>
'''

old_css = re.compile(r'<style id="requested-ui-only-20261027">.*?</style>\s*', re.S)
if old_css.search(s):
    s = old_css.sub(css, s, count=1)
else:
    head_end = s.find('</head>')
    if head_end < 0:
        raise SystemExit('No </head> found')
    s = s[:head_end] + css + s[head_end:]

# ---- Exact safety checks ----
# Only the visible Refresh button must be gone; the refreshLiveRota function stays intact.
if refresh_button_re.search(s):
    raise SystemExit('Visible Refresh button still present')
if s.count('id="rotasticLiveMini"') != 1:
    raise SystemExit('LIVE id count changed')
if s.count('id="driveTimeBtn"') != 1:
    raise SystemExit('ETA id count changed')
if s.count('id="weatherBadge"') != 1:
    raise SystemExit('Weather id count changed')

row_start = s.find('<div class="live-rota-meta-row')
grid_start = s.find('id="topActionGrid"')
row_region = s[row_start:grid_start]
positions = [row_region.find('id="rotasticLiveMini"'), row_region.find('id="driveTimeBtn"'), row_region.find('id="weatherBadge"')]
if not (positions[0] >= 0 and positions[0] < positions[1] < positions[2]):
    raise SystemExit('LIVE / ETA / Weather are not in the requested order in one row')

for marker in [
    'id="scheduleMatrixContainer"',
    'onclick="openSwapRequestModal()"',
    'id="rotaZoomBtn"',
    'id="rotaDaySelector"',
    'id="tabSchedule"',
    'toggleRotaExportMenu()',
]:
    if marker not in s:
        raise SystemExit('Protected anchor missing after patch: ' + marker)

if s == before:
    raise SystemExit('No changes made')

p.write_text(s, encoding='utf-8')
