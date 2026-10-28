(()=>{
'use strict';
function removeAccessCodeUI(){
  const settings=document.getElementById('tabUserSettings');
  const ids=['tempAdminCodeManagerCard','adminAccessGrantCard','rotastic-unified-admin'];
  ids.forEach(id=>{
    const el=document.getElementById(id);
    if(el&&(!settings||settings.contains(el)))el.remove();
  });
  if(!settings)return;
  [...settings.querySelectorAll('h1,h2,h3,h4,h5,h6')].forEach(h=>{
    const text=String(h.textContent||'').replace(/\s+/g,' ').trim();
    if(!/^Access Codes$/i.test(text))return;
    const card=h.closest('.clean-card,.rounded-2xl,.rounded-xl,section,article');
    if(card&&settings.contains(card))card.remove();
  });
}
function run(){removeAccessCodeUI();requestAnimationFrame(removeAccessCodeUI);setTimeout(removeAccessCodeUI,250);setTimeout(removeAccessCodeUI,1000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
new MutationObserver(removeAccessCodeUI).observe(document.documentElement,{subtree:true,childList:true});
})();
