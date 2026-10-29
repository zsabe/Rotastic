(()=>{
'use strict';
/* Data-only permanent Code Blue guard. No DOM/UI changes. */
const KEY='rotastic_physician_rules';
const BLOCKED=[
  'Dr Abdulgafoor K.',
  'Dr Maher A.',
  'Dr Saleh',
  'Dr Mohammed S.'
];
function forceCodeBlueExemptions(){
  try{
    const raw=localStorage.getItem(KEY);
    const rules=raw?JSON.parse(raw):{};
    const out=(rules&&typeof rules==='object'&&!Array.isArray(rules))?rules:{};
    BLOCKED.forEach(name=>{
      const rec=(out[name]&&typeof out[name]==='object')?out[name]:{};
      rec.employment=rec.employment||'permanent';
      rec.exemptCodeBlue=true;
      out[name]=rec;
    });
    localStorage.setItem(KEY,JSON.stringify(out));
  }catch(e){console.warn('ROTASTIC Code Blue hard block:',e)}
}
forceCodeBlueExemptions();
setTimeout(forceCodeBlueExemptions,0);
setTimeout(forceCodeBlueExemptions,500);
setTimeout(forceCodeBlueExemptions,1500);
window.rotasticForceCodeBlueExemptions=forceCodeBlueExemptions;
})();
