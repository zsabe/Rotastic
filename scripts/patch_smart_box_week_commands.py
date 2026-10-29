from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Smart Box logic only; do not alter UI/CSS/markup.
# The deployed file does not contain a reliable literal "Smart Box" label, so
# locate the existing natural-language command area by command-oriented code.
markers=[
    r'function\s+[A-Za-z_$][\w$]*\s*\([^)]*(?:text|input|command|prompt|message|instruction)[^)]*\)\s*\{',
    r'(?:instruction|command|prompt|message)',
]
positions=[]
for pat in markers:
    m=re.search(pat,s,re.I)
    if m: positions.append(m.start())
if not positions:
    raise SystemExit('Natural-language command area missing; refusing unsafe index edit')
anchor=min(positions)
script_start=s.rfind('<script',0,anchor)
if script_start<0:
    raise SystemExit('Command script boundary missing')
insert=s.find('>',script_start)+1
if insert<=0:
    raise SystemExit('Command script tag malformed')

code=r'''
/* ROTASTIC_SMARTBOX_WEEK_COMMANDS_V1 */
function rotasticParseWeeklyPhysicianCommand(input){
  const raw=String(input||'').trim();
  if(!raw)return null;
  const text=raw.replace(/[\u2018\u2019]/g,"'").replace(/\s+/g,' ').trim();
  if(!/\bthis\s+week\b/i.test(text))return null;
  function cleanName(v){v=String(v||'').trim().replace(/^[\s:,-]+|[\s,.;:]+$/g,'').replace(/^(?:doctor|dr\.?)\s+/i,'');return v?'Dr '+v:'';}
  function namesFrom(v){v=String(v||'').replace(/\bthis\s+week\b/ig,'').trim().replace(/^(?:the\s+following\s+)?(?:doctors?|physicians?)\s*(?:are|is)?\s*[:,-]?\s*/i,'');return [...new Set(v.split(/\s*(?:,|\band\b|&)\s*/i).map(cleanName).filter(Boolean))];}
  let m,names=[];
  m=text.match(/^(.+?)\s+(?:is|are)\s+(?:not\s+off|working|on\s+duty|available)\b/i);
  if(m){names=namesFrom(m[1]);if(names.length)return {scope:'week',action:'working',doctors:names};}
  m=text.match(/^(?:the\s+following\s+)?(?:doctors?|physicians?)\s+(?:are|is)\s+(?:not\s+off|working|on\s+duty|available)\s*[:,-]?\s*(.+)$/i);
  if(m){names=namesFrom(m[1]);if(names.length)return {scope:'week',action:'working',doctors:names};}
  m=text.match(/^(.+?)\s+(?:is|are)\s+off\b/i);
  if(m){names=namesFrom(m[1]);if(names.length)return {scope:'week',action:'off',doctors:names};}
  m=text.match(/^(?:the\s+following\s+)?(?:doctors?|physicians?)\s+(?:are|is)\s+off\s*[:,-]?\s*(.+)$/i);
  if(m){names=namesFrom(m[1]);if(names.length)return {scope:'week',action:'off',doctors:names};}
  m=text.match(/^(?:move\s+)?(.+?)\s+(?:to\s+)?work\s+with\s+group\s*(one|1|two|2)\b/i)||text.match(/^(?:move\s+)?(.+?)\s+to\s+group\s*(one|1|two|2)\b/i);
  if(m){names=namesFrom(m[1]);if(names.length)return {scope:'week',action:'group',group:/^(?:one|1)$/i.test(m[2])?1:2,doctors:names};}
  return null;
}
'''
if 'ROTASTIC_SMARTBOX_WEEK_COMMANDS_V1' not in s:
    s=s[:insert]+code+s[insert:]

# Locate a nearby command-processing function and hook only that function.
region_start=max(0,anchor-50000); region_end=min(len(s),anchor+120000)
region=s[region_start:region_end]
candidates=[]
for m in re.finditer(r'(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{',region):
    args=m.group(2).strip()
    if not args: continue
    absolute=region_start+m.start()
    body=s[absolute:absolute+16000].lower()
    if any(k in body for k in ['instruction','command','prompt','message','rota']) and any(k in args.lower() for k in ['text','input','command','prompt','message','instruction']):
        candidates.append((absolute,m.group(1),args.split(',')[0].strip()))
if not candidates:
    raise SystemExit('Command handler not safely identifiable; refusing partial write')
pos,name,arg=min(candidates,key=lambda x:abs(x[0]-anchor))
brace=s.find('{',pos)+1
hook=f"\n  const __rotasticWeekCmd=rotasticParseWeeklyPhysicianCommand({arg});\n  if(__rotasticWeekCmd && typeof rotasticApplyWeeklyPhysicianCommand==='function'){{const __r=rotasticApplyWeeklyPhysicianCommand(__rotasticWeekCmd);if(__r!==undefined)return __r;}}\n"
if '__rotasticWeekCmd=rotasticParseWeeklyPhysicianCommand' not in s[pos:pos+4000]:
    s=s[:brace]+hook+s[brace:]

# Do not invent storage semantics. The app must expose its weekly state adapter.
if 'rotasticApplyWeeklyPhysicianCommand' not in s.replace(hook,''):
    raise SystemExit('Weekly command state adapter missing; refusing to guess storage semantics')

for token in ['ROTASTIC_SMARTBOX_WEEK_COMMANDS_V1',"action:'working'","action:'off'","action:'group'"]:
    if token not in s: raise SystemExit('missing Smart Box invariant '+token)
p.write_text(s,encoding='utf-8')
print('Smart Box weekly natural-language commands integrated; UI unchanged.')
