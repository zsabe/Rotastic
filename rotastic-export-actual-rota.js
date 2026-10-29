(()=>{
'use strict';
/* Export-only source adapter: read the exact assignments already stored in currentSchedule. */
if(window.__rotasticExportActualRotaInstalled)return;window.__rotasticExportActualRotaInstalled=true;
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).replace(/\s+P$/i,'').replace(/\s*\((?:IUCD|SDI)\)\s*$/i,'').trim();
const isDoc=s=>/^Dr\.?\s+/i.test(norm(s));
const leaveNames=day=>{const x=day?.leaves||day?.leave||day?.leaveDoctors||day?.onLeave||[];return (Array.isArray(x)?x:[x]).map(v=>norm(typeof v==='string'?v:(v?.name||v?.doctor||v?.physician||''))).filter(isDoc)};
const shiftNames=sh=>{if(!sh)return[];const vals=[sh.med,sh.fed,sh.ped,sh.timed1Doc,sh.timed2Doc,sh.ancDoc,sh.ncdDoc,sh.wicDoc,sh.wbcDoc,sh.hearingDoc,sh.htDoc,sh.isolationDoc];if(sh.rooms&&typeof sh.rooms==='object')vals.push(...Object.values(sh.rooms));return [...new Set(vals.map(v=>norm(v)).filter(isDoc))]};
function count(day,p){const leaves=new Set(leaveNames(day).map(x=>x.toLowerCase()));return shiftNames(day?.[p]).filter(x=>!leaves.has(x.toLowerCase())).length}
function patchDay(day){if(!day||typeof day!=='object')return day;day.doctorsAM=count(day,'am');day.drsAM=day.doctorsAM;day.amCount=day.doctorsAM;day.doctorsPM=count(day,'pm');day.drsPM=day.doctorsPM;day.pmCount=day.doctorsPM;return day}
function patchSchedule(){const s=window.currentSchedule||window.rotasticCurrentSchedule||window.schedule||window.rota;if(Array.isArray(s))s.forEach(patchDay);else if(Array.isArray(s?.days))s.days.forEach(patchDay);return s}
window.rotasticPatchExportActualRota=patchSchedule;
/* The renderer calls currentSchedule at export time. Keep its data authoritative and counts leave-aware. */
const wrap=n=>{const f=window[n];if(typeof f!=='function'||f.__actualRota)return;const w=function(...a){patchSchedule();return f.apply(this,a)};w.__actualRota=true;window[n]=w};
['exportToPDFReport','exportToImageReport','exportToXLSReport'].forEach(wrap);
let tries=0;const t=setInterval(()=>{tries++;['exportToPDFReport','exportToImageReport','exportToXLSReport'].forEach(wrap);if(tries>120)clearInterval(t)},100);
})();
