(()=>{
'use strict';
function restoreLiveRow(){
 if(document.getElementById('rotastic-live-row-restore'))return;
 const style=document.createElement('style');
 style.id='rotastic-live-row-restore';
 style.textContent=`
.live-rota-meta-row{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;align-items:center!important;gap:6px!important;visibility:visible!important;opacity:1!important}
.live-rota-meta-row>*{visibility:visible!important;opacity:1!important}
.live-rota-meta-row .rotastic-live-mini{display:flex!important;min-height:20px!important;height:20px!important;padding:0 2px!important;border:0!important;background:transparent!important;box-shadow:none!important;justify-self:start!important}
.live-drive-slot{display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;justify-self:center!important;min-width:0!important}
.live-drive-slot #driveTimeBtn{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;width:auto!important;min-width:0!important;max-width:none!important;height:20px!important;min-height:20px!important;padding:0 2px!important;gap:4px!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important}
#weatherBadge{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;height:20px!important;min-height:20px!important;max-height:20px!important;width:auto!important;padding:0 2px!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important;justify-self:end!important}
#liveRotaUpdatedAt,#driveTimeBtnSub{display:none!important}
.rotastic-live-mini-label,#driveTimeBtnText,#weatherTemp{font-size:10px!important;line-height:1!important;font-weight:700!important}
.rotastic-live-mini-label{color:#f43f5e!important}
@media(max-width:767px){#tabSchedule .live-rota-meta-row{margin-top:0!important;margin-bottom:-4px!important;transform:translateY(-20px)}}`;
 document.head.appendChild(style);
}
function clean(){
 const tab=document.getElementById('tabUserSettings');
 if(!tab)return;
 [...tab.querySelectorAll('button,a')].forEach(el=>{
  if(!/broadcast/i.test(String(el.textContent||'')))return;
  const card=el.closest('.clean-card,.rounded-2xl,.rounded-xl');
  if(card&&tab.contains(card))card.remove();else el.remove();
 });
}
function init(){restoreLiveRow();clean();setTimeout(clean,400);setTimeout(clean,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true});
})();