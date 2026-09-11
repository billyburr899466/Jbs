import { escapeHtml } from './customer-core.js';
const f = n => Number(n).toFixed(2);
export function deckOutline(d) {
  const {length:L,depth:D,notchLength:N,notchDepth:M}=d;
  return d.shape==='l_shape' ? [[0,0],[L,0],[L,D-M],[L-N,D-M],[L-N,D],[0,D]] : [[0,0],[L,0],[L,D],[0,D]];
}
export function renderDeck(result, view={}) {
  const d=result.input,L=d.length,D=d.depth,H=Math.max(.15,d.height),outline=deckOutline(d);
  const yaw=(view.yaw??-32)*Math.PI/180,el=(view.top?89:view.elevation??28)*Math.PI/180;
  const zoom=Math.max(.7,Math.min(2,view.zoom??1));
  const project=([x,y,z=H])=>{x-=L/2;y-=D/2;const a=x*Math.cos(yaw)-y*Math.sin(yaw),b=x*Math.sin(yaw)+y*Math.cos(yaw);return [a,b*Math.sin(el)-z*Math.cos(el)];};
  const all=[];const polys=[];const lines=[];
  const poly=(points,fill,stroke='#4c372a',extra='')=>{all.push(...points);polys.push({points,fill,stroke,extra});};
  const line=(a,b,stroke,width=1,extra='',under=false)=>{all.push(a,b);lines.push({a,b,stroke,width,extra,under});};
  const colors={'Natural':'#ae8158','Warm brown':'#875b42','Cedar tone':'#bd7950','Driftwood gray':'#919394','Charcoal':'#50565d'};
  const deck=colors[d.color]||'#ad8a68', rail=d.railStyle.includes('White')?'#ebeff3':/Black|Cable/.test(d.railStyle)?'#28313b':'#73513b';
  const skirting=d.extras.includes('skirting');
  for(let i=0;i<outline.length;i++) {
    const a=outline[i],b=outline[(i+1)%outline.length];
    poly([[...a,H],[...b,H],[...b,skirting?0:H-.55],[...a,skirting?0:H-.55]],skirting?'#7b624e':'#77583e');
  }
  if(!skirting&&!view.top) for(const [x,y] of outline) line([x,y,0],[x,y,H],'#645140',5,'',true);
  poly(outline.map(p=>[...p,H]),view.framing?'#e2d7c8':deck);
  const cut=d.shape==='l_shape';
  if(view.framing) {
    const spacing=d.joistSpacing/12;
    for(let x=0;x<=L+.01;x+=spacing)line([x,0,H+.02],[x,cut&&x>L-d.notchLength?D-d.notchDepth:D,H+.02],'#8c6845',2.2);
  } else if(d.boardDirection==='depth') {
    for(let x=.48;x<L;x+=.48)line([x,0,H+.02],[x,cut&&x>L-d.notchLength?D-d.notchDepth:D,H+.02],'#ffffff50',.65);
  } else {
    for(let y=.48;y<D;y+=.48)line([0,y,H+.02],[cut&&y>D-d.notchDepth?L-d.notchLength:L,y,H+.02],'#ffffff50',.65);
  }
  // Match stair openings and landing to the selected edge of the actual footprint.
  const stair=d.stairLocation,sw=d.stairWidth;
  const center=stair==='front'?[(L-d.notchLength)/2,D]:stair==='left'?[0,D/2]:[L,(D-d.notchDepth)/2];
  const outward=stair==='front'?[0,1]:stair==='left'?[-1,0]:[1,0];
  const tangent=stair==='front'?[1,0]:[0,1];
  const sameEdge=(a,b)=>stair==='front'?a[1]===D&&b[1]===D:stair==='left'?a[0]===0&&b[0]===0:a[0]===L&&b[0]===L;
  if(result.stepCount) {
    const count=result.stepCount,run=.85;
    for(let i=count-1;i>=0;i--) {
      const z=H*(1-(i+1)/count),near=(i+.05)*run,far=(i+1)*run;
      const pt=(t,r)=>[center[0]+tangent[0]*t+outward[0]*r,center[1]+tangent[1]*t+outward[1]*r,z];
      poly([pt(-sw/2,near),pt(sw/2,near),pt(sw/2,far),pt(-sw/2,far)],deck);
    }
  }
  function railEdge(a,b) {
    const length=Math.hypot(a[0]-b[0],a[1]-b[1]);if(length<.03)return;
    const h=H+3;
    line([...a,h],[...b,h],rail,3.2);
    line([...a,H+.22],[...b,H+.22],rail,1.5);
    const count=Math.ceil(length/.45);
    if(d.railStyle.includes('Cable')) for(let z=H+.5;z<h;z+=.45)line([...a,z],[...b,z],rail,.65);
    for(let i=0;i<=count;i++) {
      if(d.railStyle.includes('Cable')&&i!==0&&i!==count)continue;
      const t=i/count,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
      line([x,y,H],[x,y,h],rail,i===0||i===count?2.8:1);
    }
  }
  if(d.railing!=='none') for(let i=0;i<outline.length;i++) {
    const a=outline[i],b=outline[(i+1)%outline.length];
    if(d.railing==='front'&&!(a[1]===D&&b[1]===D))continue;
    if(d.railing==='open_sides'&&a[1]===0&&b[1]===0)continue;
    if(result.stepCount&&sameEdge(a,b)) {
      const axis=a[0]===b[0]?1:0,dir=b[axis]>a[axis]?1:-1;
      const p=[...center],q=[...center];p[axis]-=sw/2*dir;q[axis]+=sw/2*dir;
      railEdge(a,p);railEdge(q,b);
    } else railEdge(a,b);
  }
  if(d.extras.includes('lighting')) for(const a of outline)line([...a,H+.08],[...a,H+.2],'#ffe9aa',5);

  all.push([-2,-2,0],[L+2,D+2,H+3.5]);
  const projected=all.map(project),xs=projected.map(p=>p[0]),ys=projected.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(600/(maxX-minX),340/(maxY-minY))*zoom;
  const map=p=>{const [x,y]=project(p);return [340+(x-(maxX+minX)/2)*scale,210+(y-(maxY+minY)/2)*scale];};
  const points=p=>p.map(map).map(x=>x.map(f).join(',')).join(' ');
  const lineSvg=l=>{const a=map(l.a),b=map(l.b);return `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${l.stroke}" stroke-width="${l.width}" ${l.extra}/>`;};
  const body=lines.filter(l=>l.under).map(lineSvg).join('')+polys.map(p=>`<polygon points="${points(p.points)}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="1" ${p.extra}/>`).join('')+lines.filter(l=>!l.under).map(lineSvg).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="jbs-deck-scene" viewBox="0 0 680 430" role="img" aria-label="${escapeHtml(result.shapeLabel)} deck, ${L} by ${D} feet, ${d.color}, ${d.stairLocation} stairs" data-deck-scene=""><defs><radialGradient id="yard"><stop stop-color="#edf1e9"/><stop offset="1" stop-color="#dce5df"/></radialGradient></defs><rect width="680" height="430" rx="18" fill="url(#yard)"/>${body}<text x="24" y="28" fill="#334b45" font-family="system-ui" font-size="13">${d.attachment==='attached'?'HOME EDGE':'FREESTANDING'} · ${view.framing?'FRAMING VIEW':view.top?'TOP VIEW':'DRAG TO ROTATE'}</text><text x="340" y="410" text-anchor="middle" fill="#253e36" font-family="system-ui" font-size="15">${L} × ${D} ft · ${result.area} sq ft · ${H===.15?0:d.height} ft high</text></svg>`;
}
