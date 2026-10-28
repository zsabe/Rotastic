(()=>{
'use strict';
function clean(){
 const tab=document.getElementById('tabUserSettings');
 if(!tab)return;
 [...tab.querySelectorAll('button,a')].forEach(el=>{
  if(!/broadcast/i.test(String(el.textContent||'')))return;
  const card=el.closest('.clean-card,.rounded-2xl,.rounded-xl');
  if(card&&tab.contains(card))card.remove();else el.remove();
 });
}
function init(){clean();setTimeout(clean,400);setTimeout(clean,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true});
})();