/* t293B: 받은 배당(실수령) 지급 건 단위 저장 공용 모듈. 저장 키 EVK(dnmv2.receipt.evidence.v1) · version 1 그대로, 필드만 추가(하위호환).
   item = {account_id, month, amount(계좌·월 합계, 기존 의미 유지), codes{종목:원화 합계, 기존 의미 유지}, notes{기존 종목별 메모}, pays[지급 건], source, at}
   pays[] = {id, code, date, amount(원화 세후), currency, amount_fx, fx, kind, at} — 같은 계좌·종목·월이라도 지급일이 다르면 별도 건.
   불변식: codes[c] = (기존 단일 기록분) + Σpays(c).amount, amount = (기존 계좌·월 합계 잔여, 종목 미상) + Σcodes → 기존 리더(rcCore·overlay)의 합계는 그대로 맞고 이중 합산 없음.
   기존 기록(pays 없음)은 쪼개거나 지우지 않고 종목별 1건(id 'c:종목')으로 그대로 읽는다. 합산은 분석 화면에서만(codes/amount). */
(function(){
'use strict';
const B=v=>{const s=String(v==null?'0':v).trim();if(/^-?\d+$/.test(s))return BigInt(s);const n=Number(s);return Number.isFinite(n)?BigInt(Math.round(n)):0n};
const S=v=>B(v).toString();
const paysOf=(it,c)=>(it.pays||[]).filter(p=>p&&p.code===c);
const sumPays=(it,c)=>paysOf(it,c).reduce((a,p)=>a+B(p.amount),0n);
const codeSum=it=>Object.values(it.codes||{}).reduce((a,v)=>a+B(v),0n);
function monthRest(it){return B(it.amount)-codeSum(it)}
function list(it){const out=[],n=it.notes||{};
 for(const c of Object.keys(it.codes||{})){const lp=B(it.codes[c])-sumPays(it,c);if(lp!==0n||!paysOf(it,c).length){const x=n[c]||{};out.push({id:'c:'+c,code:c,date:/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')?x.date:'',amount:lp.toString(),currency:x.currency==='USD'?'USD':'KRW',amount_fx:x.amount_fx,fx:x.fx,kind:x.kind||'기존 입력',at:x.at||it.at||null,legacy:true})}}
 for(const p of it.pays||[])if(p&&p.id&&p.code)out.push(Object.assign({},p,{amount:S(p.amount),legacy:false}));
 return out.sort((a,b)=>((a.date||it.month+'-99')+a.code+a.id).localeCompare((b.date||it.month+'-99')+b.code+b.id))}
function find(items,acc,month){return items.find(x=>x&&x.account_id===acc&&x.month===month)}
function tidy(items,it){if(it.pays&&!it.pays.length)delete it.pays;if(it.codes&&!Object.keys(it.codes).length)delete it.codes;if(!it.codes&&B(it.amount)===0n){const i=items.indexOf(it);if(i>=0)items.splice(i,1)}}
function err(code,msg){const e=Error(msg);e.code=code;return e}
function add(items,acc,month,p){const code=String(p.code||'').trim().toUpperCase(),date=String(p.date||'');
 if(!acc)throw err('ACC','계좌를 선택해 주세요.');if(!/^[0-9A-Z.\-]{1,12}$/.test(code))throw err('CODE','종목 코드를 입력해 주세요.');
 if(!/^\d{4}-\d{2}$/.test(month))throw err('MONTH','지급 월이 올바르지 않아요.');if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date.slice(0,7)!==month))throw err('DATE','지급일이 올바르지 않아요.');
 if(!/^\d+$/.test(String(p.amount)))throw err('AMT','실수령액은 0 이상의 원 단위 숫자로 입력해 주세요.');
 let it=find(items,acc,month);
 if(it&&monthRest(it)!==0n)throw err('LEGACY_MONTH',month.replace('-','.')+'월 이 계좌는 계좌 합계(종목 미상)로 입력돼 있어요. 중복 합산을 막기 위해 그 합계를 먼저 삭제(되돌리기)한 뒤 종목별로 입력해 주세요.');
 if(it&&date&&list(it).some(q=>q.code===code&&q.date===date&&B(q.amount)===B(p.amount)&&q.id!==p.id))throw err('DUP','같은 계좌·종목·지급일·금액의 지급 건이 이미 있어요. 중복 입력을 막았어요.');
 if(!it){it={account_id:acc,month,amount:'0',source:p.source||'대표 입력'};items.push(it)}
 const at=new Date().toISOString(),rec={id:p.id&&!String(p.id).startsWith('c:')?p.id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),code,date,amount:S(p.amount),currency:p.currency==='USD'?'USD':'KRW',kind:p.kind||'지급건 입력',at};
 if(rec.currency==='USD'){if(p.amount_fx)rec.amount_fx=String(p.amount_fx);if(p.fx)rec.fx=String(p.fx)}
 it.pays=it.pays||[];it.pays.push(rec);it.codes=it.codes||{};it.codes[code]=(B(it.codes[code]||0)+B(rec.amount)).toString();it.amount=(B(it.amount)+B(rec.amount)).toString();it.at=at;
 items.sort((a,b)=>(a.account_id+a.month).localeCompare(b.account_id+b.month));return rec}
function get(items,acc,month,id){const it=find(items,acc,month);return it?list(it).find(q=>q.id===id)||null:null}
function remove(items,acc,month,id){const it=find(items,acc,month);if(!it||!id)return null;let amt,code;
 if(String(id).startsWith('c:')){code=String(id).slice(2);if(!it.codes||it.codes[code]==null)return null;amt=B(it.codes[code])-sumPays(it,code);if(it.notes){delete it.notes[code];if(!Object.keys(it.notes).length)delete it.notes}}
 else{const i=(it.pays||[]).findIndex(q=>q&&q.id===id);if(i<0)return null;code=it.pays[i].code;amt=B(it.pays[i].amount);it.pays.splice(i,1)}
 const nc=B(it.codes&&it.codes[code])-amt;if(it.codes){if(nc===0n&&!paysOf(it,code).length)delete it.codes[code];else it.codes[code]=nc.toString()}
 it.amount=(B(it.amount)-amt).toString();tidy(items,it);return {code,amount:amt.toString()}}
function removeCode(items,acc,month,code){const it=find(items,acc,month);if(!it)return 0;let n=0;for(const q of list(it).filter(q=>q.code===code)){if(remove(items,acc,month,q.id))n++}return n}
function removeMonth(items,acc,month){const it=find(items,acc,month);if(!it)return false;it.amount=codeSum(it).toString();if(it.notes&&it.notes._)delete it.notes._;tidy(items,it);return true}
function update(items,acc,month,id,p){const snap=JSON.stringify(items);try{if(!remove(items,acc,month,id))throw err('NOTFOUND','수정할 지급 건을 찾지 못했어요.');const m2=p.month||String(p.date||'').slice(0,7)||month;return add(items,p.acc||acc,m2,Object.assign({},p,{id}))}catch(e){items.splice(0,items.length,...JSON.parse(snap));throw e}}
window.EvPay={B,list,monthRest,codeSum,add,get,remove,removeCode,removeMonth,update,version:'t293'};
})();
