from pathlib import Path
import re

p = Path('index.html')
s = p.read_text()
original = s

# Remove only the email magic-link block previously added to Dr Zaid's local owner path.
otp_pattern = re.compile(
    r"\n\s*// Establish a real Supabase Auth session for permanent-admin RPCs\..*?"
    r"console\.warn\('ROTASTIC: permanent admin Supabase sign-in could not start\.', authError\?\.message \|\| authError\);\n\s*}\n",
    re.S,
)
s, n_otp = otp_pattern.subn('\n', s, count=1)
assert n_otp == 1, f'Expected exactly one magic-link block, found {n_otp}'

# Replace only the current violet admin-code card with a unified card using the same design system.
card_start_marker = '<div class="hidden clean-card rounded-2xl p-5 max-w-xl mx-auto border-violet-500/25" id="tempAdminCodeManagerCard">'
card_end_marker = '<div class="hidden clean-card rounded-2xl p-5 max-w-xl mx-auto border-emerald-500/25" id="adminAccessGrantCard">'
start = s.index(card_start_marker)
end = s.index(card_end_marker, start)
old_card = s[start:end]
assert 'Temporary Admin Access' in old_card and 'tempAdminCodeList' in old_card
new_card = '''<div class="hidden clean-card rounded-2xl p-5 max-w-xl mx-auto border-violet-500/25" id="tempAdminCodeManagerCard">
<div class="pb-3 border-b border-slate-800">
<h3 class="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center">
<i class="fa-solid fa-key mr-2"></i>ROTASTIC Access Codes
          </h3>
<p class="text-[11px] text-slate-400 mt-1">Generate first-time setup or temporary Admin View access for a physician.</p>
</div>
<div class="pt-4 space-y-3">
<div class="rounded-xl bg-slate-900/55 border border-slate-800 p-3" id="rotasticSecureAdminLoginBox">
<div class="flex items-center justify-between gap-2 mb-2">
<div>
<div class="text-[10px] uppercase tracking-wider font-bold text-slate-300">Secure backend admin</div>
<div class="text-[10px] text-slate-500 mt-0.5" id="rotasticAdminBackendStatus">Password sign-in required once on this device.</div>
</div>
<i class="fa-solid fa-shield-halved text-violet-300"></i>
</div>
<div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2" id="rotasticAdminPasswordControls">
<input autocomplete="current-password" class="bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-violet-400" id="rotasticAdminBackendPassword" placeholder="Dr Zaid secure backend password" type="password"/>
<button class="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl transition" onclick="rotasticAuthenticatePermanentAdminPassword()" type="button"><i class="fa-solid fa-lock-open mr-1.5"></i>Authenticate</button>
</div>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
<select class="bg-slate-900 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-700 outline-none" id="rotasticAccessCodeType" onchange="rotasticAccessTypeChanged()">
<option value="setup">First-time setup code</option>
<option value="admin">Temporary Admin code</option>
</select>
<select class="bg-slate-900 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-700 outline-none" id="rotasticAccessDoctorSelect"><option value="">Select physician</option></select>
</div>
<div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
<select class="hidden bg-slate-900 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-700 outline-none" id="rotasticAccessDurationMinutes">
<option value="1440">24 hours</option>
<option value="10080">1 week</option>
<option value="43200">1 month</option>
</select>
<div class="text-[10px] text-slate-500 flex items-center px-1" id="rotasticAccessDurationHint">First-time setup codes are single-use and valid for 24 hours.</div>
<button class="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl transition" id="rotasticIssueAccessCodeBtn" onclick="rotasticIssueUnifiedAccessCode()" type="button"><i class="fa-solid fa-plus mr-1.5"></i>Generate Code</button>
</div>
<div class="hidden p-3 rounded-xl bg-violet-950/30 border border-violet-500/30" id="newTempAdminCodeBox">
<div class="text-[10px] uppercase tracking-wider font-bold text-violet-300" id="newTempAdminCodeLabel">New access code</div>
<div class="text-xl font-black tracking-[0.18em] text-white mt-1 select-all" id="newTempAdminCodeValue"></div>
<div class="text-[10px] text-slate-400 mt-1" id="newTempAdminCodeExpiry"></div>
<button class="hidden mt-3 w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition" id="rotasticOutlookDraftBtn" onclick="rotasticOpenLatestAccessCodeOutlookDraft()" type="button"><i class="fa-solid fa-envelope mr-1.5"></i>Send via Outlook</button>
</div>
<div class="mt-4">
<div class="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Active / recent Admin codes</div>
<div class="space-y-2" id="tempAdminCodeList"></div>
</div>
</div>
</div>
'''
s = s[:start] + new_card + s[end:]

# Add the unified secure-auth / code-issuance helpers directly before the existing legacy code creator.
anchor = 'async function createTemporaryAdminCode() {'
assert s.count(anchor) == 1
helpers = r'''
const ROTASTIC_PHCC_EMAIL_BY_PHYSICIAN = Object.freeze({
  'Dr Mohamed M.':'mmoursi@phcc.gov.qa','Dr Husam S':'halsaudi@phcc.gov.qa','Dr Fazila K.':'fkhattak@phcc.gov.qa','Dr Mohammed S.':'msayed@phcc.gov.qa',
  'Dr Bilal C.':'bchaudhry@phcc.gov.qa','Dr Saima N.':'snaz@phcc.gov.qa','Dr Imran A.':'imahmad@phcc.gov.qa','Dr Maher A.':'mahed@phcc.gov.qa',
  'Dr Laith A.':'lalmarsomi@phcc.gov.qa','Dr Oula T.':'otayar@phcc.gov.qa','Dr Abdulgafoor K.':'akuniyil@phcc.gov.qa','Dr Abdulrashid S.':'asiddique@phcc.gov.qa',
  'Dr Shadi T':'saltarawneh@phcc.gov.qa','Dr Syed I.':'sislam@phcc.gov.qa','Dr Selman E.':'serturhan@phcc.gov.qa','Dr Enan M.':'emasoud@phcc.gov.qa',
  'Dr Gani M.':'gsmohamed@phcc.gov.qa','Dr Faisal C.':'fchaudhry@phcc.gov.qa','Dr Muhammad K.':'mkhattak@phcc.gov.qa','Dr Aminullah Z.':'azamani@phcc.gov.qa',
  'Dr Salah M.':'salmohammed@phcc.gov.qa','Dr Rida C.':'rchandio@phcc.gov.qa','Dr Maya S.':'msukkari@phcc.gov.qa','Dr Laila A.':'layoub@phcc.gov.qa',
  'Dr Saba T.':'satahir@phcc.gov.qa','Dr Tayseer A.':'tayed@phcc.gov.qa','Dr Zaid SE.':'zeleish@phcc.gov.qa','Dr Fahima N.':'fnabina@phcc.gov.qa'
});
let rotasticLatestIssuedAccess = null;

function rotasticUnifiedDoctorEmail(name) {
  return getKnownPhysicianEmail(name) || ROTASTIC_PHCC_EMAIL_BY_PHYSICIAN[String(name || '').trim()] || '';
}

function rotasticPopulateUnifiedAccessDoctors() {
  const select = document.getElementById('rotasticAccessDoctorSelect');
  if (!select) return;
  const current = select.value;
  const doctors = typeof getDoctorsAlphabetically === 'function' ? getDoctorsAlphabetically() : [];
  select.innerHTML = '<option value="">Select physician</option>' + doctors.map(function(d){
    const name = String(d?.name || '').trim();
    return name ? '<option value="' + name.replace(/&/g,'&amp;').replace(/"/g,'&quot;') + '">' + name + '</option>' : '';
  }).join('');
  if (current && Array.from(select.options).some(function(o){ return o.value === current; })) select.value = current;
}

function rotasticAccessTypeChanged() {
  const type = document.getElementById('rotasticAccessCodeType')?.value || 'setup';
  const duration = document.getElementById('rotasticAccessDurationMinutes');
  const hint = document.getElementById('rotasticAccessDurationHint');
  if (duration) duration.classList.toggle('hidden', type !== 'admin');
  if (hint) hint.textContent = type === 'admin'
    ? 'Choose how long this physician may unlock Admin View.'
    : 'First-time setup codes are single-use and valid for 24 hours.';
}

async function rotasticBackendPermanentAdminReady() {
  await rotasticBackendEnsureSession();
  if (!rotasticBackendClient) return false;
  const sessionResult = await rotasticBackendClient.auth.getSession();
  const session = sessionResult?.data?.session || null;
  const email = String(session?.user?.email || '').trim().toLowerCase();
  if (!session || email !== ROTASTIC_ZAID_PERMANENT_EMAIL) return false;
  const identityResult = await rotasticBackendClient.rpc('rotastic_registration_identity');
  if (identityResult.error) return false;
  const identity = Array.isArray(identityResult.data) ? identityResult.data[0] : identityResult.data;
  const physician = String(identity?.profile_physician_name || identity?.physician_name || '').trim();
  return String(identity?.role || '').toLowerCase() === 'zaid' && physician === 'Dr Zaid SE.';
}

async function rotasticRefreshPermanentAdminAuthUI() {
  const status = document.getElementById('rotasticAdminBackendStatus');
  const controls = document.getElementById('rotasticAdminPasswordControls');
  let ready = false;
  try { ready = await rotasticBackendPermanentAdminReady(); } catch (_) {}
  if (status) {
    status.textContent = ready ? 'Dr Zaid backend admin authenticated on this device.' : 'Enter Dr Zaid secure backend password once on this device.';
    status.className = 'text-[10px] mt-0.5 ' + (ready ? 'text-emerald-300' : 'text-slate-500');
  }
  if (controls) controls.classList.toggle('hidden', ready);
  return ready;
}

async function rotasticAuthenticatePermanentAdminPassword() {
  if (!rotasticIsPermanentAdminIdentity() || activeUserDocName !== 'Dr Zaid SE.') {
    alert('Secure backend sign-in is reserved for Dr Zaid.');
    return;
  }
  const input = document.getElementById('rotasticAdminBackendPassword');
  const password = String(input?.value || '');
  if (!password) { alert('Enter the secure backend password.'); return; }
  try {
    await rotasticBackendEnsureSession();
    if (!rotasticBackendClient) throw new Error('Secure backend is unavailable.');
    try { await rotasticBackendClient.auth.signOut({ scope:'local' }); } catch (_) {}
    const result = await rotasticBackendClient.auth.signInWithPassword({
      email: ROTASTIC_ZAID_PERMANENT_EMAIL,
      password: password
    });
    if (result.error) throw result.error;
    rotasticBackendUser = result.data?.user || result.data?.session?.user || null;
    const ready = await rotasticBackendPermanentAdminReady();
    if (!ready) {
      try { await rotasticBackendClient.auth.signOut({ scope:'local' }); } catch (_) {}
      throw new Error('This Supabase account is not bound to Dr Zaid permanent admin access.');
    }
    if (input) input.value = '';
    await rotasticRefreshPermanentAdminAuthUI();
    await renderTempAdminCodeManager();
  } catch (e) {
    if (input) input.value = '';
    alert(e?.message || 'Secure backend sign-in failed.');
  }
}

async function rotasticIssueUnifiedAccessCode() {
  if (!canManageAdminAccess() || activeUserDocName !== 'Dr Zaid SE.') {
    alert('Access codes can only be generated by Dr Zaid from permanent Admin View.');
    return;
  }
  const ready = await rotasticBackendPermanentAdminReady();
  if (!ready) {
    await rotasticRefreshPermanentAdminAuthUI();
    alert('Authenticate the secure backend first.');
    return;
  }
  const type = document.getElementById('rotasticAccessCodeType')?.value || 'setup';
  const doctor = String(document.getElementById('rotasticAccessDoctorSelect')?.value || '').trim();
  if (!doctor) { alert('Select a physician.'); return; }
  const email = rotasticUnifiedDoctorEmail(doctor);
  if (!/^\S+@phcc\.gov\.qa$/i.test(email)) {
    alert('No PHCC email is stored for this physician.');
    return;
  }
  const button = document.getElementById('rotasticIssueAccessCodeBtn');
  if (button) button.disabled = true;
  try {
    let code = '';
    let expiresAt = '';
    if (type === 'setup') {
      const issue = await rotasticBackendClient.rpc('rotastic_issue_registration_code_v2', {
        p_email: email,
        p_physician_name: doctor,
        p_valid_minutes: 1440
      });
      if (issue.error) throw issue.error;
      const row = Array.isArray(issue.data) ? issue.data[0] : issue.data;
      code = String(row?.registration_code || '');
      expiresAt = row?.expires_at || '';
      if (!/^\d{6}$/.test(code)) throw new Error('The setup service did not return a valid code.');
    } else {
      const minutes = parseInt(document.getElementById('rotasticAccessDurationMinutes')?.value || '1440', 10);
      const issue = await rotasticBackendClient.rpc('rotastic_issue_admin_access_code', {
        p_minutes: Math.max(5, minutes || 1440),
        p_target_physician: doctor
      });
      if (issue.error) throw issue.error;
      const row = Array.isArray(issue.data) ? issue.data[0] : issue.data;
      code = String(row?.admin_code || '');
      expiresAt = row?.expires_at || '';
      if (!/^\d{8}$/.test(code)) throw new Error('The Admin access service did not return a valid code.');
    }

    saveKnownPhysicianEmail(doctor, email);
    rotasticLatestIssuedAccess = { type:type, doctor:doctor, email:email, code:code, expiresAt:expiresAt };
    const box = document.getElementById('newTempAdminCodeBox');
    const label = document.getElementById('newTempAdminCodeLabel');
    const value = document.getElementById('newTempAdminCodeValue');
    const expiry = document.getElementById('newTempAdminCodeExpiry');
    const outlook = document.getElementById('rotasticOutlookDraftBtn');
    if (box) box.classList.remove('hidden');
    if (label) label.textContent = type === 'setup' ? 'New first-time setup code' : 'New Temporary Admin code';
    if (value) value.textContent = code;
    if (expiry) expiry.textContent = 'For ' + doctor + ' · expires ' + formatWorkflowTime(expiresAt);
    if (outlook) outlook.classList.remove('hidden');
    try { await navigator.clipboard.writeText(code); } catch (_) {}
    if (type === 'admin') await renderTempAdminCodeManager();
  } catch (e) {
    alert(e?.message || 'Could not generate this access code.');
  } finally {
    if (button) button.disabled = false;
  }
}

function rotasticOpenLatestAccessCodeOutlookDraft() {
  const issued = rotasticLatestIssuedAccess;
  if (!issued?.email || !issued?.code) { alert('Generate an access code first.'); return; }
  const expiry = issued.expiresAt ? formatWorkflowTime(issued.expiresAt) : '';
  const setup = issued.type === 'setup';
  const subject = setup ? 'Rotastic activation code' : 'ROTASTIC Admin View code';
  const body = setup
    ? ('Dear ' + issued.doctor + ',\n\nYour ROTASTIC first-time activation code is: ' + issued.code + '\n\nThis code is single-use and valid for 24 hours. Open ROTASTIC, enter your PHCC email address and this code to complete setup.\n\nRegards,\nDr Zaid SE.')
    : ('Dear ' + issued.doctor + ',\n\nYour temporary ROTASTIC Admin View code is: ' + issued.code + '\n\nThis code is valid until ' + expiry + '. Open ROTASTIC, choose Admin View and enter this code.\n\nRegards,\nDr Zaid SE.');
  const query = 'to=' + encodeURIComponent(issued.email) + '&subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  const appUrl = 'ms-outlook://compose?' + query;
  const webUrl = 'https://outlook.office.com/mail/deeplink/compose?' + query;
  let leftPage = false;
  const mark = function(){ if (document.visibilityState === 'hidden') leftPage = true; };
  document.addEventListener('visibilitychange', mark, { once:true });
  window.location.href = appUrl;
  setTimeout(function(){ if (!leftPage && document.visibilityState === 'visible') window.location.href = webUrl; }, 1200);
}

'''
s = s.replace(anchor, helpers + anchor, 1)

# Make the manager populate the unified selector and avoid the old pink RPC error before backend authentication.
manager_anchor = """  const canManageCodes = canManageAdminAccess();
  card.classList.toggle('hidden', !canManageCodes);
  if (!canManageCodes) return;

  const listEl = document.getElementById('tempAdminCodeList');
  if (!listEl) return;

  try {
    await rotasticBackendEnsureSession();"""
manager_new = """  const canManageCodes = canManageAdminAccess();
  card.classList.toggle('hidden', !canManageCodes);
  if (!canManageCodes) return;
  rotasticPopulateUnifiedAccessDoctors();
  rotasticAccessTypeChanged();

  const listEl = document.getElementById('tempAdminCodeList');
  if (!listEl) return;

  const ready = await rotasticRefreshPermanentAdminAuthUI();
  if (!ready) {
    listEl.innerHTML = '<div class=\"text-[11px] text-slate-500\">Secure backend password sign-in is required to load or issue codes.</div>';
    return;
  }

  try {
    await rotasticBackendEnsureSession();"""
assert manager_anchor in s
s = s.replace(manager_anchor, manager_new, 1)

# Hide the duplicate green delegated-admin card. Retain the legacy code below for easy rollback.
grant_anchor = "function renderAdminGrantList() {\n  const card = document.getElementById('adminAccessGrantCard');"
grant_new = "function renderAdminGrantList() {\n  const card = document.getElementById('adminAccessGrantCard');\n  if (card) card.classList.add('hidden');\n  return;\n  /* legacy delegated card retained below but intentionally disabled */"
assert grant_anchor in s
s = s.replace(grant_anchor, grant_new, 1)

# Safety assertions: no email OTP remains in the page and required new controls exist.
assert s != original
assert 'signInWithOtp({' not in s, 'Email OTP/magic-link auth remains in index.html'
assert 'signInWithPassword({' in s
assert 'First-time setup code' in s
assert 'Temporary Admin code' in s
assert 'Send via Outlook' in s
assert 'rotasticOutlookDraftBtn' in s

p.write_text(s)
