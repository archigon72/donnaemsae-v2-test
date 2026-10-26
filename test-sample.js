/* 테스트 사이트 전용(배포 사본에만 존재). 첫 접속 시 v2 허브로 이동, 예시 계좌·거래 자동 적재, 상단 안내와 '예시 데이터 다시 불러오기' 버튼. 실제 계좌 정보 없음. */
(function(){try{var pn=location.pathname;if((/\/$/.test(pn)||/\/index\.html$/.test(pn))&&!location.search&&!sessionStorage.getItem('v2test.landed')){sessionStorage.setItem('v2test.landed','1');location.replace('asset-hub.html');return}}catch(e){}
var K='dnmuat194.management.facts.v1',F='v2test.sampleLoaded';
function load(reload){var x=new XMLHttpRequest();x.open('GET','test-sample-seed.json',false);x.send();if(x.status===200){localStorage.setItem(K,x.responseText);localStorage.setItem(F,'1');if(reload)location.reload()}}
try{if(!localStorage.getItem(F)&&!localStorage.getItem(K))load(false)}catch(e){}
document.addEventListener('DOMContentLoaded',function(){var d=document.createElement('div');d.id='v2test-bar';d.style.cssText='position:relative;z-index:99999;background:#ffd34d;color:#111;font:600 12px/1.4 sans-serif;padding:5px 8px;display:flex;gap:6px;align-items:center;justify-content:space-between';
d.innerHTML='<span>v2 테스트 사이트 · 예시 데이터 · 실제 계좌 입력 금지</span><button type="button" style="font:inherit;padding:3px 8px;border-radius:6px;border:1px solid #111;background:#fff;color:#111">예시 데이터 다시 불러오기</button>';
d.querySelector('button').onclick=function(){if(confirm('이 브라우저의 테스트 기록을 지우고 예시 데이터로 되돌릴까요?'))load(true)};document.body.insertBefore(d,document.body.firstChild)})})();
