from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Scheduling/Smart-Box logic only. No UI/CSS/markup changes.
# Locate the existing Smart Box command parser from stable textual anchors and
# extend it in-place. Fail closed if the handler cannot be identified.
needles=['smart box','smartbox','Smart Box','SmartBox']
hits=[s.lower().find(n.lower()) for n in needles if s.lower().find(n.lower())>=0]
if not hits:
    raise SystemExit('Smart Box anchor missing; refusing unsafe index edit')

# Add a standalone parser immediately before the first Smart Box script area.
# It is intentionally side-effect free: the existing handler can call it and
# receive normalized weekly commands.
anchor=min(hits)
script_start=s.rfind('<script',0,anchor)
if script_start<0:
    raise SystemExit('Smart Box script boundary missing')
insert=s.find('>',script_start)+1
if insert<=0:
    raise SystemExit('Smart Box script tag malformed')

code=r'''
/* ROTASTIC_SMARTBOX_WEEK_COMMANDS_V1 */
function rotasticParseWeeklyPhysicianCommand(input){
  const raw=String(input||'').trim();
  if(!raw)return null;
  const text=raw.replace(/[\u2018\u2019]/g,"'").replace(/\s+/g,' ').trim();
  const lower=text.toLowerCase();
  const week=/\bthis\s+week\b/i.test(text);
  if(!week)return null;

  function cleanName(v){
    v=String(v||'').trim().replace(/^[\s:,-]+|[\s,.;:]+$/g,'');
    v=v.replace(/^(?:doctor|dr\.?)[\s]+/i,'');
    if(!v)return '';
    return 'Dr '+v;
  }
  function namesFrom(v){
    v=String(v||'').replace(/\bthis\s+week\b/ig,'').replace(/\b(?:is|are)\b\s*$/i,'').trim();
    v=v.replace(/^(?:the\s+following\s+)?(?:doctors?|physicians?)\s*(?:are|is)?\s*[:,-]?\s*/i,'');
    const parts=v.split(/\s*(?:,|\band\b|&)\s*/i).map(cleanName).filter(Boolean);
    return [...new Set(parts)];
  }
  function before(pattern){const m=text.match(pattern);return m?namesFrom(m[1]):[];}
  function after(pattern){const m=text.match(pattern);return m?namesFrom(m[1]):[];}

  let names=[];
  // Negation/working MUST be checked before OFF so "not off" cannot become OFF.
  if(/\b(?:not\s+off|working|on\s+duty|available)\b/i.test(text)){
    names=before(/^(.+?)\s+(?:is|are)\s+(?:not\s+off|working|on\s+duty|available)\b/i);
    if(!names.length)names=after(/^(?:the\s+following\s+)?(?:doctors?|physicians?)\s+(?:are|is)\s+(?:not\s+off|working|on\s+duty|available)\s*[:,-]?\s*(.+)$/i);
    if(names.length)return {scope:'week',action:'working',doctors:names};
  }
  if(/\boff\b/i.test(text)){
    names=before(/^(.+?)\s+(?:is|are)\s+off\b/i);
    if(!names.length)names=after(/^(?:the\s+following\s+)?(?:doctors?|physicians?)\s+(?:are|is)\s+off\s*[:,-]?\s*(.+)$/i);
    if(names.length)return {scope:'week',action:'off',doctors:names};
  }
  let m=text.match(/^(?:move\s+)?(.+?)\s+(?:to\s+)?work\s+with\s+group\s*(one|1|two|2)\b/i)
       ||text.match(/^(?:move\s+)?(.+?)\s+to\s+group\s*(one|1|two|2)\b/i);
  if(m){
    names=namesFrom(m[1]);
    if(names.length)return {scope:'week',action:'group',group:/^(?:one|1)$/i.test(m[2])?1:2,doctors:names};
  }
  return null;
}
'''
if 'ROTASTIC_SMARTBOX_WEEK_COMMANDS_V1' not in s:
    s=s[:insert]+code+s[insert:]

# Find likely existing text-processing functions near Smart Box and hook the
# parser at the beginning. We only accept a function whose body references the
# Smart Box region, avoiding broad/global replacements.
region_start=max(0,anchor-30000); region_end=min(len(s),anchor+80000)
region=s[region_start:region_end]
import re
candidates=[]
for m in re.finditer(r'(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{',region):
    args=m.group(2).strip()
    if not args: continue
    absolute=region_start+m.start()
    body=s[absolute:absolute+12000].lower()
    if any(k in body for k in ['smart','instruction','command','prompt','rota']) and any(k in args.lower() for k in ['text','input','command','prompt','message','instruction']):
        candidates.append((absolute,m.group(1),args.split(',')[0].strip()))
if not candidates:
    raise SystemExit('Smart Box command handler not safely identifiable; parser added in memory only, refusing partial write')

pos,name,arg=min(candidates,key=lambda x:abs(x[0]-anchor))
brace=s.find('{',pos)+1
hook=f"\n  const __rotasticWeekCmd=rotasticParseWeeklyPhysicianCommand({arg});\n  if(__rotasticWeekCmd && typeof rotasticApplyWeeklyPhysicianCommand==='function'){{const __r=rotasticApplyWeeklyPhysicianCommand(__rotasticWeekCmd);if(__r!==undefined)return __r;}}\n"
if '__rotasticWeekCmd=rotasticParseWeeklyPhysicianCommand' not in s[pos:pos+3000]:
    s=s[:brace]+hook+s[brace:]

# Require the app to already expose a weekly-command application function. This
# prevents us from guessing how OFF/group state is stored.
if 'function rotasticApplyWeeklyPhysicianCommand' not in s and 'rotasticApplyWeeklyPhysicianCommand=' not in s:
    raise SystemExit('Weekly command state adapter missing; refusing to guess storage semantics')

for token in ['ROTASTIC_SMARTBOX_WEEK_COMMANDS_V1','not\\s+off','action:\'working\'','action:\'off\'','action:\'group\'']:
    if token not in s: raise SystemExit('missing Smart Box invariant '+token)
p.write_text(s,encoding='utf-8')
print('Smart Box weekly natural-language commands integrated; UI unchanged.')
