(() => {
  'use strict';

  if (window.__ROTASTIC_ADMIN_WORKFLOW_V2__) return;
  window.__ROTASTIC_ADMIN_WORKFLOW_V2__ = true;

  const norm = v => String(v || '').replace(/\s+/g, ' ').trim();
  const lower = v => norm(v).toLowerCase();
  const MOURSI_NAMES = ['dr mohamed m.', 'dr mohamed salah moursi', 'dr. mohamed salah moursi'];
  const COMBINED_LABEL = 'Updates & Approvals';
  let panel = null;
  let inbox = null;
  let bell = null;

  function currentPhysician() {
    const candidates = [
      window.rotasticRegistrationIdentity?.physician_name,
      window.rotasticRegistrationIdentity?.profile_physician_name,
      window.rotasticBackendUser?.user_metadata?.physician_name,
      window.currentUser?.physician_name,
      window.currentUser?.name
    ];
    return norm(candidates.find(Boolean));
  }

  function isMoursi() {
    const n = lower(currentPhysician());
    return MOURSI_NAMES.includes(n) || n.includes('mohamed') && n.includes('moursi');
  }

  function client() {
    return window.rotasticBackendClient || null;
  }

  function css() {
    if (document.getElementById('rotastic-admin-workflow-style')) return;
    const s = document.createElement('style');
    s.id = 'rotastic-admin-workflow-style';
    s.textContent = `
      #rotasticApprovalInbox{margin:0 0 18px;padding:16px;border-radius:16px;background:#0f1624;border:1px solid rgba(20,184,166,.22);color:#e2e8f0}
      #rotasticApprovalInbox h3{margin:0 0 6px;font-size:18px}
      #rotasticApprovalInbox .rw-sub{font-size:12px;color:#94a3b8;margin-bottom:12px}
      .rw-request{padding:12px;margin:10px 0;border-radius:12px;border:1px solid rgba(148,163,184,.15);background:#0b1220}
      .rw-request-title{font-weight:700;margin-bottom:5px}.rw-request-meta{font-size:12px;line-height:1.45;color:#94a3b8}
      .rw-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.rw-btn{border:0;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer}
      .rw-approve{background:#14b8a6;color:#04110f}.rw-decline{background:#293244;color:#f8fafc}.rw-empty{font-size:13px;color:#94a3b8;padding:10px 0}
      #rotasticHeaderBell{display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:36px;padding:0 10px;border-radius:12px;border:1px solid rgba(148,163,184,.16);background:#0f1624;color:#e2e8f0;cursor:pointer;font-size:18px;position:relative}
      #rotasticHeaderBell .rw-badge{position:absolute;right:4px;top:2px;min-width:16px;height:16px;border-radius:8px;padding:0 4px;background:#ef4444;color:#fff;font-size:10px;line-height:16px;text-align:center}
      #rotasticViewSwitchSettings{margin:0 0 14px;padding:12px;border:1px solid rgba(148,163,184,.12);border-radius:12px;background:#0f1624}
      #rotasticViewSwitchSettings .rw-label{font-size:12px;color:#94a3b8;margin-bottom:8px}
    `;
    document.head.appendChild(s);
  }

  function clickables() {
    return Array.from(document.querySelectorAll('button,a,[role="button"],[data-tab],[data-target],[aria-controls]'));
  }

  function findTab(re) {
    return clickables().find(el => re.test(norm(el.textContent))) || null;
  }

  function targetFromTab(tab) {
    if (!tab) return null;
    const raw = tab.getAttribute('aria-controls') || tab.getAttribute('data-target') || tab.getAttribute('data-tab') || tab.getAttribute('href') || '';
    const id = raw.replace(/^#/, '');
    if (id && document.getElementById(id)) return document.getElementById(id);
    return null;
  }

  function mergeTabs() {
    const announcementTab = findTab(/announcement/i);
    const feedbackTab = findTab(/feedback/i);
    if (!announcementTab && !feedbackTab) return;
    const primary = announcementTab || feedbackTab;
    primary.textContent = COMBINED_LABEL;
    const primaryPanel = targetFromTab(primary);
    const secondaryPanel = targetFromTab(primary === announcementTab ? feedbackTab : announcementTab);
    if (feedbackTab && feedbackTab !== primary) feedbackTab.style.display = 'none';
    if (announcementTab && announcementTab !== primary) announcementTab.style.display = 'none';
    if (primaryPanel && secondaryPanel && secondaryPanel !== primaryPanel && !primaryPanel.contains(secondaryPanel)) {
      while (secondaryPanel.firstChild) primaryPanel.appendChild(secondaryPanel.firstChild);
      secondaryPanel.style.display = 'none';
    }
    panel = primaryPanel;
    ensureInbox();
  }

  function ensureInbox() {
    if (!isMoursi() || !panel) return;
    inbox = document.getElementById('rotasticApprovalInbox');
    if (!inbox) {
      inbox = document.createElement('section');
      inbox.id = 'rotasticApprovalInbox';
      inbox.innerHTML = '<h3>Approval Inbox</h3><div class="rw-sub">Rota, leave and swap requests awaiting your decision.</div><div id="rotasticApprovalInboxList" class="rw-empty">Loading requests…</div>';
      panel.prepend(inbox);
    }
    refreshInbox();
  }

  function pendingStatus(v) {
    const s = lower(v);
    return !s || s === 'submitted for approval' || s === 'sent_to_moursi' || s === 'under_review' || s === 'pending';
  }

  async function loadRequests() {
    const c = client();
    if (!c || !isMoursi()) return [];
    const out = [];

    try {
      const { data } = await c.from('rotastic_leave_requests').select('id,physician_name,leave_type,type_label,start_date,end_date,notes,status,created_at').order('created_at', { ascending: false }).limit(50);
      (data || []).filter(r => pendingStatus(r.status)).forEach(r => out.push({ kind: 'leave', ...r }));
    } catch (_) {}

    try {
      const { data } = await c.from('rotastic_swap_requests').select('id,physician_name,target_physician_name,shift_date,shift_period,requested_shift_date,requested_shift_period,notes,status,created_at').order('created_at', { ascending: false }).limit(50);
      (data || []).filter(r => pendingStatus(r.status)).forEach(r => out.push({ kind: 'swap', ...r }));
    } catch (_) {}

    try {
      const { data, error } = await c.rpc('rotastic_rota_review_status', { p_review_id: null });
      if (!error && data && ['sent_to_moursi','under_review','zaid_modification_requested'].includes(String(data.status || ''))) out.push({ kind: 'rota', ...data, created_at: data.sent_to_moursi_at || data.generated_at });
    } catch (_) {}

    return out.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  function esc(v) {
    return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function describe(r) {
    if (r.kind === 'leave') return {
      title: `Leave request — ${esc(r.physician_name)}`,
      meta: `${esc(r.type_label || r.leave_type || 'Leave')} · ${esc(r.start_date)} to ${esc(r.end_date)}${r.notes ? '<br>' + esc(r.notes) : ''}`
    };
    if (r.kind === 'swap') return {
      title: `Swap request — ${esc(r.physician_name)}`,
      meta: `${esc(r.shift_date || '')} ${esc(r.shift_period || '')}${r.target_physician_name ? ' → ' + esc(r.target_physician_name) : ''}${r.requested_shift_date ? '<br>Requested: ' + esc(r.requested_shift_date) + ' ' + esc(r.requested_shift_period || '') : ''}${r.notes ? '<br>' + esc(r.notes) : ''}`
    };
    return { title: 'Suggested rota review', meta: `Week starting ${esc(r.week_start || '')}` };
  }

  async function decide(r, approved) {
    const c = client();
    if (!c) throw new Error('Secure backend session unavailable.');
    const reviewer = currentPhysician() || 'Dr Mohamed M.';
    if (r.kind === 'rota') {
      if (approved) {
        const { error } = await c.rpc('rotastic_rota_review_approve', { p_review_id: r.id });
        if (error) throw error;
      } else {
        const text = window.prompt('Reason for declining / requested amendment:', 'Please revise this rota and resend for approval.');
        if (!text) return;
        const { error } = await c.rpc('rotastic_rota_review_amend', { p_review_id: r.id, p_text: text });
        if (error) throw error;
      }
    } else if (r.kind === 'leave') {
      const status = approved ? 'Approved' : 'Declined';
      const { error } = await c.from('rotastic_leave_requests').update({ status, approved_by_name: reviewer, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', r.id);
      if (error) throw error;
    } else if (r.kind === 'swap') {
      const status = approved ? 'Approved' : 'Declined';
      const { error } = await c.from('rotastic_swap_requests').update({ status, reviewed_by_name: reviewer, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', r.id);
      if (error) throw error;
    }
    await refreshInbox();
  }

  async function refreshInbox() {
    const list = document.getElementById('rotasticApprovalInboxList');
    if (!list || !isMoursi()) return;
    list.textContent = 'Loading requests…';
    const requests = await loadRequests();
    if (!requests.length) {
      list.className = 'rw-empty';
      list.textContent = 'No requests are waiting for approval.';
      updateBell(0);
      return;
    }
    list.className = '';
    list.innerHTML = '';
    for (const r of requests) {
      const d = describe(r);
      const card = document.createElement('div');
      card.className = 'rw-request';
      card.innerHTML = `<div class="rw-request-title">${d.title}</div><div class="rw-request-meta">${d.meta}</div><div class="rw-actions"><button class="rw-btn rw-approve">Approve</button><button class="rw-btn rw-decline">Decline</button></div>`;
      card.querySelector('.rw-approve').onclick = async () => { try { await decide(r, true); } catch (e) { alert(e?.message || 'Could not approve request.'); } };
      card.querySelector('.rw-decline').onclick = async () => { try { await decide(r, false); } catch (e) { alert(e?.message || 'Could not decline request.'); } };
      list.appendChild(card);
    }
    updateBell(requests.length);
  }

  function updateBell(count) {
    if (!bell) return;
    let badge = bell.querySelector('.rw-badge');
    if (count > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'rw-badge'; bell.appendChild(badge); }
      badge.textContent = count > 99 ? '99+' : String(count);
    } else if (badge) badge.remove();
  }

  function installBellAndMoveViewSwitch() {
    const controls = clickables();
    const viewButtons = controls.filter(el => /^(admin view|colleague view)$/i.test(norm(el.textContent)));
    if (viewButtons.length) {
      const holder = viewButtons[0].parentElement;
      const settingsTab = findTab(/settings/i);
      const settingsPanel = targetFromTab(settingsTab);
      if (holder && settingsPanel && !document.getElementById('rotasticViewSwitchSettings')) {
        const box = document.createElement('div');
        box.id = 'rotasticViewSwitchSettings';
        box.innerHTML = '<div class="rw-label">View mode</div>';
        holder.parentNode?.insertBefore(document.createComment('view-switch-moved'), holder);
        box.appendChild(holder);
        settingsPanel.prepend(box);
      }
    }

    if (!bell) {
      bell = document.getElementById('rotasticHeaderBell');
      if (!bell) {
        bell = document.createElement('button');
        bell.id = 'rotasticHeaderBell';
        bell.type = 'button';
        bell.setAttribute('aria-label', 'Notifications and approvals');
        bell.textContent = '🔔';
        bell.onclick = () => {
          const tab = findTab(/updates\s*&\s*approvals/i) || findTab(/announcement/i) || findTab(/feedback/i);
          if (tab) tab.click();
          setTimeout(() => document.getElementById('rotasticApprovalInbox')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        };
        const header = document.querySelector('header') || document.querySelector('nav') || document.body.firstElementChild;
        if (header) header.appendChild(bell);
      }
    }
  }

  function apply() {
    css();
    mergeTabs();
    installBellAndMoveViewSwitch();
    ensureInbox();
  }

  document.addEventListener('DOMContentLoaded', apply, { once: true });
  if (document.readyState !== 'loading') apply();
  const observer = new MutationObserver(() => apply());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(() => { if (isMoursi()) refreshInbox(); }, 30000);
})();
