/* Unified day navigation/header and assignment-based shift counts. */
(()=>{
'use strict';if(window.__rotasticUnifiedDayUI)return;window.__rotasticUnifiedDayUI=true;
const style=document.createElement('style');style.textContent=`
body:has(#scheduleMatrixContainer .rotastic-day-sheet) #rotaDaySelector{display:none!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head{position:relative!important;padding:12px 45px!important;min-height:78px!important;display:flex!important;align-items:center!important}
body.rotastic-rota-view-active .rotastic-day-header-main{width:100%!important;gap:8px!important}
body.rotastic-rota-view-active .rotastic-day-weather-icon{width:34px!important;flex:0 0 34px!important;height:42px!important;font-size:26px!important}
body.rotastic-rota-view-active .rotastic-day-header-lines{gap:2px!important}
body.rotastic-rota-view-active .rotastic-day-header-lines strong{font-size:15px!important;white-space:nowrap!important;overflow-wrap:normal!important}
body.rotastic-rota-view-active .rotastic-day-header-lines span{font-size:12px!important}
body.rotastic-rota-view-active .rotastic-day-nav-arrow{display:flex!important;align-items:center;justify-content:center;position:absolute!important;top:50%!important;transform:translateY(-50%)!important;z-index:10!important}
body.rotastic-rota-view-active .rotastic-day-nav-arrow.prev{left:4px!important}
body.rotastic-rota-view-active .rotastic-day-nav-arrow.next{right:4px!important}
body.rotastic-rota-view-active .rotastic-day-sheet>.rotastic-twilight-panel{margin:5px 2px 9px!important;padding:9px!important}
body.rotastic-rota-view-active .rotastic-shift-head{padding:0!important;min-height:0!important;height:auto!important;border:0!important}
body.rotastic-rota-view-active .rotastic-shift-head>*:not(.rotastic-shift-notice){display:none!important}
body.rotastic-rota-view-active .rotastic-shift-notice{display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:wrap!important;padding:7px 11px!important;gap:9px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}
body.rotastic-rota-view-active .rotastic-shift-notice .rotastic-shift-day-total{display:none!important}
body.rotastic-rota-view-active .rotastic-shift-notice *{min-width:0!important}
@media(max-width:420px){body.rotastic-rota-view-active .rotastic-day-header-lines strong{font-size:13px!important}body.rotastic-rota-view-active .rotastic-shift-notice{font-size:11px!important}}
/* Balanced three-zone header: small animated icon, readable details, compact legend. */
body.rotastic-rota-view-active .rotastic-day-sheet-head{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;column-gap:16px!important;padding:14px 48px!important;min-height:92px!important;box-sizing:border-box!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head>.rotastic-day-header-main{display:flex!important;align-items:center!important;justify-content:flex-start!important;width:auto!important;min-width:0!important;flex:initial!important;gap:12px!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head>.rotastic-day-key{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:7px!important;position:static!important;margin:0!important;min-width:92px!important;max-width:130px!important;font-size:11px!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head>.rotastic-day-key>span{display:flex!important;align-items:center!important;gap:7px!important;white-space:nowrap!important;font-size:11px!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head .rotastic-day-weather-icon{font-size:22px!important;width:30px!important;height:32px!important;flex:0 0 30px!important;animation:rotastic-celestial-float 3.8s ease-in-out infinite!important;transform-origin:center}
@keyframes rotastic-celestial-float{0%,100%{transform:translateY(2px) rotate(-9deg);opacity:.9;filter:drop-shadow(0 0 3px rgba(250,204,21,.35))}50%{transform:translateY(-3px) rotate(7deg);opacity:1;filter:drop-shadow(0 0 9px rgba(250,204,21,.65))}}
@media(prefers-reduced-motion:reduce){body.rotastic-rota-view-active .rotastic-day-sheet-head .rotastic-day-weather-icon{animation:none!important}}
body.rotastic-rota-view-active .rotastic-day-sheet-head .rotastic-day-header-lines{min-width:0!important;gap:5px!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head .rotastic-day-header-lines strong{font-size:clamp(14px,2.8vw,19px)!important;line-height:1.2!important;white-space:normal!important;overflow-wrap:normal!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head .rotastic-day-header-lines span{font-size:clamp(11px,2.3vw,14px)!important;line-height:1.3!important}
@media(max-width:390px){body.rotastic-rota-view-active .rotastic-day-sheet-head{padding-left:37px!important;padding-right:37px!important;column-gap:7px!important}body.rotastic-rota-view-active .rotastic-day-sheet-head>.rotastic-day-key{min-width:76px!important}body.rotastic-rota-view-active .rotastic-day-sheet-head>.rotastic-day-header-main{gap:6px!important}}
`;document.head.appendChild(style);
const normalize=n=>String(n||'').toLowerCase().replace(/\s*\([^)]*\)/g,'').replace(/^dr\.?\s*/,'').replace(/[^a-z0-9]/g,'').replace(/^(ghanim|ganim|gshafi)$/,'gshafi').replace(/^(muhammadk|qaisark)$/,'qaisar');
const valid=n=>/^dr\.?\s/i.test(String(n||''));
function names(v,out){if(typeof v==='string'){if(valid(v))out.push(v)}else if(Array.isArray(v)){v.forEach(x=>names(x,out))}else if(v&&typeof v==='object'){if(v.doctor||v.name)names(v.doctor||v.name,out);else Object.values(v).forEach(x=>names(x,out))}}
function count(day,p){const sh=day?.[p];if(!sh)return 0;const found=[];
 for(const key of ['rooms','med','fed','ped','timed1Doc','timed2Doc','ancDoc','cmcDoc','wbcDoc','iucdDoc','sdiDoc','smokingDoc','noRoomDocs','specialAssignments'])names(sh[key],found);
 // Code Blue is a duty carried out by already rostered doctors, not an extra headcount.
 const seen=new Set(found.map(normalize).filter(Boolean));
 return [...seen].filter(k=>!window.rotasticDoctorIsOnDisplayedLeave?.(found.find(n=>normalize(n)===k),day,p)).length;
}
let active=0;
function update(){
 const root=document.getElementById('scheduleMatrixContainer');if(!root||!document.body.classList.contains('rotastic-rota-view-active'))return;
 const days=window.currentSchedule||[];const sheets=[...root.querySelectorAll('.rotastic-day-sheet')];if(!days.length||!sheets.length)return;
 if(sheets.length===1){const date=sheets[0].querySelector('.rotastic-day-sheet-head')?.textContent||'';const idx=days.findIndex(d=>date.includes(d.isoDate||d.date));if(idx>=0)active=idx;else if(Number.isInteger(window.activeDayIndex))active=window.activeDayIndex}
 active=Math.max(0,Math.min(days.length-1,active));
 for(const [i,sheet] of sheets.entries()){
  if(sheets.length>1)sheet.style.display=i===active?'':'none';
  const day=sheets.length===1?days[active]:days[i];if(!day)continue;
  const head=sheet.querySelector('.rotastic-day-sheet-head');if(!head)continue;
  for(const [cls,dir] of [['prev',-1],['next',1]]){let btn=head.querySelector('.rotastic-day-nav-arrow.'+cls);if(!btn){btn=document.createElement('button');btn.type='button';btn.className='rotastic-day-nav-arrow '+cls;btn.textContent=dir<0?'‹':'›';head.append(btn)}btn.style.display='flex';btn.disabled=active+dir<0||active+dir>=days.length;btn.onclick=()=>go(dir)}
  const title=head.querySelector('.rotastic-day-header-lines strong');if(title){const d=new Date((day.isoDate||day.date)+'T12:00:00');const label=(day.day||'')+' · '+(Number.isFinite(d.getTime())?d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}):day.date);if(title.textContent!==label)title.textContent=label}
  for(const [j,panel] of [...sheet.querySelectorAll('.rotastic-shift-panel')].entries()){
   const p=panel.dataset.shiftPeriod|| (panel.classList.contains('rotastic-shift-pm')?'pm':j===0?'am':'pm');
   const notice=panel.querySelector('.rotastic-shift-notice');if(!notice)continue;
   const total=count(day,p);const label=[...notice.querySelectorAll('span')].find(e=>/total on duty/i.test(e.textContent));
   if(label?.nextElementSibling&&label.nextElementSibling.textContent!==String(total))label.nextElementSibling.textContent=String(total);
   const extra=notice.querySelector('.rotastic-shift-day-total');if(extra)extra.remove();
  }
 }
}
function go(dir){const next=active+dir;const days=window.currentSchedule||[];if(next<0||next>=days.length)return;active=next;if(typeof window.filterDay==='function'){window.filterDay(next)}else if(typeof window.setActiveDayIndex==='function'){window.setActiveDayIndex(next)}else if(typeof window.renderScheduleView==='function'){window.activeDayIndex=next;window.renderScheduleView()}update()}
let start=null;document.addEventListener('touchstart',e=>{if(!e.target.closest?.('#scheduleMatrixContainer .rotastic-day-sheet-head'))return;start={x:e.touches[0].clientX,y:e.touches[0].clientY}},{passive:true});
document.addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)go(dx<0?1:-1)},{passive:true});
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()})}).observe(document.documentElement,{subtree:true,childList:true});document.addEventListener('DOMContentLoaded',update);setTimeout(update,650);
})();