from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
pat=re.compile(r'<div class="hidden clean-card rounded-2xl p-5 max-w-xl mx-auto border-amber-500/25" id="settingsBroadcastCard">.*?</div>\s*(?=<div class="hidden clean-card rounded-2xl p-5 max-w-xl mx-auto border-violet-500/25" id="tempAdminCodeManagerCard">)',re.S)
s,n=pat.subn('',s)
if n != 1: raise SystemExit(f'Expected one Settings Broadcast card, found {n}')
old='<option value="first_time">First-time setup code</option>\n<option value="admin">Temporary Admin code</option>'
new='<option value="admin" selected>Temporary Admin code</option>\n<option value="first_time">First-time setup code (24 hours)</option>'
if old not in s: raise SystemExit('Access-code type options anchor not found')
s=s.replace(old,new,1)
s=s.replace("document.getElementById('accessCodeType')?.value || 'first_time'", "document.getElementById('accessCodeType')?.value || 'admin'")
old_gate="await rotasticBackendEnsureSession();\n    if (!rotasticBackendClient || !rotasticBackendUser) throw new Error('Verified Admin sign-in is required.');"
new_gate="""await rotasticBackendEnsureSession();
    if (!rotasticBackendClient) throw new Error('Authentication service unavailable.');
    const accessSessionResult = await rotasticBackendClient.auth.getSession();
    const accessSessionUser = accessSessionResult?.data?.session?.user || null;
    if (!accessSessionUser) {
      const adminEmail = String(Storage.get('rotastic_verified_email', '') || ROTASTIC_ZAID_PERMANENT_EMAIL || '').trim().toLowerCase();
      if (!/@phcc\\.gov\\.qa$/i.test(adminEmail)) throw new Error('A verified permanent-admin PHCC email is required.');
      const authResult = await rotasticBackendClient.auth.signInWithOtp({email:adminEmail,options:{emailRedirectTo:window.location.origin+window.location.pathname,shouldCreateUser:true}});
      if (authResult?.error) throw authResult.error;
      throw new Error('Secure Admin sign-in link sent to '+adminEmail+'. Open it once, then Generate Code will work on this device.');
    }
    rotasticBackendUser = accessSessionUser;"""
if old_gate not in s: raise SystemExit('Access-code auth gate anchor not found')
s=s.replace(old_gate,new_gate)
style='''\n<style id="rotastic-splash-date-paint-guard">\n#rotasticOpeningSplash { visibility: hidden; }\n#rotasticOpeningSplash.rotastic-date-ready { visibility: visible; }\n</style>\n'''
if 'id="rotastic-splash-date-paint-guard"' not in s:
    if '</head>' not in s: raise SystemExit('head anchor missing')
    s=s.replace('</head>',style+'</head>',1)
reveal="""  try { updateOpeningSplashName(); }
  catch (e) { console.warn('ROTASTIC splash name update:', e); }

  const splash = document.getElementById('rotasticOpeningSplash');"""
reveal_new="""  try { updateOpeningSplashName(); }
  catch (e) { console.warn('ROTASTIC splash name update:', e); }

  const splash = document.getElementById('rotasticOpeningSplash');
  if (splash) splash.classList.add('rotastic-date-ready');"""
if reveal not in s: raise SystemExit('Splash reveal anchor not found')
s=s.replace(reveal,reveal_new)
p.write_text(s,encoding='utf-8')
