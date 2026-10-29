from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Authoritative scheduling invariant: Dr Gani M. belongs to Group 2.
group2_members = ['Dr Husam S','Dr Maher A.','Dr Zaid SE.','Dr Selman E.','Dr Syed I.','Dr Abdulrashid S.','Dr Oula T.','Dr Tayseer A.','Dr Saba T.','Dr Bilal C.','Dr Laith A.','Dr Gani M.']
group2 = "const ROTASTIC_GROUP_2 = new Set(" + repr(group2_members).replace('"', "'") + ".map(canonicalRotaName));"
s, n = re.subn(r"const ROTASTIC_GROUP_2 = new Set\(\[.*?\]\.map\(canonicalRotaName\)\);", lambda m: group2, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('ROTASTIC_GROUP_2 set missing')

# One canonical group resolver for all generator paths. Use a callable replacement so
# JavaScript backslashes are not interpreted as Python replacement escapes.
auth = "function rotasticAuthoritativeGroup(name) { const k=canonicalRotaName(name); if (/^Dr\\.?\\s+Gani\\b/i.test(String(k||name||''))) return 2; return ROTASTIC_GROUP_2.has(k) ? 2 : 1; }"
s, n = re.subn(r"function rotasticAuthoritativeGroup\(name\)\s*\{.*?\}", lambda m: auth, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('rotasticAuthoritativeGroup missing')

s = re.sub(r"function getDoctorGroup\(name\)\s*\{.*?\n\}", lambda m: "function getDoctorGroup(name) { return rotasticAuthoritativeGroup(name); }", s, count=1, flags=re.S)
s = re.sub(r"function doctorGroup\(name\)\s*\{.*?\n\}", lambda m: "function doctorGroup(name) { return rotasticAuthoritativeGroup(name); }", s, count=1, flags=re.S)

def fix_gani_object(m):
    block = m.group(0)
    block = re.sub(r"(\bgroup\s*:\s*)['\"]?1['\"]?", r"\g<1>2", block)
    block = re.sub(r"(\bgroupNo\s*:\s*)['\"]?1['\"]?", r"\g<1>2", block)
    block = re.sub(r"(\bgroupNumber\s*:\s*)['\"]?1['\"]?", r"\g<1>2", block)
    return block
s = re.sub(r"\{[^{}]{0,1200}(?:Dr\.?\s+Gani\s+M\.?|Dr\.?\s+Gani\s+Shafi)[^{}]{0,1200}\}", fix_gani_object, s, flags=re.I)

marker = "/* ROTASTIC_GANI_GROUP2_RUNTIME_PIN */"
runtime = r'''/* ROTASTIC_GANI_GROUP2_RUNTIME_PIN */
function rotasticPinGaniGroup2Metadata() {
  const pools=[];
  ['physicians','doctors','doctorList','physicianList','rotaPhysicians'].forEach(function(k){
    try { if (Array.isArray(window[k])) pools.push(window[k]); } catch(e) {}
  });
  pools.forEach(function(list){list.forEach(function(d){
    if(!d || typeof d!=='object') return;
    const nm=d.name||d.doctor||d.displayName||d.fullName||'';
    if(/^Dr\.?\s+Gani\b/i.test(String(nm))){
      if('group' in d) d.group=2;
      if('groupNo' in d) d.groupNo=2;
      if('groupNumber' in d) d.groupNumber=2;
    }
  });});
}
'''
if marker not in s:
    anchor = 'function rotasticAuthoritativeGroup(name)'
    pos = s.find(anchor)
    if pos < 0: raise SystemExit('runtime pin anchor missing')
    s = s[:pos] + runtime + s[pos:]

for fn in ['generateDutyScheduleFromPlanner','generateDutySchedule']:
    pat = r"function\s+" + fn + r"\s*\(([^)]*)\)\s*\{"
    if re.search(pat, s) and not re.search(pat + r"\s*\n\s*rotasticPinGaniGroup2Metadata\(\);", s):
        s = re.sub(pat, lambda m: m.group(0) + "\n  rotasticPinGaniGroup2Metadata();", s, count=1)

if "'Dr Gani M.'" not in group2:
    raise SystemExit('Dr Gani M. missing from Group 2')
if "return 2; return ROTASTIC_GROUP_2.has(k) ? 2 : 1;" not in s:
    raise SystemExit('Gani hard Group 2 resolver missing')
if marker not in s:
    raise SystemExit('Gani metadata runtime pin missing')

p.write_text(s, encoding='utf-8')
print('Hard-pinned Dr Gani M. to Group 2 across generator set, resolver and roster metadata; UI unchanged.')
