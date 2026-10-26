/* v5.3 세후 배당 계산(표시·현금 정합 전용). 원장 replay 결과를 읽어 지급 건별 세후액을 계산하고,
   사용자 확정 실입금액(state.dividend_confirmations)을 우선 적용한다. 원장 기록은 수정하지 않는다.
   규칙(대표 결정): 일반계좌 해외형 = 세전×15.4% · 국내주식형 커버드콜 = 회차 과세표준×수량×15.4%, 자료 없으면 세전×18%를 과세표준 ·
   ISA/연금저축/IRP = 과세이연(세금 0) · 그 외 일반 과세형(대표 확정 2026-10-14) = 공식 회차 과세표준 자료 일치 시 우선, 없으면 과세대상 비율 100%(세전 전액)×15.4%.
   원 단위: 과세표준 원 미만 절사 → 소득세 = floor(과세표준×14%) → 지방소득세 = floor(소득세×10%) → 세금 = 합, 세전액 초과 불가. */
(function(root){'use strict';
let data=null;const byDist=new Map();
const DEFER=['ISA','연금저축','IRP'];
function init(d){data=d&&d.classification?d:null;byDist.clear();if(data)for(const b of data.bases||[])byDist.set(b.distribution_id,b);return !!data}
function ready(){return !!data}
function floorWon(L,v){return L.D.of((v.n/v.d).toString())}
function category(code){return data?.classification?.[code]?.category||'undecided'}
function compute(L,ev,acctType,distributions){
 const pre=ev.amount,code=ev.code,cat=category(code),t=acctType||'일반';
 if(DEFER.includes(t))return {category:cat,rule:'deferred',rule_label:t+' 과세이연 (수령 단계 세금 0)',base:null,tax:L.D.of('0'),net:pre};
 let base,rule,label;const b=byDist.get(ev.distribution_id),d=distributions.get(ev.distribution_id);
 const match=b&&d&&b.code===code&&b.ex_date===d.ex_date&&L.D.of(b.per_share).cmp(d.per_share)===0;
 if(cat==='overseas'){base=pre;rule='overseas_15_4';label='해외형 · 세전×15.4%'}
 else if(cat==='domestic_cc'){if(match){base=ev.quantity.mul(b.taxable_per_share);rule='cc_basis';label='국내 커버드콜 · 회차 과세표준 '+b.taxable_per_share+'원/주'}else{base=pre.mul('0.18');rule='cc_18';label='국내 커버드콜 · 과세표준 자료 없음 → 세전×18% 과세표준'}}
 else{if(match){base=ev.quantity.mul(b.taxable_per_share);rule='other_basis';label='일반 과세형 · 회차 과세표준 '+b.taxable_per_share+'원/주'}else{base=pre;rule='other_100';label='일반 과세형 · 회차 과세표준 자료 없음 → 세전 100%×15.4%'}}
 const bw=floorWon(L,base),inc=floorWon(L,bw.mul('0.14')),loc=floorWon(L,inc.mul('0.1'));let tax=inc.add(loc);if(tax.cmp(pre)>0)tax=pre;
 return {category:cat,rule,rule_label:label,base:bw,income_tax:inc,local_tax:loc,tax,net:pre.sub(tax)};
}
/* replay 결과 r에 세후 정보를 붙이고 계좌 배당현금을 세후(실입금) 기준으로 바꾼 새 객체를 돌려준다. */
function adjust(L,r,state,distList){
 if(!data)return Object.assign({},r,{tax:{ready:false,rows:[],byAcc:new Map(),shortfall:new Map()}});
 const types=new Map(state.accounts.map(a=>[a.account_id,a.type||'일반'])),conf=new Map((state.dividend_confirmations||[]).map(c=>[c.account_id+':'+c.distribution_id,c])),dist=new Map(distList.map(d=>[d.distribution_id,d]));
 const rows=[],byAcc=new Map(),run=new Map(),minRun=new Map();
 for(const e of r.events){const a=e.account_id;if(!run.has(a)){run.set(a,L.D.of('0'));minRun.set(a,L.D.of('0'))}
  if(e.kind==='dividend'){const c=compute(L,e,types.get(a),dist),k=a+':'+e.distribution_id,cf=conf.get(k);const net=cf?L.D.of(cf.amount):c.net;
   const row={...c,key:k,account_id:a,code:e.code,distribution_id:e.distribution_id,date:e.date,quantity:e.quantity,pretax:e.amount,auto_net:c.net,auto_tax:c.tax,confirmed:cf?L.D.of(cf.amount):null,net,deduct:e.amount.sub(net)};rows.push(row);
   byAcc.set(a,(byAcc.get(a)||L.D.of('0')).add(row.deduct));run.set(a,run.get(a).add(net))}
  else if(e.kind==='use'||(e.kind==='trade'&&e.type==='reinvest'))run.set(a,run.get(a).sub(e.amount));
  if(run.get(a).cmp(minRun.get(a))<0)minRun.set(a,run.get(a))}
 const cash=new Map();for(const [a,v] of r.cash)cash.set(a,v.sub(byAcc.get(a)||L.D.of('0')));
 const shortfall=new Map();for(const [a,m] of minRun)if(m.cmp('0')<0)shortfall.set(a,L.D.of('0').sub(m));
 return Object.assign({},r,{cash,pretax_cash:r.cash,tax:{ready:true,rows,byAcc,shortfall}});
}
function shortfallTotal(L,r){let s=L.D.of('0');for(const v of (r.tax?.shortfall||new Map()).values())s=s.add(v);return s}
const api={init,ready,category,compute,adjust,shortfallTotal,DEFER};root.ManagementTax=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
