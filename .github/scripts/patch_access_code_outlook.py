from pathlib import Path

index = Path('index.html')
s = index.read_text(encoding='utf-8')

old_email = """function getKnownPhysicianEmail(docName) {
  const custom = Storage.getJSON('rotastic_custom_physicians', []);
  const customRow = Array.isArray(custom) ? custom.find(function(row){ return row && row.name === docName && row.email; }) : null;
  if (customRow && customRow.email) return String(customRow.email).trim().toLowerCase();
  const map = getPhysicianEmailMap();
  return String(map[docName] || '').trim().toLowerCase();
}"""
new_email = """function getKnownPhysicianEmail(docName) {
  const custom = Storage.getJSON('rotastic_custom_physicians', []);
  const customRow = Array.isArray(custom) ? custom.find(function(row){ return row && row.name === docName && row.email; }) : null;
  if (customRow && customRow.email) return String(customRow.email).trim().toLowerCase();
  const map = getPhysicianEmailMap();
  const stored = String(map[docName] || '').trim().toLowerCase();
  if (stored) return stored;
  const permanentDirectory = {
    'Dr Zaid SE.': 'zeleish@phcc.gov.qa',
    'Dr Mohamed M.': 'mmoursi@phcc.gov.qa',
    'Dr Nabina': 'fnabina@phcc.gov.qa',
    'Dr. Nabina': 'fnabina@phcc.gov.qa'
  };
  return String(permanentDirectory[docName] || '').trim().toLowerCase();
}"""

old_outlook = "window.location.href = 'mailto:' + encodeURIComponent(info.email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);"
new_outlook = """const outlookUrl = 'https://outlook.office.com/mail/deeplink/compose?to=' + encodeURIComponent(info.email) + '&subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  const outlookWindow = window.open(outlookUrl, '_blank', 'noopener');
  if (!outlookWindow) {
    window.location.href = 'mailto:' + encodeURIComponent(info.email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }"""

if s.count(old_email) != 1:
    raise SystemExit(f'Email mapping anchor count was {s.count(old_email)}, expected 1')
if s.count(old_outlook) != 1:
    raise SystemExit(f'Outlook anchor count was {s.count(old_outlook)}, expected 1')

s = s.replace(old_email, new_email, 1)
s = s.replace(old_outlook, new_outlook, 1)
index.write_text(s, encoding='utf-8')

sw = Path('service-worker.js')
w = sw.read_text(encoding='utf-8')
old_cache = "const CACHE = 'rotastic-v233-zaid-auth-session';"
new_cache = "const CACHE = 'rotastic-v234-access-code-outlook';"
if old_cache in w:
    w = w.replace(old_cache, new_cache, 1)
elif new_cache not in w:
    raise SystemExit('Service worker cache anchor not found')
sw.write_text(w, encoding='utf-8')

check = index.read_text(encoding='utf-8')
for required in [
    'id="tempAdminCodeManagerCard"',
    'id="accessCodeType"',
    'id="accessCodeDoctorSelect"',
    "functions.invoke('rotastic-registration-admin'",
    'sendLastAccessCodeViaOutlook()',
    "'Dr Mohamed M.': 'mmoursi@phcc.gov.qa'",
    'https://outlook.office.com/mail/deeplink/compose'
]:
    if required not in check:
        raise SystemExit('Required marker missing: ' + required)

# These legacy scripts previously caused UI regressions and must not be newly loaded.
for forbidden_src in [
    '<script src="rotastic-admin-hotfix.js"',
    '<script src="rotastic-admin-access-unified.js"',
    '<script src="rotastic-registration-admin.js"'
]:
    if forbidden_src in check:
        raise SystemExit('Forbidden legacy admin script is loaded: ' + forbidden_src)

print('Strict access-code patch applied successfully.')
