/* v2 미래날씨 화면 전용 모듈 (t275u 대표 승인 가정). 기존 weather-engine.js 산식은 변경하지 않음.
   맑은 날: 주가 매년 -3%, 분배율 매년 -1.5% / 구름 낀 날: 주가 매년 -5%, 분배율 매년 -2.5%
   연 하락률은 월복리 등가로 적용: 월 계수 = (1-연하락률)^(1/12) → 12개월 후 정확히 (1-연하락률).
   비 오는 날: 각 60개월 주기 시작점(그 시점 구름 경로)에서 최초 6개월 주가 매월 -5%·분배율 매월 -2.5%(직전 값 복리)
   → 이후 24개월 동안 구름 경로까지 기하(로그선형) 보간 회복 → 주기 끝까지 구름 경로 → 5년마다 같은 충격 반복.
   주당 분배금 = 그 시점 주가 × 현재 분배율 × 분배율 계수 (두 효과 모두 반영).
   전액 재투자: 분배금으로 같은 ETF를 그 달 가격에 매수. 전액 인출: 수량 고정, 분배금은 누적 인출(계좌 잔고·수익 없음).
   인출형 총가치 = 보유자산 + 누적 인출분배금(비교용). 가상 예시이며 예측이 아님. */
(function(root){'use strict';
const YEARS=[5,10,15,20],DROP=6,REC=24,CYCLE=60,SHOCK_P=.95,SHOCK_R=.975;
const ANN={sun:[.97,.985],cloud:[.95,.975]};
const base=(sc,m)=>({price:Math.pow(ANN[sc][0],m/12),rate:Math.pow(ANN[sc][1],m/12)});
function path(sc,m){ // m = 경과 월. price: 출발가 대비, rate: 현재 분배율 대비
  if(sc==='sun'||sc==='cloud')return Object.assign(base(sc,m),{phase:'base'});
  if(sc!=='rain')throw new RangeError('scenario');
  const s=Math.floor(m/CYCLE)*CYCLE,k=m-s,c=base('cloud',m),c0=base('cloud',s);
  if(k===0)return Object.assign(c,{phase:'base'});
  if(k<=DROP)return{price:c0.price*Math.pow(SHOCK_P,k),rate:c0.rate*Math.pow(SHOCK_R,k),phase:'drop'};
  if(k<DROP+REC){const c6=base('cloud',s+DROP),gp=c0.price*Math.pow(SHOCK_P,DROP)/c6.price,gr=c0.rate*Math.pow(SHOCK_R,DROP)/c6.rate,f=(DROP+REC-k)/REC;
    return{price:c.price*Math.pow(gp,f),rate:c.rate*Math.pow(gr,f),phase:'recover'}}
  return Object.assign(c,{phase:'base'})}
function simulate(holds,sc,years){ // holds: [{value, yield}] value=현재 평가액(원), yield=현재 연 분배율(소수)
  if(!YEARS.includes(years))throw new RangeError('years');
  const n=years*12,st=holds.map(h=>({qr:h.value,qw:h.value,y:h.yield})); // 출발가=1 기준 좌수(=원). qr 재투자형, qw 인출형
  const start=st.reduce((a,h)=>a+h.qr,0),startDiv=st.reduce((a,h)=>a+h.qr*h.y/12,0);let cum=0;
  const rows=[{m:0,value:start,div:startDiv,wValue:start,wDiv:startDiv,cum:0,wTotal:start,phase:'base',price:1,rate:1}];
  for(let m=1;m<=n;m++){const p=path(sc,m);let v=0,d=0,wv=0,wd=0;
    for(const h of st){const dps=p.price*h.y*p.rate/12; // 원 단위 주당(출발가=1) 월 분배금
      const dr=h.qr*dps;h.qr+=dr/p.price;d+=dr;v+=h.qr*p.price;
      const dw=h.qw*dps;cum+=dw;wd+=dw;wv+=h.qw*p.price}
    rows.push({m,value:v,div:d,wValue:wv,wDiv:wd,cum,wTotal:wv+cum,phase:p.phase,price:p.price,rate:p.rate})}
  const e=rows[n];return{scenario:sc,years,start,startDiv,end:e.value,endDiv:e.div,wEnd:e.wValue,wEndDiv:e.wDiv,cum:e.cum,wTotal:e.wTotal,diff:e.value-e.wTotal,tr:e.value-start,trPct:start>0?(e.value-start)/start:null,rows}}
const api=Object.freeze({YEARS,DROP,REC,CYCLE,SHOCK_P,SHOCK_R,ANN,path,simulate});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WeatherV2=api;
})(typeof globalThis!=='undefined'?globalThis:this);

;typeof window!=='undefined'&&window.addEventListener('pageshow',function(e){if(e.persisted&&/[?&]mode=weather/.test(location.search))location.reload()});
