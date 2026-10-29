(()=>{
'use strict';
const norm=s=>String(s||'').trim().toLowerCase().replace(/\./g,'').replace(/\s+/g,' ');
const FEMALE_SIDE_ONLY=new Set(['Dr Fazila K','Dr Maya S','Dr Oula T','Dr Tayseer A','Dr Saima N','Dr Rida','Dr Laila','Dr Saba']);
/* Permanent rule: these physicians must NEVER be assigned to any Code Blue position (TL, TM2, TM3; AM or PM). */
const CODE_BLUE_BLOCKED=new Set([
 'Dr Saleh',
 'Dr Maher','Dr Maher A',
 'Dr Abdulghafoor','Dr Abdulgafoor','Dr Abdel Ghafoor','Dr Abdelghafoor','Dr Abdulghafoor K','Dr Abdulgafoor K',
 'Dr Mohammed Sayed','Dr Mohamed Sayed','Dr Muhammad Sayed','Dr Mohamed S','Dr Mohammed S','Dr Muhammad S'
]);
const GROUPS=Object.freeze({group1:['Dr Laila','Dr Saleh'],group2:['Dr Saba']});
const same=(a,b)=>norm(a)===norm(b),inSet=(set,d)=>[...set].some(x=>same(x,d));
const isFemale=d=>inSet(FEMALE_SIDE_ONLY,d),codeBlueBlocked=d=>inSet(CODE_BLUE_BLOCKED,d);
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
/* Generator-safe helpers: callers should filter Code Blue candidate pools with these BEFORE selection. */
const filterCodeBlueCandidates=doctors=>(Array.isArray(doctors)?doctors:[]).filter(d=>!codeBlueBlocked(typeof d==='string'?d:(d?.name||d?.doctor||d?.physician||'')));
const canAssignCodeBlue=doctor=>!codeBlueBlocked(typeof doctor==='string'?doctor:(doctor?.name||doctor?.doctor||doctor?.physician||''));
window.ROTASTIC_PERMANENT_ROTA_RULES=Object.freeze({femaleSideOnly:[...FEMALE_SIDE_ONLY],maleOnlyTwilight:['9-4','2-8'],codeBlueBlocked:[...CODE_BLUE_BLOCKED],groups:GROUPS,noSameDayAmPm:true,fairMaleFemaleDistribution:true,offStatus:'explicit-leave-only',isFemale,codeBlueBlocked,canAssignCodeBlue,filterCodeBlueCandidates,doctorGroup,displayName,validate});
window.rotasticValidateRota=validate;
window.rotasticCanAssignCodeBlue=canAssignCodeBlue;
window.rotasticFilterCodeBlueCandidates=filterCodeBlueCandidates;
window.rotasticScheduleDisplayName=displayName;
})();
