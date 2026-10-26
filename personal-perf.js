/* v2-stage1 개인 원장 투자성과 모듈 (t274). CORE·ETF NAV-TR 계산식과 무관한 별도 표시용 계산.
   계좌 범위: 예수금(현금) 포함 포트폴리오. 외부 현금흐름 = 입금(+)·출금(−)·배당현금 외부 사용(−)·첫 잔고 기록(이전 거래 없는 계좌, +).
     매수·매도·배당 입금·배당 재투자는 계좌 내부 이동(예수금 ↔ 종목)이라 외부흐름 아님. 매도대금은 예수금으로 남음.
   종목 범위: 매수(+)·매도(−)·세후 배당(−, 종목에서 나간 수익)·재투자(+, 내부 투입·투자원금 아님).
   가격 기준: 종료 평가는 기존 자료의 종가. 과거 종가 이력이 없으므로 기간 시작 시점에 보유 종목이 있으면 계산 불가(과거 NAV와 현재 종가를 섞지 않음).
   기간 수익률: Modified Dietz(비연환산)  R = (EV − BV − ΣF) / (BV + Σ w·F), w = (T − t)/T.
   연환산 수익률: XIRR(머니웨이티드) — 같은 BV·EV·흐름 사용, 기간 365일 이상일 때만.
   현금 기록·평가액·세후 배당 중 하나라도 확인되지 않으면 ok:false + reason(추정값으로 메우지 않음). */
(function(g){'use strict';
const DAY=86400000,dt=s=>Date.parse(s+'T00:00:00Z'),TOL=1;
function days(a,b){return Math.round((dt(b)-dt(a))/DAY)}
function dayBefore(d){return new Date(dt(d)-DAY).toISOString().slice(0,10)}
function xirr(cfs){if(!cfs.some(c=>c.amt<0)||!cfs.some(c=>c.amt>0))return null;const t0=cfs[0].date;
  const f=r=>cfs.reduce((s,c)=>s+c.amt/Math.pow(1+r,days(t0,c.date)/365),0);
  let lo=-0.9999,hi=10,flo=f(lo),fhi=f(hi);if(!isFinite(flo)||!isFinite(fhi)||flo*fhi>0)return null;
  for(let i=0;i<300;i++){const m=(lo+hi)/2,fm=f(m);if(Math.abs(fm)<1e-9)return m;if(flo*fm<0){hi=m;fhi=fm}else{lo=m;flo=fm}}return (lo+hi)/2}
/* flows: [{date, amount(+투입/−회수), external}] */
function compute({start,end,bv,ev,flows,dividends=0}){
  const out={start,end,ok:false,method:{period:'Modified Dietz(기간, 비연환산)',annual:'XIRR(연환산, 365일 이상)'}};
  if(ev===null||ev===undefined){out.reason='종료 시점 평가액을 확인할 수 없는 종목이 있어 수익률을 계산하지 않았습니다.';return out}
  if(bv===null||bv===undefined){out.reason='기간 시작 시점 평가액을 같은 가격 기준으로 확인할 수 없어 수익률을 계산하지 않았습니다.';return out}
  const T=days(start,end);const fl=flows.filter(f=>f.date>start&&f.date<=end);
  const sumF=fl.reduce((s,f)=>s+f.amount,0);
  const inflow=fl.filter(f=>f.external&&f.amount>0).reduce((s,f)=>s+f.amount,0);
  const outflow=-fl.filter(f=>f.amount<0).reduce((s,f)=>s+f.amount,0);
  const pnl=ev-bv-sumF;Object.assign(out,{bv,ev,inflow,outflow,pnl,dividends,days:T,principal:bv+inflow});
  if(T<=0){out.reason='기간이 너무 짧아 수익률을 계산하지 않았습니다.';return out}
  const den=bv+fl.reduce((s,f)=>s+f.amount*(days(f.date,end)/T),0);
  if(!(den>0)){out.reason='기간 중 평균 투자금이 0 이하라 수익률을 정의할 수 없습니다.';return out}
  out.ok=true;out.ret=pnl/den;
  if(T>=365){const cfs=[];if(bv)cfs.push({date:start,amt:-bv});for(const f of fl)cfs.push({date:f.date,amt:-f.amount});cfs.push({date:end,amt:ev});cfs.sort((a,b)=>a.date.localeCompare(b.date));out.xirr=xirr(cfs)}else out.xirr=null;
  return out}
/* 계좌 하나의 예수금 시간선. items: [{date, ok, type, amount(number|null)}]
   type: deposit|withdraw|balance|buy|sell|div|reinvest|use|opening */
function timeline(items){const ev=items.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.ok-b.ok);
  let known=false,cash=0,anchor=null,hadPrior=false,legacyLast=null;const snaps=[],flows=[],issues=[],balances=[];
  for(const e of ev){const a=e.amount;
    if(!known){if(e.type==='deposit'){known=true;anchor=e;cash=a;flows.push({date:e.date,amount:a,external:true,type:'deposit'})}
      else if(e.type==='balance'){known=true;anchor=e;cash=a;balances.push(e.date);if(!hadPrior){if(a>0)flows.push({date:e.date,amount:a,external:true,type:'start_balance'})}}
      else if(e.type==='withdraw'){issues.push({date:e.date,kind:'cash',msg:'첫 예수금 기록 전 출금'})}
      else{hadPrior=true;legacyLast=e.date;continue}
      snaps.push({date:e.date,cash});continue}
    switch(e.type){
      case 'deposit':cash+=a;flows.push({date:e.date,amount:a,external:true,type:'deposit'});break;
      case 'withdraw':cash-=a;flows.push({date:e.date,amount:-a,external:true,type:'withdraw'});break;
      case 'balance':{const d=a-cash;if(Math.abs(d)>=TOL)issues.push({date:e.date,kind:'mismatch',msg:'잔고 확인값과 기록 계산 예수금 차이 '+Math.round(d).toLocaleString('ko-KR')+'원(입출금 기록 누락 가능)'});cash=a;balances.push(e.date);break}
      case 'buy':cash-=a;break;case 'sell':cash+=a;break;
      case 'div':if(a===null){issues.push({date:e.date,kind:'cash',msg:'세후 배당 입금액 미확인(추정 지급 포함)'});}else cash+=a;break;
      case 'reinvest':cash-=a;break;
      case 'use':cash-=a;flows.push({date:e.date,amount:-a,external:true,type:'use'});break;
      case 'opening':issues.push({date:e.date,kind:'cash',msg:'예수금 기록 이후 기존 보유분 등록(시가 미상)'});break}
    if(cash<-TOL&&!issues.some(i=>i.kind==='neg'&&i.date===e.date))issues.push({date:e.date,kind:'neg',msg:'예수금이 음수(입금 기록 누락 가능)'});
    snaps.push({date:e.date,cash})}
  const first=ev.length?ev[0].date:null;
  function cashAt(d){if(first&&d<first)return 0;if(!anchor||d<anchor.date)return null;let c=null;for(const s of snaps){if(s.date<=d)c=s.cash;else break}return c}
  return {anchor,hadPrior,legacyLast,flows,issues,balances,cashAt,first,count:ev.length}}
/* 계좌 범위 성과. accts: [{id, items}], holdingsAt(date)->보유 종목 수, evHoldings: number|null */
function portfolio({accts,start,end,holdingsAt,evHoldings,dividends}){
  const tls=accts.map(a=>({id:a.id,tl:timeline(a.items)})).filter(x=>x.tl.count);const why=[];
  if(!tls.length)return {ok:false,empty:true,reason:'기록이 없습니다.'};
  const S=start||dayBefore(tls.map(x=>x.tl.first).sort()[0]);
  for(const {id,tl} of tls){
    if(!tl.anchor){why.push(id+': 예수금(입금·잔고) 기록이 없어 매수·매도 현금흐름을 확인할 수 없습니다.');continue}
    if(tl.hadPrior&&tl.anchor.date>S){why.push(id+': 첫 예수금 기록('+tl.anchor.date+') 이전 거래가 있어 이 기간은 계산할 수 없습니다.');continue}
    const lastBal=tl.balances.filter(d=>d<=S).sort().pop()||'';
    for(const i of tl.issues){if(i.date>end)continue;if(i.kind==='mismatch'?i.date>S:i.date>lastBal){why.push(id+': '+i.date+' '+i.msg);break}}}
  const out={start:S,end,why};
  if(!why.length&&holdingsAt(S)>0)why.push('기간 시작('+S+')에 보유 종목이 있으나 그 시점 종가 이력이 없어 같은 가격 기준으로 평가할 수 없습니다.');
  if(why.length)return Object.assign(out,{ok:false,reason:why.join(' / ')});
  const bv=tls.reduce((s,x)=>s+(x.tl.cashAt(S)||0),0),ec=tls.reduce((s,x)=>s+(x.tl.cashAt(end)||0),0);
  const flows=[].concat(...tls.map(x=>x.tl.flows));
  const r=compute({start:S,end,bv,ev:evHoldings===null?null:ec+evHoldings,flows,dividends});r.cashEnd=ec;r.why=why;return r}
/* 종목 범위. items: [{date, type: buy|sell|div|reinvest|opening, amount}] */
function instrument({items,start,end,holdingsAt,evHoldings}){if(!items.length)return {ok:false,empty:true,reason:'기록이 없습니다.'};
  const ev=items.slice().sort((a,b)=>a.date.localeCompare(b.date));const S=start||dayBefore(ev[0].date);
  const fl=[];let div=0;for(const e of ev){if(e.date<=S||e.date>end)continue;
    if(e.type==='buy')fl.push({date:e.date,amount:e.amount,external:true});else if(e.type==='sell')fl.push({date:e.date,amount:-e.amount,external:true});
    else if(e.type==='reinvest')fl.push({date:e.date,amount:e.amount,external:false});
    else if(e.type==='div'){if(e.amount===null)return {start:S,end,ok:false,reason:e.date+' 세후 배당 입금액 미확인(추정 지급 포함)이라 계산하지 않았습니다.'};fl.push({date:e.date,amount:-e.amount,external:false});div+=e.amount}
    else if(e.type==='opening')return {start:S,end,ok:false,reason:'기존 보유분 등록(매수 시가 미상)이 있어 이 종목 성과를 계산하지 않았습니다.'}}
  if(holdingsAt(S)>0)return {start:S,end,ok:false,reason:'기간 시작('+S+')에 보유 수량이 있으나 그 시점 종가 이력이 없어 같은 가격 기준으로 평가할 수 없습니다.'};
  return compute({start:S,end,bv:0,ev:evHoldings,flows:fl,dividends:div})}
const api={compute,timeline,portfolio,instrument,xirr,days,dayBefore};g.PersonalPerf=api;if(typeof module!=='undefined')module.exports=api})(typeof window!=='undefined'?window:globalThis);
