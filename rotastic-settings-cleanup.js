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
function settingsCardFor(el,tab){let n=el;while(n&&n.parentElement&&n.parentElement!==tab){if(n.matches?.('.clean-card,.rounded-2xl,.rounded-xl,#rotastic-settings-card'))return n;n=n.parentElement}return n&&n!==tab?n:null}
function moveViewModeToTop(tab){const marker=[...tab.querySelectorAll('h1,h2,h3,h4,h5,label,div,span,p')].find(el=>/^\s*view\s*mode\s*$/i.test(String(el.textContent||'')));if(!marker)return;const card=settingsCardFor(marker,tab);if(!card||card.dataset.rotasticViewModeTop==='1')return;card.dataset.rotasticViewModeTop='1';const heading=[...tab.children].find(el=>/^\s*settings\s*$/i.test(String(el.textContent||'')));if(heading&&heading.nextSibling)tab.insertBefore(card,heading.nextSibling);else tab.prepend(card)}
function ensureSignOut(tab){if([...tab.querySelectorAll('button,a')].some(el=>/^\s*sign\s*out\s*$/i.test(String(el.textContent||''))))return;const host=document.getElementById('rotastic-settings-card')||tab,actions=host.querySelector?.('.rx-settings-actions')||host,b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Sign out';b.dataset.rotasticSignOut='1';b.onclick=async()=>{if(!confirm('Sign out of ROTASTIC on this device?'))return;b.disabled=true;try{if(typeof window.raSignOut==='function'){await window.raSignOut();return}const client=window.rotasticBackendClient||window.supabaseClient||null;if(client?.auth?.signOut){const {error}=await client.auth.signOut({scope:'local'});if(error)throw error}sessionStorage.clear();localStorage.removeItem('rotastic-auth-session-v1');location.replace(location.pathname)}catch(e){b.disabled=false;alert(e?.message||String(e))}};actions.appendChild(b)}
function removeAccessCodes(tab){const direct=document.getElementById('tempAdminCodeManagerCard');if(direct&&tab.contains(direct))direct.remove();const unified=document.getElementById('rotastic-unified-admin');if(unified&&tab.contains(unified))unified.remove();[...tab.querySelectorAll('h1,h2,h3,h4,h5,div,p,span')].forEach(el=>{if(!/^\s*access\s+codes\s*$/i.test(String(el.textContent||'')))return;const card=settingsCardFor(el,tab);if(card&&tab.contains(card))card.remove()})}
function clean(){const tab=document.getElementById('tabUserSettings');if(!tab)return;removeAccessCodes(tab);[...tab.querySelectorAll('button,a')].forEach(el=>{if(!/broadcast/i.test(String(el.textContent||'')))return;const card=el.closest('.clean-card,.rounded-2xl,.rounded-xl');if(card&&tab.contains(card))card.remove();else el.remove()});moveViewModeToTop(tab);ensureSignOut(tab)}
function init(){restoreLiveRow();clean();setTimeout(clean,400);setTimeout(clean,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true});
})();