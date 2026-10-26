/* t144 UAT: 차트 색 표식·저장 버튼 바탕을 canvas로 덧그림.
   근거: Samsung Internet 야간/다크 모드는 SVG 칠(휘도 0.30 고정)과 CSS 배경(0.03~0.12)을 어둡게 바꾸지만
   canvas·video는 색 필터 대상이 아님(ctrl.blog, Samsung Internet v11 소스 분석). 최신 버전 실기기 확인 필요.
   색 값은 기존 계산 그대로(getComputedStyle / data-color)를 읽어 같은 HEX로 칠함. 계산·원장·레이아웃 불변. */
(function(){
  'use strict';
  if(window.UatPaint)return;
  var SEL=['.fd-bar .stack i','.dot','.uat-top5 .sw','.mu-comp-list li i','.mu-comp-list li .dot','.fd-ico','.fd-prog i','.mu-save'];
  var DPR=function(){return Math.max(1,Math.min(3,window.devicePixelRatio||1))};
  var busy=false,queued=false,mo=null;
  function rgbOk(c){return c&&c!=='transparent'&&!/rgba\([^)]*,\s*0\)$/.test(c)}
  function paintEl(el){
    var cs=getComputedStyle(el),r=el.getBoundingClientRect(),bg=cs.backgroundColor;
    var cv=el.querySelector(':scope > canvas.uat-pc');
    if(!r.width||!r.height||!rgbOk(bg)){if(cv)cv.remove();return}
    var d=DPR(),w=Math.round(r.width*d),h=Math.round(r.height*d),key=bg+'|'+w+'x'+h;
    if(cv&&el.dataset.uatpc===key)return;
    if(cs.position==='static')el.style.position='relative';
    if(cs.isolation!=='isolate')el.style.isolation='isolate';
    if(!cv){cv=document.createElement('canvas');cv.className='uat-pc';cv.setAttribute('aria-hidden','true');el.insertBefore(cv,el.firstChild)}
    cv.width=w;cv.height=h;var x=cv.getContext('2d');x.clearRect(0,0,w,h);x.fillStyle=bg;x.fillRect(0,0,w,h);
    el.dataset.uatpc=key;
  }
  function paintDonut(svg){
    var host=svg.parentElement;if(!host)return;
    var r=svg.getBoundingClientRect();if(!r.width)return;
    var d=DPR(),cs=[].slice.call(svg.querySelectorAll('circle[data-seg]'));
    var key=cs.map(function(c){return (c.dataset.color||'')+c.getAttribute('stroke-dasharray')+c.getAttribute('stroke-dashoffset')}).join(';')+'|'+Math.round(r.width*d)+'x'+Math.round(r.height*d);
    var cv=svg.nextElementSibling&&svg.nextElementSibling.classList.contains('uat-pc-donut')?svg.nextElementSibling:null;
    if(cv&&cv.dataset.key===key)return;
    if(getComputedStyle(host).position==='static')host.style.position='relative';
    if(!cv){cv=document.createElement('canvas');cv.className='uat-pc uat-pc-donut';cv.setAttribute('aria-hidden','true');svg.insertAdjacentElement('afterend',cv)}
    var hr=host.getBoundingClientRect();
    cv.style.left=(r.left-hr.left+host.scrollLeft)+'px';cv.style.top=(r.top-hr.top+host.scrollTop)+'px';cv.style.width=r.width+'px';cv.style.height=r.height+'px';
    cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);
    var x=cv.getContext('2d');x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cv.width,cv.height);
    cs.forEach(function(c){
      var col=c.dataset.color||getComputedStyle(c).stroke,R=+c.getAttribute('r'),cx=+c.getAttribute('cx'),cy=+c.getAttribute('cy');
      var C=2*Math.PI*R,da=(c.getAttribute('stroke-dasharray')||'').split(/[ ,]+/).map(Number),len=da[0]||0,off=-Number(c.getAttribute('stroke-dashoffset')||0);
      var sw=parseFloat(getComputedStyle(c).strokeWidth)||+c.getAttribute('stroke-width')||10;
      var M=c.getScreenCTM();if(!M||!len)return;
      x.setTransform(d*M.a,d*M.b,d*M.c,d*M.d,d*(M.e-r.left),d*(M.f-r.top));
      x.beginPath();x.arc(cx,cy,R,off/C*2*Math.PI,(off+len)/C*2*Math.PI,false);x.lineWidth=sw;x.strokeStyle=col;x.lineCap='butt';x.stroke();
    });
    cv.dataset.key=key;svg.classList.add('uat-pc-on');
  }
  function run(){
    queued=false;if(busy)return;busy=true;if(mo)mo.disconnect();
    try{
      document.querySelectorAll('svg.mu-donut').forEach(paintDonut);
      document.querySelectorAll(SEL.join(',')).forEach(function(el){if(!el.closest('.uat-pc'))paintEl(el)});
    }catch(e){if(window.console)console.warn('UatPaint',e)}
    busy=false;observe();
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(run)}}
  function observe(){if(!mo)mo=new MutationObserver(schedule);mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','data-color','aria-pressed','hidden']})}
  window.UatPaint={run:run};
  function start(){run();addEventListener('resize',schedule);addEventListener('orientationchange',schedule);addEventListener('pageshow',schedule)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
