/* t242·t243: 상단 '← 놀이터로 돌아가기'·'종목 검색' 바(pv-bar) 생성 제거(하단 4탭·우측 연구소 대문으로 대체). 놀이터 후보 사본 전용: 194-test 최신 승인 상세화면(account-uat 최종본 표시 모듈) 재사용.
   데이터는 194-test 공개 data/ 를 읽기 전용으로 참조(메인 승인본, auto-test 미사용). 저장·원장 무관. */
(function(g){'use strict';if(g.__pvShim)return;g.__pvShim=1;var SRC=new URL('../../',g.location.href).href,P=['data/','inputs/','references/'],base=new URL('./',g.location.href);
function fix(u){try{var x=new URL(u,g.location.href);if(x.origin!==g.location.origin)return null;var p=x.pathname;if(p.indexOf(base.pathname)!==0)return null;var rest=p.slice(base.pathname.length);for(var k=0;k<P.length;k++)if(rest.indexOf(P[k])===0)return SRC+rest+x.search}catch(e){}return null}
var F=g.fetch;if(F)g.fetch=function(a,b){var s=(typeof Request!=='undefined'&&a instanceof Request)?a.url:String(a),f=fix(s);if(f)a=f;return F.call(this,a,b)};
var LOCAL={'detail.html':1,'index.html':0};
g.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;if(a.closest('.pg-bottom,.portal-return-bar'))return;var h=a.getAttribute('href');if(!h||/^(#|https?:|mailto:)/.test(h))return;var u=new URL(h,g.location.href);if(u.origin!==g.location.origin)return;var f=u.pathname.split('/').pop();if(f==='detail.html')return;if(f==='analysis-search.html'||f==='analysis.html'){e.preventDefault();g.location.href='./';return}e.preventDefault();g.location.href=SRC+f+u.search},true);
})(self);
