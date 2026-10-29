(()=>{
'use strict';
if(window.__rotasticLatestSchedulingRules)return;window.__rotasticLatestSchedulingRules=true;
const key=v=>String(v||'').trim().toLowerCase().replace(/\./g,'').replace(/^dr\s+/,'').replace(/[^a-z0-9]+/g,' ').trim();
const first=v=>key(v).split(' ')[0]||'';
const doctorOf=v=>typeof v==='string'?v:(v?.doctor||v?.name||v?.physician||'');
const isFemale=v=>['fazila','maya','oula','ola','tayseer','taysir','saima','rida','laila','layla','leila','saba','fahima'].includes(first(v));
const isZaid=v=>/^zaid(\s|$)/.test(key(v));
const isAbdulgafoor=v=>/^(abdul\s*)?(ghafoor|gafoor|ghafour|gafour)(\s|$)/.test(key(v))||/^abdulgafoor(\s|$)/.test(key(v))||/^abdulghafoor(\s|$)/.test(key(v));
const isErField=k=>/^(male.?er|er.?male|male.?emergency|emergency.?male|female.?er|er.?female|female.?emergency|emergency.?female)$/i.test(String(k).replace(/[_-]+/g,' '))||/paed|pediatric|paediatric/i.test(String(k));
const isMaleEr=k=>/^(male.?er|er.?male|male.?emergency|emergency.?male)$/i.test(String(k).replace(/[_-]+/g,' '));
const isFemaleEr=k=>/^(female.?er|er.?female|female.?emergency|emergency.?female)$/i.test(String(k).replace(/[_-]+/g,' '));
const isTwilightField=k=>/twilight|timed|nine.?to.?four|two.?to.?eight|9.?4|2.?8/i.test(k);
const codeBlueBlocked=v=>isAbdulgafoor(v)||isZaid(v)||/^maher(\s|$)/.test(key(v))||/^(mohamed|mohammed|muhammad)\s+(sayed|saeed|s)(\s|$)/.test(key(v))||/^(saleh|salah)(\s|$)/.test(key(v));
function shiftDoctors(sh){const out=[];if(!sh)return out;if(sh.rooms)for(const v of Object.values(sh.rooms)){const d=doctorOf(v);if(d)out.push(d)}for(const k of Object.keys(sh)){if(k==='rooms'||isTwilightField(k))continue;const d=doctorOf(sh[k]);if(d)out.push(d)}return [...new Map(out.map(d=>[key(d),d])).values()]}
function erEligible(d,field){if(!d||isZaid(d)||isAbdulgafoor(d))return false;if(isMaleEr(field)&&isFemale(d))return false;if(isFemaleEr(field)&&!isFemale(d))return false;return true}
function enforceEr(sh){if(!sh)return 0;let changed=0;const fields=Object.keys(sh).filter(isErField),used=new Set(),candidates=shiftDoctors(sh);for(const f of fields){const d=doctorOf(sh[f]);if(!erEligible(d,f)||used.has(key(d))){if(d){sh[f]='';changed++}}else used.add(key(d))}for(const f of fields){if(doctorOf(sh[f]))continue;const pick=candidates.find(d=>erEligible(d,f)&&!used.has(key(d)));if(pick){sh[f]=pick;used.add(key(pick));changed++}}return changed}
function enforceCodeBlue(day,p,cbKey){const cb=day?.[cbKey],sh=day?.[p];if(!cb||!sh)return 0;let changed=0;const erDoctors=new Set(Object.keys(sh).filter(isErField).map(k=>key(doctorOf(sh[k]))).filter(Boolean));const used=new Set(),slots=Object.keys(cb);for(const s of slots){const d=doctorOf(cb[s]);if(!d||codeBlueBlocked(d)||used.has(key(d))){if(d){cb[s]='';changed++}}else used.add(key(d))}const candidates=shiftDoctors(sh).filter(d=>!codeBlueBlocked(d));for(const s of slots){if(doctorOf(cb[s]))continue;let pick=candidates.find(d=>!used.has(key(d))&&!erDoctors.has(key(d)));if(!pick)pick=candidates.find(d=>!used.has(key(d)));if(pick){cb[s]=pick;used.add(key(pick));changed++}}
// Prefer replacing an ER-overlap Code Blue doctor when an eligible non-ER alternative exists.
for(const s of slots){const cur=doctorOf(cb[s]);if(!cur||!erDoctors.has(key(cur)))continue;const otherUsed=new Set(slots.filter(x=>x!==s).map(x=>key(doctorOf(cb[x]))).filter(Boolean));const alt=candidates.find(d=>!erDoctors.has(key(d))&&!otherUsed.has(key(d)));if(alt&&key(alt)!==key(cur)){cb[s]=alt;changed++}}
return changed}
function balanceRooms(sh){if(!sh?.rooms)return 0;let changed=0;const rooms=sh.rooms;const maleRooms=Object.keys(rooms).filter(r=>Number(r)>=9&&Number(r)<=20),femaleRooms=Object.keys(rooms).filter(r=>Number(r)>20);for(const r of maleRooms){const d=doctorOf(rooms[r]);if(d&&isFemale(d)){const target=femaleRooms.find(x=>!doctorOf(rooms[x]));if(target){rooms[target]=d;rooms[r]='';changed++}}}
const countSide=list=>list.reduce((n,r)=>n+(doctorOf(rooms[r])?1:0),0);let m=countSide(maleRooms),f=countSide(femaleRooms);while(m-f>1){const from=maleRooms.find(r=>{const d=doctorOf(rooms[r]);return d&&!isFemale(d)&&!isAbdulgafoor(d)&&Number(r)!==9});const to=femaleRooms.find(r=>!doctorOf(rooms[r]));if(!from||!to)break;rooms[to]=rooms[from];rooms[from]='';m--;f++;changed++}while(f-m>1){const from=femaleRooms.find(r=>{const d=doctorOf(rooms[r]);return d&&!isFemale(d)&&!isAbdulgafoor(d)});const to=maleRooms.find(r=>!doctorOf(rooms[r])&&Number(r)!==9);if(!from||!to)break;rooms[to]=rooms[from];rooms[from]='';f--;m++;changed++}return changed}
function enforce(schedule){const root=schedule||window.currentSchedule,days=Array.isArray(root)?root:Array.isArray(root?.days)?root.days:[];let changed=0;for(const day of days){changed+=enforceEr(day?.am);changed+=enforceEr(day?.pm);changed+=enforceCodeBlue(day,'am','cbAM');changed+=enforceCodeBlue(day,'pm','cbPM');changed+=balanceRooms(day?.am);changed+=balanceRooms(day?.pm)}return changed}
window.rotasticEnforceLatestSchedulingRules=enforce;
window.ROTASTIC_LATEST_RULES=Object.freeze({femaleRooms:'21+',maleRooms:'either side',balanceSides:true,zaidERExcluded:true,oneERPerDoctor:true,uniqueCodeBluePositions:true,preferCodeBlueNotER:true});
setInterval(()=>{const n=enforce(window.currentSchedule);if(n)window.renderSchedule?.()},650);
})();