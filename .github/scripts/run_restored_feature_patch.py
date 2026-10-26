from pathlib import Path
import re

src=Path('.github/scripts/apply_restored_feature_set.py').read_text(encoding='utf-8')
old="settings_heading='''<i class=\"fa-solid fa-gear text-teal-400 mr-2\"></i>Settings\\n      </h2>'''"
new="settings_heading='''<i class=\"fa-solid fa-gear text-teal-400 mr-2\"></i>Settings\\n        </h2>'''"
if old not in src:
    raise SystemExit('settings patch-script anchor missing')
src=src.replace(old,new,1)
exec(compile(src,'apply_restored_feature_set.py','exec'))

# The helper is intentionally authored as a Python raw string so JS regex
# escapes survive. Convert formatting-only literal \\n sequences to real line
# breaks, then restore the one regex that intentionally matches newlines.
p=Path('index.html')
s=p.read_text(encoding='utf-8')
start=s.find('<script id="rotastic-requested-direct-functions">')
end=s.find('</script>',start)
if start<0 or end<0:
    raise SystemExit('direct feature script marker missing after patch')
body=s[start:end]
body=body.replace('\\n','\n')
body=body.replace('raw.split(/\n+|\\s*;\\s*/)', 'raw.split(/\\n+|\\s*;\\s*/)')
s=s[:start]+body+s[end:]
p.write_text(s,encoding='utf-8')
