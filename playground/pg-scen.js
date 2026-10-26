/* 투자 놀이터 보수 시나리오(추가 전용 모듈). pg-core.js 기존 함수는 그대로 두고 allocate·paysIn만 재사용.
   보수(주가 연 −2%): 매월 가격 = 시작가 × 0.98^(m/12), 회차 주당 분배금도 같은 비율로 축소(분배율 % 유지).
   지급 월·정수 주 재매수·종목별 잔돈 이월·세전은 기본 simulate와 동일. 자산 = Σ(주식 수×그 달 가격)+잔돈+처음 남은 현금. */
(function(root){'use strict';const C=root.PgCore||(typeof require!=='undefined'?require('./pg-core.js'):null);
function simulateDecline(amount,items,meta,years,annualPct){const g=Math.pow(1-annualPct/100,1/12),a=C.allocate(amount,items);const st=a.rows.map(r=>({code:r.code,p0:r.price,shares:r.shares,cash:0}));let cum=0;const log=[];
 for(let m=1;m<=years*12;m++){const f=Math.pow(g,m);let pm=0;for(const s of st){const d=meta[s.code];if(!d||!(d.dps>0)||!d.perYear)continue;const c=C.paysIn(d.perYear,m);if(!c)continue;const price=s.p0*f,pay=s.shares*d.dps*f*c;cum+=pay;pm+=pay;s.cash+=pay;const b=Math.floor(s.cash/price+1e-9);s.shares+=b;s.cash-=b*price}
  if(m%12===0)log.push({year:m/12,factor:f,stock:st.reduce((x,s)=>x+s.shares*s.p0*f,0),change:st.reduce((x,s)=>x+s.cash,0),cum,paidThisMonth:pm,shares:st.map(s=>({code:s.code,shares:s.shares,price:s.p0*f,dps:(meta[s.code]&&meta[s.code].dps||0)*f}))})}
 const f=Math.pow(g,years*12),stock=st.reduce((x,s)=>x+s.shares*s.p0*f,0),change=st.reduce((x,s)=>x+s.cash,0);let annualNow=0;for(const s of st){const d=meta[s.code];if(d&&d.dps>0&&d.perYear)annualNow+=s.shares*d.dps*f*d.perYear}
 return {years,reinvest:true,factor:f,stock,change,initCash:a.cash,asset:stock+change+a.cash,cumDividend:cum,annualNow,monthlyNow:annualNow/12,shares:st.map(s=>({code:s.code,shares:s.shares})),log}}
root.PgScen={simulateDecline};if(typeof module!=='undefined')module.exports=root.PgScen})(typeof window!=='undefined'?window:globalThis);
/* 월세(적립식) 전액 재투자: 매월 초 납입금을 비중대로 종목별 현금에 더해 정수 주 매수(잔돈 종목별 이월) → 그 달 지급 분배금(보유 전체 주식 기준, 세전)
   을 같은 종목 정수 주로 재매수. 가격·주당 분배금 고정. 자산 = Σ(주식 수×가격)+Σ종목별 잔돈. 받은 분배금은 자산에 따로 더하지 않음(재투자분은 주식에 포함). */
(function(root){'use strict';const C=root.PgCore;
function simulateMonthly(P,items,meta,years){const st=items.map(it=>({code:it.code,w:it.w,price:it.price,shares:0,cash:0}));let cum=0,paid=0;const n=Math.round(years*12);
 for(let m=1;m<=n;m++){for(const s of st){if(!(s.price>0))continue;s.cash+=Math.floor(P*s.w/100);const b=Math.floor(s.cash/s.price+1e-9);s.shares+=b;s.cash-=b*s.price}
  for(const s of st){const d=meta[s.code];if(!d||!(d.dps>0)||!d.perYear||!(s.price>0))continue;const c=C.paysIn(d.perYear,m);if(!c)continue;const pay=s.shares*d.dps*c;cum+=pay;s.cash+=pay;const b=Math.floor(s.cash/s.price+1e-9);s.shares+=b;s.cash-=b*s.price}
  paid+=P}
 const stock=st.reduce((x,s)=>x+s.shares*s.price,0),change=st.reduce((x,s)=>x+s.cash,0);let annualNow=0;for(const s of st){const d=meta[s.code];if(d&&d.dps>0&&d.perYear)annualNow+=s.shares*d.dps*d.perYear}
 return {years,principal:paid,stock,change,asset:stock+change,cumDividend:cum,annualNow,monthlyNow:annualNow/12,shares:st.map(s=>({code:s.code,shares:s.shares}))}}
root.PgScen=Object.assign(root.PgScen||{},{simulateMonthly});if(typeof module!=='undefined')module.exports=root.PgScen})(typeof window!=='undefined'?window:globalThis);
/* 월세 보수: simulateMonthly와 같은 순서(월초 납입 매수 → 그 달 분배 재투자)에 m개월 가격 P0×(1−a)^(m/12), 회차 주당 분배금도 같은 비율(분배율 % 유지).
   납입·재투자 모두 그 달 하락 가격으로 매수. 자산 = Σ주식×그 달 가격 + 잔돈. 원금 = 납입 합계(시나리오 무관). */
(function(root){'use strict';const C=root.PgCore;
function simulateMonthlyDecline(P,items,meta,years,annualPct){const g=Math.pow(1-annualPct/100,1/12),st=items.map(it=>({code:it.code,w:it.w,p0:it.price,shares:0,cash:0}));let cum=0,paid=0;const n=Math.round(years*12);
 for(let m=1;m<=n;m++){const f=Math.pow(g,m);for(const s of st){if(!(s.p0>0))continue;const pr=s.p0*f;s.cash+=Math.floor(P*s.w/100);const b=Math.floor(s.cash/pr+1e-9);s.shares+=b;s.cash-=b*pr}
  for(const s of st){const d=meta[s.code];if(!d||!(d.dps>0)||!d.perYear||!(s.p0>0))continue;const c=C.paysIn(d.perYear,m);if(!c)continue;const pr=s.p0*f,pay=s.shares*d.dps*f*c;cum+=pay;s.cash+=pay;const b=Math.floor(s.cash/pr+1e-9);s.shares+=b;s.cash-=b*pr}
  paid+=P}
 const f=Math.pow(g,n),stock=st.reduce((x,s)=>x+s.shares*s.p0*f,0),change=st.reduce((x,s)=>x+s.cash,0);let annualNow=0;for(const s of st){const d=meta[s.code];if(d&&d.dps>0&&d.perYear)annualNow+=s.shares*d.dps*f*d.perYear}
 return {years,principal:paid,factor:f,stock,change,asset:stock+change,cumDividend:cum,annualNow,monthlyNow:annualNow/12,shares:st.map(s=>({code:s.code,shares:s.shares}))}}
root.PgScen=Object.assign(root.PgScen||{},{simulateMonthlyDecline});if(typeof module!=='undefined')module.exports=root.PgScen})(typeof window!=='undefined'?window:globalThis);
/* 분배율 기준 일치 어댑터: 화면에 보이는 종목별 연환산 분배율 r_i(%)로 회차 주당 분배금을 다시 만든다.
   회차 주당 분배금 = 시작 가격 P0 × r_i/100 ÷ k (k = 그 종목 실제 연 지급횟수: 월12·주52·분기4…), 월지급이면 P0×r/12.
   보수에서는 엔진이 그 달 가격 비율(0.97^(m/12))로 함께 줄인다. r 없거나 주기 미상이면 분배금 없음(화면은 계산 보류). */
(function(root){'use strict';
function rateMeta(meta,items,rateOf){const o={};for(const it of items){const m=meta[it.code];if(!m)continue;const r=rateOf(it.code);o[it.code]=Object.assign({},m,{dps:(r!=null&&m.perYear&&it.price>0)?it.price*r/100/m.perYear:null,rate:r})}return o}
root.PgScen=Object.assign(root.PgScen||{},{rateMeta});if(typeof module!=='undefined')module.exports=root.PgScen})(typeof window!=='undefined'?window:globalThis);
