(()=>{
'use strict';
function removeLegacyAccessCodeUI(){
  const settings=document.getElementById('tabUserSettings');
  const ids=['tempAdminCodeManagerCard','adminAccessGrantCard','rotastic-unified-admin'];
  ids.forEach(id=>{
    const el=document.getElementById(id);
    if(el&&(!settings||settings.contains(el)))el.remove();
  });
}
function run(){removeLegacyAccessCodeUI();requestAnimationFrame(removeLegacyAccessCodeUI);setTimeout(removeLegacyAccessCodeUI,250);setTimeout(removeLegacyAccessCodeUI,1000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
new MutationObserver(removeLegacyAccessCodeUI).observe(document.documentElement,{subtree:true,childList:true});
})();
