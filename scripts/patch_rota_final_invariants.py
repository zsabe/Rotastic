from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Surgical scheduler repair only. Do not touch UI markup, CSS, dropdowns or rendering.
broken="function rotasticAuthoritativeGroup(name) { const k=canonicalRotaName(name); const o=(typeof rotasticGetWeeklyGroupOverrides==='function'?rotasticGetWeeklyGroupOverrides():{}); if(o&&Number(o[k])) return Number(o[k]); if (/^Dr\\.?\\s+Gani\\b/i.test(String(k||name||''))) return 2; return ROTASTIC_GROUP_2.has(k) ? 2 : 1; }); if(o&&Number(o[k])) return Number(o[k]); if (/^Dr\\.?\\s+Gani\\b/i.test(String(k||name||''))) return 2; return ROTASTIC_GROUP_2.has(k) ? 2 : 1; }"
clean="function rotasticAuthoritativeGroup(name) { const k=canonicalRotaName(name); const o=(typeof rotasticGetWeeklyGroupOverrides==='function'?rotasticGetWeeklyGroupOverrides():{}); if(o&&Number(o[k])) return Number(o[k]); if (/^Dr\\.?\\s+Gani\\b/i.test(String(k||name||''))) return 2; return ROTASTIC_GROUP_2.has(k) ? 2 : 1; }"
if broken in s:
    s=s.replace(broken,clean,1)
else:
    pattern=r"function rotasticAuthoritativeGroup\(name\) \{[^\n]*\}"
    if not re.search(pattern,s): raise SystemExit('authoritative group function missing')
    s=re.sub(pattern,lambda m: clean,s,count=1)

# Remove old scheduler helper blocks so repeated integrations remain clean/idempotent.
for marker in ['/* ROTASTIC_CANONICAL_RIDA_GANI_V1 */','/* ROTASTIC_SCHEDULER_RIDA_GANI_HELPERS_V2 */','/* ROTASTIC_SCHEDULER_RIDA_GANI_HELPERS_V3 */','/* ROTASTIC_SCHEDULER_GROUP_GUARD_V4 */']:
    while marker in s:
        a=s.find(marker)
        b=s.find('function rotasticSurfaceMissingPhysicians(){',a)
        if b<0: raise SystemExit('scheduler helper boundary missing')
        s=s[:a]+s[b:]

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
anchor='function rotasticSurfaceMissingPhysicians(){'
pos=s.find(anchor)
if pos<0: raise SystemExit('surface invariant anchor missing')
s=s[:pos]+helpers+s[pos:]

# Scheduler-only group routing; no UI/display functions are modified.
s=s.replace("function group(doc){doc=canonical(doc);if(doc===RIDA)return 1;return rotasticAuthoritativeGroup(doc);}","function group(doc){return getAuthoritativeGroupForScheduler(doc);}")
s=s.replace("function group(doc){doc=canonical(doc);if(doc===RIDA)return 1;if(doc===GANI)return 2;return rotasticAuthoritativeGroup(doc);}","function group(doc){return getAuthoritativeGroupForScheduler(doc);}")

if 'return ROTASTIC_GROUP_2.has(k) ? 2 : 1; });' in s: raise SystemExit('malformed authoritative group function still present')
if s.count('/* ROTASTIC_SCHEDULER_GROUP_GUARD_V4 */') != 1: raise SystemExit('scheduler group guard duplication')

p.write_text(s,encoding='utf-8')
print('Repaired malformed scheduler JavaScript; scheduler-only Rida/Gani grouping retained; UI untouched.')
