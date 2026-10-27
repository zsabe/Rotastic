from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
anchor='''#weatherBadge{width:auto!important;min-width:0!important;justify-content:flex-end!important}'''
assert anchor in s
if '.live-rota-meta-row .rotastic-live-mini{display:inline-flex!important;' not in s:
    s=s.replace(anchor, anchor+'\n.live-rota-meta-row .rotastic-live-mini{display:inline-flex!important;align-items:center!important;gap:4px!important;visibility:visible!important;opacity:1!important;justify-self:start!important}', 1)
assert 'id="rotasticLiveMini"' in s
assert 'id="driveTimeBtn"' in s
assert 'id="weatherBadge"' in s
p.write_text(s,encoding='utf-8')
