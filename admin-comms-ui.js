(() => {
  'use strict';

  if (window.__ROTASTIC_ADMIN_CENTER_V3__) return;
  window.__ROTASTIC_ADMIN_CENTER_V3__ = true;

  const MARK = 'rotastic-admin-center-v3';
  const MOURSI_EMAIL = 'mmoursi@phcc.gov.qa';
  let combinedPane = null;
  let bell = null;
  let inboxTimer = null;

  const norm = v => String(v || '').replace(/\s+/g, ' ').trim();
  const lower = v => norm(v).toLowerCase();

  function clickables() {
    return Array.from(document.querySelectorAll('button,a,[role="button"],[data-tab],[data-target],[aria-controls]'));
  }

  function findClickable(re) {
    return clickables().find(el => re.test(norm(el.textContent))) || null;
  }

  function targetFromTab(tab) {
    if (!tab) return null;
    const raw = tab.getAttribute('aria-controls') || tab.getAttribute('data-target') || tab.getAttribute('data-tab') || tab.getAttribute('href') || '';
    const id = raw.replace(/^#/, '');
    if (id && document.getElementById(id)) return document.getElementById(id);
    return null;
  }

  function findPane(word, tab) {
    const direct = targetFromTab(tab);
    if (direct) return direct;
    const key = lower(word);
    const candidates = Array.from(document.querySelectorAll('section,article,main,div')).filter(el => {
      const sig = lower(`${el.id || ''} ${el.className || ''}`);
      return sig.includes(key) && el.children.length > 0 && !el.matches('nav,[role="tablist"]');
    });
    candidates.sort((a,b) => a.children.length - b.children.length);
    return candidates[0] || null;
  }

  function replaceVisibleLabelPreserveIcon(el, re, replacement) {
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const node = nodes.find(n => re.test(norm(n.nodeValue)));
    if (node) node.nodeValue = node.nodeValue.replace(re, replacement);
    el.setAttribute('aria-label', replacement);
    el.setAttribute('title', replacement);
  }

  function addStyles() {
    if (document.getElementById(`${MARK}-style`)) return;
    const style = document.createElement('style');
    style.id = `${MARK}-style`;
    style.textContent = `
      .rac-account-box,.rac-inbox{box-sizing:border-box;width:100%;max-width:100%;border:1px solid rgba(148,163,184,.14);background:#0f1624;color:#e2e8f0;border-radius:16px;padding:14px;margin:0 0 14px;overflow:hidden}
      .rac-account-title,.rac-inbox-title{font-weight:900;font-size:1rem;color:#f8fafc;margin:0 0 5px}
      .rac-muted{font-size:.82rem;color:#94a3b8;line-height:1.45;overflow-wrap:anywhere}
      .rac-account-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}
      .rac-signout{border:1px solid rgba(248,113,113,.25);background:rgba(248,113,113,.08);color:#fecaca;border-radius:11px;padding:8px 12px;font-weight:800}
      .rac-view-holder{margin-top:10px;max-width:100%}
      .rac-inbox-list{display:grid;gap:10px;margin-top:12px}
      .rac-request{box-sizing:border-box;width:100%;max-width:100%;border:1px solid rgba(148,163,184,.13);background:#0b1220;border-radius:14px;padding:12px;overflow:hidden}
      .rac-request-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0}
      .rac-request-title{font-weight:850;color:#f8fafc;min-width:0;overflow-wrap:anywhere}
      .rac-chip{flex:0 0 auto;font-size:.7rem;font-weight:850;padding:4px 7px;border-radius:999px;background:rgba(20,184,166,.12);color:#5eead4}
      .rac-request-meta{font-size:.8rem;color:#94a3b8;line-height:1.45;margin-top:6px;overflow-wrap:anywhere;word-break:break-word}
      .rac-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .rac-btn{border:0;border-radius:10px;padding:8px 12px;font-weight:850;min-width:92px;cursor:pointer}
      .rac-approve,.rac-informed{background:#14b8a6;color:#04130f}.rac-decline{background:#273244;color:#f8fafc;border:1px solid rgba(148,163,184,.16)}
      .rac-bell{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:0}
      .rac-bell svg{width:22px;height:22px;display:block}
      .rac-badge{position:absolute;right:5px;top:4px;min-width:17px;height:17px;border-radius:999px;padding:0 4px;background:#ef4444;color:#fff;font:800 10px/17px system-ui;text-align:center}
      .rac-feedback-wrap{margin-top:16px;padding-top:14px;border-top:1px solid rgba(148,163,184,.12)}
      .rac-section-label{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;font-weight:900;margin:0 0 9px}
    `;
    document.head.appendChild(style);
  }

  function currentPhysician() {
    const values = [
      window.rotasticRegistrationIdentity?.profile_physician_name,
      window.rotasticRegistrationIdentity?.physician_name,
      window.rotasticBackendUser?.user_metadata?.physician_name,
      window.currentUser?.physician_name,
      window.currentUser?.name
    ];
    return norm(values.find(Boolean));
  }

  async function currentEmail() {
    try {
      const s = await window.rotasticBackendClient?.auth?.getSession?.();
      return lower(s?.data?.session?.user?.email || window.rotasticRegistrationIdentity?.email || '');
    } catch (_) {
      return lower(window.rotasticRegistrationIdentity?.email || '');
    }
  }

  async function isMoursi() {
    const email = await currentEmail();
    const name = lower(currentPhysician());
    return email === MOURSI_EMAIL || (name.includes('mohamed') && name.includes('moursi'));
  }

  function mergeAdminTabs() {
    const annTab = findClickable(/\b(announcement|broadcast)s?\b/i);
    const feedbackTab = findClickable(/\bfeedback\b/i);
    if (!annTab || !feedbackTab) return combinedPane;

    replaceVisibleLabelPreserveIcon(annTab, /Announcements?|Broadcasts?/i, 'Updates');
    feedbackTab.style.display = 'none';
    feedbackTab.setAttribute('aria-hidden','true');

    const annPane = findPane('announcement', annTab) || findPane('broadcast', annTab);
    const feedbackPane = findPane('feedback', feedbackTab);
    if (!annPane) return combinedPane;

    if (feedbackPane && feedbackPane !== annPane && !annPane.querySelector('[data-rac-feedback="1"]')) {
      const wrap = document.createElement('div');
      wrap.className = 'rac-feedback-wrap';
      wrap.dataset.racFeedback = '1';
      const label = document.createElement('div');
      label.className = 'rac-section-label';
      label.textContent = 'Feedback';
      wrap.appendChild(label);
      while (feedbackPane.firstChild) wrap.appendChild(feedbackPane.firstChild);
      annPane.appendChild(wrap);
      feedbackPane.style.display = 'none';
    }

    combinedPane = annPane;
    return annPane;
  }

  function settingsPane() {
    const tab = findClickable(/^\s*settings\s*$/i) || findClickable(/settings/i);
    return findPane('settings', tab);
  }

  function headerAdminControl() {
    return clickables().find(el => /^(admin login|admin view|colleague view)$/i.test(norm(el.textContent))) || null;
  }

  function accountBox() {
    const pane = settingsPane();
    if (!pane) return null;
    let box = document.getElementById('rac-account-box');
    if (!box) {
      box = document.createElement('section');
      box.id = 'rac-account-box';
      box.className = 'rac-account-box';
      box.innerHTML = '<div class="rac-account-title">Account & view</div><div class="rac-muted rac-current-view"></div><div id="rac-view-holder" class="rac-view-holder"></div><div class="rac-account-actions"><button type="button" class="rac-signout">Sign out</button></div>';
      box.querySelector('.rac-signout').onclick = signOut;
      pane.insertBefore(box, pane.firstChild);
    }
    const current = box.querySelector('.rac-current-view');
    if (current) current.innerHTML = `You are viewing as doctor <strong>${escapeHtml(currentPhysician() || 'Not signed in')}</strong>.`;
    return box;
  }

  function moveAdminControlAndInstallBell() {
    const control = headerAdminControl();
    const box = accountBox();
    if (!box) return;
    const holder = box.querySelector('#rac-view-holder');

    if (control && holder && !holder.contains(control)) {
      let marker = document.getElementById('rac-header-slot');
      if (!marker) {
        marker = document.createElement('span');
        marker.id = 'rac-header-slot';
        marker.style.display = 'none';
        control.parentNode?.insertBefore(marker, control);
      }
      holder.appendChild(control);
    }

    if (!bell) bell = document.getElementById('rac-header-bell');
    if (!bell) {
      bell = document.createElement('button');
      bell.type = 'button';
      bell.id = 'rac-header-bell';
      bell.className = `${control?.className || ''} rac-bell`.trim();
      bell.setAttribute('aria-label','Notifications');
      bell.setAttribute('title','Notifications');
      bell.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>';
      bell.onclick = openUpdates;
      const marker = document.getElementById('rac-header-slot');
      if (marker?.parentNode) marker.parentNode.insertBefore(bell, marker);
      else {
        const header = document.querySelector('header');
        if (header) header.appendChild(bell);
      }
    }
  }

  async function signOut() {
    try { await window.rotasticBackendClient?.auth?.signOut?.(); } catch (_) {}
    try { window.rotasticBackendUser = null; } catch (_) {}
    try { window.rotasticRegistrationIdentity = null; } catch (_) {}
    location.reload();
  }

  function openUpdates() {
    const tab = findClickable(/^\s*updates\s*$/i) || findClickable(/\b(announcement|broadcast)s?\b/i);
    if (tab) tab.click();
    setTimeout(() => document.getElementById('rac-moursi-inbox')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
  }

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function setBellCount(count) {
    if (!bell) return;
    let badge = bell.querySelector('.rac-badge');
    if (!count) { badge?.remove(); return; }
    if (!badge) { badge = document.createElement('span'); badge.className = 'rac-badge'; bell.appendChild(badge); }
    badge.textContent = count > 99 ? '99+' : String(count);
  }

  async function backendClient() {
    try { if (typeof window.rotasticBackendEnsureSession === 'function') await window.rotasticBackendEnsureSession(); } catch (_) {}
    return window.rotasticBackendClient || null;
  }

  async function loadMoursiInbox() {
    if (!(await isMoursi())) { setBellCount(0); return []; }
    const client = await backendClient();
    if (!client?.rpc) return [];
    const {data,error} = await client.rpc('rotastic_moursi_approval_inbox');
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    setBellCount(rows.length);
    return rows;
  }

  function requestKindLabel(row) {
    if (row.request_kind === 'rota') return 'Rota';
    if (row.request_kind === 'swap') return 'Swap';
    if (row.request_kind === 'sick') return 'Sick leave';
    return row.title || 'Leave';
  }

  async function actOnRequest(row, action) {
    const client = await backendClient();
    if (!client?.rpc) throw new Error('Secure ROTASTIC session is required.');
    let note = null;
    if (action === 'decline' && row.request_kind === 'rota') {
      note = window.prompt('Reason / requested amendment:', 'Please revise this rota and resend for approval.');
      if (!note) return;
    }
    const {error} = await client.rpc('rotastic_moursi_request_action', {
      p_kind: row.request_kind,
      p_id: row.request_id,
      p_action: action,
      p_note: note
    });
    if (error) throw error;
    await renderMoursiInbox();
  }

  async function renderMoursiInbox() {
    const pane = combinedPane || mergeAdminTabs();
    if (!pane) return;
    const moursi = await isMoursi();
    let box = document.getElementById('rac-moursi-inbox');
    if (!moursi) { box?.remove(); setBellCount(0); return; }

    if (!box) {
      box = document.createElement('section');
      box.id = 'rac-moursi-inbox';
      box.className = 'rac-inbox';
      pane.insertBefore(box,pane.firstChild);
    }
    box.innerHTML = '<div class="rac-inbox-title">Approval inbox</div><div class="rac-muted">Leave, swap and rota items sent to you appear here. Sick leave requires acknowledgement, not approval.</div><div class="rac-inbox-list"><div class="rac-muted">Loading…</div></div>';
    const list = box.querySelector('.rac-inbox-list');

    try {
      const rows = await loadMoursiInbox();
      list.innerHTML = '';
      if (!rows.length) {
        list.innerHTML = '<div class="rac-muted">Nothing is waiting for you.</div>';
        return;
      }
      rows.forEach(row => {
        const card = document.createElement('div');
        card.className = 'rac-request';
        const inform = row.action_mode === 'inform';
        card.innerHTML = `<div class="rac-request-head"><div class="rac-request-title">${escapeHtml(row.title || requestKindLabel(row))}</div><span class="rac-chip">${escapeHtml(requestKindLabel(row))}</span></div><div class="rac-request-meta"><strong>${escapeHtml(row.physician_name || '')}</strong>${row.detail ? '<br>'+escapeHtml(row.detail) : ''}</div><div class="rac-actions"></div>`;
        const actions = card.querySelector('.rac-actions');
        if (inform) {
          const informed = document.createElement('button');
          informed.type = 'button'; informed.className = 'rac-btn rac-informed'; informed.textContent = 'Informed';
          informed.onclick = async () => { informed.disabled = true; try { await actOnRequest(row,'informed'); } catch(e) { alert(e?.message || 'Could not acknowledge this item.'); informed.disabled = false; } };
          actions.appendChild(informed);
        } else {
          const approve = document.createElement('button');
          approve.type = 'button'; approve.className = 'rac-btn rac-approve'; approve.textContent = 'Approve';
          approve.onclick = async () => { approve.disabled = true; try { await actOnRequest(row,'approve'); } catch(e) { alert(e?.message || 'Could not approve this item.'); approve.disabled = false; } };
          const decline = document.createElement('button');
          decline.type = 'button'; decline.className = 'rac-btn rac-decline'; decline.textContent = 'Decline';
          decline.onclick = async () => { decline.disabled = true; try { await actOnRequest(row,'decline'); } catch(e) { alert(e?.message || 'Could not decline this item.'); decline.disabled = false; } };
          actions.append(approve,decline);
        }
        list.appendChild(card);
      });
    } catch (e) {
      list.innerHTML = `<div class="rac-muted">${escapeHtml(e?.message || 'Unable to load approvals.')}</div>`;
    }
  }

  async function apply() {
    addStyles();
    mergeAdminTabs();
    moveAdminControlAndInstallBell();
    await renderMoursiInbox();
  }

  function start() {
    apply();
    let debounce = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { mergeAdminTabs(); moveAdminControlAndInstallBell(); },180);
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    clearInterval(inboxTimer);
    inboxTimer = setInterval(() => renderMoursiInbox(),45000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();