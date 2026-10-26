(() => {
  'use strict';

  const IDS = {
    style: 'rotastic-compact-layout-v2-style',
    actions: 'rotastic-compact-actions-v2',
    utilities: 'rotastic-live-utilities-v2',
    header: 'rotastic-compact-rota-header-v2'
  };
  const moved = new Map();
  let busy = false;
  let timer = 0;

  const txt = el => String(el?.textContent || '').replace(/\s+/g, ' ').trim();
  const low = el => txt(el).toLowerCase();
  const shown = el => {
    if (!el?.isConnected || !el.getBoundingClientRect) return false;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 2 && r.height > 2;
  };

  function styles() {
    if (document.getElementById(IDS.style)) return;
    const s = document.createElement('style');
    s.id = IDS.style;
    s.textContent = `
      #${IDS.actions}{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;margin:8px 0 10px!important;align-items:stretch!important}
      #${IDS.actions}>.rc-moved-action{min-width:0!important;width:auto!important;max-width:none!important;min-height:58px!important;height:auto!important;margin:0!important;padding:0!important;border-radius:15px!important;overflow:visible!important;display:flex!important;align-items:stretch!important}
      #${IDS.actions}>.rc-moved-action>button,#${IDS.actions}>.rc-moved-action>a,#${IDS.actions}>.rc-moved-action>[role="button"],#${IDS.actions}>button.rc-moved-action,#${IDS.actions}>a.rc-moved-action{width:100%!important;min-width:0!important;min-height:58px!important;height:auto!important;margin:0!important;padding:9px 6px!important;border-radius:15px!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;font-size:12px!important;line-height:1.15!important}
      #${IDS.utilities}{display:inline-flex!important;align-items:center!important;gap:5px!important;margin-inline-start:6px!important;vertical-align:middle!important;flex-wrap:wrap!important}
      #${IDS.utilities}>.rc-moved-utility{width:auto!important;min-width:0!important;max-width:150px!important;min-height:29px!important;height:auto!important;margin:0!important;padding:0!important;border-radius:999px!important;overflow:visible!important;display:inline-flex!important;align-items:center!important}
      #${IDS.utilities}>.rc-moved-utility>button,#${IDS.utilities}>.rc-moved-utility>a,#${IDS.utilities}>.rc-moved-utility>[role="button"],#${IDS.utilities}>button.rc-moved-utility,#${IDS.utilities}>a.rc-moved-utility{width:auto!important;min-width:0!important;min-height:29px!important;height:auto!important;margin:0!important;padding:5px 9px!important;border-radius:999px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:10.5px!important;line-height:1.1!important;white-space:nowrap!important}
      #${IDS.header}{display:grid!important;grid-template-columns:36px minmax(0,1fr) 36px!important;gap:8px!important;align-items:center!important;margin:7px 0 9px!important;padding:9px 8px!important;border:1px solid rgba(148,163,184,.14)!important;border-radius:16px!important;background:var(--surface-card,#0f1624)!important;color:inherit!important;box-shadow:0 7px 20px rgba(0,0,0,.10)!important}
      #${IDS.header} .rc-nav{width:34px!important;height:34px!important;border-radius:11px!important;border:1px solid rgba(148,163,184,.17)!important;background:rgba(255,255,255,.035)!important;color:inherit!important;font-size:20px!important;font-weight:900!important;cursor:pointer!important}
      #${IDS.header} .rc-nav:disabled{opacity:.25!important;cursor:default!important}
      #${IDS.header} .rc-center{text-align:center!important;min-width:0!important}
      #${IDS.header} .rc-weekday{font:900 16.5px/1.05 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
      #${IDS.header} .rc-meta{display:flex!important;gap:8px!important;justify-content:center!important;flex-wrap:wrap!important;margin-top:4px!important;color:#9fb0c5!important;font:750 11px/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
      [data-rc-duplicate-days="1"]{display:none!important}
      body.rotastic-compact-v2 main,body.rotastic-compact-v2 [role="main"]{scroll-margin-top:8px}
      @media(max-width:520px){#${IDS.actions}{gap:6px!important}#${IDS.actions}>.rc-moved-action{min-height:54px!important}#${IDS.actions}>.rc-moved-action>button,#${IDS.actions}>.rc-moved-action>a,#${IDS.actions}>.rc-moved-action>[role="button"],#${IDS.actions}>button.rc-moved-action,#${IDS.actions}>a.rc-moved-action{min-height:54px!important;padding:7px 4px!important;font-size:11px!important}#${IDS.utilities}{gap:4px!important;margin-inline-start:4px!important}#${IDS.utilities}>.rc-moved-utility>button,#${IDS.utilities}>.rc-moved-utility>a,#${IDS.utilities}>.rc-moved-utility>[role="button"],#${IDS.utilities}>button.rc-moved-utility,#${IDS.utilities}>a.rc-moved-utility{padding:5px 7px!important;font-size:10px!important}#${IDS.header}{grid-template-columns:33px minmax(0,1fr) 33px!important;padding:8px 6px!important}#${IDS.header} .rc-nav{width:32px!important;height:32px!important}#${IDS.header} .rc-weekday{font-size:15.5px!important}}
    `;
    document.head.appendChild(s);
  }

  function interactives() {
    return [...document.querySelectorAll('button,a,[role="button"],[role="tab"],[onclick],summary')].filter(shown);
  }

  const matchers = {
    rota: [/\brota view\b/i,/\bswitch to rota\b/i,/^rota$/i],
    swap: [/request.{0,12}swap/i,/swap.{0,12}request/i,/^swap$/i],
    export: [/^export\b/i,/export.{0,20}rota/i,/download.{0,20}rota/i],
    weather: [/weather/i,/\b\d{1,2}\s*°[cf]?\b/i],
    eta: [/abu\s*nakhla/i,/\beta\b/i,/travel\s*time/i]
  };

  function control(kind) {
    const existing = moved.get(kind);
    if (existing?.isConnected) return existing.querySelector?.('button,a,[role="button"],[role="tab"],[onclick],summary') || (existing.matches?.('button,a,[role="button"],[role="tab"],[onclick],summary') ? existing : null);
    const list = interactives();
    const found = list.find(el => matchers[kind].some(re => re.test(txt(el)))) || null;
    return found;
  }

  function wrapperFor(el) {
    if (!el) return null;
    if (el.matches('button,a,[role="button"],summary') && el.getBoundingClientRect().height >= 45) return el;
    let node = el;
    let best = el;
    for (let i=0;i<4 && node.parentElement;i+=1) {
      node = node.parentElement;
      if (node.id === IDS.actions || node.id === IDS.utilities) break;
      const r = node.getBoundingClientRect?.();
      if (!r || r.height <= 0) continue;
      if (r.height > 220 || r.width > Math.max(540, innerWidth * .88)) break;
      best = node;
      const sig = `${node.id || ''} ${typeof node.className === 'string' ? node.className : ''}`;
      if (/card|tile|quick|action|shortcut|tool/i.test(sig)) return node;
    }
    return best;
  }

  function capture(kind) {
    const cached = moved.get(kind);
    if (cached?.isConnected) return cached;
    const c = control(kind);
    if (!c) return null;
    const w = wrapperFor(c);
    if (!w) return null;
    moved.set(kind,w);
    w.dataset.rcKind = kind;
    return w;
  }

  function distinctNodes(kinds) {
    const seen = new Set();
    const result = [];
    for (const kind of kinds) {
      const n = capture(kind);
      if (!n || seen.has(n)) continue;
      seen.add(n); result.push([kind,n]);
    }
    return result;
  }

  function commonAncestor(nodes) {
    if (!nodes.length) return null;
    let p = nodes[0];
    while (p && p !== document.body) {
      if (nodes.every(n => p.contains(n))) return p;
      p = p.parentElement;
    }
    return null;
  }

  function buildActions() {
    if (document.getElementById(IDS.actions)) return;
    const items = distinctNodes(['rota','swap','export']);
    if (items.length < 2) return;
    const nodes = items.map(x=>x[1]);
    const common = commonAncestor(nodes);
    const first = nodes[0];
    const parent = common && common !== document.body && common.getBoundingClientRect().height < 800 ? common : first.parentElement;
    if (!parent) return;
    const row = document.createElement('div');
    row.id = IDS.actions;
    row.setAttribute('aria-label','ROTASTIC quick actions');
    parent.insertBefore(row, common === parent ? first : first);
    items.forEach(([kind,node]) => {
      node.classList.add('rc-moved-action');
      node.dataset.rcKind = kind;
      row.appendChild(node);
    });
  }

  function liveBadge() {
    return [...document.querySelectorAll('span,div,p,strong,small,button,a,[role="status"]')]
      .filter(shown)
      .find(el => /^live(?:\s+now)?(?:\s*[•·])?$/i.test(txt(el))) || null;
  }

  function buildUtilities() {
    if (document.getElementById(IDS.utilities)) return;
    const live = liveBadge();
    if (!live?.parentElement) return;
    const items = distinctNodes(['weather','eta']);
    if (!items.length) return;
    const wrap = document.createElement('span');
    wrap.id = IDS.utilities;
    wrap.setAttribute('aria-label','Live utilities');
    live.insertAdjacentElement('afterend',wrap);
    items.forEach(([kind,node]) => {
      node.classList.add('rc-moved-utility');
      node.dataset.rcKind = kind;
      wrap.appendChild(node);
    });
  }

  const dayRE = /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const roomRE = /\b(?:clinic\s*)?room\s*(?:no\.?\s*)?[a-z0-9-]+\b/i;
  const dateREs = [
    /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2}\b/i,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+20\d{2}\b/i,
    /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/,
    /\b\d{1,2}[-/]\d{1,2}[-/]20\d{2}\b/
  ];

  function smallText(re) {
    return [...document.querySelectorAll('h1,h2,h3,h4,h5,strong,span,p,div')]
      .filter(shown)
      .filter(el => !el.closest(`#${IDS.header}`) && el.children.length < 5 && txt(el).length < 90)
      .find(el => re.test(txt(el))) || null;
  }

  function info() {
    const dEl = smallText(dayRE);
    let day = dEl ? txt(dEl).match(dayRE)?.[1] || '' : '';
    let date = '';
    for (const re of dateREs) {
      const el = smallText(re);
      if (el) { date = txt(el).match(re)?.[0] || ''; break; }
    }
    const rEl = smallText(roomRE);
    const room = rEl ? txt(rEl).match(roomRE)?.[0] || '' : '';
    if (!day && date) {
      const d = new Date(date);
      if (!Number.isNaN(d.getTime())) day = days[d.getDay()];
    }
    return {day:day || 'Rota',date,room,dEl,rEl};
  }

  function nav(direction) {
    const prev = direction === 'prev';
    const re = prev ? /(^|\b)(previous|prev|back|yesterday)(\b|$)|^[‹←◀]$/i : /(^|\b)(next|tomorrow)(\b|$)|^[›→▶]$/i;
    return interactives().find(el => {
      if (el.closest(`#${IDS.header}`)) return false;
      return re.test(`${txt(el)} ${el.getAttribute('aria-label')||''} ${el.getAttribute('title')||''}`);
    }) || null;
  }

  function rotaAnchor(i) {
    const legend = smallText(/shift\s*lead|legend|\bkey\b/i);
    if (legend) {
      let n = legend;
      for (let x=0;x<3 && n.parentElement;x+=1) {
        if (n.getBoundingClientRect().width > 240) return n;
        n = n.parentElement;
      }
      return legend;
    }
    return i.dEl || i.rEl || document.querySelector('main')?.firstElementChild || null;
  }

  function buildHeader() {
    const i = info();
    const p = nav('prev'), n = nav('next');
    if (!i.dEl && !i.date && !i.room && !p && !n) return;
    let h = document.getElementById(IDS.header);
    if (!h) {
      const anchor = rotaAnchor(i);
      if (!anchor?.parentElement) return;
      h = document.createElement('div');
      h.id = IDS.header;
      h.innerHTML = '<button type="button" class="rc-nav rc-prev" aria-label="Previous day">‹</button><div class="rc-center"><div class="rc-weekday"></div><div class="rc-meta"><span class="rc-date"></span><span class="rc-room"></span></div></div><button type="button" class="rc-nav rc-next" aria-label="Next day">›</button>';
      anchor.parentElement.insertBefore(h,anchor);
    }
    h.querySelector('.rc-weekday').textContent = i.day;
    h.querySelector('.rc-date').textContent = i.date;
    h.querySelector('.rc-room').textContent = i.room;
    const pb=h.querySelector('.rc-prev'), nb=h.querySelector('.rc-next');
    pb.disabled=!p; nb.disabled=!n;
    pb.onclick=()=>{const x=nav('prev');if(x){x.click();setTimeout(schedule,70)}};
    nb.onclick=()=>{const x=nav('next');if(x){x.click();setTimeout(schedule,70)}};

    // Hide only compact standalone weekday strips, never schedule grids/tables.
    [...document.querySelectorAll('nav,section,div')].filter(shown).forEach(el=>{
      if (el.contains(h)||h.contains(el)||el.closest('table,[role="grid"],.rota-grid,.schedule-grid')) return;
      const r=el.getBoundingClientRect(), t=txt(el);
      if (r.height>105||r.width<180||t.length>190) return;
      const count=days.filter(d=>new RegExp(`\\b${d}\\b`,'i').test(t)).length;
      if(count>=3) el.dataset.rcDuplicateDays='1';
    });
  }

  function apply() {
    if (busy || !document.body) return;
    busy=true;
    try {
      styles();
      document.body.classList.add('rotastic-compact-v2');
      buildActions();
      buildUtilities();
      buildHeader();
    } catch(e) {
      console.warn('ROTASTIC compact layout v2:', e?.message || e);
    } finally { busy=false; }
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(apply,100)}
  function start(){
    apply();
    new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','hidden','aria-selected']});
    document.addEventListener('click',()=>setTimeout(schedule,80),true);
    window.addEventListener('resize',schedule,{passive:true});
    setTimeout(apply,600);setTimeout(apply,1600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
