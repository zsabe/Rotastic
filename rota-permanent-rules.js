(()=>{
'use strict';
const norm=s=>String(s||'').trim().toLowerCase().replace(/\./g,'').replace(/\s+/g,' ');
const FEMALE_SIDE_ONLY=new Set(['Dr Fazila K','Dr Maya S','Dr Oula T','Dr Tayseer A','Dr Saima N','Dr Rida','Dr Laila','Dr Saba']);
const CODE_BLUE_BLOCKED=new Set(['Dr Saleh','Saleh','Dr Maher','Dr Maher A','Maher','Maher A','Dr Abdulghafoor','Dr Abdulgafoor','Dr Abdel Ghafoor','Dr Abdelghafoor','Dr Abdulghafoor K','Dr Abdulgafoor K','Abdulghafoor','Abdulgafoor','Abdel Ghafoor','Abdelghafoor','Dr Mohammed Sayed','Dr Mohamed Sayed','Dr Muhammad Sayed','Dr Mohamed S','Dr Mohammed S','Dr Muhammad S','Mohammed Sayed','Mohamed Sayed','Muhammad Sayed','Mohamed S','Mohammed S','Muhammad S']);
const GROUPS=Object.freeze({group1:['Dr Laila','Dr Saleh'],group2:['Dr Saba']});
const compact=s=>norm(s).replace(/^dr\s+/,'').replace(/[^a-z0-9]+/g,' ').trim();
const blockedKeys=new Set([...CODE_BLUE_BLOCKED].map(compact));
const same=(a,b)=>norm(a)===norm(b),inSet=(set,d)=>[...set].some(x=>same(x,d));
const isFemale=d=>inSet(FEMALE_SIDE_ONLY,d);
const doctorName=d=>typeof d==='string'?d:(d?.name||d?.doctor||d?.physician||'');
const codeBlueBlocked=d=>{const k=compact(doctorName(d));return !!k&&blockedKeys.has(k)};
const doctorGroup=d=>Object.entries(GROUPS).find(([,a])=>a.some(x=>same(x,d)))?.[0]||null;
const displayName=d=>String(d||'').trim().replace(/\bDr\.?\s+Morsi\b/i,'Dr Moursi');
const isCodeBlueRole=a=>/code\s*blue|\bTL\b|\bTM\s*2\b|\bTM\s*3\b|\bTM2\b|\bTM3\b/i.test(String(a?.role||a?.clinic||a?.assignment||a?.position||a?.duty||''));
const dateOf=a=>String(a?.date||a?.isoDate||a?.dayDate||a?.shiftDate||'').slice(0,10);
const isLeave=a=>a?.leave===true||a?.onLeave===true||a?.isLeave===true||/\b(leave|annual leave|on leave)\b/i.test(String(a?.status||a?.role||a?.assignment||a?.duty||''));
const leaveKey=(doctor,date)=>`${date}|${compact(doctor)}`;
function collectLeaveKeys(assignments=[]){const keys=new Set();for(const a of Array.isArray(assignments)?assignments:[]){const d=doctorName(a),dt=dateOf(a);if(d&&dt&&isLeave(a))keys.add(leaveKey(d,dt));}return keys}
function validate(assignments=[]){
 const errors=[],byDay=new Map(),leaveKeys=collectLeaveKeys(assignments);
 for(const a of assignments){const doctor=doctorName(a),role=String(a.role||a.clinic||a.assignment||a.position||a.duty||''),shift=String(a.shift||'').toUpperCase(),date=dateOf(a);if(!doctor)continue;
  if(date&&leaveKeys.has(leaveKey(doctor,date))&&!isLeave(a))errors.push(`${displayName(doctor)} is on leave and cannot have any assignment on ${date}`);
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
const filterCodeBlueCandidates=doctors=>(Array.isArray(doctors)?doctors:[]).filter(d=>!codeBlueBlocked(d));
const canAssignCodeBlue=doctor=>!codeBlueBlocked(doctor);
const cbKey=k=>/code.?blue|^(am|pm)?_?(tl|tm2|tm3)$|^(tl|tm2|tm3)_(am|pm)$/i.test(String(k||''));
function scrubCodeBlue(node,inCodeBlue=false,seen=new WeakSet()){if(!node||typeof node!=='object'||seen.has(node))return 0;seen.add(node);let changed=0;if(Array.isArray(node)){for(let i=node.length-1;i>=0;i--){const v=node[i];if(inCodeBlue&&codeBlueBlocked(v)){node.splice(i,1);changed++;continue}changed+=scrubCodeBlue(v,inCodeBlue,seen)}return changed}for(const k of Object.keys(node)){const v=node[k],ctx=inCodeBlue||cbKey(k);if(ctx&&typeof v==='string'&&codeBlueBlocked(v)){node[k]='';changed++;continue}if(ctx&&v&&typeof v==='object'&&codeBlueBlocked(v)){if('doctor'in v)v.doctor='';else if('physician'in v)v.physician='';else if('name'in v)v.name='';changed++;continue}changed+=scrubCodeBlue(v,ctx,seen)}return changed}
function enforceCodeBlueExclusions(schedule){return scrubCodeBlue(schedule||window.currentSchedule||null,false)}
/* Leave is absolute: once a physician/date is marked leave, remove every other duty for that physician/date. */
function enforceLeaveExclusions(schedule){
 const root=schedule||window.currentSchedule;if(!root||typeof root!=='object')return 0;let changed=0;
 const arrays=[];const seen=new WeakSet();(function walk(n){if(!n||typeof n!=='object'||seen.has(n))return;seen.add(n);if(Array.isArray(n)){arrays.push(n);n.forEach(walk);return}Object.values(n).forEach(walk)})(root);
 const all=arrays.flat().filter(v=>v&&typeof v==='object'&&!Array.isArray(v));const keys=collectLeaveKeys(all);if(!keys.size)return 0;
 for(const arr of arrays){for(let i=arr.length-1;i>=0;i--){const a=arr[i];if(!a||typeof a!=='object'||Array.isArray(a))continue;const d=doctorName(a),dt=dateOf(a);if(d&&dt&&keys.has(leaveKey(d,dt))&&!isLeave(a)){arr.splice(i,1);changed++;}}}
 return changed;
}
function enforcePermanentRules(schedule){const root=schedule||window.currentSchedule;let changed=0;changed+=enforceLeaveExclusions(root);changed+=enforceCodeBlueExclusions(root);return changed}
function installGeneratorGuards(){const names=['generateSchedule','generateRota','buildSchedule','buildRota','createSchedule','createRota'];names.forEach(name=>{const fn=window[name];if(typeof fn!=='function'||fn.__rotasticPermanentGuard)return;const wrapped=function(...args){const out=fn.apply(this,args);if(out&&typeof out.then==='function')return out.then(v=>{enforcePermanentRules(v);enforcePermanentRules(window.currentSchedule);return v});enforcePermanentRules(out);enforcePermanentRules(window.currentSchedule);return out};wrapped.__rotasticPermanentGuard=true;window[name]=wrapped});const render=window.renderSchedule;if(typeof render==='function'&&!render.__rotasticPermanentGuard){const wrapped=function(...args){enforcePermanentRules(window.currentSchedule);return render.apply(this,args)};wrapped.__rotasticPermanentGuard=true;window.renderSchedule=wrapped}}
window.ROTASTIC_PERMANENT_ROTA_RULES=Object.freeze({femaleSideOnly:[...FEMALE_SIDE_ONLY],maleOnlyTwilight:['9-4','2-8'],codeBlueBlocked:[...CODE_BLUE_BLOCKED],groups:GROUPS,noSameDayAmPm:true,fairMaleFemaleDistribution:true,offStatus:'explicit-leave-only',leaveMeansZeroAssignments:true,isFemale,codeBlueBlocked,canAssignCodeBlue,filterCodeBlueCandidates,enforceCodeBlueExclusions,enforceLeaveExclusions,enforcePermanentRules,doctorGroup,displayName,validate});
window.rotasticValidateRota=validate;window.rotasticCanAssignCodeBlue=canAssignCodeBlue;window.rotasticFilterCodeBlueCandidates=filterCodeBlueCandidates;window.rotasticEnforceCodeBlueExclusions=enforceCodeBlueExclusions;window.rotasticEnforceLeaveExclusions=enforceLeaveExclusions;window.rotasticEnforcePermanentRules=enforcePermanentRules;window.rotasticScheduleDisplayName=displayName;
installGeneratorGuards();setTimeout(installGeneratorGuards,0);setTimeout(installGeneratorGuards,1000);setTimeout(()=>enforcePermanentRules(window.currentSchedule),1200);
})();
