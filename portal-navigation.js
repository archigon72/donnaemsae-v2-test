/* Portal routing only. No ledger, data, calculation or storage operations. */
(function () {
  'use strict';
  function start() {
    const service = document.body.dataset.portalService;
    const analysisFlow = service === 'analysis' || service === 'terms';
    const home = service === 'management'
      ? 'asset-hub.html'
      : service === 'terms' ? 'terms.html'
      : service === 'output' ? 'output.html' : 'analysis.html';
    const bar = document.createElement('div');
    bar.className = 'portal-return-bar';
    const link = document.createElement('a');
    link.href = 'index.html';
    link.className = 'portal-return-link';
    link.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11 12 3l9 8M5 9v12h14V9M9 21v-8h6v8"/></svg><span>연구소 대문</span>';
    bar.append(link);
    document.body.prepend(bar);
    if (analysisFlow && !document.querySelector('.service-bottom')) {
      const nav = document.createElement('nav');
      nav.className = 'service-bottom';
      nav.setAttribute('aria-label', '공통 내비게이션');
      [['home', 'analysis.html', '홈'], ['analysis', 'analysis.html', '분석'], ['management', 'asset-hub.html', '관리'], ['playground', 'playground/', '놀이터']].forEach(function ([id, href, label]) {
        const a = document.createElement('a'); a.href = href; a.textContent = label;
        if (id === 'playground') a.className = 'nav-pg';
        if (id === 'analysis') { a.className = 'active'; a.setAttribute('aria-current', 'page'); }
        nav.append(a);
      });
      document.body.append(nav);
      document.body.classList.add('has-service-bottom');
    }
    /* t241: 4번째 탭(놀이터) — 공통 하단 내비(.service-bottom, .lab-bottom/.mc-nav)에만 추가. 상단 lab-topnav 제외. */
    if (!document.querySelector('link[data-nav4]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'nav4.css?v=n4-2'; l.setAttribute('data-nav4', '1'); document.head.append(l); }
    function addPlayground() {
      document.querySelectorAll('nav.service-bottom, nav.lab-bottom').forEach(function (nav) {
        nav.querySelectorAll('a').forEach(function (a) { if (a.getAttribute('href') === 'playground/' && !a.classList.contains('nav-pg')) a.classList.add('nav-pg'); });
        if (nav.querySelector('a.nav-pg')) return;
        const a = document.createElement('a'); a.href = 'playground/'; a.className = 'nav-pg'; a.textContent = '놀이터'; nav.append(a);
      });
    }
    addPlayground();
    new MutationObserver(addPlayground).observe(document.body, {childList: true, subtree: true});
    function connect() {
      document.querySelectorAll('a[href]').forEach(function (a) {
        if (a.closest('.portal-return-bar, .pv-top')) return;
        const url = new URL(a.getAttribute('href'), location.href);
        if (url.origin !== location.origin) return;
        if (service === 'analysis' && document.body.dataset.view === 'detail' && (a.classList.contains('fx-back') || a.classList.contains('back-link'))) {
          if (a.getAttribute('href') !== 'analysis-search.html') a.setAttribute('href', 'analysis-search.html');
          return;
        }
        const base = new URL('.', location.href);
        if (url.pathname !== base.pathname && url.pathname !== base.pathname + 'index.html') return;
        a.setAttribute('href', (analysisFlow ? 'analysis.html' : home) + (analysisFlow ? '' : url.search + url.hash));
      });
    }
    connect();
    new MutationObserver(connect).observe(document.body, {childList: true, subtree: true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
