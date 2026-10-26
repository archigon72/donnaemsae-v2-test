/* 포트폴리오 설계실 계산 모듈(순수 함수). 원천 데이터 읽기 전용, 세전, 가상 포트폴리오.
   누락 데이터는 0으로 대체하지 않고 오류/제한으로 반환한다. */
(function(root){'use strict';
const num=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
function sharesAndCash(amount,price){if(!(price>0))return {ok:false,reason:'참고가격 없음'};if(!(amount>=0))return {ok:false,reason:'투자금 오류'};const shares=Math.floor(amount/price+1e-9);return {ok:true,shares,cost:shares*price,cash:amount-shares*price}}
function daysBetween(a,b){return Math.round((Date.parse(b)-Date.parse(a))/864e5)}
function payFrequency(history){const d=(history||[]).map(h=>h.date).filter(Boolean).sort();if(d.length<2)return {ok:false,reason:'지급 이력 2회 미만 — 주기 판단 불가'};const gaps=[];for(let i=1;i<d.length;i++)gaps.push(daysBetween(d[i-1],d[i]));gaps.sort((a,b)=>a-b);const med=gaps[Math.floor(gaps.length/2)];const perYear=med<=10?52:med<=45?12:med<=110?4:med<=200?2:1;return {ok:true,perYear,medianGap:med,label:{52:'주간',12:'월',4:'분기',2:'반기',1:'연'}[perYear]}}
/* A. 최근 실제 분배금 방식: 정수 주식수 × 회차 분배금 × 연 지급횟수 ÷ 12 */
function methodA(etf,amount,basis){const sc=sharesAndCash(amount,etf.price);if(!sc.ok)return {ok:false,reason:sc.reason};
 const hist=etf.history||[],rec=etf.recent12||[];if(!hist.length)return {ok:false,reason:'분배 이력 없음',...sc};
 const fq=payFrequency(hist);if(!fq.ok)return {ok:false,reason:fq.reason,...sc};
 let per,basisLabel,n=null;
 if(basis==='avg12'){const am=rec.map(r=>num(r.amount)).filter(v=>v!==null);if(!am.length)return {ok:false,reason:'최근 12개월 분배 자료 없음',...sc};per=am.reduce((s,v)=>s+v,0)/am.length;n=am.length;basisLabel=`최근 12개월 회차 평균(${n}회)`+(n<fq.perYear?' · 12개월 미만 자료':'')}
 else{per=num(etf.latest&&etf.latest.amount);if(per===null)return {ok:false,reason:'최근 지급액 없음',...sc};basisLabel=`최근 지급(${etf.latest.date})`}
 const annual=sc.shares*per*fq.perYear;return {ok:true,...sc,perShare:per,perYear:fq.perYear,freq:fq.label,basisLabel,annual,monthly:annual/12,partial:n!==null&&n<fq.perYear}}
/* B. 가정 연분배율 방식: 투자금 × 가정 연분배율 ÷ 12 */
function methodB(amount,yieldPct){const y=num(yieldPct);if(y===null||y<0)return {ok:false,reason:'가정 분배율 미입력'};const annual=amount*y/100;return {ok:true,annual,monthly:annual/12}}
/* 재투자 보기: 가격·분배금 불변 가정. 월 분배금 × 재투자 비율로 정수주 재매수(잔돈 이월) */
function reinvestView(rows,months,ratio){return rows.filter(h=>h.ok).map(h=>{let shares=h.shares,carry=0,taken=0;for(let m=0;m<months;m++){const d=shares*h.monthlyPerShare;taken+=d*(1-ratio);carry+=d*ratio;const add=Math.floor(carry/h.price+1e-9);shares+=add;carry-=add*h.price}return {code:h.code,startShares:h.shares,endShares:shares,addShares:shares-h.shares,withdrawn:taken,carry,endMonthly:shares*h.monthlyPerShare}})}
/* 2단계: 모든 종목이 실제 값을 가진 교집합 거래일만. 상장 전 외삽 없음. field='tr'|'raw' */
function intersect(seriesMap,codes,field,from,to,only){const maps=[];for(const c of codes){const s=seriesMap[c];if(!s||!s.length)return {ok:false,reason:`${c}: 시계열 없음`};const m=new Map();for(const p of s){const v=p[field];if(v===null||!(v>0))continue;if(from&&p.date<from)continue;if(to&&p.date>to)continue;if(only&&!only.has(p.date))continue;m.set(p.date,v)}if(!m.size)return {ok:false,reason:`${c}: 유효 지수 없음`};maps.push(m)}
 const dates=[...maps[0].keys()].filter(d=>maps.every(m=>m.has(d))).sort();if(dates.length<2)return {ok:false,reason:'공통 거래일 2일 미만'};return {ok:true,dates,values:maps.map(m=>dates.map(d=>m.get(d)))}}
function rebalanceDue(prev,cur,rule){if(rule==='monthly')return prev.slice(0,7)!==cur.slice(0,7);if(rule==='quarterly'){const q=d=>d.slice(0,4)+'Q'+Math.floor((+d.slice(5,7)-1)/3);return q(prev)!==q(cur)}return false}
/* 조합 지수 = Σ 보유단위 × 종목 지수. TR 지수에 분배금을 추가로 더하지 않음 */
function backtest(seriesMap,codes,weights,opt){opt=opt||{};const it=intersect(seriesMap,codes,opt.field||'tr',opt.from,opt.to,opt.only);if(!it.ok)return it;const {dates,values}=it;const W=weights.reduce((s,v)=>s+v,0);if(!(W>0))return {ok:false,reason:'비중 합계 0'};const w=weights.map(v=>v/W);
 let units=w.map((wi,i)=>100*wi/values[i][0]);const V=[100];let rebal=0;
 for(let t=1;t<dates.length;t++){let v=0;for(let i=0;i<codes.length;i++)v+=units[i]*values[i][t];V.push(v);
  if(rebalanceDue(dates[t-1],dates[t],opt.rebalance)){units=w.map((wi,i)=>v*wi/values[i][t]);rebal++}}
 return {ok:true,dates,values:V,rebalances:rebal,...metrics(dates,V),corr:correlation(values),start:dates[0],end:dates[dates.length-1],obs:dates.length}}
function rets(v){const r=[];for(let i=1;i<v.length;i++)r.push(v[i]/v[i-1]-1);return r}
function metrics(dates,V){const r=rets(V),n=r.length;let peak=V[0],mdd=0,pd=dates[0],md=null,td=null;for(let i=0;i<V.length;i++){if(V[i]>peak){peak=V[i];pd=dates[i]}const dd=V[i]/peak-1;if(dd<mdd){mdd=dd;md=pd;td=dates[i]}}
 const mean=r.reduce((s,x)=>s+x,0)/n;const vol=n>1?Math.sqrt(r.reduce((s,x)=>s+(x-mean)**2,0)/(n-1))*Math.sqrt(252):null;
 const win=Math.min(20,V.length-1);let worst=Infinity,ws=null,we=null;for(let i=win;i<V.length;i++){const x=V[i]/V[i-win]-1;if(x<worst){worst=x;ws=dates[i-win];we=dates[i]}}
 return {cum:V[V.length-1]/V[0]-1,mdd,mddPeak:md,mddTrough:td,vol,worst,worstWin:win,worstStart:ws,worstEnd:we}}
function pearson(a,b){const n=a.length;if(n<3)return null;const ma=a.reduce((s,x)=>s+x,0)/n,mb=b.reduce((s,x)=>s+x,0)/n;let sab=0,sa=0,sb=0;for(let i=0;i<n;i++){sab+=(a[i]-ma)*(b[i]-mb);sa+=(a[i]-ma)**2;sb+=(b[i]-mb)**2}return sa&&sb?sab/Math.sqrt(sa*sb):null}
function correlation(values){const R=values.map(rets);return R.map(a=>R.map(b=>pearson(a,b)))}
function periodWarning(obs){if(obs<60)return {level:'strong',text:`관측 ${obs}거래일 — 매우 짧은 기간입니다. 결과를 일반화하지 마세요.`};if(obs<252)return {level:'warn',text:`관측 ${obs}거래일(1년 미만) — 짧은 기간 경고. 연환산 변동성은 참고용입니다.`};return null}
const api={num,sharesAndCash,payFrequency,methodA,methodB,reinvestView,intersect,backtest,metrics,correlation,periodWarning,rebalanceDue};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PDL=api})(typeof window!=='undefined'?window:this);
