(()=>{
'use strict';
const norm=s=>String(s||'').trim().toLowerCase().replace(/\./g,'').replace(/\s+/g,' ');
const FEMALE_SIDE_ONLY=new Set(['Dr Fazila K','Dr Maya S','Dr Oula T','Dr Tayseer A','Dr Saima N','Dr Rida','Dr Laila','Dr Saba']);
/* Permanent rule: these physicians must NEVER be assigned to any Code Blue position (TL, TM2, TM3; AM or PM). */
const CODE_BLUE_BLOCKED=new Set([
 'Dr Saleh','Saleh',
 'Dr Maher','Dr Maher A','Maher','Maher A',
 'Dr Abdulghafoor','Dr Abdulgafoor','Dr Abdel Ghafoor','Dr Abdelghafoor','Dr Abdulghafoor K','Dr Abdulgafoor K','Abdulghafoor','Abdulgafoor','Abdel Ghafoor','Abdelghafoor',
 'Dr Mohammed Sayed','Dr Mohamed Sayed','Dr Muhammad Sayed','Dr Mohamed S','Dr Mohammed S','Dr Muhammad S','Mohammed Sayed','Mohamed Sayed','Muhammad Sayed','Mohamed S','Mohammed S','Muhammad S'
]);
const GROUPS=Object.freeze({group1:['Dr Laila','Dr Saleh'],group2:['Dr Saba']});
const compact=s=>norm(s).replace(/^dr\s+/,'').replace(/[^a-z0-9]+/g,' ' ).trim();
const blockedKeys=new Set([...CODE_BLUE_BLOCKED].map(compact));
const same=(a,b)=>norm(a)===norm(b),inSet=(set,d)=>[...set].some(x=>same(x,d));
const isFemale=d=>inSet(FEMALE_SIDE_ONLY,d);
const codeBlueBlocked=d=>{const k=compact(typeof d==='string'?d:(d?.name||d?.doctor||d?.physician||''));return !!k&&blockedKeys.has(k)};
const doctorGroup=d=>Object.entries(GROUPS).find(([,a])=>a.some(x=>same(x,d)))?.[0]||null;
const displayName=d=>String(d||'').trim().replace(/\bDr\.?\s+Morsi\b/i,'Dr Moursi');
const isCodeBlueRole=a=>/code\s*blue|\bTL\b|\bTM\s*2\b|\bTM\s*3\b|\bTM2\b|\bTM3\b/i.test(String(a?.role||a?.clinic||a?.assignment||a?.position||a?.duty||''));
function validate(assignments=[]){
 const errors=[],byDay=new Map();
 for(const a of assignments){const doctor=a.doctor||a.name||a.physician||'',role=String(a.role||a.clinic||a.assignment||a.position||a.duty||''),shift=String(a.shift||'').toUpperCase(),date=String(a.date||a.isoDate||'');if(!doctor)continue;
  if((/^(9\s*[-–]\s*4|2\s*[-–]\s*8)$/i.test(role)||/^(9\s*[-–]\s*4|2\s*[-–]\s*8)$/i.test(shift))&&isFemale(doctor))errors.push(`${displayName(doctor)} cannot work ${role||shift}`);
  if(isFemale(doctor)&&!/(female|leave|off|management)/i.test(role)&&/(male|paeds|emergency)/i.test(role))errors.push(`${displayName(doctor)} must work on the female side only`);
  if(isCodeBlueRole(a)&&codeBlueBlocked(doctor))errors.push(`${displayName(doctor)} cannot work Code Blue`);
  if(a.off===true&&!a.leave&&!/leave/i.test(role))errors.push(`${displayName(doctor)} may only be marked off for explicit leave`);
  const g=doctorGroup(doctor);if(a.group&&g&&norm(a.group).replace(/\s/g,'')!==g)errors.push(`${displayName(doctor)} must remain in ${g.replace('group','Group ')}`);
  const k=`${date}|${norm(doctor)}`;if(!byDay.has(k))byDay.set(k,new Set());if(shift==='AM'||shift==='PM')byDay.get(k).add(shift);
 }
 for(const [k,s] of byDay)if(s.has('AM')&&s.has('PM'))errors.push(`${displayName(k.split('|')[1])} cannot work both AM and PM on the same day`);
 return [...new Set(errors)];
}
const doctorName=d=>typeof d==='string'?d:(d?.name||d?.doctor||d?.physician||'');
const filterCodeBlueCandidates=doctors=>(Array.isArray(doctors)?doctors:[]).filter(d=>!codeBlueBlocked(doctorName(d)));
const canAssignCodeBlue=doctor=>!codeBlueBlocked(doctorName(doctor));
/*
 Enforce the rule on the generated schedule itself as a final safety net.
 This intentionally touches data only: no DOM, CSS, navigation or visual markup.
 It recognises common Code Blue containers/fields (codeBlue/code_blue/TL/TM2/TM3)
 and removes a blocked physician if an older generator selected one.
*/
const cbKey=k=>/code.?blue|^(am|pm)?_?(tl|tm2|tm3)$|^(tl|tm2|tm3)_(am|pm)$/i.test(String(k||''));
function scrubCodeBlue(node,inCodeBlue=false,seen=new WeakSet()){
 if(!node||typeof node!=='object'||seen.has(node))return 0;seen.add(node);let changed=0;
 if(Array.isArray(node)){
  for(let i=node.length-1;i>=0;i--){const v=node[i];if(inCodeBlue&&codeBlueBlocked(doctorName(v))){node.splice(i,1);changed++;continue}changed+=scrubCodeBlue(v,inCodeBlue,seen)}
  return changed;
 }
 for(const k of Object.keys(node)){
  const v=node[k],ctx=inCodeBlue||cbKey(k);
  if(ctx&&typeof v==='string'&&codeBlueBlocked(v)){node[k]='';changed++;continue}
  if(ctx&&v&&typeof v==='object'&&codeBlueBlocked(doctorName(v))){
   if('doctor' in v)v.doctor='';else if('physician' in v)v.physician='';else if('name' in v)v.name='';changed++;continue;
  }
  changed+=scrubCodeBlue(v,ctx,seen);
 }
 return changed;
}
function enforceCodeBlueExclusions(schedule){return scrubCodeBlue(schedule||window.currentSchedule||null,false)}
function installGeneratorGuards(){
 const names=['generateSchedule','generateRota','buildSchedule','buildRota','createSchedule','createRota'];
 names.forEach(name=>{const fn=window[name];if(typeof fn!=='function'||fn.__rotasticCodeBlueGuard)return;const wrapped=function(...args){const out=fn.apply(this,args);if(out&&typeof out.then==='function')return out.then(v=>{enforceCodeBlueExclusions(v);enforceCodeBlueExclusions(window.currentSchedule);return v});enforceCodeBlueExclusions(out);enforceCodeBlueExclusions(window.currentSchedule);return out};wrapped.__rotasticCodeBlueGuard=true;window[name]=wrapped});
 const render=window.renderSchedule;if(typeof render==='function'&&!render.__rotasticCodeBlueGuard){const wrapped=function(...args){enforceCodeBlueExclusions(window.currentSchedule);return render.apply(this,args)};wrapped.__rotasticCodeBlueGuard=true;window.renderSchedule=wrapped}
}
window.ROTASTIC_PERMANENT_ROTA_RULES=Object.freeze({femaleSideOnly:[...FEMALE_SIDE_ONLY],maleOnlyTwilight:['9-4','2-8'],codeBlueBlocked:[...CODE_BLUE_BLOCKED],groups:GROUPS,noSameDayAmPm:true,fairMaleFemaleDistribution:true,offStatus:'explicit-leave-only',isFemale,codeBlueBlocked,canAssignCodeBlue,filterCodeBlueCandidates,enforceCodeBlueExclusions,doctorGroup,displayName,validate});
window.rotasticValidateRota=validate;window.rotasticCanAssignCodeBlue=canAssignCodeBlue;window.rotasticFilterCodeBlueCandidates=filterCodeBlueCandidates;window.rotasticEnforceCodeBlueExclusions=enforceCodeBlueExclusions;window.rotasticScheduleDisplayName=displayName;
installGeneratorGuards();setTimeout(installGeneratorGuards,0);setTimeout(installGeneratorGuards,1000);setTimeout(()=>enforceCodeBlueExclusions(window.currentSchedule),1200);
})();
