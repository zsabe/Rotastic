/* Match room Twilight markers to the actual shift assignments, not stale doctor flags. */
(()=>{
'use strict';
if(window.__rotasticTwilightVisualSync)return;window.__rotasticTwilightVisualSync=true;
const key=v=>String(v||'').toLowerCase().replace(/\\s*\\([^)]*\\)/g,'').replace(/\\s+p\\s*$/i,'').replace(/^dr\\.?\\s*/,'').replace(/[^a-z0-9]/g,'').replace(/^(muhammadk|mohammedk|mohammadk|mohamedk|qaisark)$/,'qaisar').replace(/^(ganim|ghanim|gshafi)$/,'gshafi').replace(/^(abdulgafoork|agafoor)$/,'agafoor').replace(/^(abdulrashids|arashid)$/,'arashid').replace(/^(shadit|shadi)$/,'shadi').replace(/^(enanm|enan)$/,'enan');
const css=document.createElement('style');css.textContent=`
body.rotastic-rota-view-active .rotastic-twilight-doctor{font-size:11px!important}
@media(max-width:430px){body.rotastic-rota-view-active .rotastic-twilight-doctor{font-size:10px!important}}
body.rotastic-rota-view-active .rotastic-exclusive-no-room{margin-top:12px!important;overflow-wrap:anywhere}
body.rotastic-rota-view-active .rotastic-shift-fit-grid>.rotastic-shift-fit-col:last-child>.rotastic-exclusive-no-room{width:100%;min-width:0}
body.rotastic-rota-view-active .rotastic-excel-extra-duties{display:none!important}
`;document.head.appendChild(css);
function sync(){
 const root=document.getElementById('scheduleMatrixContainer'),days=window.currentSchedule;
 if(!root||!Array.isArray(days))return;
 const sheets=[...root.querySelectorAll('.rotastic-day-sheet')];
 for(const [i,sheet] of sheets.entries()){
  const heading=sheet.querySelector('.rotastic-day-sheet-head')?.textContent||'';
  const day=days.find(d=>heading.includes(d.isoDate||'__unknown__')||heading.includes(d.date||'__unknown__'))||days[Number.isInteger(window.activeDayIndex)?window.activeDayIndex:i]||days[i];if(!day)continue;
  for(const [panelIndex,panel] of [...sheet.querySelectorAll('.rotastic-shift-panel')].entries()){
   const p=panel.dataset.shiftPeriod|| (panel.classList.contains('rotastic-shift-pm')?'pm':panelIndex===0?'am':'pm');
   const shift=day[p];if(!shift)continue;
   const actual=new Set([shift.timed1Doc,shift.timed2Doc].map(key).filter(k=>k&&k!=='noclinic'&&k!=='-'));
   // The Twilight panel lists doctors across the day; match room cards to the actual assigned doctor.
   const both=new Set([...actual,...['am','pm'].flatMap(period=>[day[period]?.timed1Doc,day[period]?.timed2Doc]),...([...sheet.querySelectorAll('.rotastic-twilight-slot:not(.rotastic-twilight-slot-missing) .rotastic-twilight-doctor')].map(el=>el.textContent))].map(key).filter(Boolean));
   for(const card of panel.querySelectorAll('.rotastic-room-card-new')){
    const room=card.dataset.room;const raw=shift.rooms?.[room];const name=typeof raw==='string'?raw:(raw?.doctor||raw?.name||'');const displayed=card.querySelector('.rotastic-room-card-name')?.textContent||'';
    const number=card.querySelector('.rotastic-room-card-number');if(!number)continue;
    const should=[name,displayed].some(n=>both.has(key(n)));
    const badges=[...number.querySelectorAll('.rotastic-room-number-t')];
    if(!should)badges.forEach(b=>b.remove());
    else if(!badges.length){const badge=document.createElement('span');badge.className='rotastic-room-number-t';badge.title='Twilight';badge.setAttribute('aria-label','Twilight');badge.textContent='T';number.appendChild(badge)}
   }
   const box=panel.querySelector('.rotastic-exclusive-no-room');
   const right=panel.querySelector('.rotastic-shift-fit-grid > .rotastic-shift-fit-col:last-child');
   if(box&&right&&box.parentElement!==right)right.appendChild(box);
  }
 }
}
let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync()})};
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',schedule);setTimeout(schedule,700);
})();
