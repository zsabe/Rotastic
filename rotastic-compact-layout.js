(() => {
  'use strict';

  const STYLE_ID = 'rotastic-compact-layout-style';
  const ACTIONS_ID = 'rotastic-compact-actions';
  const UTILITIES_ID = 'rotastic-live-utilities';
  const HEADER_ID = 'rotastic-compact-rota-header';
  const MARK = 'data-rotastic-compact-source';
  let applying = false;
  let observer = null;
  let timer = null;

  const text = el => String(el?.textContent || '').replace(/\s+/g, ' ').trim();
  const norm = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const visible = el => {
    if (!el || !el.isConnected || !el.getBoundingClientRect) return false;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 2 && r.height > 2;
  };

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ACTIONS_ID}{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0 12px;position:relative;z-index:3}
      #${ACTIONS_ID} .rc-action{min-height:64px;border-radius:16px;border:1px solid rgba(148,163,184,.15);background:var(--surface-card,#0f1624);color:inherit;padding:10px 8px;display:flex;align-items:center;justify-content:center;gap:7px;text-align:center;font:800 13px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.12)}
      #${ACTIONS_ID} .rc-action:active{transform:translateY(1px)}
      #${ACTIONS_ID} .rc-action .rc-icon{font-size:17px;line-height:1}
      #${UTILITIES_ID}{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;margin-inline-start:7px;vertical-align:middle}
      #${UTILITIES_ID} .rc-chip{min-height:30px;border-radius:999px;border:1px solid rgba(148,163,184,.16);background:rgba(15,22,36,.92);color:inherit;padding:5px 10px;font:800 11px/1.1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;white-space:nowrap}
      #${UTILITIES_ID} .rc-chip:active{transform:translateY(1px)}
      #${HEADER_ID}{display:grid;grid-template-columns:38px minmax(0,1fr) 38px;align-items:center;gap:8px;margin:8px 0 10px;padding:11px 10px;border:1px solid rgba(148,163,184,.14);border-radius:17px;background:var(--surface-card,#0f1624);color:inherit;box-shadow:0 8px 24px rgba(0,0,0,.10)}
      #${HEADER_ID} .rc-nav{width:36px;height:36px;border:1px solid rgba(148,163,184,.16);border-radius:12px;background:rgba(255,255,255,.035);color:inherit;font-size:20px;font-weight:900;cursor:pointer}
      #${HEADER_ID} .rc-nav:disabled{opacity:.25;cursor:default}
      #${HEADER_ID} .rc-day{text-align:center;min-width:0}
      #${HEADER_ID} .rc-weekday{font:900 17px/1.05 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.01em}
      #${HEADER_ID} .rc-meta{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:4px;color:#9fb0c5;font:750 11px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      [data-rotastic-compact-hidden="1"]{display:none!important}
      body.rotastic-compact-layout .rc-tight-gap{margin-top:6px!important;padding-top:6px!important}
      @media(max-width:520px){#${ACTIONS_ID}{gap:7px;margin-top:7px}#${ACTIONS_ID} .rc-action{min-height:57px;padding:8px 5px;font-size:11.5px;border-radius:14px}#${ACTIONS_ID} .rc-action .rc-icon{font-size:15px}#${UTILITIES_ID}{gap:4px;margin-inline-start:4px}#${UTILITIES_ID} .rc-chip{padding:5px 8px;font-size:10.5px}#${HEADER_ID}{margin-top:6px;padding:9px 7px;grid-template-columns:34px minmax(0,1fr) 34px}#${HEADER_ID} .rc-nav{width:33px;height:33px;border-radius:11px}#${HEADER_ID} .rc-weekday{font-size:16px}}
    `;
    document.head.appendChild(style);
  }

  function candidates() {
    return [...document.querySelectorAll('button,a,[role="button"],[role="tab"],[onclick],summary')].filter(visible);
  }

  function findControl(patterns, exclusions = []) {
    const controls = candidates();
    return controls.find(el => {
      const t = norm(text(el));
      if (!t) return false;
      if (exclusions.some(re => re.test(t))) return false;
      return patterns.some(re => re.test(t));
    }) || null;
  }

  function conservativeCard(el) {
    if (!el) return null;
    let node = el;
    let fallback = el;
    for (let i = 0; i < 4 && node?.parentElement; i += 1) {
      node = node.parentElement;
      const cls = `${node.id || ''} ${node.className || ''}`.toLowerCase();
      const r = node.getBoundingClientRect?.();
      if (!r || r.height <= 0) continue;
      if (r.height > 240 || r.width > Math.max(innerWidth * .95, 760)) break;
      fallback = node;
      if (/\b(card|tile|quick|action|shortcut|tool|menu-item|dashboard-item)\b/.test(cls)) return node;
    }
    const r = fallback?.getBoundingClientRect?.();
    if (r && r.height <= 190) return fallback;
    return el;
  }

  function sourceControl(kind) {
    if (kind === 'rota') return findControl([/\brota view\b/, /\bswitch to rota\b/, /^rota$/], [/personal/]);
    if (kind === 'swap') return findControl([/request.*swap/, /swap.*request/, /^swap$/]);
    if (kind === 'export') return findControl([/^export\b/, /export.*rota/, /download.*rota/]);
    if (kind === 'weather') return findControl([/weather/, /°[cf]\b/]);
    if (kind === 'eta') return findControl([/abu\s*nakhla/, /\beta\b/, /travel time/]);
    return null;
  }

  function makeProxy(kind, label, icon, className = 'rc-action') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.dataset.kind = kind;
    button.innerHTML = `<span class="rc-icon" aria-hidden="true">${icon}</span><span>${label}</span>`;
    button.addEventListener('click', () => {
      const src = sourceControl(kind);
      if (src) {
        src.click();
        setTimeout(schedule, 50);
      }
    });
    return button;
  }

  function hideOriginal(kind) {
    const src = sourceControl(kind);
    if (!src || src.closest(`#${ACTIONS_ID},#${UTILITIES_ID}`)) return;
    src.setAttribute(MARK, kind);
    const card = conservativeCard(src);
    if (card && !card.contains(document.getElementById(ACTIONS_ID)) && !card.contains(document.getElementById(UTILITIES_ID))) {
      card.dataset.rotasticCompactHidden = '1';
      card.dataset.rotasticCompactKind = kind;
    }
  }

  function commonParent(elements) {
    const list = elements.filter(Boolean);
    if (!list.length) return null;
    let p = list[0];
    while (p && p !== document.body) {
      if (list.every(el => p.contains(el))) return p;
      p = p.parentElement;
    }
    return null;
  }

  function actionHost() {
    const controls = ['rota','swap','export'].map(sourceControl).filter(Boolean);
    if (!controls.length) return null;
    const cards = controls.map(conservativeCard).filter(Boolean);
    const common = commonParent(cards);
    if (common && common !== document.body) {
      const r = common.getBoundingClientRect?.();
      if (r && r.height < 700) return { parent: common, before: cards[0] };
    }
    const first = cards[0] || controls[0];
    return { parent: first.parentElement, before: first };
  }

  function buildActions() {
    let row = document.getElementById(ACTIONS_ID);
    if (!row) {
      const host = actionHost();
      if (!host?.parent) return;
      row = document.createElement('div');
      row.id = ACTIONS_ID;
      row.setAttribute('aria-label', 'ROTASTIC quick actions');
      row.append(
        makeProxy('rota','Rota View','▦'),
        makeProxy('swap','Request Swap','⇄'),
        makeProxy('export','Export','⇩')
      );
      host.parent.insertBefore(row, host.before || host.parent.firstChild);
    }
    ['rota','swap','export'].forEach(hideOriginal);
  }

  function findLive() {
    const all = [...document.querySelectorAll('span,div,p,strong,small,button,a,[role="status"],[role="button"]')].filter(visible);
    return all.find(el => /^live(?:\s*[•·])?$/i.test(text(el)) || /^live\s+now$/i.test(text(el))) || null;
  }

  function buildUtilities() {
    const live = findLive();
    if (!live) return;
    let wrap = document.getElementById(UTILITIES_ID);
    if (!wrap) {
      wrap = document.createElement('span');
      wrap.id = UTILITIES_ID;
      wrap.setAttribute('aria-label','Live utilities');
      const weather = makeProxy('weather','Weather','☁','rc-chip');
      const eta = makeProxy('eta','ETA Abu Nakhla','⌖','rc-chip');
      wrap.append(weather, eta);
      if (live.parentElement) live.insertAdjacentElement('afterend', wrap);
    }
    ['weather','eta'].forEach(hideOriginal);
  }

  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const weekdayRe = /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i;
  const dateRes = [
    /\b(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)?\s*,?\s*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2}\b/i,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+20\d{2}\b/i,
    /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/,
    /\b\d{1,2}[-/]\d{1,2}[-/]20\d{2}\b/
  ];
  const roomRe = /\b(?:clinic\s*)?room\s*(?:no\.?\s*)?[a-z0-9-]+\b/i;

  function findSmallText(re) {
    return [...document.querySelectorAll('h1,h2,h3,h4,h5,strong,span,p,div')]
      .filter(visible)
      .filter(el => el.children.length < 5 && text(el).length < 90)
      .find(el => re.test(text(el))) || null;
  }

  function dayInfo() {
    const dayEl = findSmallText(weekdayRe);
    let day = dayEl ? text(dayEl).match(weekdayRe)?.[1] : '';
    let date = '';
    for (const re of dateRes) {
      const el = findSmallText(re);
      if (el) { date = text(el).match(re)?.[0] || text(el); break; }
    }
    const roomEl = findSmallText(roomRe);
    const room = roomEl ? (text(roomEl).match(roomRe)?.[0] || text(roomEl)) : '';
    if (!day && date) {
      const parsed = new Date(date);
      if (!Number.isNaN(parsed.getTime())) day = weekdays[parsed.getDay()];
    }
    return { day: day || 'Rota', date, room, dayEl, roomEl };
  }

  function navSource(direction) {
    const list = candidates();
    const prev = direction === 'prev';
    const words = prev ? /(^|\b)(previous|prev|back|yesterday)(\b|$)|^[‹←◀]$/i : /(^|\b)(next|tomorrow)(\b|$)|^[›→▶]$/i;
    return list.find(el => {
      if (el.closest(`#${HEADER_ID}`)) return false;
      const label = `${text(el)} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`;
      return words.test(label);
    }) || null;
  }

  function rotaAnchor() {
    const legend = findSmallText(/shift\s*lead|legend|key/i);
    if (legend) {
      let node = legend;
      for (let i=0;i<3 && node.parentElement;i+=1) {
        const r = node.getBoundingClientRect?.();
        if (r && r.width > 250) return node;
        node = node.parentElement;
      }
      return legend;
    }
    const day = findSmallText(weekdayRe);
    return day || document.querySelector('main')?.firstElementChild || null;
  }

  function buildRotaHeader() {
    const info = dayInfo();
    const prev = navSource('prev');
    const next = navSource('next');
    if (!info.dayEl && !info.date && !info.room && !prev && !next) return;

    let header = document.getElementById(HEADER_ID);
    if (!header) {
      const anchor = rotaAnchor();
      if (!anchor?.parentElement) return;
      header = document.createElement('div');
      header.id = HEADER_ID;
      header.innerHTML = '<button class="rc-nav rc-prev" type="button" aria-label="Previous day">‹</button><div class="rc-day"><div class="rc-weekday"></div><div class="rc-meta"><span class="rc-date"></span><span class="rc-room"></span></div></div><button class="rc-nav rc-next" type="button" aria-label="Next day">›</button>';
      anchor.parentElement.insertBefore(header, anchor);
    }
    header.querySelector('.rc-weekday').textContent = info.day;
    header.querySelector('.rc-date').textContent = info.date || '';
    header.querySelector('.rc-room').textContent = info.room || '';
    const p = navSource('prev');
    const n = navSource('next');
    const pb = header.querySelector('.rc-prev');
    const nb = header.querySelector('.rc-next');
    pb.disabled = !p;
    nb.disabled = !n;
    pb.onclick = () => { const src = navSource('prev'); if (src) { src.click(); setTimeout(schedule, 60); } };
    nb.onclick = () => { const src = navSource('next'); if (src) { src.click(); setTimeout(schedule, 60); } };

    // Remove only small, standalone duplicate day-navigation strips. Never hide rota rows/tables.
    [...document.querySelectorAll('div,nav,section')].filter(visible).forEach(el => {
      if (el.contains(header) || header.contains(el) || el.closest('table,[role="grid"],.rota-grid,.schedule-grid')) return;
      const t = text(el);
      const r = el.getBoundingClientRect?.();
      if (!r || r.height > 105 || r.width < 180) return;
      const matches = weekdays.filter(d => new RegExp(`\\b${d}\\b`,'i').test(t));
      if (matches.length >= 3 && t.length < 180) el.dataset.rotasticCompactHidden = '1';
    });
  }

  function restoreSourcesBeforeScan() {
    document.querySelectorAll('[data-rotastic-compact-hidden="1"]').forEach(el => {
      // Keep our deliberately-hidden originals hidden, but source discovery uses hidden elements through marked descendants.
      if (!el.querySelector(`[${MARK}]`) && !el.matches(`[${MARK}]`)) delete el.dataset.rotasticCompactHidden;
    });
  }

  function apply() {
    if (applying || !document.body) return;
    applying = true;
    try {
      installStyles();
      document.body.classList.add('rotastic-compact-layout');
      restoreSourcesBeforeScan();
      buildActions();
      buildUtilities();
      buildRotaHeader();
    } catch (err) {
      console.warn('ROTASTIC compact layout:', err?.message || err);
    } finally {
      applying = false;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 100);
  }

  function start() {
    apply();
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class','style','hidden','aria-selected'] });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('click', () => setTimeout(schedule, 80), true);
    setTimeout(apply, 700);
    setTimeout(apply, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
