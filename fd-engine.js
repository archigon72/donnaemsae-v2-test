/* 미래배당 화면 계산 (UAT 후보). 원장은 읽기만 하고 절대 쓰지 않는다.
   상태 구분: done=① 원장 실입금 확정(dividend_confirmations) · scheduled=② 확정 일정 미수령(지급일 미래) ·
   unconfirmed=지급일 경과·실입금 미확정(원장 자동입금 생성 안 함) · held=등록일 경계 보류(권리 확인 불가) ·
   forecast=③ 예상 — fd-forecast.json(사전계산: 주기·예상 배당락일·+3 KRX 영업일 지급일·월배당 최근3회 평균). 원장에 쓰지 않음.
   세금: 기존 승인 ManagementTax.compute 재사용. 등록 전 지급 회차는 소급하지 않음. */
(function(root){'use strict';
const FORECAST_APPROVED=true; /* 대표 결정 2026-10-14: 월배당=옵션 C(최근 3회 평균), 분기·비정기=금액 미정 */
function regDates(state){const m=new Map();for(const t of state.transactions){const k=t.account_id+':'+t.code;if(!m.has(k)||t.trade_date<m.get(k))m.set(k,t.trade_date)}return m}
function heldNow(L,state,a,code){return L.entitlement(state,a,code,'9999-12-31').cmp('0')>0}
function build(L,T,state,dists,opt){
 const today=opt.today||L.today(),accTypes=new Map(state.accounts.map(a=>[a.account_id,a.type||'일반'])),conf=new Map((state.dividend_confirmations||[]).map(c=>[c.account_id+':'+c.distribution_id,c]));
 const reg=regDates(state),distMap=new Map(dists.map(d=>[d.distribution_id,d])),codes=new Set(state.transactions.map(t=>t.code)),out=[],seen=new Set();
 for(const d of dists){if(!codes.has(d.code)||d.cashflow_included===false)continue;if(d.status!=='confirmed'&&d.status!=='estimated')continue;if(!d.ex_date||!d.pay_date)continue;
  for(const a of state.accounts){const id=a.account_id,k=id+':'+d.code,r=reg.get(k);if(!r)continue;const key=id+':'+d.distribution_id;if(seen.has(key))continue;seen.add(key);
   if(d.pay_date<r)continue; /* 등록 전 지급 → 소급 금지 */
   const q=L.entitlement(state,id,d.code,d.ex_date),base={key,account_id:id,code:d.code,distribution_id:d.distribution_id,ex_date:d.ex_date,pay_date:d.pay_date,pay_date_kind:d.pay_date_kind||(d.status==='estimated'?'estimated':'actual'),per_share:d.per_share,acct_type:accTypes.get(id)};
   if(q.cmp('0')<=0){if(d.ex_date<=r&&heldNow(L,state,id,d.code))out.push({...base,state:'held',quantity:null,reason:'등록일('+r+') 이전·당일 배당락 회차 — 기존 자료로 권리 확정 여부를 확인할 수 없어 보류'});continue}
   const pre=q.mul(d.per_share),tx=T&&T.ready()?T.compute(L,{amount:pre,code:d.code,distribution_id:d.distribution_id,quantity:q},accTypes.get(id),distMap):null;
   const cf=conf.get(key);let st=d.pay_date>today?'scheduled':cf?'done':'unconfirmed';
   const net=cf&&st==='done'?L.D.of(cf.amount):tx?tx.net:null;
   out.push({...base,state:st,quantity:q,pretax:pre,tax:tx?(cf&&st==='done'?pre.sub(net):tx.tax):null,net,rule_label:tx?tx.rule_label:'세금 자료 미로딩',confirmed:!!cf});}}
 /* ③ 예상: 기존 자료 마지막 배당락일 이후만(중복 없음) */
 const FC=opt.forecast&&opt.forecast.items||{};
 for(const code of codes){const f=FC[code];if(!f||!f.events)continue;const ps=f.per_share_sum!=null?L.D.of(f.per_share_sum).div(String(f.per_share_n)):null;
  for(const e of f.events){const did=code+'-F'+e.ex_date.replace(/-/g,'');
   for(const a of state.accounts){const id=a.account_id,r=reg.get(id+':'+code);if(!r)continue;const key=id+':'+did;if(seen.has(key))continue;seen.add(key);if(e.pay_date<r)continue;
    const base={key,account_id:id,code,distribution_id:did,ex_date:e.ex_date,pay_date:e.pay_date,pay_date_kind:'forecast',cal:e.cal||'estimated',per_share:ps?ps.str(6):null,acct_type:accTypes.get(id),cadence:f.cadence,per_share_n:f.per_share_n||null,forecast:true};
    const q=L.entitlement(state,id,code,e.ex_date);
    if(q.cmp('0')<=0){if(e.ex_date<=r&&heldNow(L,state,id,code))out.push({...base,state:'held',quantity:null,reason:'등록일('+r+') 이전·당일 예상 배당락 — 권리 확인 불가로 보류'});continue}
    if(!ps){out.push({...base,state:'forecast',quantity:q,pretax:null,tax:null,net:null,undecided:true,rule_label:f.cadence+' · 금액 미정(근거 없는 예측 금지)'});continue}
    const pre=q.mul(ps),tx=T&&T.ready()?T.compute(L,{amount:pre,code,distribution_id:did,quantity:q},accTypes.get(id),distMap):null;
    out.push({...base,state:'forecast',quantity:q,pretax:pre,tax:tx?tx.tax:null,net:tx?tx.net:null,rule_label:(tx?tx.rule_label:'세금 자료 미로딩')+' · 월배당 최근 '+f.per_share_n+'회 평균'})}}}
 /* 배당락 이벤트(보유 종목, 표시용) */
 const ex=[];for(const d of dists){if(!codes.has(d.code)||d.cashflow_included===false||!d.ex_date)continue;for(const a of state.accounts){const r=reg.get(a.account_id+':'+d.code);if(!r||d.ex_date<r)continue;const q=L.entitlement(state,a.account_id,d.code,d.ex_date);if(q.cmp('0')>0)ex.push({account_id:a.account_id,code:d.code,distribution_id:d.distribution_id,date:d.ex_date,quantity:q,per_share:d.per_share})}}
 for(const code of codes){const f=FC[code];if(!f||!f.events)continue;for(const e of f.events)for(const a of state.accounts){const r=reg.get(a.account_id+':'+code);if(!r||e.ex_date<r)continue;const q=L.entitlement(state,a.account_id,code,e.ex_date);if(q.cmp('0')>0)ex.push({account_id:a.account_id,code,distribution_id:code+'-F'+e.ex_date.replace(/-/g,''),date:e.ex_date,quantity:q,per_share:null,forecast:true})}}
 return {rows:out,ex,today,forecast:{approved:FORECAST_APPROVED,label:'월배당 최근 최대 3회(0원 제외) 평균 · 분기·비정기 금액 미정',status:opt.forecast?.calendar_status||{},yearMax:opt.forecast?.horizon?.ui_year_max||null}};
}
function amt(L,r,basis){if(r.state==='held'||r.undecided)return null;return basis==='pre'?r.pretax:r.net}
function won(v){return v==null?null:Math.floor(Number(v.num()))}
function man(w){if(w==null)return '—';const s=w<0?'-':'',a=Math.abs(w);if(a<1000)return s+Math.floor(a).toLocaleString('ko-KR')+'원';const t=Math.floor(a/1000)/10;return s+t.toLocaleString('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:1})+'만'}
function exact(L,v){if(v==null)return '—';const s=typeof v.str==='function'?v.str(6):String(v),neg=s.startsWith('-'),[i,f]=s.replace('-','').split('.'),fr=f&&/[1-9]/.test(f);const n=BigInt(i||'0')+(neg&&fr?1n:0n);return (neg&&n>0n?'-':'')+Number(n).toLocaleString('ko-KR')+'원'}
function exactPS(L,v){if(v==null)return '—';const s=v.str(6),[i,f]=s.split('.');const ff=f?f.replace(/0+$/,''):'';return Number(i).toLocaleString('ko-KR')+(ff?'.'+ff:'')+'원'}
function summarize(L,b,{year,accounts,basis}){const z=()=>L.D.of('0'),sel=r=>(!accounts||accounts.has(r.account_id))&&r.pay_date.slice(0,4)===String(year);
 const rows=b.rows.filter(sel),S={done:z(),scheduled:z(),unconfirmed:z(),forecast:z(),tax:z(),held:0,undecided:0,months:Array.from({length:12},()=>({done:z(),scheduled:z(),unconfirmed:z(),forecast:z(),n:0,undecided:0})),byAcc:new Map()};
 for(const r of rows){const m=+r.pay_date.slice(5,7)-1;S.months[m].n++;if(r.state==='held'){S.held++;S.months[m].held=(S.months[m].held||0)+1;continue}const v=amt(L,r,basis);if(v==null){if(r.undecided){S.undecided++;S.months[m].undecided++;const A=S.byAcc.get(r.account_id)||{done:z(),scheduled:z(),unconfirmed:z(),forecast:z(),n:0,undecided:0};A.undecided++;S.byAcc.set(r.account_id,A)}continue}S[r.state]=S[r.state].add(v);S.months[m][r.state]=S.months[m][r.state].add(v);if(r.state!=='unconfirmed'&&r.tax)S.tax=S.tax.add(r.tax);
  const A=S.byAcc.get(r.account_id)||{done:z(),scheduled:z(),unconfirmed:z(),forecast:z(),n:0,undecided:0};A[r.state]=A[r.state].add(v);A.n++;S.byAcc.set(r.account_id,A)}
 S.rows=rows;S.total=S.done.add(S.scheduled).add(S.forecast);return S}
const api={build,summarize,man,exact,exactPS,won,amt,FORECAST_APPROVED};root.FutureDividend=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
