/* v2 미래날씨 화면 전용 모듈 (t275). 기존 weather-engine.js 산식은 변경하지 않음.
   시안 기준: 맑은 날 주가100%·분배율100% / 구름 낀 날 주가 매년 97% 경로·분배율100% /
   비 오는 날 최초 6개월 하락(주가 최저 70%·분배율 88%) → 24개월 동안 구름 낀 날 경로로 회복 → 10년마다 재발.
   주당 배당 = 그 시점 주가 × 현재 분배율 × 적용 분배율. 배당 전액 재투자. 가상 예시이며 예측이 아님. */
(function(root){'use strict';
const YEARS=[5,10,15,20],DROP=6,REC=24,CYCLE=120,BOTTOM=.70,RCUT=.88,CLOUD=.97;
const cloud=m=>Math.pow(CLOUD,m/12);
function path(sc,m){ // m = 경과 월(0..). price: 출발가 대비, rate: 현재 분배율 대비
  if(sc==='sun')return{price:1,rate:1,phase:'base'};
  if(sc==='cloud')return{price:cloud(m),rate:1,phase:'base'};
  if(sc!=='rain')throw new RangeError('scenario');
  const s=Math.floor(m/CYCLE)*CYCLE,k=m-s,p0=cloud(s),low=p0*BOTTOM;
  if(k<=DROP){const t=k/DROP;return{price:p0+(low-p0)*t,rate:1+(RCUT-1)*t,phase:k===0?'base':'drop'}}
  if(k<=DROP+REC){const t=(k-DROP)/REC;return{price:low+(cloud(m)-low)*t,rate:RCUT+(1-RCUT)*t,phase:'recover'}}
  return{price:cloud(m),rate:1,phase:'base'}}
function simulate(holds,sc,years){ // holds: [{value, yield}] value=현재 평가액(원), yield=현재 연 분배율(소수)
  if(!YEARS.includes(years))throw new RangeError('years');
  const n=years*12,st=holds.map(h=>({q:h.value,y:h.yield})); // q: 출발가=1 기준 좌수(=원)
  const start=st.reduce((a,h)=>a+h.q,0),startDiv=st.reduce((a,h)=>a+h.q*h.y/12,0),rows=[{m:0,value:start,div:startDiv,phase:'base',price:1,rate:1}];
  for(let m=1;m<=n;m++){const p=path(sc,m);let v=0,d=0;
    for(const h of st){const dps=p.price*h.y*p.rate/12;h.q+=h.q*dps/p.price;v+=h.q*p.price;d+=h.q*p.price*h.y*p.rate/12}
    rows.push({m,value:v,div:d,phase:p.phase,price:p.price,rate:p.rate})}
  const e=rows[n];return{scenario:sc,years,start,startDiv,end:e.value,endDiv:e.div,tr:e.value-start,trPct:start>0?(e.value-start)/start:null,rows}}
const api=Object.freeze({YEARS,DROP,REC,CYCLE,BOTTOM,RCUT,CLOUD,path,simulate});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WeatherV2=api;
})(typeof globalThis!=='undefined'?globalThis:this);
