/* Compact shift panels, cleaner day header and navigable twilight doctors. */
(()=>{
'use strict';if(window.__rotasticDayVisualPolish)return;window.__rotasticDayVisualPolish=true;
const css=document.createElement('style');css.textContent=`
body.rotastic-rota-view-active .rotastic-day-sheet-head{box-shadow:0 10px 30px rgba(0,0,0,.2)!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head .rotastic-day-header-main{gap:12px!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head .rotastic-day-weather-icon{flex-basis:64px!important;width:64px!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head .rotastic-day-header-lines strong{font-size:clamp(15px,4vw,19px)!important;overflow-wrap:anywhere}
body.rotastic-rota-view-active .rotastic-shift-head{padding:9px 13px!important;min-height:0!important;gap:6px!important}
body.rotastic-rota-view-active .rotastic-shift-head .rotastic-shift-time{font-size:15px!important}
body.rotastic-rota-view-active .rotastic-shift-head .rotastic-shift-date-line{display:none!important}
body.rotastic-rota-view-active .rotastic-shift-head .rotastic-shift-notice{display:flex!important;align-items:center!important;gap:12px!important}
body.rotastic-rota-view-active .rotastic-shift-head .rotastic-shift-notice .rotastic-shift-day-total{white-space:nowrap!important}
body.rotastic-rota-view-active .rotastic-twilight-panel{position:relative;padding:12px!important}
body.rotastic-rota-view-active .rotastic-twilight-slots{display:flex!important;gap:8px!important}
body.rotastic-rota-view-active .rotastic-twilight-slot{flex:1 1 0;min-width:0}
.rotastic-twilight-nav{position:absolute;top:50%;transform:translateY(-50%);width:30px;height:42px;border:1px solid rgba(167,139,250,.35);border-radius:10px;background:rgba(76,29,149,.3);color:#e9d5ff;font-size:24px;cursor:pointer}
.rotastic-twilight-nav.prev{left:6px}.rotastic-twilight-nav.next{right:6px}
.rotastic-twilight-nav:disabled{opacity:.3}
@media(max-width:450px){body.rotastic-rota-view-active .rotastic-twilight-panel{padding:10px!important}body.rotastic-rota-view-active .rotastic-twilight-doctor{font-size:12px!important}}
`;document.head.appendChild(css);
function valid(s){return /^dr\.?\s/i.test(String(s||''))}
function update(){
 const root=document.getElementById('scheduleMatrixContainer');if(!root||!document.body.classList.contains('rotastic-rota-view-active'))return;
 const days=window.currentSchedule||[];
 for(const sheet of root.querySelectorAll('.rotastic-day-sheet')){
  const head=sheet.querySelector('.rotastic-day-sheet-head');const day=days.find(d=>head?.textContent.includes(d.isoDate||d.date));if(!day)continue;
  for(const panel of sheet.querySelectorAll('.rotastic-shift-panel')){
   const header=panel.querySelector('.rotastic-shift-head');if(!header)continue;
   const date=header.querySelector('.rotastic-shift-date-line');if(date)date.style.display='none';
   for(const el of header.querySelectorAll('*')){if(el.children.length===0&&/^(morning duty|evening duty)$/i.test(el.textContent.trim()))el.style.display='none'}
  }
  // Twilight is informational only: no arrows or carousel.
  const tw=sheet.querySelector('.rotastic-twilight-panel');
  if(tw)tw.querySelectorAll('.rotastic-twilight-nav').forEach(btn=>btn.remove());
 }
}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;update()})}).observe(document.documentElement,{subtree:true,childList:true});document.addEventListener('DOMContentLoaded',update);setTimeout(update,600);
})();