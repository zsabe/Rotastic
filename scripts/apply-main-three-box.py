from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')
original = s

# 1) Remove only the existing large Export / ETA / Weather three-card row.
meta_pattern = re.compile(
    r'<div class="live-rota-meta-row w-full">\s*'
    r'<button class="rotastic-top-export-card" id="topExportCard".*?</button>\s*'
    r'<div class="live-drive-slot">\s*'
    r'(<a aria-label="Open Google Maps driving directions to Abu Nakhla Health Centre".*?id="driveTimeBtn".*?</a>)\s*'
    r'</div>\s*'
    r'(<span class="inline-flex items-center gap-1.*?id="weatherBadge">.*?</span>\s*</span>)\s*'
    r'</div>\s*</div>',
    re.S,
)
m = meta_pattern.search(s)
if not m:
    raise SystemExit('Original Export/ETA/Weather row not found exactly once')
eta_anchor = m.group(1)
weather_span = m.group(2)
s = s[:m.start()] + s[m.end():]

# Make weather itself clickable while preserving its existing children/IDs.
weather_button = weather_span.replace('<span ', '<button onclick="updateAbuNakhlaWeather()" title="Refresh Abu Nakhla weather" type="button" ', 1)
# Replace the final closing span belonging to weatherBadge only.
last = weather_button.rfind('</span>')
if last < 0:
    raise SystemExit('Weather badge closing tag not found')
weather_button = weather_button[:last] + '</button>' + weather_button[last + len('</span>'):]

# 2) Replace only the large Refresh action with Export, preserving the existing 3-column action grid.
refresh_pattern = re.compile(
    r'<button class="rota-action-btn w-full justify-center px-3 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-\[11px\] sm:text-xs font-bold text-teal-300 transition flex items-center gap-2" onclick="refreshLiveRota\(\)" type="button">\s*'
    r'<i class="fa-solid fa-rotate text-\[12px\]"></i><span>Refresh</span>\s*'</n    r'</button>',
    re.S,
)
# The regex above is intentionally assembled below to avoid changing unrelated Refresh controls.
refresh_literal = '''<button class="rota-action-btn w-full justify-center px-3 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-[11px] sm:text-xs font-bold text-teal-300 transition flex items-center gap-2" onclick="refreshLiveRota()" type="button">
<i class="fa-solid fa-rotate text-[12px]"></i><span>Refresh</span>
</button>'''
export_literal = '''<button class="rota-action-btn w-full justify-center px-3 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-[11px] sm:text-xs font-bold text-teal-300 transition flex items-center gap-2" onclick="toggleRotaExportMenu()" type="button">
<i class="fa-solid fa-arrow-up-from-bracket text-[12px]"></i><span>Export</span><i class="fa-solid fa-chevron-down text-[8px] text-slate-500"></i>
</button>'''
if s.count(refresh_literal) != 1:
    raise SystemExit(f'Expected one main Refresh action, found {s.count(refresh_literal)}')
s = s.replace(refresh_literal, export_literal, 1)

# 3) Put the existing ETA and Weather immediately beside LIVE, without moving anything else.
live_literal = '''<div class="rotastic-live-mini" id="rotasticLiveMini">
<span class="relative flex h-1.5 w-1.5 flex-shrink-0">
  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
  <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
</span>
<span class="rotastic-live-mini-label">LIVE</span>
<button id="liveRotaUpdatedAt" onclick="toggleLiveRotaUpdatedDetail()" title="Tap to show full update time" type="button">Updated (--:--)</button>
</div>'''
if s.count(live_literal) != 1:
    raise SystemExit(f'Expected one LIVE strip, found {s.count(live_literal)}')
new_live = '''<div class="rotastic-live-mini" id="rotasticLiveMini">
<span class="relative flex h-1.5 w-1.5 flex-shrink-0">
  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
  <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
</span>
<span class="rotastic-live-mini-label">LIVE</span>
<div class="live-drive-slot">''' + eta_anchor + '''</div>
''' + weather_button + '''
<button id="liveRotaUpdatedAt" onclick="toggleLiveRotaUpdatedDetail()" title="Tap to show full update time" type="button">Updated (--:--)</button>
</div>'''
s = s.replace(live_literal, new_live, 1)

# 4) Override only ETA/Weather when they are inside the LIVE strip, neutralizing older large-card CSS.
css_anchor = '.rotastic-live-mini button{min-height:18px!important;padding:0!important;background:none!important;border:0!important;color:#64748b!important;font-size:8px!important;line-height:1!important}'
if s.count(css_anchor) != 1:
    raise SystemExit(f'Expected one LIVE CSS anchor, found {s.count(css_anchor)}')
compact_css = css_anchor + '''
/* Requested only: compact clickable ETA + Weather beside LIVE. */
.rotastic-live-mini .live-drive-slot{width:auto!important;min-width:0!important;height:20px!important;min-height:20px!important;display:flex!important;align-items:center!important;overflow:visible!important}
.rotastic-live-mini .live-drive-slot #driveTimeBtn{display:inline-flex!important;width:auto!important;min-width:0!important;max-width:none!important;height:20px!important;min-height:20px!important;max-height:20px!important;margin:0!important;padding:0 5px!important;border:0!important;border-radius:6px!important;background:transparent!important;box-shadow:none!important;gap:3px!important}
.rotastic-live-mini .live-drive-slot #driveTimeBtn>i{font-size:9px!important}
.rotastic-live-mini #driveTimeBtnText{font-size:8px!important;line-height:1!important;color:#7dd3fc!important;font-weight:900!important}
.rotastic-live-mini #driveTimeBtnSub{display:none!important}
.rotastic-live-mini #weatherBadge{display:inline-flex!important;width:auto!important;min-width:0!important;max-width:none!important;height:20px!important;min-height:20px!important;max-height:20px!important;margin:0!important;padding:0 5px!important;border:0!important;border-radius:6px!important;background:transparent!important;box-shadow:none!important;gap:3px!important;color:#cbd5e1!important;font-size:8px!important;font-weight:850!important}
.rotastic-live-mini #weatherTemp{font-size:8px!important;font-weight:850!important;color:#cbd5e1!important}
'''
s = s.replace(css_anchor, compact_css, 1)

if s == original:
    raise SystemExit('No changes made')

# Narrow invariants: requested controls + core design anchors remain.
checks = {
    'LIVE strip': 'id="rotasticLiveMini"',
    'ETA': 'id="driveTimeBtn"',
    'Weather': 'id="weatherBadge"',
    'Rota View': '<span>Rota View</span>',
    'Request Swap': '<span>Request Swap</span>',
    'Export': '<span>Export</span>',
    'personal poster': 'personal-poster-card',
    'rota matrix': 'id="scheduleMatrixContainer"',
    'day selector': 'id="rotaDaySelector"',
}
for name, needle in checks.items():
    if needle not in s:
        raise SystemExit(f'Missing protected design anchor: {name}')
if '<span>Refresh</span>' in s:
    raise SystemExit('Main Refresh action still present')
if s.count('id="driveTimeBtn"') != 1 or s.count('id="weatherBadge"') != 1:
    raise SystemExit('ETA/Weather IDs duplicated')

p.write_text(s, encoding='utf-8')
