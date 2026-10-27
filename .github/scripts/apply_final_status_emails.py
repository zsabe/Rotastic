from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

if 'id="rotastic-final-compact-status-strip"' in s:
    print('Patch already applied.')
    raise SystemExit(0)

for anchor in [
    'id="rotasticLiveMini"', 'id="driveTimeBtn"', 'id="weatherBadge"',
    'onclick="openSwapRequestModal()"', 'onclick="toggleRotaExportMenu()"',
    'function getKnownPhysicianEmail(docName)', 'function renderPhysicianManagement()'
]:
    assert anchor in s, anchor

old_directory = """  const permanentDirectory = {
    'Dr Zaid SE.': 'zeleish@phcc.gov.qa',
    'Dr Mohamed M.': 'mmoursi@phcc.gov.qa',
    'Dr Nabina': 'fnabina@phcc.gov.qa',
    'Dr. Nabina': 'fnabina@phcc.gov.qa'
  };"""
new_directory = """  const permanentDirectory = {
    'Dr Mohamed M.': 'mmoursi@phcc.gov.qa',
    'Dr Husam S': 'halsaudi@phcc.gov.qa',
    'Dr Fazila K.': 'fkhattak@phcc.gov.qa',
    'Dr Mohammed S.': 'msayed@phcc.gov.qa',
    'Dr Bilal C.': 'bchaudhry@phcc.gov.qa',
    'Dr Saima N.': 'snaz@phcc.gov.qa',
    'Dr Imran A.': 'imahmad@phcc.gov.qa',
    'Dr Maher A.': 'mahed@phcc.gov.qa',
    'Dr Laith A.': 'lalmarsomi@phcc.gov.qa',
    'Dr Oula T.': 'otayar@phcc.gov.qa',
    'Dr Abdulgafoor K.': 'akuniyil@phcc.gov.qa',
    'Dr Abdulrashid S.': 'asiddique@phcc.gov.qa',
    'Dr Shadi T': 'saltarawneh@phcc.gov.qa',
    'Dr Syed I.': 'sislam@phcc.gov.qa',
    'Dr Selman E.': 'serturhan@phcc.gov.qa',
    'Dr Enan M.': 'emasoud@phcc.gov.qa',
    'Dr Gani M.': 'gsmohamed@phcc.gov.qa',
    'Dr Faisal C.': 'fchaudhry@phcc.gov.qa',
    'Dr Muhammad K.': 'mkhattak@phcc.gov.qa',
    'Dr Aminullah Z.': 'azamani@phcc.gov.qa',
    'Dr Salah M.': 'salmohammed@phcc.gov.qa',
    'Dr Rida C.': 'rchandio@phcc.gov.qa',
    'Dr Maya S.': 'msukkari@phcc.gov.qa',
    'Dr Laila A.': 'layoub@phcc.gov.qa',
    'Dr Saba T.': 'satahir@phcc.gov.qa',
    'Dr Tayseer A.': 'tayed@phcc.gov.qa',
    'Dr Zaid SE.': 'zeleish@phcc.gov.qa',
    'Dr Nabina': 'fnabina@phcc.gov.qa',
    'Dr. Nabina': 'fnabina@phcc.gov.qa'
  };"""
assert s.count(old_directory) == 1
s = s.replace(old_directory, new_directory, 1)

old_render = """    const safe = doc.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\"/g,'&quot;');
    const encodedName = encodeURIComponent(doc.name);"""
new_render = """    const safe = doc.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\"/g,'&quot;');
    const physicianEmail = getKnownPhysicianEmail(doc.name);
    const safeEmail = String(physicianEmail || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\"/g,'&quot;');
    const encodedName = encodeURIComponent(doc.name);"""
assert s.count(old_render) == 1
s = s.replace(old_render, new_render, 1)

name_line = '<div class="text-xs font-bold text-white">${safe}</div>'
assert s.count(name_line) == 1
s = s.replace(
    name_line,
    name_line + "\n          ${safeEmail ? `<div class=\"text-[9px] text-cyan-300/80 break-all mt-0.5\">${safeEmail}</div>` : ''}",
    1
)

final_css = '''
<style id="rotastic-final-compact-status-strip">
.live-rota-meta-row{grid-template-columns:auto minmax(0,1fr) auto!important;gap:6px!important;align-items:center!important}
.live-rota-meta-row>div:first-child,.live-rota-meta-row .rotastic-live-mini,.live-drive-slot,#weatherBadge{min-height:20px!important;height:20px!important;padding:0 2px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
.live-drive-slot{display:flex!important;align-items:center!important;justify-content:center!important}
.live-drive-slot #driveTimeBtn{display:inline-flex!important;width:auto!important;min-width:0!important;max-width:none!important;min-height:20px!important;height:20px!important;padding:0 2px!important;gap:4px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;align-items:center!important;justify-content:center!important}
#liveRotaUpdatedAt,#driveTimeBtnSub{display:none!important}
.rotastic-live-mini-label,#driveTimeBtnText,#weatherTemp{font-size:10px!important;line-height:1!important;font-weight:700!important}
.rotastic-live-mini-label{color:#f43f5e!important}
#weatherBadge{width:auto!important;min-width:0!important;justify-content:flex-end!important}
@media(max-width:640px){.live-rota-meta-row>div:first-child,.live-rota-meta-row .rotastic-live-mini,.live-drive-slot,#weatherBadge,.live-drive-slot #driveTimeBtn{min-height:20px!important;height:20px!important;padding-top:0!important;padding-bottom:0!important}#driveTimeBtnText,#weatherTemp,.rotastic-live-mini-label{font-size:10px!important}}
</style>
'''
idx = s.rfind('</body>')
assert idx != -1
s = s[:idx] + final_css + s[idx:]

emails = [
    'mmoursi@phcc.gov.qa','halsaudi@phcc.gov.qa','fkhattak@phcc.gov.qa','msayed@phcc.gov.qa',
    'bchaudhry@phcc.gov.qa','snaz@phcc.gov.qa','imahmad@phcc.gov.qa','mahed@phcc.gov.qa',
    'lalmarsomi@phcc.gov.qa','otayar@phcc.gov.qa','akuniyil@phcc.gov.qa','asiddique@phcc.gov.qa',
    'saltarawneh@phcc.gov.qa','sislam@phcc.gov.qa','serturhan@phcc.gov.qa','emasoud@phcc.gov.qa',
    'gsmohamed@phcc.gov.qa','fchaudhry@phcc.gov.qa','mkhattak@phcc.gov.qa','azamani@phcc.gov.qa',
    'salmohammed@phcc.gov.qa','rchandio@phcc.gov.qa','msukkari@phcc.gov.qa','layoub@phcc.gov.qa',
    'satahir@phcc.gov.qa','tayed@phcc.gov.qa','zeleish@phcc.gov.qa','fnabina@phcc.gov.qa'
]
assert all(email in s for email in emails)

p.write_text(s, encoding='utf-8')
print('Patched index.html only.')
