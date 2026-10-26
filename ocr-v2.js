/* v2 02 OCR 추천 입력(t275). 무료 브라우저 내 OCR(tesseract.js, jsDelivr CDN에서 사용자가 버튼을 누를 때만 로드; 이미지는 서버로 전송되지 않음).
   인식값은 '추천'일 뿐이며 사용자가 확인·수정 후 [양식에 채우기]를 눌러야 window.TradeFormV2.fill 로 입력됨. 저장은 기존 [저장] 버튼으로 사용자가 직접. 02 화면 구조·검증·저장 로직 변경 없음. */
(function(root){'use strict';
const CDN='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
const num=s=>{const v=Number(String(s).replace(/[,\s원주]/g,''));return isFinite(v)?v:null};
function parse(text,known){const t=String(text||'').replace(/\r/g,''),o={};
  let m=t.match(/(20\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/);if(m){const mm=+m[2],dd=+m[3];if(mm>=1&&mm<=12&&dd>=1&&dd<=31)o.date=m[1]+'-'+String(mm).padStart(2,'0')+'-'+String(dd).padStart(2,'0')}
  m=t.match(/(?:체결\s*수량|수량|체결량)\s*[:：]?\s*([\d,]+(?:\.\d+)?)/)||t.match(/([\d,]+(?:\.\d+)?)\s*주(?![가식])/);if(m)o.quantity=num(m[1]);
  m=t.match(/(?:체결\s*(?:단가|가격)|단가|체결가|매수가|매도가|평균\s*단가|평단가?)\s*[:：]?\s*([\d,]+(?:\.\d+)?)/);if(m)o.price=num(m[1]);
  const codes=t.match(/\b[0-9][0-9A-Z]{5}\b/g)||[];for(const c of codes){if(/^20\d{4}$/.test(c)&&o.date&&o.date.replace(/-/g,'').startsWith(c))continue;if(!known||known(c)){o.code=c;break}}
  if(m=t.match(/(매수|매도)(?![가금단])/))o.side=m[1];return o}
function load(){return root.Tesseract?Promise.resolve(root.Tesseract):new Promise((ok,no)=>{const s=document.createElement('script');s.src=CDN;s.onload=()=>ok(root.Tesseract);s.onerror=()=>no(new Error('OCR 엔진을 불러오지 못했습니다(네트워크 확인).'));document.head.appendChild(s)})}
async function recognize(file,onp){const T=await load();const r=await T.recognize(file,'kor+eng',{logger:x=>onp&&x.progress!=null&&onp(x.status,x.progress)});return r.data.text}
function ui(){const F=root.TradeFormV2;if(!F||!F.form||F.form.querySelector('.ocr-v2'))return;const f=F.form,box=document.createElement('div');box.className='ocr-v2';
 box.innerHTML='<label class="ocr-pick"><input type="file" accept="image/*" hidden> 📷 체결내역 사진으로 추천 입력 <small>(무료·기기 안에서 인식·선택사항)</small></label><p class="ocr-st" aria-live="polite"></p><div class="ocr-sg" hidden></div>';
 f.insertBefore(box,f.firstChild);const st=box.querySelector('.ocr-st'),sg=box.querySelector('.ocr-sg'),inp=box.querySelector('input');
 const known=c=>{try{return !!(f.code&&[...f.code.options].some(o=>o.value===c))||(typeof root.name==='function'&&root.name(c)!==c)}catch(_){return false}};
 inp.addEventListener('change',async()=>{const file=inp.files&&inp.files[0];if(!file)return;sg.hidden=true;st.textContent='인식 준비 중…';
  try{const text=await recognize(file,(s,p)=>{st.textContent='인식 중 '+Math.round(p*100)+'%'});const v=parse(text,known);show(v)}catch(e){st.textContent=e.message||'인식 실패'}inp.value=''});
 function show(v){const row=(k,l,ty)=>'<label>'+l+'<input data-ocr="'+k+'" type="'+ty+'" value="'+(v[k]!=null?String(v[k]).replace(/"/g,''):'')+'"'+(ty==='number'?' step="any"':'')+'></label>';
  const n=['date','quantity','price','code'].filter(k=>v[k]!=null).length;st.textContent=n?'추천값 '+n+'개를 찾았습니다. 확인·수정 후 채우세요. (자동 저장 안 함)':'인식된 값이 없습니다. 직접 입력해 주세요.';
  sg.innerHTML=row('date','거래일','date')+row('quantity','수량','number')+row('price','1주당 가격(원)','number')+row('code','종목코드','text')+(v.side?'<p class="ocr-side">사진 속 구분: '+v.side+' (거래 유형은 직접 선택)</p>':'')+'<div class="ocr-btns"><button type="button" class="lab-btn ocr-ok">양식에 채우기</button><button type="button" class="lab-btn ocr-no">닫기</button></div>';sg.hidden=false}
 sg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.classList.contains('ocr-no')){sg.hidden=true;st.textContent='';return}
  const g=k=>{const x=sg.querySelector('[data-ocr="'+k+'"]').value.trim();return x===''?null:x},v={date:g('date'),quantity:g('quantity'),price:g('price')},c=g('code');
  if(c&&f.code&&[...f.code.options].some(o=>o.value===c)){f.code.value=c;f.code.dispatchEvent(new Event('change',{bubbles:true}))}else if(c){v.code=c}
  root.TradeFormV2.fill(v);sg.hidden=true;st.textContent='추천값을 양식에 채웠습니다. 내용을 확인한 뒤 저장해 주세요.'})}
const api={parse,recognize,ui,CDN};root.OcrV2=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof document!=='undefined'){const mo=new MutationObserver(()=>{if(root.TradeFormV2&&root.TradeFormV2.form&&document.contains(root.TradeFormV2.form))ui()});mo.observe(document.documentElement,{childList:true,subtree:true})}
})(typeof globalThis!=='undefined'?globalThis:this);
