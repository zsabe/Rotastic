(()=>{
'use strict';
/* Export-only adapter. It exposes the exact currentSchedule fields expected by the locked export template. */
if(window.__rotasticExportActualRotaInstalled)return;window.__rotasticExportActualRotaInstalled=true;
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).replace(/\s+P$/i,'').replace(/\s*\((?:IUCD|SDI)\)\s*$/i,'').trim();
const isDoc=s=>/^Dr\.?\s+/i.test(norm(s));
const sameDoc=(a,b)=>{const x=norm(a).toLowerCase(),y=norm(b).toLowerCase();return !!x&&x===y};
const leaveNames=day=>{const x=day?.leaves||day?.leave||day?.leaveDoctors||day?.onLeave||[];return (Array.isArray(x)?x:[x]).map(v=>norm(typeof v==='string'?v:(v?.name||v?.doctor||v?.physician||''))).filter(isDoc)};
const shiftNames=sh=>{if(!sh)return[];const vals=[sh.med,sh.fed,sh.ped,sh.timed1Doc,sh.timed2Doc,sh.ancDoc,sh.ncdDoc,sh.wicDoc,sh.wbcDoc,sh.hearingDoc,sh.htDoc,sh.isolationDoc,sh.isoDoc];if(sh.rooms&&typeof sh.rooms==='object')vals.push(...Object.values(sh.rooms));return [...new Set(vals.map(norm).filter(isDoc))]};
function fallbackCount(day,p){const leaves=new Set(leaveNames(day).map(x=>x.toLowerCase()));return shiftNames(day?.[p]).filter(x=>!leaves.has(x.toLowerCase())).length}
function exactCount(day,p){const n=p==='am'?day?.amNotices:day?.pmNotices;const v=Number(n);return Number.isFinite(v)&&v>=0?v:fallbackCount(day,p)}
function exposeShift(day,p){const sh=day?.[p];if(!sh||typeof sh!=='object')return;
  /* Emergency and twilight: map directly from the rota, never from DOM text. */
  sh.maleER=sh.med||''; sh.femaleER=sh.fed||''; sh.paedsDoc=sh.ped||'';
  const t1=sh.timed1Doc||'',t2=sh.timed2Doc||'';
  if(p==='am'){sh.nineFour1=t1;sh.nineFour2=sameDoc(t1,t2)?'':t2}
  else{sh.twoEight1=t1;sh.twoEight2=sameDoc(t1,t2)?'':t2}
  /* Keep explicit clinic fields authoritative. */
  sh.ancDoc=sh.ancDoc||'';sh.ncdDoc=sh.ncdDoc||'';sh.wicDoc=sh.wicDoc||'';sh.wbcDoc=sh.wbcDoc||'';
  sh.hearingDoc=sh.hearingDoc||sh.htDoc||'';sh.isoDoc=sh.isoDoc||sh.isolationDoc||'';
}
function patchDay(day){if(!day||typeof day!=='object')return day;exposeShift(day,'am');exposeShift(day,'pm');
  /* Code Blue is an overlay role and must come only from cbAM/cbPM. */
  day.codeBlue={am:{tl:day?.cbAM?.tl||'',tm2:day?.cbAM?.tm2||'',tm3:day?.cbAM?.tm3||''},pm:{tl:day?.cbPM?.tl||'',tm2:day?.cbPM?.tm2||'',tm3:day?.cbPM?.tm3||''}};
  /* Notices must use the rota's actual per-shift totals (already leave-aware in the generator). */
  day.doctorsAM=day.drsAM=day.amCount=exactCount(day,'am');
  day.doctorsPM=day.drsPM=day.pmCount=exactCount(day,'pm');
  return day;
}
function patchSchedule(){const s=window.currentSchedule||window.rotasticCurrentSchedule||window.schedule||window.rota;if(Array.isArray(s))s.forEach(patchDay);else if(Array.isArray(s?.days))s.days.forEach(patchDay);return s}
window.rotasticPatchExportActualRota=patchSchedule;
/* Patch immediately and again immediately before every export. */
patchSchedule();
const wrap=n=>{const f=window[n];if(typeof f!=='function'||f.__actualRota)return;const w=function(...a){patchSchedule();return f.apply(this,a)};w.__actualRota=true;window[n]=w};
['exportToPDFReport','exportToImageReport','exportToXLSReport'].forEach(wrap);
let tries=0;const t=setInterval(()=>{tries++;patchSchedule();['exportToPDFReport','exportToImageReport','exportToXLSReport'].forEach(wrap);if(tries>120)clearInterval(t)},100);
})();
