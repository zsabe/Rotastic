const ROTASTIC_SUPABASE_URL = 'https://lodhylphktopwqlcvcvf.supabase.co';
const ROTASTIC_SUPABASE_KEY = 'sb_publishable_w7PkdZLDpZUo8bAH8hszyA_6BbzuOtf';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

async function getSupabaseFactory() {
  if (window.supabase && typeof window.supabase.createClient === 'function') return window.supabase.createClient;
  const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm');
  return mod.createClient;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(ch => ch.charCodeAt(0)));
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function modalShell(title, body) {
  document.getElementById('rotastic-private-modal')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'rotastic-private-modal';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML = `
    <div class="rotastic-private-card">
      <button class="rotastic-private-close" aria-label="Close">×</button>
      <div class="rotastic-private-lock">Private</div>
      <h2>${escapeHtml(title)}</h2>
      <div class="rotastic-private-body">${body}</div>
      <div class="rotastic-private-status" aria-live="polite"></div>
    </div>`;
  wrap.querySelector('.rotastic-private-close').onclick = () => wrap.remove();
  wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
  document.body.appendChild(wrap);
  return wrap;
}

function setModalStatus(modal, text, error = false) {
  const node = modal.querySelector('.rotastic-private-status');
  if (!node) return;
  node.textContent = text || '';
  node.classList.toggle('error', error);
}

function injectStyles() {
  if (document.getElementById('rotastic-private-style')) return;
  const style = document.createElement('style');
  style.id = 'rotastic-private-style';
  style.textContent = `
  #rotastic-private-modal{position:fixed;inset:0;z-index:2147483646;background:rgba(3,8,18,.72);display:grid;place-items:center;padding:18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .rotastic-private-card{width:min(520px,100%);background:#fff;color:#111827;border-radius:22px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.35);position:relative}
  .rotastic-private-card h2{margin:8px 0 14px;font-size:1.35rem}.rotastic-private-body{line-height:1.45}.rotastic-private-lock{display:inline-block;font-size:.75rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:#eef2ff;padding:5px 9px;border-radius:999px}
  .rotastic-private-close{position:absolute;right:12px;top:8px;border:0;background:transparent;font-size:30px;line-height:1;cursor:pointer;color:#4b5563}
  .rotastic-private-actions{display:grid;gap:10px;margin-top:18px}.rotastic-private-actions button,.rotastic-private-actions input,.rotastic-private-actions select{font:inherit;border-radius:12px;padding:12px 14px}.rotastic-private-actions button{border:0;background:#111827;color:white;font-weight:750;cursor:pointer}.rotastic-private-actions button.secondary{background:#e5e7eb;color:#111827}.rotastic-private-actions button.danger{background:#991b1b}.rotastic-private-status{min-height:20px;margin-top:12px;font-size:.9rem;color:#166534}.rotastic-private-status.error{color:#b91c1c}
  #rotastic-sick-button,#rotastic-notify-button{position:fixed;right:16px;z-index:2147483000;border:0;border-radius:999px;padding:11px 16px;font:700 14px system-ui,-apple-system,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer}
  #rotastic-sick-button{bottom:18px;background:#7f1d1d;color:white}#rotastic-notify-button{bottom:66px;background:#111827;color:white}
  @media(max-width:640px){.rotastic-private-card{padding:20px;border-radius:18px}#rotastic-sick-button,#rotastic-notify-button{right:10px}}
  `;
  document.head.appendChild(style);
}

async function getSession(client) {
  const { data } = await client.auth.getSession();
  return data?.session || null;
}

async function getProfile(client, userId) {
  const { data, error } = await client.from('rotastic_profiles').select('physician_name').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function refreshPushSubscription(client, session, profile, force = false) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const { data: vapidPublic, error: vapidError } = await client.rpc('rotastic_vapid_public_key');
  if (vapidError || !vapidPublic) throw vapidError || new Error('Push key unavailable');
  const versionKey = 'rotastic-vapid-key-current';
  let sub = await reg.pushManager.getSubscription();
  if (sub && (force || localStorage.getItem(versionKey) !== vapidPublic)) {
    try { await client.from('rotastic_push_subscriptions').delete().eq('endpoint', sub.endpoint); } catch (_) {}
    try { await sub.unsubscribe(); } catch (_) {}
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublic) });
  }
  const json = sub.toJSON();
  const payload = {
    user_id: session.user.id,
    physician_name: profile.physician_name,
    endpoint: sub.endpoint,
    subscription: json,
    updated_at: new Date().toISOString()
  };
  const { error } = await client.from('rotastic_push_subscriptions').upsert(payload, { onConflict: 'user_id,endpoint' });
  if (error) throw error;
  localStorage.setItem(versionKey, vapidPublic);
  await fetch(`${ROTASTIC_SUPABASE_URL}/functions/v1/rotastic-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': ROTASTIC_SUPABASE_KEY },
    body: JSON.stringify({ action: 'process_mine' })
  }).catch(() => {});
  return true;
}

function addNotificationButton(client, session, profile) {
  if (!('Notification' in window) || Notification.permission === 'granted' || document.getElementById('rotastic-notify-button')) return;
  const btn = document.createElement('button');
  btn.id = 'rotastic-notify-button';
  btn.textContent = 'Enable notifications';
  btn.onclick = async () => {
    try {
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && !isStandalone()) {
        const m = modalShell('Install ROTASTIC first', '<p>On iPhone/iPad, add ROTASTIC to the Home Screen, open it from the new Home Screen icon, then tap <b>Enable notifications</b> again.</p>');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');
      await refreshPushSubscription(client, session, profile, true);
      btn.remove();
      const m = modalShell('Notifications enabled', '<p>Private ROTASTIC reminders are enabled on this device.</p>');
      setTimeout(() => m.remove(), 2200);
    } catch (e) {
      const m = modalShell('Notifications not enabled', `<p>${escapeHtml(e?.message || String(e))}</p>`);
    }
  };
  document.body.appendChild(btn);
}

async function showSickCheckin(client, caseId, shiftId) {
  if (!caseId || !shiftId) return;
  const modal = modalShell('How are you feeling?', `
    <p>Hope you are feeling better. Are you going back to work, or are you reporting sick today?</p>
    <p><small>Your response is private and is sent only through the confidential staffing workflow.</small></p>
    <div class="rotastic-private-actions">
      <button data-response="going_back">Going back to work</button>
      <button class="danger" data-response="sick_today">Reporting sick today</button>
    </div>`);
  modal.querySelectorAll('[data-response]').forEach(btn => btn.addEventListener('click', async () => {
    modal.querySelectorAll('button').forEach(b => b.disabled = true);
    setModalStatus(modal, 'Saving your response…');
    const { error } = await client.rpc('rotastic_sick_checkin_response', { p_case_id: caseId, p_shift_id: shiftId, p_response: btn.dataset.response });
    if (error) {
      modal.querySelectorAll('button').forEach(b => b.disabled = false);
      return setModalStatus(modal, error.message || 'Could not save response.', true);
    }
    setModalStatus(modal, 'Response saved privately.');
    history.replaceState({}, document.title, location.pathname + location.hash);
    setTimeout(() => modal.remove(), 1300);
  }));
}

async function showManagerReview(client, caseId) {
  if (!caseId) return;
  const { data: row, error } = await client.from('rotastic_sick_cases').select('id,physician_name,started_on,status,long_term_until').eq('id', caseId).maybeSingle();
  if (error || !row) return;
  const modal = modalShell('Long-term sickness review', `
    <p>Is <b>${escapeHtml(row.physician_name)}</b> on long-term sickness?</p>
    <p><small>Started ${escapeHtml(row.started_on)}. This screen is restricted to the authorized manager.</small></p>
    <div class="rotastic-private-actions">
      <button data-manager="yes_until">Yes — until a date</button>
      <input type="date" id="rotastic-longterm-until" aria-label="Long-term sickness end date">
      <button data-manager="duration_unknown">Yes — duration unknown</button>
      <button class="secondary" data-manager="no">No</button>
    </div>`);
  modal.querySelectorAll('[data-manager]').forEach(btn => btn.addEventListener('click', async () => {
    const answer = btn.dataset.manager;
    const until = modal.querySelector('#rotastic-longterm-until')?.value || null;
    if (answer === 'yes_until' && !until) return setModalStatus(modal, 'Choose the end date first.', true);
    modal.querySelectorAll('button,input').forEach(el => el.disabled = true);
    setModalStatus(modal, 'Saving…');
    const { error: rpcError } = await client.rpc('rotastic_manager_long_term_response', { p_case_id: caseId, p_response: answer, p_until: answer === 'yes_until' ? until : null });
    if (rpcError) {
      modal.querySelectorAll('button,input').forEach(el => el.disabled = false);
      return setModalStatus(modal, rpcError.message || 'Could not save response.', true);
    }
    setModalStatus(modal, 'Saved.');
    history.replaceState({}, document.title, location.pathname + location.hash);
    setTimeout(() => modal.remove(), 1200);
  }));
}

async function showReportSick(client) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  const modal = modalShell('Report sick privately', `
    <p>This does not announce sickness to colleagues. The staffing workflow only removes you from the selected shift and privately informs the authorized manager.</p>
    <div class="rotastic-private-actions">
      <input id="rotastic-sick-date" type="date" value="${today}" aria-label="Shift date">
      <select id="rotastic-sick-shift" aria-label="Shift"><option value="AM">AM shift</option><option value="PM">PM shift</option></select>
      <button id="rotastic-submit-sick" class="danger">Report sick</button>
    </div>`);
  modal.querySelector('#rotastic-submit-sick').onclick = async () => {
    const date = modal.querySelector('#rotastic-sick-date').value;
    const shift = modal.querySelector('#rotastic-sick-shift').value;
    if (!date) return setModalStatus(modal, 'Choose a shift date.', true);
    modal.querySelectorAll('button,input,select').forEach(el => el.disabled = true);
    setModalStatus(modal, 'Submitting privately…');
    const { error } = await client.rpc('rotastic_report_sick', { p_shift_date: date, p_shift_code: shift });
    if (error) {
      modal.querySelectorAll('button,input,select').forEach(el => el.disabled = false);
      return setModalStatus(modal, error.message || 'Could not report sickness.', true);
    }
    setModalStatus(modal, 'Reported privately. Your selected shift has been marked unavailable in the confidential staffing workflow.');
    setTimeout(() => { modal.remove(); location.reload(); }, 1400);
  };
}

function addReportSickButton(client) {
  if (document.getElementById('rotastic-sick-button')) return;
  const btn = document.createElement('button');
  btn.id = 'rotastic-sick-button';
  btn.textContent = 'Report sick';
  btn.setAttribute('aria-label', 'Report sick privately');
  btn.onclick = () => showReportSick(client);
  document.body.appendChild(btn);
}

function parseLocalDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
}

function findShiftStart(item, date, code) {
  const raw = item?.shift_start_at || item?.shiftStart || item?.start_at || item?.startAt || item?.start || item?.time;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    if (/^\d{1,2}:\d{2}/.test(String(raw))) return `${date}T${String(raw).slice(0,5)}:00+03:00`;
  }
  return null;
}

function extractScheduleCandidates(root) {
  const out = [];
  const seen = new Set();
  function add(name, date, code, start, key) {
    name = String(name || '').trim(); date = parseLocalDate(date); code = String(code || '').toUpperCase().trim();
    if (!name || !date || !['AM','PM'].includes(code) || !start) return;
    const id = `${date}|${code}|${name}`; if (seen.has(id)) return; seen.add(id);
    out.push({ physician_name:name, shift_date:date, shift_code:code, shift_start_at:start, source_key:key || id });
  }
  function walk(node, path='root', depth=0) {
    if (depth > 8 || node == null) return;
    if (Array.isArray(node)) { node.forEach((v,i)=>walk(v,`${path}[${i}]`,depth+1)); return; }
    if (typeof node !== 'object') return;
    const date = node.date || node.shift_date || node.shiftDate || node.day || node.dateKey;
    const code = node.shift_code || node.shiftCode || node.period || node.shift;
    const name = node.physician_name || node.physicianName || node.doctor || node.doctorName || node.name;
    if (date && code && name) add(name,date,code,findShiftStart(node,parseLocalDate(date),String(code).toUpperCase()),path);
    if (date) {
      for (const c of ['AM','PM']) {
        const list = node[c] || node[c.toLowerCase()] || node[`${c.toLowerCase()}Doctors`] || node[`${c.toLowerCase()}_doctors`];
        if (Array.isArray(list)) list.forEach((v,i)=>{
          const n = typeof v === 'string' ? v : (v?.physician_name || v?.physicianName || v?.doctor || v?.doctorName || v?.name);
          const start = typeof v === 'object' ? findShiftStart(v,parseLocalDate(date),c) : findShiftStart(node,parseLocalDate(date),c);
          add(n,date,c,start,`${path}.${c}[${i}]`);
        });
      }
    }
    Object.entries(node).forEach(([k,v])=>{ if (!['subscription','session','token'].includes(k)) walk(v,`${path}.${k}`,depth+1); });
  }
  walk(root);
  return out;
}

async function trySyncManagerSchedule(client) {
  const weekStart = (() => { const d=new Date(); const q=new Date(d.toLocaleString('en-US',{timeZone:'Asia/Qatar'})); const day=(q.getDay()+6)%7; q.setDate(q.getDate()-day); return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(q); })();
  const candidates = [];
  for (let i=0;i<localStorage.length;i++) {
    const key=localStorage.key(i); if (!key) continue;
    let parsed; try { parsed=JSON.parse(localStorage.getItem(key)); } catch (_) { continue; }
    for (const row of extractScheduleCandidates(parsed)) candidates.push(row);
  }
  const unique = [...new Map(candidates.map(r=>[`${r.shift_date}|${r.shift_code}|${r.physician_name}`,r])).values()];
  if (!unique.length) return;
  await client.rpc('rotastic_sync_released_shifts',{p_week_start:weekStart,p_shifts:unique}).catch?.(()=>{});
}

async function handleDeepLink(client) {
  const p = new URLSearchParams(location.search);
  const action = p.get('rotasticAction');
  const caseId = p.get('caseId');
  const shiftId = p.get('shiftId');
  if (action === 'sick_checkin') return showSickCheckin(client, caseId, shiftId);
  if (action === 'sick_manager_review') return showManagerReview(client, caseId);
}

async function boot() {
  injectStyles();
  let createClient;
  try { createClient = await getSupabaseFactory(); } catch (e) { console.error('ROTASTIC private module unavailable',e); return; }
  const client = createClient(ROTASTIC_SUPABASE_URL, ROTASTIC_SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  let session = await getSession(client);
  for (let i=0;!session && i<15;i++) { await sleep(400); session=await getSession(client); }
  if (!session) return;
  let profile;
  try { profile=await getProfile(client,session.user.id); } catch (_) { return; }
  if (!profile?.physician_name) return;
  addReportSickButton(client);
  addNotificationButton(client,session,profile);
  if (Notification.permission === 'granted') refreshPushSubscription(client,session,profile).catch(console.warn);
  handleDeepLink(client).catch(console.error);
  trySyncManagerSchedule(client).catch(()=>{});
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type === 'ROTASTIC_NOTIFICATION_OPEN' && event.data.url) location.href = event.data.url;
  });
  setInterval(()=>{
    if (document.visibilityState==='visible') {
      if (Notification.permission==='granted') refreshPushSubscription(client,session,profile).catch(()=>{});
      trySyncManagerSchedule(client).catch(()=>{});
    }
  }, 10*60*1000);
}

boot();
