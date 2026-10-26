/* ROTASTIC logout/switch-account control — functional addition only, existing design preserved. */
(function(){
'use strict';

const IDENTITY_KEYS=[
  'rotastic_user_doc_name',
  'rotastic_setup_completed',
  'rotastic_verified_email',
  'rotastic_verified_role',
  'rotastic_admin_token',
  'rotastic_admin_code_id',
  'rotastic_view_mode'
];

function clearIdentityState(){
  IDENTITY_KEYS.forEach(function(key){
    try{ localStorage.removeItem(key); }catch(_){}
    try{ if(window.Storage && typeof Storage.remove==='function') Storage.remove(key); }catch(_){}
  });
  try{ window.rotasticRegistrationIdentity=null; }catch(_){}
  try{ window.rotasticVerifiedRole=''; }catch(_){}
  try{ window.rotasticBackendUser=null; }catch(_){}
  try{ window.activeUserDocName=''; }catch(_){}
  try{ window.currentViewMode='colleague'; }catch(_){}
}

async function rotasticLogoutAndSwitchAccount(){
  const btn=document.getElementById('rotasticLogoutBtn');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-1.5"></i>Signing out…';}
  try{
    if(window.rotasticBackendClient && rotasticBackendClient.auth){
      const result=await rotasticBackendClient.auth.signOut({scope:'local'});
      if(result && result.error) throw result.error;
    }
  }catch(e){
    console.warn('ROTASTIC sign-out:',e && e.message ? e.message : e);
  }
  clearIdentityState();
  try{ sessionStorage.clear(); }catch(_){}
  try{
    if(navigator.serviceWorker && navigator.serviceWorker.controller){
      navigator.serviceWorker.controller.postMessage({type:'ROTASTIC_LOGOUT'});
    }
  }catch(_){}
  location.reload();
}
window.rotasticLogoutAndSwitchAccount=rotasticLogoutAndSwitchAccount;

function findAccountHost(){
  const byId=['rotasticAccountCard','accountCard','userAccountCard','settingsAccountCard','userSettingsContent','settingsContent'];
  for(const id of byId){const el=document.getElementById(id);if(el)return el;}
  const textNodes=[...document.querySelectorAll('div,p,span,h2,h3,h4')].filter(function(el){
    const t=String(el.textContent||'').replace(/\s+/g,' ').trim();
    return /^Logged in as\b/i.test(t)||/^Account\b/i.test(t);
  });
  for(const el of textNodes){
    const card=el.closest('.clean-card,.settings-card,.card,section');
    if(card)return card;
  }
  const settingsTab=document.getElementById('tabUserSettings');
  if(settingsTab){
    const target=settingsTab.getAttribute('data-target')||settingsTab.getAttribute('href')||'';
    if(target && target.startsWith('#')){const el=document.querySelector(target);if(el)return el;}
  }
  return document.querySelector('[id*="settings" i]')||null;
}

function ensureLogoutButton(){
  if(document.getElementById('rotasticLogoutBtn'))return;
  const host=findAccountHost();
  if(!host)return;
  const wrap=document.createElement('div');
  wrap.id='rotasticLogoutWrap';
  wrap.className='mt-4 pt-4 border-t border-slate-800';
  wrap.innerHTML='<button id="rotasticLogoutBtn" type="button" onclick="rotasticLogoutAndSwitchAccount()" class="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-extrabold text-rose-200 hover:bg-rose-500/15 transition"><i class="fa-solid fa-right-from-bracket mr-1.5"></i>Log out / Switch account</button><div class="mt-2 text-[9px] text-slate-500">Signs out this device only. Rota, leave, announcements and shared data are not deleted.</div>';
  host.appendChild(wrap);
}

function boot(){ensureLogoutButton();setTimeout(ensureLogoutButton,400);setTimeout(ensureLogoutButton,1400);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
new MutationObserver(function(){setTimeout(ensureLogoutButton,40)}).observe(document.documentElement,{subtree:true,childList:true});
})();
