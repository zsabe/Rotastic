(()=>{
'use strict';
function removeOldAccessCodes(){
  const button=document.getElementById('createAccessCodeButton');
  if(button){
    const card=button.closest('.clean-card')||button.closest('section')||button.parentElement;
    if(card) card.remove();
  }
}
function loadSecureManager(){
  if(document.querySelector('script[data-rotastic-secure-code-manager]')) return;
  const s=document.createElement('script');
  s.src='./rotastic-admin-hotfix.js?v=20261029-3';
  s.async=false;
  s.dataset.rotasticSecureCodeManager='1';
  document.head.appendChild(s);
}
function run(){removeOldAccessCodes();loadSecureManager();}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
new MutationObserver(removeOldAccessCodes).observe(document.documentElement,{childList:true,subtree:true});
})();
