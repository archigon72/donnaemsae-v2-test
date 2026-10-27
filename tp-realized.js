/* t289 B3 안1(대표 승인): 매도 실현손익 = 매도대금 − 평균원가로 줄어든 원가. 원장(ManagementLedger.replay)의 매도 처리와 같은 순서·같은 버킷 규칙
   (직접매수분 먼저, 그 다음 재투자분, 각 버킷 평균원가)을 읽기 전용으로 재현. 원장·저장값·저장 키는 바꾸지 않음. 금액은 원화(trade_price; USD 거래는 거래 당시 환율로 원장이 이미 원화화).
   acq = 취득원가 흐름(최초매수·추가매수·기존 보유분 등록·배당재투자). 기존 보유분 등록일은 실제 매수일이 아님(ob 표시). */
(function(root){'use strict';
function compute(L,s,asOf){const D=L.D,Z=()=>D.of('0'),hs=new Map(),sells=[],acq=[];
 const tx=(s&&s.transactions||[]).filter(t=>t&&t.trade_date&&t.trade_date<=asOf).slice().sort((a,b)=>a.trade_date.localeCompare(b.trade_date)||a.order_key-b.order_key);
 for(const t of tx){const k=t.account_id+':'+t.code;let h=hs.get(k);const q=D.of(t.quantity),p=D.of(t.trade_price),amt=q.mul(p);
  if(!h||h.dq.add(h.rq).cmp('0')<=0){h={dq:Z(),rq:Z(),dc:Z(),rc:Z(),ob:false};hs.set(k,h)}
  if(t.type==='initial_buy'||t.type==='add_buy'||t.type==='opening_balance'){h.dq=h.dq.add(q);h.dc=h.dc.add(amt);if(t.type==='opening_balance')h.ob=true;acq.push({date:t.trade_date,account_id:t.account_id,code:t.code,type:t.type,amt})}
  else if(t.type==='reinvest'){h.rq=h.rq.add(q);h.rc=h.rc.add(amt);acq.push({date:t.trade_date,account_id:t.account_id,code:t.code,type:t.type,amt})}
  else if(t.type==='sell'){if(h.dq.add(h.rq).cmp(q)<0)throw Error('매도수량이 보유수량보다 많습니다.');const dq=h.dq.cmp(q)>=0?q:h.dq,rq=q.sub(dq);let cost=Z();
   if(dq.cmp('0')>0){const c=h.dc.div(h.dq).mul(dq);cost=cost.add(c);h.dc=h.dc.sub(c);h.dq=h.dq.sub(dq)}
   if(rq.cmp('0')>0){const c=h.rc.div(h.rq).mul(rq);cost=cost.add(c);h.rc=h.rc.sub(c);h.rq=h.rq.sub(rq)}
   sells.push({date:t.trade_date,account_id:t.account_id,code:t.code,q,proceeds:amt,cost,pl:amt.sub(cost),ob:h.ob,full:h.dq.add(h.rq).cmp('0')===0})}}
 return {sells,acq}}
/* 범위 합계: fh({account_id,code}) 필터, (from, to] 날짜 구간(from 없으면 처음부터) */
function sum(L,r,fh,from,to){const D=L.D;let pl=D.of('0'),pro=D.of('0'),cost=D.of('0'),acq=D.of('0'),n=0,ob=0,full=new Set();
 for(const x of r.sells){if(!fh(x)||(from&&x.date<=from)||(to&&x.date>to))continue;pl=pl.add(x.pl);pro=pro.add(x.proceeds);cost=cost.add(x.cost);n++;if(x.ob)ob++;if(x.full)full.add(x.account_id+':'+x.code)}
 for(const x of r.acq){if(!fh(x)||(from&&x.date<=from)||(to&&x.date>to))continue;acq=acq.add(x.amt)}
 return {pl,proceeds:pro,cost,acq,n,ob,full:[...full]}}
const api={compute,sum};root.TPRealized=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
