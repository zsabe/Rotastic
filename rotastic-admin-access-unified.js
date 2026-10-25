(()=>{
'use strict';
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const qatar=d=>{try{return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Qatar',dateStyle:'medium',timeStyle:'short'}).format(new Date(d))}catch{return String(d||'')}};
function permanentAdmin(){
  try{
    if(typeof isAdminViewActive==='function'&&!isAdminViewActive())return false;
    const n=norm(window.activeUserDocName||'');
    return n.includes('zaid')||n.includes('moursi')||n.includes('mohamed');
  }catch{return false}
}
function hideLegacyDelegatedCard(){
  const card=document.getElementById('adminAccessGrantCard');
  if(card){card.classList.add('hidden');card.style.display='none';card.setAttribute('aria-hidden','true')}
}
function ensureTargetSelector(){
  const card=document.getElementById('tempAdminCodeManagerCard');
  const duration=document.getElementById('tempAdminDurationMinutes');
  if(!card||!duration)return null;
  let select=document.getElementById('tempAdminTargetPhysician');
  if(!select){
    const wrap=document.createElement('div');
    wrap.id='tempAdminTargetWrap';
    wrap.className='mb-2';
    wrap.innerHTML='<select class="w-full bg-slate-900 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-700 outline-none" id="tempAdminTargetPhysician"><option value="">Any authorised physician</option></select><div class="text-[10px] text-slate-500 mt-1">Leave blank for a general temporary Admin View code, or choose one physician for delegated access.</div>';
    const grid=duration.closest('.pt-4')||duration.parentElement;
    grid?.parentElement?.insertBefore(wrap,grid);
    select=wrap.querySelector('select');
  }
  const desired=[['60','1 hour'],['480','8 hours'],['1440','1 day'],['4320','3 days'],['10080','7 days']];
  if(!duration.dataset.rauDurations){duration.innerHTML=desired.map(([v,l])=>`<option value="${v}"${v==='480'?' selected':''}>${l}</option>`).join('');duration.dataset.rauDurations='1'}
  return select;
}
async function populatePhysicians(){
  const select=ensureTargetSelector();
  if(!select||select.dataset.loaded==='1')return;
  try{
    if(typeof rotasticBackendEnsureSession==='function')await rotasticBackendEnsureSession();
    if(!window.rotasticBackendClient)return;
    const {data,error}=await window.rotasticBackendClient.rpc('rotastic_list_authorized_physicians');
    if(error)throw error;
    (Array.isArray(data)?data:[]).filter(r=>r?.active&&r?.physician_name).forEach(r=>{
      if([...select.options].some(o=>o.value===r.physician_name))return;
      const o=document.createElement('option');o.value=r.physician_name;o.textContent=r.physician_name;select.appendChild(o);
    });
    select.dataset.loaded='1';
  }catch(e){console.warn('ROTASTIC admin physician list',e)}
}
async function createUnifiedCode(){
  if(!permanentAdmin()){alert('Admin access codes can only be created from a permanent Admin View.');return}
  const select=ensureTargetSelector();
  const target=select?.value||null;
  const minutes=Math.max(5,parseInt(document.getElementById('tempAdminDurationMinutes')?.value||'480',10)||480);
  try{
    if(typeof rotasticBackendEnsureSession==='function')await rotasticBackendEnsureSession();
    if(!window.rotasticBackendClient||!window.rotasticBackendUser)throw new Error('Verified Admin sign-in is required.');
    const {data,error}=await window.rotasticBackendClient.rpc('rotastic_issue_admin_access_code',{p_minutes:minutes,p_target_physician:target});
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    const code=String(row?.admin_code||'');
    if(!/^\d{8}$/.test(code))throw new Error('The Admin access service did not return a valid code.');
    const box=document.getElementById('newTempAdminCodeBox'),val=document.getElementById('newTempAdminCodeValue'),expiry=document.getElementById('newTempAdminCodeExpiry');
    box?.classList.remove('hidden');if(val)val.textContent=code;
    if(expiry)expiry.textContent=`${target?'Delegated to '+target+' · ':''}Expires ${qatar(row.expires_at)} Qatar time`;
    if(box&&!document.getElementById('tempAdminCopyCodeBtn')){
      const actions=document.createElement('div');actions.className='flex gap-2 mt-3';
      actions.innerHTML='<button class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-white transition" id="tempAdminCopyCodeBtn" type="button">Copy code</button><button class="px-3 py-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-[11px] font-bold text-rose-300 transition" id="tempAdminRevokeNewBtn" type="button">Revoke</button>';
      box.appendChild(actions);
    }
    const copy=document.getElementById('tempAdminCopyCodeBtn'),revoke=document.getElementById('tempAdminRevokeNewBtn');
    if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(code);copy.textContent='Copied ✓';setTimeout(()=>copy.textContent='Copy code',1400)}catch{alert('Copy failed. Press and hold the code to copy it.')}};
    if(revoke)revoke.onclick=async()=>{try{const r=await window.rotasticBackendClient.rpc('rotastic_revoke_admin_access_code',{p_code_id:row.code_id});if(r.error)throw r.error;box?.classList.add('hidden');if(typeof renderTempAdminCodeManager==='function')await renderTempAdminCodeManager()}catch(e){alert(e?.message||String(e))}};
    try{await navigator.clipboard.writeText(code)}catch{}
    if(typeof renderTempAdminCodeManager==='function')await renderTempAdminCodeManager();
  }catch(e){alert(e?.message||String(e))}
}
function install(){
  hideLegacyDelegatedCard();
  ensureTargetSelector();
  populatePhysicians();
  try{window.canManageAdminAccess=permanentAdmin}catch{}
  try{window.createTemporaryAdminCode=createUnifiedCode}catch{}
}
function init(){install();new MutationObserver(()=>install()).observe(document.documentElement,{childList:true,subtree:true});setInterval(install,3000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
