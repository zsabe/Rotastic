(() => {
  'use strict';

  const MARK = 'rotastic-admin-comms-v1';
  const COMBINED_LABEL = 'Updates & Requests';
  const MOURSI_NAME = 'Dr Mohamed M.';
  let lastReview = null;
  let initialized = false;

  const norm = value => String(value || '').replace(/\s+/g, ' ').trim();
  const lower = value => norm(value).toLowerCase();

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function clickables() {
    return Array.from(document.querySelectorAll('button, a, [role="button"], [data-tab], [data-target], [aria-controls]'));
  }

  function findTab(keyword) {
    const re = new RegExp(keyword, 'i');
    return clickables().find(el => re.test(norm(el.textContent))) || null;
  }

  function targetFromTab(tab) {
    if (!tab) return null;
    const raw = tab.getAttribute('aria-controls') || tab.getAttribute('data-target') || tab.getAttribute('data-tab') || tab.getAttribute('href') || '';
    if (raw) {
      const id = raw.replace(/^#/, '');
      const byId = document.getElementById(id);
      if (byId) return byId;
      try {
        const q = raw.startsWith('#') ? document.querySelector(raw) : null;
        if (q) return q;
      } catch (_) {}
    }
    return null;
  }

  function findPane(keyword, tab) {
    const direct = targetFromTab(tab);
    if (direct) return direct;
    const k = keyword.toLowerCase();
    const candidates = Array.from(document.querySelectorAll('section, main, article, div'))
      .filter(el => {
        const sig = `${el.id || ''} ${el.className || ''}`.toLowerCase();
        if (!sig.includes(k)) return false;
        if (el.matches('button,nav,[role="tablist"]')) return false;
        return el.children.length > 0;
      });
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.children.length - b.children.length);
    return candidates[0];
  }

  function addStyles() {
    if (document.getElementById(`${MARK}-style`)) return;
    const style = document.createElement('style');
    style.id = `${MARK}-style`;
    style.textContent = `
      .rotastic-comms-section-title{font-weight:800;font-size:.82rem;letter-spacing:.04em;text-transform:uppercase;opacity:.72;margin:14px 2px 8px}
      .rotastic-moursi-review-card{border:1px solid rgba(45,212,191,.28);background:linear-gradient(145deg,rgba(20,184,166,.10),rgba(15,23,42,.76));border-radius:16px;padding:14px;margin:0 0 14px;box-shadow:0 12px 30px rgba(0,0,0,.18)}
      .rotastic-moursi-review-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
      .rotastic-moursi-review-title{font-size:1rem;font-weight:800}
      .rotastic-moursi-review-status{font-size:.76rem;padding:4px 8px;border-radius:999px;background:rgba(148,163,184,.14);white-space:nowrap}
      .rotastic-moursi-review-meta{font-size:.86rem;line-height:1.45;opacity:.86;margin-bottom:12px}
      .rotastic-moursi-review-actions{display:flex;gap:9px;flex-wrap:wrap}
      .rotastic-moursi-review-actions button{border:0;border-radius:12px;padding:9px 14px;font-weight:800;cursor:pointer}
      .rotastic-review-approve{background:#14b8a6;color:#04130f}
      .rotastic-review-decline{background:rgba(248,113,113,.15);color:#fecaca;border:1px solid rgba(248,113,113,.28)!important}
      .rotastic-review-muted{opacity:.7;font-size:.86rem}
      .rotastic-view-mode-box{border:1px solid rgba(148,163,184,.14);border-radius:14px;padding:12px;margin:0 0 14px;background:rgba(15,23,42,.42)}
      .rotastic-view-mode-label{font-size:.78rem;font-weight:800;opacity:.7;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em}
      .rotastic-bell-button{display:inline-flex;align-items:center;justify-content:center;position:relative;min-width:38px;height:38px;border-radius:12px;border:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.72);color:inherit;cursor:pointer;font-size:19px}
      .rotastic-bell-badge{position:absolute;right:-4px;top:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#ef4444;color:white;font:800 11px/18px system-ui;text-align:center}
      .rotastic-combined-feedback{margin-top:16px;padding-top:14px;border-top:1px solid rgba(148,163,184,.14)}
    `;
    document.head.appendChild(style);
  }

  function ensureSectionTitle(parent, text, beforeNode) {
    if (!parent) return;
    const key = text.toLowerCase().replace(/\W+/g, '-');
    if (parent.querySelector(`[data-rotastic-section="${key}"]`)) return;
    const title = document.createElement('div');
    title.className = 'rotastic-comms-section-title';
    title.dataset.rotasticSection = key;
    title.textContent = text;
    parent.insertBefore(title, beforeNode || parent.firstChild);
  }

  function mergeAnnouncementAndFeedback() {
    const annTab = findTab('announcement');
    const feedbackTab = findTab('feedback');
    if (!annTab || !feedbackTab) return null;

    annTab.textContent = COMBINED_LABEL;
    annTab.setAttribute('aria-label', COMBINED_LABEL);
    feedbackTab.style.display = 'none';
    feedbackTab.setAttribute('aria-hidden', 'true');

    const annPane = findPane('announcement', annTab);
    const feedbackPane = findPane('feedback', feedbackTab);
    if (!annPane) return null;

    if (feedbackPane && feedbackPane !== annPane && !feedbackPane.dataset.rotasticMerged) {
      ensureSectionTitle(annPane, 'Announcements');
      const wrap = document.createElement('div');
      wrap.className = 'rotastic-combined-feedback';
      wrap.dataset.rotasticMergedFeedback = '1';
      ensureSectionTitle(wrap, 'Feedback');
      while (feedbackPane.firstChild) wrap.appendChild(feedbackPane.firstChild);
      annPane.appendChild(wrap);
      feedbackPane.dataset.rotasticMerged = '1';
      feedbackPane.style.display = 'none';
    }
    annPane.dataset.rotasticCombinedPane = '1';
    return annPane;
  }

  function findSettingsPane() {
    const settingsTab = findTab('settings');
    return findPane('settings', settingsTab);
  }

  function commonAncestor(a, b) {
    if (!a || !b) return null;
    const aParents = [];
    for (let x = a; x && x !== document.body; x = x.parentElement) aParents.push(x);
    for (let y = b; y && y !== document.body; y = y.parentElement) {
      if (aParents.includes(y)) return y;
    }
    return null;
  }

  function findViewSwitchContainer() {
    const all = Array.from(document.querySelectorAll('button, a, label, span, div'));
    const admin = all.find(el => /admin\s*view/i.test(norm(el.textContent)) && norm(el.textContent).length < 90);
    const colleague = all.find(el => /colleague\s*view/i.test(norm(el.textContent)) && norm(el.textContent).length < 90);
    if (admin && colleague) {
      const common = commonAncestor(admin, colleague);
      if (common && common !== document.body && common.children.length < 12) return common;
    }
    return admin || colleague || null;
  }

  function moveViewSwitchToSettings() {
    const settingsPane = findSettingsPane();
    const switchNode = findViewSwitchContainer();
    if (!settingsPane || !switchNode || settingsPane.contains(switchNode)) return null;
    if (switchNode.closest('.rotastic-view-mode-box')) return null;

    const oldParent = switchNode.parentElement;
    const placeholder = document.createElement('span');
    placeholder.dataset.rotasticViewSwitchPlaceholder = '1';
    if (oldParent) oldParent.insertBefore(placeholder, switchNode);

    const box = document.createElement('div');
    box.className = 'rotastic-view-mode-box';
    box.dataset.rotasticViewMode = '1';
    const label = document.createElement('div');
    label.className = 'rotastic-view-mode-label';
    label.textContent = 'View mode';
    box.appendChild(label);
    box.appendChild(switchNode);
    settingsPane.insertBefore(box, settingsPane.firstChild);
    return placeholder;
  }

  function openCombinedTab() {
    const annTab = findTab('updates & requests') || findTab('announcement');
    if (annTab) annTab.click();
    const card = document.getElementById('rotastic-moursi-review-card');
    if (card) setTimeout(() => card.scrollIntoView({behavior:'smooth', block:'start'}), 120);
  }

  function ensureBell(placeholder) {
    if (document.getElementById('rotastic-admin-bell')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'rotastic-admin-bell';
    button.className = 'rotastic-bell-button';
    button.title = 'Notifications';
    button.setAttribute('aria-label', 'Notifications');
    button.textContent = '🔔';
    button.addEventListener('click', openCombinedTab);

    if (placeholder && placeholder.parentElement) {
      placeholder.replaceWith(button);
      return;
    }

    const header = document.querySelector('header') || document.querySelector('[class*="header"]');
    if (header) header.appendChild(button);
  }

  function setBellCount(count) {
    const bell = document.getElementById('rotastic-admin-bell');
    if (!bell) return;
    let badge = bell.querySelector('.rotastic-bell-badge');
    if (!count) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'rotastic-bell-badge';
      bell.appendChild(badge);
    }
    badge.textContent = String(Math.min(99, count));
  }

  async function backendClient() {
    try {
      if (typeof window.rotasticBackendEnsureSession === 'function') await window.rotasticBackendEnsureSession();
    } catch (_) {}
    return window.rotasticBackendClient || null;
  }

  function isPendingReview(review) {
    return review && ['sent_to_moursi','under_review','zaid_modification_requested'].includes(String(review.status || ''));
  }

  function formatDate(value) {
    if (!value) return '';
    try { return new Date(value).toLocaleString([], {dateStyle:'medium', timeStyle:'short'}); } catch (_) { return String(value); }
  }

  function renderMoursiCard(pane, review, isMoursi) {
    let card = document.getElementById('rotastic-moursi-review-card');
    if (!isMoursi) {
      if (card) card.remove();
      setBellCount(0);
      return;
    }
    if (!pane) return;
    if (!card) {
      card = document.createElement('div');
      card.id = 'rotastic-moursi-review-card';
      card.className = 'rotastic-moursi-review-card';
      pane.insertBefore(card, pane.firstChild);
    }

    const pending = isPendingReview(review);
    setBellCount(pending ? 1 : 0);
    if (!pending) {
      card.innerHTML = `
        <div class="rotastic-moursi-review-head">
          <div class="rotastic-moursi-review-title">🔔 Requests for approval</div>
          <div class="rotastic-moursi-review-status">Up to date</div>
        </div>
        <div class="rotastic-review-muted">No pending requests have been sent to you.</div>`;
      return;
    }

    const week = norm(review.week_start) || 'Upcoming rota';
    const sent = formatDate(review.sent_to_moursi_at);
    card.innerHTML = `
      <div class="rotastic-moursi-review-head">
        <div class="rotastic-moursi-review-title">🔔 Request awaiting your decision</div>
        <div class="rotastic-moursi-review-status">Pending</div>
      </div>
      <div class="rotastic-moursi-review-meta">
        <strong>Suggested rota:</strong> week of ${week}${sent ? `<br><strong>Sent:</strong> ${sent}` : ''}
      </div>
      <div class="rotastic-moursi-review-actions">
        <button type="button" class="rotastic-review-approve">Approve</button>
        <button type="button" class="rotastic-review-decline">Decline</button>
      </div>`;

    card.querySelector('.rotastic-review-approve')?.addEventListener('click', () => decideReview('approve', review.id, card));
    card.querySelector('.rotastic-review-decline')?.addEventListener('click', () => decideReview('decline', review.id, card));
  }

  async function decideReview(action, reviewId, card) {
    const client = await backendClient();
    if (!client || !reviewId) {
      alert('Secure ROTASTIC session is required.');
      return;
    }
    const buttons = Array.from(card.querySelectorAll('button'));
    buttons.forEach(b => b.disabled = true);
    try {
      const result = action === 'approve'
        ? await client.rpc('rotastic_rota_review_approve', {p_review_id: reviewId})
        : await client.rpc('rotastic_rota_review_amend', {p_review_id: reviewId, p_text: 'Declined by Dr Moursi — please revise and resend.'});
      if (result?.error) throw result.error;
      await refreshMoursiReview(true);
    } catch (err) {
      alert(err?.message || 'Unable to update this request.');
      buttons.forEach(b => b.disabled = false);
    }
  }

  async function refreshMoursiReview(force) {
    const pane = document.querySelector('[data-rotastic-combined-pane="1"]') || mergeAnnouncementAndFeedback();
    const client = await backendClient();
    if (!client) return;
    try {
      const {data, error} = await client.rpc('rotastic_rota_review_status', {p_review_id: null});
      if (error) return;
      lastReview = data || null;
      const viewer = norm(data?.viewer);
      const isMoursi = lower(viewer) === lower(MOURSI_NAME) || /moursi/i.test(viewer);
      renderMoursiCard(pane, data, isMoursi);
    } catch (_) {
      if (force) renderMoursiCard(pane, lastReview, false);
    }
  }

  function applyLayout() {
    addStyles();
    const pane = mergeAnnouncementAndFeedback();
    let placeholder = document.querySelector('[data-rotastic-view-switch-placeholder="1"]');
    if (!document.querySelector('[data-rotastic-view-mode="1"]')) placeholder = moveViewSwitchToSettings() || placeholder;
    ensureBell(placeholder);
    if (pane) refreshMoursiReview(false);
  }

  function start() {
    if (initialized) return;
    initialized = true;
    applyLayout();
    let timer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(applyLayout, 160);
    });
    observer.observe(document.documentElement, {childList:true, subtree:true});
    setInterval(() => refreshMoursiReview(false), 45000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
