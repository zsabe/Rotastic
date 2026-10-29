from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Scheduling-only invariant: Dr Gani M. is Group 2 everywhere the generator resolves groups.
group2 = "const ROTASTIC_GROUP_2 = new Set(['Dr Husam S','Dr Maher A.','Dr Zaid SE.','Dr Selman E.','Dr Syed I.','Dr Abdulrashid S.','Dr Oula T.','Dr Tayseer A.','Dr Saba T.','Dr Bilal C.','Dr Laith A.','Dr Gani M.'].map(canonicalRotaName));"
s, n = re.subn(r"const ROTASTIC_GROUP_2 = new Set\(\[.*?\]\.map\(canonicalRotaName\)\);", group2, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('ROTASTIC_GROUP_2 set missing')

# Force every generator group lookup through the same authoritative set.
auth = "function rotasticAuthoritativeGroup(name) { return ROTASTIC_GROUP_2.has(canonicalRotaName(name)) ? 2 : 1; }"
s, n = re.subn(r"function rotasticAuthoritativeGroup\(name\)\s*\{.*?\}", auth, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('rotasticAuthoritativeGroup missing')

s = re.sub(r"function getDoctorGroup\(name\)\s*\{.*?\n\}", "function getDoctorGroup(name) { return rotasticAuthoritativeGroup(name); }", s, count=1, flags=re.S)
s = re.sub(r"function doctorGroup\(name\)\s*\{.*?\n\}", "function doctorGroup(name) { return rotasticAuthoritativeGroup(name); }", s, count=1, flags=re.S)

# Hard verification before writing: Gani must resolve from the authoritative Group 2 set.
if "'Dr Gani M.'" not in group2:
    raise SystemExit('Dr Gani M. missing from Group 2')
if "return ROTASTIC_GROUP_2.has(canonicalRotaName(name)) ? 2 : 1;" not in s:
    raise SystemExit('Authoritative group resolver missing')

p.write_text(s, encoding='utf-8')
print('Enforced Dr Gani M. as Group 2 at generator group boundary; UI unchanged.')
