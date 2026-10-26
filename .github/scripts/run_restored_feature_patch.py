from pathlib import Path
src=Path('.github/scripts/apply_restored_feature_set.py').read_text(encoding='utf-8')
old="settings_heading='''<i class=\"fa-solid fa-gear text-teal-400 mr-2\"></i>Settings\\n      </h2>'''"
new="settings_heading='''<i class=\"fa-solid fa-gear text-teal-400 mr-2\"></i>Settings\\n        </h2>'''"
if old not in src:
    raise SystemExit('settings patch-script anchor missing')
src=src.replace(old,new,1)
exec(compile(src,'apply_restored_feature_set.py','exec'))
