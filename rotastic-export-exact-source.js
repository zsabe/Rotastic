(()=>{
'use strict';
/* Export-only exact source layer. Replaces fuzzy export mapping with currentSchedule fields. */
if(window.__rotasticExportExactSourceInstalled)return;window.__rotasticExportExactSourceInstalled=true;
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const name=s=>{s=clean(s);if(!s||s==='-'||/^no clinic$/i.test(s))return s==='-'?'':s;if(/\bmoursi\b/i.test(s))return 'Dr Morsi';if(/\b(muhammad|mohammed|mohamed)?\s*(k\.?\s*)?(qaisar|kaisar|kaiser)\b/i.test(s))return 'Dr Qaisar';return s.replace(/\s+P$/i,'').replace(/\s*\((?:IUCD|SDI)\)\s*$/i,'').trim()};
const isDoc=s=>/^Dr\.?\s+/i.test(name(s));
const leaves=d=>{const x=d?.leaves||d?.leave||d?.leaveDoctors||d?.onLeave||[];return [...new Set((Array.isArray(x)?x:[x]).map(v=>name(typeof v==='string'?v:(v?.name||v?.doctor||v?.physician||''))).filter(isDoc))]};
const shiftDocs=sh=>{if(!sh)return[];const a=[sh.med,sh.fed,sh.ped,sh.timed1Doc,sh.timed2Doc,sh.ancDoc,sh.ncdDoc,sh.wicDoc,sh.wbcDoc,sh.hearingDoc,sh.htDoc,sh.isolationDoc];if(sh.rooms&&typeof sh.rooms==='object')a.push(...Object.values(sh.rooms));return [...new Set(a.map(name).filter(isDoc))]};
const count=(d,p)=>{const off=new Set(leaves(d).map(x=>x.toLowerCase()));return shiftDocs(d?.[p]).filter(x=>!off.has(x.toLowerCase())).length};
function patchDay(d){if(!d||typeof d!=='object')return;d.doctorsAM=d.drsAM=d.amCount=count(d,'am');d.doctorsPM=d.drsPM=d.pmCount=count(d,'pm')}
function patch(){const s=window.currentSchedule||window.rotasticCurrentSchedule||window.schedule||window.rota;if(Array.isArray(s))s.forEach(patchDay);else if(Array.isArray(s?.days))s.days.forEach(patchDay)}
/* Exact getters used by export renderer v7. */
window.rotasticExportExact={
 name,
 leaves,
 count,
 duty(d,p,k){const sh=d?.[p]||{};const map={male:'med',female:'fed',paeds:'ped',t1:'timed1Doc',t2:'timed2Doc',anc:'ancDoc',ncd:'ncdDoc',wic:'wicDoc',wbc:'wbcDoc',ht:'hearingDoc',iso:'isolationDoc'};let v=sh[map[k]];if(k==='ht'&&!v)v=sh.htDoc;return name(v)},
 cb(d,p,r){const q=d?.[p==='am'?'cbAM':'cbPM']||{};return name(q[r])},
 room(d,p,n){return name(d?.[p]?.rooms?.[n])}
};
window.rotasticPatchExportExactSource=()=>{patch();return window.rotasticExportExact};
patch();
})();