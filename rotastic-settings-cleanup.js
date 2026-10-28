(()=>{
'use strict';
function restoreLiveRow(){
 if(document.getElementById('rotastic-live-row-restore'))return;
 const style=document.createElement('style');style.id='rotastic-live-row-restore';style.textContent=`.live-rota-meta-row{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;align-items:center!important;gap:6px!important;visibility:visible!important;opacity:1!important}.live-rota-meta-row>*{visibility:visible!important;opacity:1!important}.live-rota-meta-row .rotastic-live-mini{display:flex!important;min-height:20px!important;height:20px!important;padding:0 2px!important;border:0!important;background:transparent!important;box-shadow:none!important;justify-self:start!important}.live-drive-slot{display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;justify-self:center!important;min-width:0!important}.live-drive-slot #driveTimeBtn{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;width:auto!important;min-width:0!important;max-width:none!important;height:20px!important;min-height:20px!important;padding:0 2px!important;gap:4px!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important}#weatherBadge{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;height:20px!important;min-height:20px!important;max-height:20px!important;width:auto!important;padding:0 2px!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important;justify-self:end!important}#liveRotaUpdatedAt,#driveTimeBtnSub{display:none!important}.rotastic-live-mini-label,#driveTimeBtnText,#weatherTemp{font-size:10px!important;line-height:1!important;font-weight:700!important}.rotastic-live-mini-label{color:#f43f5e!important}@media(max-width:767px){#tabSchedule .live-rota-meta-row{display:grid!important;margin-top:0!important;margin-bottom:-4px!important;transform:translateY(-20px)}}`;
 document.head.appendChild(style);
}
function stabilizeSplash(){
 if(document.getElementById('rotastic-splash-stability'))return;
 const style=document.createElement('style');style.id='rotastic-splash-stability';style.textContent=`#rotasticOpeningSplash{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;min-height:100vh!important;overflow:hidden!important;transform:none!important;zoom:1!important}#rotasticOpeningSplash img,#rotasticOpeningSplash svg{max-width:min(72vw,320px)!important;max-height:32vh!important;object-fit:contain!important;transform:none!important}#rotasticOpeningSplash>*{transform:none!important}`;
 document.head.appendChild(style);
}
function qatarDate(){try{return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Qatar',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}catch(_){return ''}}
function dismissSplash(){const splash=document.getElementById('rotasticOpeningSplash');if(!splash)return;try{splash.style.setProperty('pointer-events','none','important');splash.style.setProperty('opacity','0','important');splash.style.setProperty('visibility','hidden','important');splash.style.setProperty('display','none','important');splash.setAttribute('aria-hidden','true');splash.classList.add('hidden')}catch(_){}}
function fixSplash(){
 stabilizeSplash();
 const splash=document.getElementById('rotasticOpeningSplash');if(!splash)return;
 const d=document.getElementById('rotasticSplashDate');const text=qatarDate();if(d&&text)d.textContent='Today is '+text;
 if(splash.dataset.rotasticShown==='1')return;
 splash.dataset.rotasticShown='1';
 const observer=new MutationObserver(()=>{if(d&&text&&d.textContent!=='Today is '+text)d.textContent='Today is '+text});observer.observe(splash,{childList:true,subtree:true,characterData:true,attributes:true});
 setTimeout(()=>observer.disconnect(),4200);
 setTimeout(dismissSplash,4500);
}
function isBroadcastNode(n){const t=String(n?.textContent||'').replace(/\s+/g,' ').trim();return /^broadcast$/i.test(t)||/^broadcast\b/i.test(t)||/admin announcements and updates/i.test(t)}
function clean(){
 const tab=document.getElementById('tabUserSettings');if(!tab)return;
 const candidates=[...tab.querySelectorAll('button,a,h1,h2,h3,h4,h5,p,span,div')].filter(isBroadcastNode);
 candidates.forEach(n=>{let card=n.closest('.clean-card,[class*="rounded-2xl"],[class*="rounded-xl"],section,article');if(card&&card!==tab&&tab.contains(card)){card.remove();return}if(n!==tab)n.remove()});
}
function init(){restoreLiveRow();stabilizeSplash();fixSplash();clean();setTimeout(dismissSplash,4700);[50,150,400,800,1500,3000].forEach(ms=>setTimeout(()=>{fixSplash();clean()},ms))}
stabilizeSplash();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
new MutationObserver(()=>{clean();fixSplash()}).observe(document.documentElement,{childList:true,subtree:true});
})();