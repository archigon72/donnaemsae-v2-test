/* t241 놀이터 영역 공통 하단 내비 4탭(홈|분석|관리|놀이터) + 우측 상단 연구소 대문 보장. 라우팅만, 계산·데이터 무관.
   사용: <script src=".../pg-nav.js" data-root="통합 루트 상대경로" data-pg="놀이터 첫 화면 경로"></script> */
(function(){'use strict';var me=document.currentScript,root=me.getAttribute('data-root')||'../',pg=me.getAttribute('data-pg')||'#/';
function css(h){if(document.querySelector('link[href="'+h+'"]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=h;document.head.appendChild(l)}
css(root+'portal-navigation.css?v=v53w-10');css(root+'nav4.css?v=n4-2');
function start(){var b=document.body;
 if(!document.querySelector('nav.pg-bottom')){var n=document.createElement('nav');n.className='service-bottom pg-bottom';n.setAttribute('aria-label','공통 내비게이션');
  [['홈',pg,''],['분석',root+'analysis.html',''],['관리',root+'asset-hub.html',''],['놀이터',pg,'nav-pg']].forEach(function(x){var a=document.createElement('a');a.href=x[1];a.textContent=x[0];if(x[2])a.className=x[2];if(x[0]==='놀이터'){a.classList.add('active');a.setAttribute('aria-current','page')}n.appendChild(a)});
  b.appendChild(n)}
 b.classList.add('has-service-bottom');
 if(me.getAttribute('data-addhome')&&!document.querySelector('.portal-return-link')){var bar=document.createElement('div');bar.className='portal-return-bar';bar.innerHTML='<a class="portal-return-link" href="'+root+'index.html"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11 12 3l9 8M5 9v12h14V9M9 21v-8h6v8"/></svg><span>연구소 대문</span></a>';b.insertBefore(bar,b.firstChild)}
 document.querySelectorAll('.portal-return-link').forEach(function(a){a.setAttribute('href',root+'index.html')});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();})();
