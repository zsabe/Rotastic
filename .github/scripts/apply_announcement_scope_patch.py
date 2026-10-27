from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
original = s

marker = "/* ROTASTIC family-practice announcement scope 2026-10-27 */"

# Add broader, current family-practice/public-health statistics to the existing weighted pool.
if "WHO: 1.4 billion adults aged 30–79 had hypertension in 2024" not in s:
    anchor = "const ROTASTIC_MEDICAL_STATS = ["
    if anchor not in s:
        raise SystemExit('medical stats anchor not found')
    additions = """const ROTASTIC_MEDICAL_STATS = [
  {country:'Global',weight:12,text:'🌍 WHO: 1.4 billion adults aged 30–79 had hypertension in 2024 (33%).'},
  {country:'Global',weight:10,text:'🌍 WHO: 44% of adults with hypertension are unaware they have it.'},
  {country:'Global',weight:10,text:'🌍 WHO: only 23% of adults with hypertension have it controlled.'},
  {country:'Global',weight:11,text:'🌍 Asthma affected about 363 million people worldwide in 2023.'},
  {country:'Global',weight:10,text:'🌍 COPD caused about 3.4 million deaths worldwide in 2023.'},
  {country:'Global',weight:10,text:'🌍 Depression affects an estimated 5.2% of adults worldwide.'},
  {country:'Global',weight:10,text:'🌍 Tobacco causes more than 7 million deaths worldwide each year.'},
  {country:'Global',weight:10,text:'🌍 In 2024, about 1.1 billion people worldwide were living with obesity.'},
  {country:'Global',weight:10,text:'🌍 In 2024, an estimated 20.6 million people were diagnosed with cancer.'},
  {country:'Global',weight:9,text:'🌍 In 2025, 13.5 million children received no routine vaccine doses.'},
  {country:'Global',weight:9,text:'🌍 Global DTP3 childhood vaccination coverage was 85% in 2025.'},
"""
    s = s.replace(anchor, additions, 1)

# Ensure a few high-confidence upcoming CPD options are present in the native clickable event pool.
if "3rd Qatar Nephrology Conference" not in s:
    anchor = "const ROTASTIC_CPD_EVENTS = ["
    if anchor not in s:
        raise SystemExit('CPD events anchor not found')
    additions = """const ROTASTIC_CPD_EVENTS = [
  {startDate:'2026-12-10', endDate:'2026-12-12', text:'🇶🇦 CPD • 3rd Qatar Nephrology Conference • 10–12 Dec 2026 • Cat 1 • 19 hours', link:'https://www.hamad.qa/EN/All-Events/3QNC2026/Pages/default.aspx'},
"""
    s = s.replace(anchor, additions, 1)

# Prayer announcement: one text-line lower than the previous 7px nudge.
s = s.replace("#tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-prayer-card {\n      transform: translateY(7px);\n    }",
              "#tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-prayer-card {\n      transform: translateY(14px);\n    }", 1)

# Final narrow CSS guard so normal announcements never drift beyond the usable right edge.
if marker not in s:
    css = f"""
<style id=\"rotastic-family-practice-announcement-scope\">
  {marker}
  #tickerInnerRow:not(.ticker-fullwidth-mode) #tickerContent,
  #tickerInnerRow:not(.ticker-fullwidth-mode) .news-stage,
  #tickerInnerRow:not(.ticker-fullwidth-mode) .news-drop-item,
  #tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-left-card {{
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }}
  #tickerInnerRow:not(.ticker-fullwidth-mode) .news-stage {{
    width: 100% !important;
    padding-right: 8px !important;
  }}
  #tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-message-card,
  #tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-medical-link,
  #tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-message-text {{
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }}
  #tickerInnerRow:not(.ticker-fullwidth-mode) .ticker-medical-link {{
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }}
</style>
"""
    if '</body>' not in s:
        raise SystemExit('body close not found')
    s = s.replace('</body>', css + '\n</body>', 1)

if s == original:
    raise SystemExit('no changes made')

# Sanity checks: preserve core existing ticker paths and requested capabilities.
required = [
    'chooseWeightedMedicalStat()',
    'chooseActiveCpdEvent()',
    "renderTickerCard('prayer'",
    'rotasticCurrentMedicalLink = cpdEvent.link',
    'ROTASTIC_MEDICAL_STATS',
    'ROTASTIC_CPD_EVENTS',
]
for token in required:
    if token not in s:
        raise SystemExit(f'missing required ticker token: {token}')

p.write_text(s, encoding='utf-8')
print('announcement patch applied')
