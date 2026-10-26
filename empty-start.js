/* t253: 자산관리 첫 화면 빈 상태 안내(E안). 계좌·거래·배당사용·배당확인 기록이 모두 없는 사용자에게만 표시.
   원장 저장/복원 코드는 호출만 하지 않고 localStorage를 읽기만 함. 기록이 하나라도 생기면 기존 화면 그대로. */
(function(){'use strict';
var KEY='dnmuat194.management.facts.v1';
function isEmpty(){try{var raw=localStorage.getItem(KEY);if(!raw)return true;var s=JSON.parse(raw);
 var n=function(a){return Array.isArray(a)?a.length:0};
 return n(s.accounts)===0&&n(s.transactions)===0&&n(s.dividend_uses)===0&&n(s.dividend_confirmations)===0;}catch(e){return false}}
var css='body.es-empty .mu-hero-text>:not(h1):not(.es-card):not(.mu-u02),body.es-empty main>.mu-duo,body.es-empty .mu-bd,body.es-empty .uat-top5,body.es-empty .mu-flow,body.es-empty .mu-notices,body.es-empty .uat-home-fab{display:none!important}'+
'.es-card{margin:14px 0 6px;padding:18px 16px;border:1px solid rgba(94,224,176,.28);border-radius:18px;background:rgba(10,30,42,.72)}.es-card .es-tag{display:inline-block;font-size:12px;color:#9fe3c8;background:rgba(23,58,76,.9);border-radius:8px;padding:2px 8px;margin-bottom:8px}'+
'.es-card h2{font-size:18px;margin:4px 0 6px;color:#eaf3f1}.es-card p{font-size:13px;line-height:1.55;color:#b9ccd4;margin:0 0 12px}'+
'.es-btn{display:block;width:100%;box-sizing:border-box;text-align:left;border-radius:14px;padding:13px 14px;margin:8px 0 0;font:inherit;font-size:15px;font-weight:700;cursor:pointer;border:1px solid #33b38a;color:#fff;background:#1c7a5c}.es-btn.es-sub{background:transparent;color:#dff7ee;border-color:#2f6f5e}'+
'.es-btn small{display:block;font-size:12px;font-weight:400;color:#cfe3dc;margin-top:3px}';
function card(){return '<div class="es-card" role="region" aria-label="처음 시작하기"><span class="es-tag">처음 오셨어요</span><h2>첫 기록부터 시작해요</h2><p>아직 등록된 보유종목이나 거래가 없어요. 편한 방법 하나를 골라 주세요.<br>다른 지표는 기록이 생기면 자동으로 나타나요.</p>'+
 '<button type="button" class="es-btn" data-es="hold">보유종목부터 등록<small>지금 가진 종목·수량·평균단가를 기존 보유분로 입력해요</small></button>'+
 '<button type="button" class="es-btn es-sub" data-es="trade">거래내역으로 시작<small>매수·매도·배당재투자를 날짜순으로 기록해요</small></button></div>'}
function apply(){var hero=document.querySelector('.mu-hero-text'),fab=document.querySelector('[data-action="trade"]');var on=!!(hero&&fab&&isEmpty());
 document.body.classList.toggle('es-empty',on);var c=hero&&hero.querySelector('.es-card');
 if(on&&!c){var h=hero.querySelector('h1');(h||hero).insertAdjacentHTML(h?'afterend':'afterbegin',card())}else if(!on&&c)c.remove()}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-es]');if(!b)return;var fab=document.querySelector('[data-action="trade"]');if(!fab)return;fab.click();
 if(b.dataset.es==='hold')setTimeout(function(){var t=document.querySelector('[data-type-btn="opening_balance"]');if(t)t.click()},0)});
function boot(){var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);apply();var m=document.querySelector('main')||document.body;new MutationObserver(function(){apply()}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)});else boot();
})();
