/* t146 final-darkimmune: 삼성 인터넷 강제 다크 대응. 계산된 원래 색을 그대로 고정(색 값 변경 없음).
   배경색 -> 동일색 linear-gradient(이미지로 취급되어 반전 제외), 글자색 -> -webkit-text-fill-color 고정 */
(function(){
  var T=0,SEL='body,body *:not(script):not(style):not(canvas):not(svg *):not(img)';
  function fix(el){
    if(el.dataset&&el.dataset.dimx)return;
    var cs=getComputedStyle(el),bg=cs.backgroundColor,bi=cs.backgroundImage;
    if(bg&&bg!=='transparent'&&!/rgba\(0, 0, 0, 0\)/.test(bg)&&(bi==='none'||!bi)){
      el.style.setProperty('background-image','linear-gradient('+bg+','+bg+')','important');
    }
    var c=cs.color; if(c)el.style.setProperty('-webkit-text-fill-color',c);
    if(el.dataset)el.dataset.dimx='1';
  }
  function run(){T=0;try{document.querySelectorAll(SEL).forEach(fix)}catch(e){}}
  function sch(){if(!T)T=setTimeout(run,120)}
  function reset(m){m.forEach(function(r){if(r.type==='attributes'&&r.target.dataset&&r.attributeName!=='style'&&r.attributeName!=='data-dimx'){delete r.target.dataset.dimx;r.target.style.removeProperty('background-image');r.target.style.removeProperty('-webkit-text-fill-color')}});sch()}
  function go(){run();new MutationObserver(reset).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-selected','aria-pressed','data-active']})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();
