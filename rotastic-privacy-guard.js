/* ROTASTIC PHCC privacy guard.
   This file disables the pre-confidentiality sickness path that still exists in
   the historical monolithic index.html. The supported sickness workflow is
   rotastic-sickness.js + Supabase RLS/RPCs. */
(function () {
  'use strict';

  const BLOCKED_KEYS = new Set([
    'rotastic_sick_leave_records',
    'rotastic_pending_shift_lead_sick_alerts'
  ]);

  function removeLegacySensitiveState() {
    try {
      BLOCKED_KEYS.forEach(key => localStorage.removeItem(key));
      const metaRaw = localStorage.getItem('rotastic_active_announcement_meta');
      if (metaRaw) {
        try {
          const meta = JSON.parse(metaRaw);
          if (meta && String(meta.kind || '').toLowerCase() === 'sick') {
            localStorage.removeItem('rotastic_active_announcement_meta');
            localStorage.removeItem('rotastic_breaking_news_item');
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  // Prevent the historical app code from recreating browser-side sickness caches.
  try {
    const proto = window.Storage && window.Storage.prototype;
    const originalSetItem = proto && proto.setItem;
    if (originalSetItem && !proto.__rotasticPrivacyGuarded) {
      Object.defineProperty(proto, '__rotasticPrivacyGuarded', { value: true });
      proto.setItem = function (key, value) {
        if (BLOCKED_KEYS.has(String(key))) return;
        if (String(key) === 'rotastic_active_announcement_meta') {
          try {
            const meta = JSON.parse(String(value));
            if (meta && String(meta.kind || '').toLowerCase() === 'sick') return;
          } catch (_) {}
        }
        if (String(key) === 'rotastic_breaking_news_item' && /reported sick|sick leave/i.test(String(value))) return;
        return originalSetItem.call(this, key, value);
      };
    }
  } catch (_) {}

  function disableLegacyFunctions() {
    // Global classic-script functions in index.html are intentionally replaced.
    // The confidential Supabase sickness module owns sickness reporting now.
    try { window.createSickLeaveAlert = function () {}; } catch (_) {}
    try { window.flushPendingSickAlertsToShiftLeader = function () {}; } catch (_) {}
    try { window.getAssignedShiftLeaderForSickReport = function () { return ''; }; } catch (_) {}
  }

  function removeLegacySickOptions(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('select').forEach(select => {
      const id = String(select.id || '').toLowerCase();
      const name = String(select.name || '').toLowerCase();
      const likelyLeaveType = id.includes('leavetype') || id.includes('leave-type') || name.includes('leavetype') || name.includes('leave-type');
      if (!likelyLeaveType) return;
      [...select.options].forEach(option => {
        const value = String(option.value || '').trim().toLowerCase();
        const text = String(option.textContent || '').trim().toLowerCase();
        if (value === 'sick' || value === 'sickness' || value === 'sick_leave' || /\bsick\s*leave\b/.test(text)) {
          option.remove();
        }
      });
    });
  }

  function scrubLegacySickLeaveRows() {
    // Old local leave submissions may contain historical sickness mirrors.
    // Remove only browser-local copies; authoritative confidential data lives in Supabase.
    try {
      const raw = localStorage.getItem('rotastic_leave_submissions');
      if (!raw) return;
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows)) return;
      const filtered = rows.filter(row => {
        const type = String(row && (row.type || row.leaveType) || '').toLowerCase();
        return !['sick','sickness','sick_leave','sick leave'].includes(type);
      });
      if (filtered.length !== rows.length) localStorage.setItem('rotastic_leave_submissions', JSON.stringify(filtered));
    } catch (_) {}
  }

  removeLegacySensitiveState();
  scrubLegacySickLeaveRows();
  disableLegacyFunctions();

  const runDomGuard = () => {
    removeLegacySickOptions(document);
    disableLegacyFunctions();
    removeLegacySensitiveState();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runDomGuard, { once: true });
  else runDomGuard();

  // Some legacy dialogs are rendered dynamically; keep the sickness option out.
  try {
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes || []) {
          if (node && node.nodeType === 1) removeLegacySickOptions(node);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}
})();
