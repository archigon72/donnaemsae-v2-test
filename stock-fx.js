/* t281ua2 작업 B: 국내+미국 일반주식 검색 DB · USD 거래 당시 환율(사용자 입력·불변 보존) · 현재 USD/KRW로 '현재 총자산 평가'만 환산.
   - 원장 계산식 변경 없음: USD 거래는 trade_price(원)=price_usd×fx_rate(입력값 그대로)로 저장, 기존 replay가 원화 취득원가·매도대금을 그 당시 값으로 계산.
   - 현재 환율은 data/usd-krw.json(무료 ECB 기준환율, 수동 갱신 스크립트). 실패 시 최근 확보값+기준시각, 없으면 '미확인'(임의 숫자 사용 안 함).
   - 현재 환율은 미국주식 '현재 평가'(가격자료 주입)에만 사용. 저장된 거래의 환율은 읽기만 함. */
(function(){'use strict';
const L=window.ManagementLedger,FXC='dnmv2.usdkrw.cache.v1',USC='dnmv2.usprice.cache.v1';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,d=2)=>Number(v).toLocaleString('ko-KR',{minimumFractionDigits:0,maximumFractionDigits:d});
async function getJSON(u,ms){const c=new AbortController(),tm=setTimeout(()=>c.abort(),ms||8000);try{const r=await fetch(u,{cache:'no-cache',signal:c.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(tm)}}
const okFx=d=>!!d&&/^\d+(\.\d{1,4})?$/.test(String(d.rate))&&+d.rate>300&&+d.rate<5000&&/^\d{4}-\d{2}-\d{2}$/.test(d.rate_date||'');
const okUs=d=>!!d&&d.items&&typeof d.items==='object';
const S={fx:null,fxStatus:'loading',us:null,usStatus:'loading',kr:null,usm:null,usSet:null,prices:null,open:false};
let fxP=null,usP=null;
function loadFx(){return fxP||(fxP=getJSON('data/usd-krw.json').then(d=>{if(!okFx(d))throw Error('format');const v=Object.assign({},d,{saved_at:new Date().toISOString()});try{localStorage.setItem(FXC,JSON.stringify(v))}catch(_){}S.fx=v;S.fxStatus='ok'}).catch(()=>{try{const c=JSON.parse(localStorage.getItem(FXC));if(okFx(c)){S.fx=c;S.fxStatus='cached';return}}catch(_){}S.fx=null;S.fxStatus='none'}))}
function loadUs(){return usP||(usP=getJSON('data/us-stock-prices.json',15000).then(d=>{if(!okUs(d))throw Error('format');try{localStorage.setItem(USC,JSON.stringify(d))}catch(_){}S.us=d;S.usStatus='ok'}).catch(()=>{try{const c=JSON.parse(localStorage.getItem(USC));if(okUs(c)){S.us=c;S.usStatus='cached';return}}catch(_){}S.us=null;S.usStatus='none'}))}
/* 미국주식 현재가(달러) × 현재 적용 환율 → 원화 평가용 가격 항목 추가. 환율 없으면 추가하지 않음(가격 미확인으로 제외 표시). */
/* t282u: 전 종목 모드 파일(항목에 날짜 없음 → 문서의 trade_date_stock/trade_date_etf 사용, 이름은 코드) 지원. 날짜를 확인할 수 없는 항목은 넣지 않음(임의 날짜 금지). */
const usDate=v=>v&&(v.trade_date||(v.etf?S.us.trade_date_etf:S.us.trade_date_stock)||S.us.trade_date)||'';
async function inject(prices){await Promise.all([loadFx(),loadUs()]);S.prices=prices;if(!prices||!Array.isArray(prices.items)||!S.us||!S.fx)return;const rate=String(S.fx.rate),have=new Set(prices.items.map(p=>p.code));
 for(const [code,v] of Object.entries(S.us.items)){const td=usDate(v);if(!v||!/^\d+(\.\d{1,4})?$/.test(String(v.price))||!(+v.price>0)||!/^\d{4}-\d{2}-\d{2}$/.test(td))continue;if(have.has(code))continue;
  prices.items.push({code,name:v.name||code,price:L.D.of(String(v.price)).mul(rate).str(8),trade_date:td,market_status:'closed',price_type:'close',source:'NASDAQ_PUBLIC_DELAYED',currency:'USD',price_usd:String(v.price),fx_rate:rate,general_stock:true})}}
function usPrice(code){const v=S.us&&S.us.items[code];return v&&+v.price>0&&usDate(v)?Object.assign({},v,{trade_date:usDate(v)}):null}
/* t282u: 표시용 분류 힌트(가격 파일의 etf/div) — 원장 불변 */
function usInfo(code){const v=S.us&&S.us.items&&S.us.items[code];return v&&+v.price>0?{name:v.name||'',etf:!!v.etf,div:!!v.div}:null}
/* ---------- 종목 검색 DB ---------- */
let mP=null;function loadMaster(){return mP||(mP=Promise.all([getJSON('data/stock-master-kr.json',20000).catch(()=>null),getJSON('data/stock-master-us.json',20000).catch(()=>null)]).then(([k,u])=>{S.kr=k||S.kr;S.usm=u||S.usm;S.usSet=new Set(((S.usm&&S.usm.items)||[]).map(x=>x[0]));if(!k||!u)mP=null/* t282u: 실패 시 다음 검색에서 재시도 */}))}
const norm=s=>String(s||'').toLowerCase().replace(/[\s.,·()\-]/g,'');
function search(q,mkt){q=String(q||'').trim();if(!q)return [];const n=norm(q),U=q.toUpperCase();const db=mkt==='us'?S.usm:S.kr;if(!db)return [];const out=[];
 for(const it of db.items){const [c,nm,ex,ko]=it;let s=-1;if(c===U)s=0;else if(c.startsWith(U))s=1;else if(mkt!=='us'&&norm(nm)===n)s=0;else if(norm(nm).startsWith(n))s=2;else if(ko&&norm(ko).includes(n))s=2;else if(norm(nm).includes(n))s=3;else if(c.includes(U))s=4;if(s>=0)out.push([s,it])}
 out.sort((a,b)=>a[0]-b[0]||a[1][0].length-b[1][0].length||(a[1][0]<b[1][0]?-1:1));return out.slice(0,20).map(x=>x[1])}
const srcLine=mkt=>{const d=mkt==='us'?S.usm:S.kr;return d?(mkt==='us'?'NASDAQ·NYSE 공개목록':'KRX 상장목록')+' · '+esc(d.updated_at_kst)+' 갱신':'종목 DB 불러오는 중'};
/* ---------- 거래 입력 연결 ---------- */
const isUsKind=f=>(f.dataset.tv2Kind||'').startsWith('os');
function recExtra(f){if(!f||f.dataset.sfxUsd!=='1')return {};return {currency:'USD',price_usd:f.dataset.sfxPu,fx_rate:f.dataset.sfxFx}}
function form(d,f,editing){if(!f||!d.classList.contains('tv2'))return;const q=s=>f.querySelector(s),mk=h=>{const t=document.createElement('div');t.innerHTML=h;return t.firstElementChild};
 const p1=q('.tv2-p1'),oldSearch=q('.tv2-search'),manual=q('.tv2-manual'),info=q('.tv2-grid'),priceCell=q('.tv2-c-price'),ref=q('.tv2-ref');if(!p1||!info)return;
 const legacyEdit=!!editing&&!editing.currency;/* 기존 원화 입력 해외 거래는 그대로(원화) 수정 */
 const row=mk('<div class="tv2-row sfx-row" hidden><span class="tv2-lab">종목 검색</span><div class="tv2-ctl"><input name="sfx_q" class="sfx-q" autocomplete="off" inputmode="search" aria-label="종목 DB 검색"><ul class="ticker-results sfx-res" role="listbox" hidden></ul><p class="tv2-hint sfx-src"></p></div></div>');
 (oldSearch||manual).before(row);const inp=row.querySelector('input'),res=row.querySelector('ul'),src=row.querySelector('.sfx-src');
 const usd=mk('<div class="sfx-usd" hidden><div class="sfx-g"><label class="sfx-c"><span class="sfx-pl">1주당 가격(USD)</span><input name="sfx_pu" inputmode="decimal" placeholder="$ 0.00" autocomplete="off"></label><label class="sfx-c"><span class="sfx-fl">거래 당시 환율(원/USD)</span><input name="sfx_fx" inputmode="decimal" placeholder="예: 1,350.50" autocomplete="off"></label></div><p class="sfx-calc" aria-live="polite">—</p><p class="sfx-ref" hidden><span></span> <button type="button" class="sfx-apply">적용</button></p></div>');
 info.after(usd);const pu=usd.querySelector('[name=sfx_pu]'),fx=usd.querySelector('[name=sfx_fx]'),calc=usd.querySelector('.sfx-calc'),refP=usd.querySelector('.sfx-ref');
 if(editing&&editing.currency==='USD'){pu.value=editing.price_usd;fx.value=editing.fx_rate}
 const holdOnly=()=>['sell','add_buy','reinvest'].includes(f.type.value);
 const clean=v=>String(v||'').trim().replace(/[,\s$₩원]/g,'');
 function compute(){const a=clean(pu.value),b=clean(fx.value);f.dataset.sfxPu=a;f.dataset.sfxFx=b;const okA=/^\d+(\.\d{1,4})?$/.test(a)&&+a>0,okB=/^\d+(\.\d{1,4})?$/.test(b)&&+b>=300&&+b<=5000;
  if(okA&&okB){const krw=L.D.of(a).mul(b);f.price.value=krw.str(12);const qn=clean(f.quantity.value);let t='1주 ₩'+num(krw.str(2));if(/^\d+(\.\d{1,12})?$/.test(qn)&&+qn>0){const Q=L.D.of(qn);t+=' · 거래액 $'+num(Q.mul(a).str(4),4)+' = ₩'+num(Q.mul(a).mul(b).str(0),0)}calc.textContent=t;calc.dataset.krw=krw.str(12)}else{f.price.value='';calc.textContent=okA||!a?(b?'환율은 300~5,000 사이 숫자로 입력':'—'):'달러가는 0보다 큰 숫자(소수 4자리)';delete calc.dataset.krw}
  f.price.dispatchEvent(new Event('input',{bubbles:true}))}
 function refresh(){const k=f.dataset.tv2Kind||'',us=isUsKind(f)&&!legacyEdit,buy=!holdOnly();
  row.hidden=!!editing||!buy||!(k==='kr_gen'||k.startsWith('os'));if(!row.hidden){const m=k.startsWith('os')?'us':'kr';row.dataset.mkt=m;inp.placeholder=m==='us'?'티커·영문명·한글 (예: AAPL, 애플)':'종목명·코드 (예: 삼성전자, 005930)';src.innerHTML=srcLine(m);if(oldSearch)oldSearch.hidden=true;loadMaster().then(()=>{src.innerHTML=srcLine(row.dataset.mkt)})}
  else if(oldSearch&&!editing){/* 매도·추가매수: 보유종목 검색(기존) 사용 */oldSearch.hidden=!(k==='kr_div'||k==='kr_gen'||holdOnly())}
  usd.hidden=!us;if(priceCell)priceCell.hidden=us;if(ref)ref.hidden=us;f.dataset.sfxUsd=us?'1':'';f.price.required=!us;
  usd.querySelector('.sfx-fl').textContent=(f.type.value==='sell'?'매도':f.type.value==='opening_balance'?'매수':'거래')+' 당시 환율(원/USD)';usd.querySelector('.sfx-pl').textContent=(f.type.value==='sell'?'1주당 매도가':'1주당 매수가')+'(USD)';
  const r=usPrice(f.code.value);refP.hidden=!(us&&r);if(r){refP.querySelector('span').textContent='현재가 $'+num(r.price,4)+' · '+r.trade_date.slice(5);refP.dataset.v=r.price}
  if(us)compute()}
 function draw(){const m=row.dataset.mkt,hits=search(inp.value,m);if(!inp.value.trim()){res.hidden=true;return}res.innerHTML=hits.length?hits.map(it=>'<li role="option" data-c="'+esc(it[0])+'" data-n="'+esc(it[1])+'"><b>'+esc(m==='us'?it[0]:it[1])+'</b><small>'+esc(m==='us'?it[1]+(it[3]?' · '+it[3]:''):it[0])+' · '+esc(it[2])+'</small></li>').join(''):'<li class="uat-empty">결과 없음 · 아래 직접 입력</li>';res.hidden=false}
 inp.addEventListener('input',()=>{loadMaster().then(draw)});inp.addEventListener('focus',()=>loadMaster());
 res.addEventListener('click',e=>{const li=e.target.closest('li[data-c]');if(!li)return;e.preventDefault();e.stopPropagation();f.tv2_code.value=li.dataset.c;f.tv2_name.value=li.dataset.n;const ok=q('.tv2-man-ok');if(ok)ok.click();inp.value='';res.hidden=true;row.querySelector('.sfx-src').innerHTML=srcLine(row.dataset.mkt);setTimeout(refresh,0)});
 refP.querySelector('.sfx-apply').onclick=()=>{if(refP.dataset.v){pu.value=refP.dataset.v;compute()}};
 [pu,fx,f.quantity].forEach(x=>x.addEventListener('input',()=>{if(f.dataset.sfxUsd==='1'&&x!==f.price)compute()}));
 d.addEventListener('click',e=>{if(e.target.closest('[data-tv2-kind],[data-type-btn],[data-tv2-mode]'))setTimeout(refresh,0)});
 ['change'].forEach(ev=>{f.type.addEventListener(ev,()=>setTimeout(refresh,0));f.code.addEventListener(ev,()=>setTimeout(refresh,0))});
 /* 저장 직전(기존 저장 로직보다 먼저) USD 입력 검증 → trade_price(원)=달러가×거래 당시 환율 */
 d.addEventListener('submit',e=>{if(e.target!==f||f.dataset.sfxUsd!=='1')return;compute();if(!calc.dataset.krw){e.preventDefault();e.stopImmediatePropagation();const er=f.querySelector('.form-error');if(er)er.textContent='USD 거래: 1주당 달러가와 '+(f.type.value==='sell'?'매도':'거래')+' 당시 환율(원/USD)을 입력해 주세요.'}},true);
 refresh()}
/* ---------- 총계좌 화면 USD/KRW 칩 ---------- */
function chip(){const f=S.fx,st=S.fxStatus;const lab=f?num(f.rate,2):'미확인';
 const usH=(window.StockFXHold&&window.StockFXHold())||[];
 const rows=usH.map(h=>{const p=usPrice(h.code);if(!p)return '<li><span>'+esc(h.code)+'</span><span>'+esc(h.q)+'주</span><span>가격 미확인</span></li>';const v=L.D.of(h.q).mul(p.price);return '<li data-us="'+esc(h.code)+'"><span>'+esc(h.code)+'</span><span>$'+num(p.price,4)+'</span><span>$'+num(v.str(2))+(f?' · ₩'+num(v.mul(String(f.rate)).str(0),0):'')+'</span></li>'}).join('');
 return '<div class="sfx-fxw"><button type="button" class="sfx-chip sfx-'+st+'" data-sfx-chip aria-expanded="'+S.open+'" data-rate="'+(f?esc(f.rate):'')+'" data-status="'+st+'">USD/KRW <b>'+lab+'</b></button>'
 +'<div class="sfx-pop"'+(S.open?'':' hidden')+'><p class="sfx-r">적용 환율 <b>'+(f?num(f.rate,2)+'원':'미확인')+'</b></p>'
 +(f?'<p>기준일 '+esc(f.rate_date)+' · '+esc(f.source)+'</p><p>'+(st==='cached'?'최근 확보 ':'갱신 ')+esc(f.fetched_at_kst)+' KST</p>':'')
 +(st==='cached'?'<p class="sfx-warn">최신 조회 실패 · 최근 확보값 사용</p>':st==='none'?'<p class="sfx-warn">환율 미확인 · 미국주식 원화 평가 제외</p>':'')
 +(rows?'<ul class="sfx-us">'+rows+'</ul>':'')+'<p class="sfx-note">현재 평가에만 적용 · 거래 당시 환율 불변</p></div></div>'}
function decorate(){const t=document.querySelector('.av2-total');if(t&&!t.querySelector('.sfx-fxw')){const sub=t.querySelector('.av2-sub');(sub||t.querySelector('.av2-amt')).insertAdjacentHTML('afterend',chip())}
 if(window.StockFXTx)for(const b of document.querySelectorAll('.lv2-tx .lv2-edit[data-edit]:not([data-sfx])')){b.dataset.sfx='1';const x=window.StockFXTx(b.dataset.edit);if(x&&x.currency==='USD'){const a=b.closest('.lv2-tx');a.insertAdjacentHTML('beforeend','<p class="sfx-txfx">$'+esc(num(x.price_usd,4))+' × '+(x.type==='sell'?'매도':'매수')+' 당시 환율 '+esc(num(x.fx_rate,4))+'원</p>')}}
 for(const s of document.querySelectorAll('.av2-acct li small:not([data-sfx])')){s.dataset.sfx='1';const c=(s.textContent.split(' · ')[0]||'').trim(),p=usPrice(c);if(p&&!/^\d/.test(c))s.insertAdjacentHTML('beforeend',' · $'+esc(num(p.price,4)))}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-sfx-chip]');if(!b)return;S.open=!S.open;b.setAttribute('aria-expanded',String(S.open));const p=b.parentElement.querySelector('.sfx-pop');if(p)p.hidden=!S.open});
const app=document.getElementById('app');if(app)new MutationObserver(()=>decorate()).observe(app,{childList:true,subtree:true});
window.StockFX={inject,form,recExtra,search,loadMaster,loadFx,state:S,decorate,usInfo,usPrice};
})();
