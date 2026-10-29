(()=>{
'use strict';
/* Data-only clinic candidate guard. No DOM/UI changes.
   The rota generator reads rotastic_physician_rules exemption flags when building clinic pools.
   Permanent rule: ANC=female only; WBC=male only. */
const KEY='rotastic_physician_rules';
const FALLBACK_FEMALE_NAMES=[
  'Dr Fazila K.','Dr Fazila','Dr Maya S.','Dr Maya','Dr Oula T.','Dr Oula','Dr Ola',
  'Dr Tayseer A.','Dr Tayseer','Dr Taysir','Dr Saima N.','Dr Saima','Dr Rida','Dr Laila','Dr Saba'
];
const norm=s=>String(s||'').trim().toLowerCase().replace(/\./g,'').replace(/^dr\s+/,'').replace(/[^a-z0-9]+/g,' ').trim();
const fallbackFemale=new Set(FALLBACK_FEMALE_NAMES.map(norm));
function genderOf(name,rec){
  const values=[rec?.gender,rec?.sex,rec?.physicianGender,rec?.doctorGender];
  for(const value of values){
    const g=String(value||'').trim().toLowerCase();
    if(g==='female'||g==='f'||g==='woman')return 'female';
    if(g==='male'||g==='m'||g==='man')return 'male';
  }
  const permanent=window.ROTASTIC_PERMANENT_ROTA_RULES;
  if(permanent&&typeof permanent.isFemale==='function'&&permanent.isFemale(name))return 'female';
  if(fallbackFemale.has(norm(name)))return 'female';
  return 'male';
}
function forceClinicGenderExemptions(){
  try{
    const raw=localStorage.getItem(KEY);
    const rules=raw?JSON.parse(raw):{};
    const out=(rules&&typeof rules==='object'&&!Array.isArray(rules))?rules:{};
    Object.keys(out).forEach(name=>{
      const rec=(out[name]&&typeof out[name]==='object')?out[name]:{};
      const gender=genderOf(name,rec);
      if(gender==='female')rec.exemptWBC=true;
      if(gender==='male')rec.exemptANC=true;
      out[name]=rec;
    });
    localStorage.setItem(KEY,JSON.stringify(out));
  }catch(e){console.warn('ROTASTIC clinic gender hard block:',e)}
}
forceClinicGenderExemptions();
setTimeout(forceClinicGenderExemptions,0);
setTimeout(forceClinicGenderExemptions,500);
setTimeout(forceClinicGenderExemptions,1500);
window.rotasticForceClinicGenderExemptions=forceClinicGenderExemptions;
})();
