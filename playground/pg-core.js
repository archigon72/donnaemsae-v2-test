/* 투자 놀이터 계산 모듈(순수 함수). 세전 · 가상 계산 · 원장 무관. */
(function(root){'use strict';
function equal(n){if(n<=0)return [];const b=Math.floor(100/n),r=100-b*n;return Array.from({length:n},(_,i)=>b+(i<r?1:0))}
/* 한 종목 비중을 v로 바꾸고 나머지(100-v)를 다른 종목의 현재 비중 비례로 정수 배분(최대 나머지법). 합계 항상 100 */
function rebalance(w,i,v){v=Math.max(0,Math.min(100,Math.round(Number(v)||0)));const n=w.length;if(n===1)return [100];const o=w.map((x,j)=>j===i?0:Math.max(0,x)),s=o.reduce((a,b)=>a+b,0),R=100-v;let base=o.map((x,j)=>j===i?0:(s>0?x/s:1/(n-1))*R);const fl=base.map(Math.floor);let left=R-fl.reduce((a,b)=>a+b,0);const ord=base.map((x,j)=>[x-fl[j],j]).filter(([,j])=>j!==i).sort((a,b)=>b[0]-a[0]||a[1]-b[1]);for(let k=0;left>0;k=(k+1)%ord.length,left--)fl[ord[k][1]]++;fl[i]=v;return fl}
/* 목돈 배분: 종목 배정액=floor(목돈×비중/100), 정수 주식 수=floor(배정액/가격), 잔여 현금=목돈−Σ매수금액 */
function allocate(amount,items){const rows=items.map(it=>{const alloc=Math.floor(amount*it.w/100);const ok=it.price>0;const shares=ok?Math.floor(alloc/it.price+1e-9):0;return {code:it.code,w:it.w,alloc,price:it.price,shares,cost:shares*(it.price||0)}});const cost=rows.reduce((a,r)=>a+r.cost,0);return {rows,cost,cash:amount-cost}}
/* 지급 횟수: 해당 월(1..)에 지급되는 회차 수. 월12·분기4·반기2·연1·주52(월별 누적 내림 차) */
function paysIn(perYear,m){if(perYear===12)return 1;if(perYear===52)return Math.floor(52*m/12)-Math.floor(52*(m-1)/12);const k=12/perYear;return m%k===0?1:0}
/* 월 배당(세전): 주식 수 × 회차 주당 분배금 × 연 지급횟수 ÷ 12 */
function dividend(rows,meta){let annual=0;const per=rows.map(r=>{const d=meta[r.code];const a=d&&d.dps>0&&d.perYear?r.shares*d.dps*d.perYear:0;annual+=a;return {code:r.code,annual:a,monthly:a/12}});return {annual,monthly:annual/12,per}}
/* 재투자 실험: 주가·주당 분배금 불변 가정. 월 단위로 지급 → (재투자 시) 종목별 현금에 더해 정수 주만 같은 종목 재매수, 잔돈 이월.
   자산=Σ(주식 수×가격)+Σ종목별 잔돈+최초 잔여 현금 (재투자한 배당은 주식에 이미 포함, 누적 배당은 별도 표시만 → 중복 없음) */
function simulate(amount,items,meta,years,reinvest){const a=allocate(amount,items);const st=a.rows.map(r=>({code:r.code,price:r.price,shares:r.shares,cash:0}));let cum=0,recv=0;for(let m=1;m<=years*12;m++){for(const s of st){const d=meta[s.code];if(!d||!(d.dps>0)||!d.perYear)continue;const c=paysIn(d.perYear,m);if(!c)continue;const pay=s.shares*d.dps*c;cum+=pay;if(reinvest){s.cash+=pay;const b=Math.floor(s.cash/s.price+1e-9);s.shares+=b;s.cash-=b*s.price}else recv+=pay}}
 const stock=st.reduce((x,s)=>x+s.shares*s.price,0),change=st.reduce((x,s)=>x+s.cash,0),annualNow=dividend(st.map(s=>({code:s.code,shares:s.shares})),meta).annual;return {years,reinvest,stock,change,initCash:a.cash,asset:stock+change+a.cash+(reinvest?0:recv),received:recv,cumDividend:cum,annualNow,monthlyNow:annualNow/12,shares:st.map(s=>({code:s.code,shares:s.shares}))}}
/* 월세(적립식): 월말 납입, 월수익률=(1+연수익률)^(1/12)-1, 미래자산=P×((1+r)^n−1)/r, r=0이면 P×n. 수수료·세금·물가 제외 */
function monthlyFV(P,annualPct,years){const n=Math.round(years*12),R=annualPct/100,r=Math.pow(1+R,1/12)-1;const fv=Math.abs(r)<1e-15?P*n:P*(Math.pow(1+r,n)-1)/r;return {principal:P*n,future:fv,gain:fv-P*n,monthlyRate:r,n}}
root.PgCore={equal,rebalance,allocate,paysIn,dividend,simulate,monthlyFV};if(typeof module!=='undefined')module.exports=root.PgCore})(typeof window!=='undefined'?window:globalThis);
