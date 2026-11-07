/* Day-by-day rota navigation with arrows and horizontal swipe. */
(()=>{
'use strict';
if(window.__rotasticDaySwipeNav)return;window.__rotasticDaySwipeNav=true;
const css=document.createElement('style');css.textContent=`
body.rotastic-rota-view-active #rotaDaySelector{display:none!important}\nbody.rotastic-rota-view-active .rotastic-day-sheet-head{position:relative!important;padding-left:46px!important;padding-right:46px!important}
.rotastic-day-nav-arrow{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:46px;border:0;border-radius:10px;color:#a5f3fc;background:rgba(15,23,42,.7);font-size:29px;line-height:1;cursor:pointer;z-index:3}
.rotastic-day-nav-arrow.prev{left:5px}.rotastic-day-nav-arrow.next{right:5px}
.rotastic-day-nav-arrow:disabled{opacity:.25;cursor:default}
body.rotastic-rota-view-active .rotastic-day-sheet-head .rotastic-day-key{display:none!important}
body.rotastic-rota-view-active .rotastic-day-sheet-head .rotastic-day-header-main{min-width:0}
`;document.head.appendChild(css);
let current=0,start=null;
function update(){
 const root=document.getElementById('scheduleMatrixContainer');if(!root||!document.body.classList.contains('rotastic-rota-view-active'))return;
 const sheets=[...root.querySelectorAll('.rotastic-day-sheet')];if(!sheets.length)return;
 const days=window.currentSchedule||[];
 if(sheets.length===1){const d=days.findIndex(x=>sheets[0].textContent.includes(x.isoDate||x.date));if(d>=0)current=d;else if(typeof window.activeDayIndex==='number'&&window.activeDayIndex>=0)current=window.activeDayIndex}
 current=Math.max(0,Math.min(days.length-1,current));
 if(sheets.length>1){sheets.forEach((s,i)=>s.style.display=i===current?'':'none')}
 for(const sheet of sheets){const head=sheet.querySelector('.rotastic-day-sheet-head');if(!head)continue;
  for(const dir of [-1,1]){const cls=dir<0?'prev':'next';let btn=head.querySelector('.rotastic-day-nav-arrow.'+cls);
   if(!btn){btn=document.createElement('button');btn.type='button';btn.className='rotastic-day-nav-arrow '+cls;btn.setAttribute('aria-label',dir<0?'Previous day':'Next day');btn.textContent=dir<0?'‹':'›';head.appendChild(btn)}
   btn.disabled=current+dir<0||current+dir>=days.length;
   btn.onclick=()=>go(dir);
  }
 }
}
function go(dir){const days=window.currentSchedule||[];const next=current+dir;if(next<0||next>=days.length)return;current=next;
 const root=document.getElementById('scheduleMatrixContainer');
 if(root?.querySelectorAll('.rotastic-day-sheet').length===1){
  if(typeof window.filterDay==='function'){window.filterDay(next);return}\n  if(typeof window.activeDayIndex==='number'&&typeof window.renderScheduleView==='function'){window.activeDayIndex=next;window.renderScheduleView();return}\n  // Prefer the app's own day filter so the correct data is rendered.
  const buttons=[...document.querySelectorAll('[data-day-index],.rotastic-day-tab')];
  const match=buttons.find(b=>Number(b.dataset.dayIndex)===next);
  if(match){match.click();return}
  if(typeof window.setActiveDayIndex==='function'){window.setActiveDayIndex(next);return}
  // If the app exposes no public day navigation, do not show a misleading arrow result.
  return;
 }
 update();
}
const root=()=>document.getElementById('scheduleMatrixContainer');
document.addEventListener('touchstart',e=>{if(!e.target.closest?.('#scheduleMatrixContainer .rotastic-day-sheet'))return;const t=e.touches[0];start={x:t.clientX,y:t.clientY}},{passive:true});
document.addEventListener('touchend',e=>{if(!start)return;const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;start=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)go(dx<0?1:-1)},{passive:true});
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()})}).observe(document.documentElement,{subtree:true,childList:true});document.addEventListener('DOMContentLoaded',update);setTimeout(update,500);
})();