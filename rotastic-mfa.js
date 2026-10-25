const ROTASTIC_MFA_URL='https://lodhylphktopwqlcvcvf.supabase.co';
const ROTASTIC_MFA_KEY='sb_publishable_w7PkdZLDpZUo8bAH8hszyA_6BbzuOtf';

async function mfaFactory(){
  if(window.supabase?.createClient)return window.supabase.createClient;
  const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm');
  return mod.createClient;
}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function styles(){
  if(document.getElementById('rotastic-mfa-style'))return;
  const s=document.createElement('style');s.id='rotastic-mfa-style';s.textContent=`
  #rotastic-mfa-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,.78);display:grid;place-items:center;padding:18px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  .rotastic-mfa-card{width:min(520px,100%);background:#fff;color:#111827;border-radius:20px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.4)}
  .rotastic-mfa-card h2{margin:0 0 10px}.rotastic-mfa-card p{line-height:1.45}.rotastic-mfa-badge{display:inline-block;margin-bottom:8px;font-size:.75rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:#e0f2fe;padding:5px 9px;border-radius:999px}
  .rotastic-mfa-actions{display:grid;gap:10px;margin-top:16px}.rotastic-mfa-actions button,.rotastic-mfa-actions input{font:inherit;border-radius:12px;padding:12px 14px}.rotastic-mfa-actions button{border:0;background:#0f172a;color:#fff;font-weight:750;cursor:pointer}.rotastic-mfa-actions button.secondary{background:#e5e7eb;color:#111827}.rotastic-mfa-qr{display:block;max-width:240px;width:100%;margin:12px auto;background:#fff}.rotastic-mfa-secret{word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem;background:#f3f4f6;padding:10px;border-radius:10px}.rotastic-mfa-status{min-height:20px;margin-top:10px;font-size:.9rem;color:#166534}.rotastic-mfa-status.error{color:#b91c1c}`;
  document.head.appendChild(s);
}
function modal(body){document.getElementById('rotastic-mfa-modal')?.remove();const w=document.createElement('div');w.id='rotastic-mfa-modal';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');w.innerHTML=`<div class="rotastic-mfa-card"><span class="rotastic-mfa-badge">Privileged access</span><h2>Multi-factor authentication required</h2><div class="rotastic-mfa-body">${body}</div><div class="rotastic-mfa-status" aria-live="polite"></div></div>`;document.body.appendChild(w);return w;}
function status(m,t,e=false){const n=m.querySelector('.rotastic-mfa-status');if(!n)return;n.textContent=t||'';n.classList.toggle('error',e);}
async function verifyExisting(client,factor){
  const m=modal(`<p>Enter the 6-digit code from your authenticator app to continue with privileged ROTASTIC access.</p><div class="rotastic-mfa-actions"><input id="rotastic-mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code"><button id="rotastic-mfa-verify">Verify</button></div>`);
  m.querySelector('#rotastic-mfa-verify').onclick=async()=>{const code=m.querySelector('#rotastic-mfa-code').value.trim();if(!/^\d{6}$/.test(code))return status(m,'Enter the 6-digit authenticator code.',true);status(m,'Verifying…');const ch=await client.auth.mfa.challenge({factorId:factor.id});if(ch.error)return status(m,ch.error.message,true);const v=await client.auth.mfa.verify({factorId:factor.id,challengeId:ch.data.id,code});if(v.error)return status(m,v.error.message,true);status(m,'Verified.');setTimeout(()=>location.reload(),500);};
}
async function enroll(client){
  const m=modal(`<p>PHCC security requires MFA for privileged ROTASTIC access. Set up an authenticator app before continuing.</p><div class="rotastic-mfa-actions"><button id="rotastic-mfa-start">Set up authenticator</button></div>`);
  m.querySelector('#rotastic-mfa-start').onclick=async()=>{status(m,'Creating secure MFA setup…');const r=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'ROTASTIC privileged access'});if(r.error)return status(m,r.error.message,true);const d=r.data;const body=m.querySelector('.rotastic-mfa-body');body.innerHTML=`<p>Scan this QR code with your authenticator app. If scanning is unavailable, enter the secret manually.</p><img class="rotastic-mfa-qr" alt="Authenticator QR code" src="${esc(d.totp.qr_code)}"><div class="rotastic-mfa-secret">${esc(d.totp.secret)}</div><div class="rotastic-mfa-actions"><input id="rotastic-mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code"><button id="rotastic-mfa-enable">Enable MFA</button></div>`;status(m,'');m.querySelector('#rotastic-mfa-enable').onclick=async()=>{const code=m.querySelector('#rotastic-mfa-code').value.trim();if(!/^\d{6}$/.test(code))return status(m,'Enter the 6-digit authenticator code.',true);status(m,'Verifying…');const ch=await client.auth.mfa.challenge({factorId:d.id});if(ch.error)return status(m,ch.error.message,true);const v=await client.auth.mfa.verify({factorId:d.id,challengeId:ch.data.id,code});if(v.error)return status(m,v.error.message,true);status(m,'MFA enabled.');setTimeout(()=>location.reload(),500);};};
}
async function bootMfa(){
  styles();
  let createClient;try{createClient=await mfaFactory();}catch{return;}
  const client=createClient(ROTASTIC_MFA_URL,ROTASTIC_MFA_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await client.auth.getSession();if(!session)return;
  const [identity,admin]=await Promise.all([client.rpc('rotastic_registration_identity'),client.rpc('rotastic_admin_session_status')]);
  const row=Array.isArray(identity.data)?identity.data[0]:identity.data;
  const adminRow=Array.isArray(admin.data)?admin.data[0]:admin.data;
  const privileged=['zaid','moursi','nabina'].includes(String(row?.role||'').toLowerCase())||adminRow?.active===true;
  if(!privileged)return;
  const aal=await client.auth.mfa.getAuthenticatorAssuranceLevel();if(aal.error)return;
  if(aal.data?.currentLevel==='aal2')return;
  const factors=await client.auth.mfa.listFactors();if(factors.error)return;
  const verified=[...(factors.data?.totp||[]),...(factors.data?.phone||[])].find(f=>f.status==='verified');
  if(verified)return verifyExisting(client,verified);
  return enroll(client);
}
bootMfa().catch(()=>{});
