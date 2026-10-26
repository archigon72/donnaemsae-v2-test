/* t138 UAT 전용: 계좌 표시 라벨(표시 전용, 저장값 불변) + 모바일 시트 가시영역 보정 */
(function(){
var TYPES=['연금저축','일반','ISA','IRP'];
function rx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
/* 규칙: 저장된 계좌명은 그대로 두고 화면에서만 '계좌명(계좌종류)'.
   이름 안에 종류 토큰이 독립 단어/괄호로 들어 있으면(예: '카카오 ISA','[ISA]카카오','키움IRP') 그 토큰만 표시에서 빼고 (종류)를 붙인다.
   토큰을 빼면 이름이 비면(이름 자체가 'ISA') 이름만 표시. 종류 없음 → '(종류 미확인)'. */
function AL(a){if(!a)return '';var name=String(a.name==null?'':a.name).trim()||'(이름 없음)';var t=a.type?String(a.type):'';
 if(!t)return name+'(종류 미확인)';
 var e=rx(t),base=name;
 base=base.replace(new RegExp('[\\[\\(（]\\s*'+e+'\\s*[\\]\\)）]','gi'),' ');
 base=base.replace(new RegExp('(^|[\\s\\-_/·,])'+e+'(?=$|[\\s\\-_/·,])','gi'),'$1');
 if(base===name&&name.toUpperCase().endsWith(t.toUpperCase())&&name.length>t.length)base=name.slice(0,name.length-t.length);
 base=base.replace(/\s{2,}/g,' ').replace(/^[\s\-_/·,]+|[\s\-_/·,]+$/g,'').trim();
 if(!base)return name;
 return base+'('+t+')'}
window.UatAcctLabel=AL;window.UatAcctTypes=TYPES;
/* 시트 높이를 실제 보이는 영역(visualViewport)에 맞춰 제목·닫기 버튼이 주소창/키보드에 가리지 않게 */
function fit(){var v=window.visualViewport,h=v?v.height:window.innerHeight,top=v?v.offsetTop:0;document.documentElement.style.setProperty('--uat-vvh',Math.round(h)+'px');
 var d=document.getElementById('ledger-dialog');if(!d||!d.open)return;var kb=Math.max(0,window.innerHeight-h-top);d.style.maxHeight=Math.max(240,Math.round(h-8))+'px';d.style.marginBottom=Math.round(kb)+'px';
 var r=d.getBoundingClientRect();if(r.top<top){d.style.maxHeight=Math.max(240,Math.round(h-8-(top-r.top)))+'px'}}
if(window.visualViewport){visualViewport.addEventListener('resize',fit);visualViewport.addEventListener('scroll',fit)}
window.addEventListener('resize',fit);window.addEventListener('orientationchange',fit);
new MutationObserver(function(){fit()}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['open']});
document.addEventListener('focusin',function(e){var d=e.target.closest&&e.target.closest('#ledger-dialog');if(d)setTimeout(function(){fit();d.scrollTop<0&&(d.scrollTop=0)},60)});
window.UatFitSheet=fit;fit();
})();
