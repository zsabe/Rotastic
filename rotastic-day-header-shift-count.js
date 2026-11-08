/* Day header layout and accurate per-shift headcount. */
(()=>{
'use strict';
if(window.__rotasticDayHeaderV2)return;window.__rotasticDayHeaderV2=true;
const style=document.createElement('style');style.textContent=`
body.rotastic-rota-view-active .rotastic-day-sheet-head{display:flex!important;align-items:center!important;gap:12px!important;padding:13px 14px!important;border:1px solid rgba(45,212,191,.28)!important;border-radius:18px!important;background:linear-gradient(110deg,#07353d,#0b172b 72%)!important;min-height:96px!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head .rotastic-day-key{margin-left:auto}
body.rotastic-rota-view-active .rotastic-day-header-main{display:flex;align-items:center;gap:12px;min-width:0;flex:1}
body.rotastic-rota-view-active .rotastic-day-weather-icon{flex:0 0 58px;width:58px;height:72px;display:flex;align-items:center;justify-content:center;font-size:39px;filter:drop-shadow(0 0 12px rgba(251,191,36,.3));animation:rotastic-day-glow 3.2s ease-in-out infinite}
body.rotastic-rota-view-active .rotastic-day-weather-icon.moon{filter:drop-shadow(0 0 12px rgba(165,180,252,.38))}
body.rotastic-rota-view-active .rotastic-day-header-lines{display:flex;flex-direction:column;gap:6px;min-width:0}
body.rotastic-rota-view-active .rotastic-day-header-lines strong{color:#f8fafc;font-size:17px;line-height:1.15}
body.rotastic-rota-view-active .rotastic-day-header-lines span{color:#cbd5e1;font-size:12px;line-height:1.3}
body.rotastic-rota-view-active .rotastic-day-header-lines .room{color:#67e8f9;font-weight:800}
@keyframes rotastic-day-glow{0%,100%{transform:scale(1) rotate(-5deg);opacity:.9}50%{transform:scale(1.09) rotate(5deg);opacity:1}}
@media(prefers-reduced-motion:reduce){body.rotastic-rota-view-active .rotastic-day-weather-icon{animation:none}}
body.rotastic-rota-view-active .rotastic-day-sheet>.rotastic-twilight-panel{margin:0 2px 10px!important}
body.rotastic-rota-view-active .rotastic-shift-notice .rotastic-shift-day-total{display:block!important;white-space:normal!important}
`;document.head.appendChild(style);
const key=v=>String(v||'').toLowerCase().replace(/^dr\.?\s*/,'').replace(/\s*\([^)]*\)\s*$/,'').replace(/[^a-z0-9]/g,'').replace(/^(muhammadk|mohammedk|mohammadk|mohamedk|qaisark)$/,'qaisar');
function nameOf(v){return typeof v==='string'?v:(v?.doctor||v?.name||'')}
function matches(a,b){return key(a)&&key(a)===key(b)}
function valid(n){return /^dr\.?\s/i.test(String(n||''))}
function update(){
 const root=document.getElementById('scheduleMatrixContainer');if(!root||!document.body.classList.contains('rotastic-rota-view-active'))return;
 const days=window.currentSchedule;if(!Array.isArray(days))return;
 const sheets=[...root.querySelectorAll('.rotastic-day-sheet')];
 sheets.forEach((sheet,i)=>{
  const head=sheet.querySelector('.rotastic-day-sheet-head');if(!head)return;
  const day=days.find(d=>head.textContent.includes(d.isoDate||d.date))||days[i];if(!day)return;
  const twilight=sheet.querySelector(':scope > .rotastic-twilight-panel');
  if(twilight&&head.nextElementSibling!==twilight)head.insertAdjacentElement('afterend',twilight);
  const user=typeof activeUserDocName==='string'?activeUserDocName:'';
  const assignments=[];
  for(const p of ['am','pm']){const sh=day[p];if(!sh)continue;const rooms=Object.entries(sh.rooms||{}).filter(([,n])=>matches(n,user)).map(([r])=>r);const all=[...Object.values(sh.rooms||{}),sh.med,sh.fed,sh.ped,sh.wbcDoc,sh.ancDoc,sh.cmcDoc,sh.timed1Doc,sh.timed2Doc,...(sh.noRoomDocs||[])];if(user&&all.some(n=>matches(n,user)))assignments.push({p,rooms})}
  const p=assignments[0]?.p||'am';const room=assignments.flatMap(a=>a.rooms).filter((x,j,a)=>a.indexOf(x)===j);
  const hours=assignments.map(a=>a.p==='am'?'AM 07:00–14:00':'PM 16:00–22:00').join(' · ')||(p==='am'?'AM 07:00–14:00':'PM 16:00–22:00');
  const roomLabel=room.length?'Room '+room.join(' / '):'Room —';
  const label=[day.day,day.date].filter(Boolean).join(' · ');
  const signature=[label,hours,roomLabel,p].join('|');
  if(head.dataset.rotasticHeaderSignature!==signature){
   let main=head.querySelector('.rotastic-day-header-main');
   if(!main){main=document.createElement('div');main.className='rotastic-day-header-main';head.prepend(main)}
   const icon=p==='pm'?'🌙':'☀️';
   main.innerHTML='<div class="rotastic-day-weather-icon '+(p==='pm'?'moon':'sun')+'" aria-hidden="true">'+icon+'</div><div class="rotastic-day-header-lines"><strong></strong><span></span><span class="room"></span></div>';
   const lines=main.querySelector('.rotastic-day-header-lines');lines.children[0].textContent=label;lines.children[1].textContent=hours;lines.children[2].textContent=roomLabel;
   [...head.children].filter(x=>x!==main&&!x.classList.contains('rotastic-day-key')).forEach(x=>x.style.display='none');
   head.dataset.rotasticHeaderSignature=signature;
  }

 });
}
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()})};
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
document.addEventListener('DOMContentLoaded',schedule);setTimeout(schedule,600);
})();