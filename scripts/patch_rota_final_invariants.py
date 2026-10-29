from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Surgical scheduler repair only. Do not touch UI markup, CSS, dropdowns or rendering.
# First repair the malformed rotasticAuthoritativeGroup left by an earlier integration.
broken="function rotasticAuthoritativeGroup(name) { const k=canonicalRotaName(name); const o=(typeof rotasticGetWeeklyGroupOverrides==='function'?rotasticGetWeeklyGroupOverrides():{}); if(o&&Number(o[k])) return Number(o[k]); if (/^Dr\\.?\\s+Gani\\b/i.test(String(k||name||''))) return 2; return ROTASTIC_GROUP_2.has(k) ? 2 : 1; }); if(o&&Number(o[k])) return Number(o[k]); if (/^Dr\\.?\\s+Gani\\b/i.test(String(k||name||''))) return 2; return ROTASTIC_GROUP_2.has(k) ? 2 : 1; }"
clean="function rotasticAuthoritativeGroup(name) { const k=canonicalRotaName(name); const o=(typeof rotasticGetWeeklyGroupOverrides==='function'?rotasticGetWeeklyGroupOverrides():{}); if(o&&Number(o[k])) return Number(o[k]); if (/^Dr\\.?\\s+Gani\\b/i.test(String(k||name||''))) return 2; return ROTASTIC_GROUP_2.has(k) ? 2 : 1; }"
if broken in s:
    s=s.replace(broken,clean,1)

# If the malformed text differs slightly, normalize the whole one-line function safely.
s=re.sub(r"function rotasticAuthoritativeGroup\(name\) \{[^\n]*\}",clean,s,count=1)

# Scheduler-only identity/group helpers. They do not alter canonicalRotaName or UI display names.
helpers=r'''/* ROTASTIC_SCHEDULER_GROUP_GUARD_V4 */
function isRidaVariant(doctorName){
  if(!doctorName)return false;
  return /^dr\.?\s*rida\s*c?\.?/i.test(String(doctorName).trim());
}
function isGaniVariant(doctorName){
  if(!doctorName)return false;
  return /(gani|ghani)/i.test(String(doctorName).trim());
}
function getAuthoritativeGroupForScheduler(doctorName,day){
  if(isRidaVariant(doctorName))return 1;
  if(isGaniVariant(doctorName))return 2;
  return rotasticAuthoritativeGroup(doctorName);
}
'''
if '/* ROTASTIC_SCHEDULER_GROUP_GUARD_V4 */' not in s:
    anchor='function rotasticSurfaceMissingPhysicians(){'
    pos=s.find(anchor)
    if pos<0: raise SystemExit('surface invariant anchor missing')
    s=s[:pos]+helpers+s[pos:]

# Protect the existing final-invariant group helper without changing UI naming.
s=s.replace("function group(doc){doc=canonical(doc);if(doc===RIDA)return 1;return rotasticAuthoritativeGroup(doc);}","function group(doc){return getAuthoritativeGroupForScheduler(doc);}")
s=s.replace("function group(doc){doc=canonical(doc);if(doc===RIDA)return 1;if(doc===GANI)return 2;return rotasticAuthoritativeGroup(doc);}","function group(doc){return getAuthoritativeGroupForScheduler(doc);}")
s=s.replace("function group(doc){return getAuthoritativeGroupForScheduler(doc);}","function group(doc){return getAuthoritativeGroupForScheduler(doc);}",1)

# Validate the exact corruption is gone before writing.
if 'return ROTASTIC_GROUP_2.has(k) ? 2 : 1; });' in s:
    raise SystemExit('malformed authoritative group function still present')
if 'function rotasticAuthoritativeGroup(name)' not in s:
    raise SystemExit('authoritative group function missing')
if 'ROTASTIC_SCHEDULER_GROUP_GUARD_V4' not in s:
    raise SystemExit('scheduler group guard missing')

p.write_text(s,encoding='utf-8')
print('Repaired malformed scheduler JavaScript and added scheduler-only Rida/Gani group guard; UI untouched.')
