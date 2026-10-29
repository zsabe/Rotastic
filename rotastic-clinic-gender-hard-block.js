(()=>{
'use strict';
/* Data-only clinic candidate guard. No DOM/UI changes.
   Permanent rule: ANC=female only; WBC=male only. */
const KEY='rotastic_physician_rules';
const FEMALE_NAMES=[
  'Dr Fazila K.','Dr Fazila','Dr Maya S.','Dr Maya','Dr Oula T.','Dr Oula','Dr Ola',
  'Dr Tayseer A.','Dr Tayseer','Dr Taysir','Dr Saima N.','Dr Saima','Dr Rida',
  'Dr Laila','Dr Layla','Dr Leila','Dr Saba'
];
const norm=s=>String(s||'').trim().toLowerCase().replace(/\./g,'').replace(/^dr\s+/,'').replace(/[^a-z0-9]+/g,' ').trim();
const female=new Set(FEMALE_NAMES.map(norm));
function genderOf(name,rec){
  const values=[rec?.gender,rec?.sex,rec?.physicianGender,rec?.doctorGender];
  for(const value of values){
    const g=String(value||'').trim().toLowerCase();
    if(g==='female'||g==='f'||g==='woman')return 'female';
    if(g==='male'||g==='m'||g==='man')return 'male';
  }
  const permanent=window.ROTASTIC_PERMANENT_ROTA_RULES;
  if(permanent&&typeof permanent.isFemale==='function'&&permanent.isFemale(name))return 'female';
  if(female.has(norm(name)))return 'female';
  return '';
}
function candidateNames(out){
  const names=new Set([...Object.keys(out),...FEMALE_NAMES]);
  const sources=[window.physicians,window.doctors,window.physicianList,window.doctorList,window.roster,window.currentPhysicians];
  for(const src of sources){
    if(Array.isArray(src))for(const item of src){const n=typeof item==='string'?item:(item?.name||item?.doctor||item?.physician);if(n)names.add(n)}
    else if(src&&typeof src==='object')Object.keys(src).forEach(n=>names.add(n));
  }
  return names;
}
function forceClinicGenderExemptions(){
  try{
    const raw=localStorage.getItem(KEY);
    const rules=raw?JSON.parse(raw):{};
    const out=(rules&&typeof rules==='object'&&!Array.isArray(rules))?rules:{};
    candidateNames(out).forEach(name=>{
      const rec=(out[name]&&typeof out[name]==='object')?out[name]:{};
      const gender=genderOf(name,rec);
      if(gender==='female')rec.exemptWBC=true;
      if(gender==='male')rec.exemptANC=true;
      out[name]=rec;
    });
    localStorage.setItem(KEY,JSON.stringify(out));
  }catch(e){console.warn('ROTASTIC clinic gender hard block:',e)}
}
function installPoolGuards(){
  const wrap=n=>{const fn=window[n];if(typeof fn!=='function'||fn.__rotasticClinicGenderGuard)return;const guarded=function(...args){forceClinicGenderExemptions();return fn.apply(this,args)};guarded.__rotasticClinicGenderGuard=true;window[n]=guarded};
  ['generateRota','generateSchedule','generateWeeklyRota','generateWeeklySchedule','autoGenerateRota','autoGenerateSchedule'].forEach(wrap);
}
forceClinicGenderExemptions();
installPoolGuards();
setTimeout(()=>{forceClinicGenderExemptions();installPoolGuards()},0);
setTimeout(()=>{forceClinicGenderExemptions();installPoolGuards()},500);
setTimeout(()=>{forceClinicGenderExemptions();installPoolGuards()},1500);
setTimeout(()=>{forceClinicGenderExemptions();installPoolGuards()},4000);
window.rotasticForceClinicGenderExemptions=forceClinicGenderExemptions;
})();
