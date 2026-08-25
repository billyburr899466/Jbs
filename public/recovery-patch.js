const PATCH_VERSION = "3.1.0-recovery";
const viewState = new WeakMap();

function esc(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"})[c]);
}
function num(field, fallback) {
  const el = document.querySelector(`[data-field="builder.${field}"]`);
  const value = Number(el?.value);
  return Number.isFinite(value) ? value : fallback;
}
function val(field, fallback="") {
  return document.querySelector(`[data-field="builder.${field}"]`)?.value || fallback;
}
function deckColor() {
  const color = val("color", "Natural").toLowerCase();
  const material = val("material", "pressure_treated");
  if (color.includes("charcoal")) return "#55585b";
  if (color.includes("gray") || color.includes("drift")) return "#7d7c77";
  if (color.includes("cedar")) return "#a9683d";
  if (color.includes("brown")) return "#8b5a38";
  if (material === "cedar") return "#ad724a";
  if (material === "composite") return "#77746e";
  if (material === "pvc") return "#928a7c";
  return "#9a734c";
}
function railColor() {
  const style = val("railStyle", "Wood rail").toLowerCase();
  if (style.includes("black") || style.includes("cable")) return "#20242b";
  if (style.includes("white")) return "#eef1f4";
  return "#765033";
}
function materialName() {
  const key = val("material", "pressure_treated");
  return ({pressure_treated:"Pressure-treated wood",cedar:"Cedar",composite:"Composite decking",pvc:"PVC decking"})[key] || "Decking";
}
function railingName() {
  return ({none:"No railing",front:"Front edge",open_sides:"Front + sides",full:"Full perimeter"})[val("railing","open_sides")] || "Front + sides";
}
function stairName() {
  return ({none:"No stairs",front:"Front",left:"Left side",right:"Right side"})[val("stairLocation","front")] || "Front";
}
function projectPoint(x, y, z, mode) {
  if (mode === "top") return [90 + x * 11, 55 + y * 9];
  const skew = mode === "left" ? -0.62 : 0.62;
  return [250 + (x - y * skew) * 9.5, 105 + y * 4.7 - z * 18];
}
function polygon(points) { return points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "); }
function line(a,b,cls="",extra="") { return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="${cls}" ${extra}/>`; }

function buildTopSvg(length, depth, height, shape, railing, stairs, deck, rail) {
  const scale = Math.min(11, 300 / Math.max(length, 1), 180 / Math.max(depth, 1));
  const x0 = 78, y0 = 70, w = length * scale, h = depth * scale;
  const cutW = w * .42, cutH = h * .45;
  const path = shape === "l_shape"
    ? `M${x0} ${y0} H${x0+w} V${y0+h} H${x0+w-cutW} V${y0+h-cutH} H${x0} Z`
    : `M${x0} ${y0} H${x0+w} V${y0+h} H${x0} Z`;
  let boards = "";
  for (let y=y0+6; y<y0+h; y+=9) boards += `<line x1="${x0}" y1="${y}" x2="${x0+w}" y2="${y}" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>`;
  let rails = "";
  const stroke = `stroke="${rail}" stroke-width="7"`;
  if (railing !== "none") rails += `<line x1="${x0}" y1="${y0+h}" x2="${x0+w}" y2="${y0+h}" ${stroke}/>`;
  if (["open_sides","full"].includes(railing)) rails += `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0+h}" ${stroke}/><line x1="${x0+w}" y1="${y0}" x2="${x0+w}" y2="${y0+h}" ${stroke}/>`;
  if (railing === "full") rails += `<line x1="${x0}" y1="${y0}" x2="${x0+w}" y2="${y0}" ${stroke}/>`;
  let stair = "";
  if (stairs !== "none" && height > .5) {
    const sw = Math.min(65, w*.3), steps = Math.max(2, Math.min(5, Math.ceil(height*12/7.5)));
    if (stairs === "front") {
      for(let i=0;i<steps;i++) stair += `<rect x="${x0+w/2-sw/2+i*4}" y="${y0+h+i*10}" width="${sw-i*8}" height="10" fill="#846344" stroke="#5b4430"/>`;
    } else {
      const left = stairs === "left";
      for(let i=0;i<steps;i++) stair += `<rect x="${left?x0-(i+1)*10:x0+w+i*10}" y="${y0+h/2-sw/2+i*4}" width="10" height="${sw-i*8}" fill="#846344" stroke="#5b4430"/>`;
    }
  }
  return `<svg viewBox="0 0 460 320" role="img" aria-label="Live top view deck design">
    <rect width="460" height="320" fill="transparent"/><rect x="55" y="22" width="350" height="34" rx="7" fill="#a7b2bd"/><text x="230" y="44" text-anchor="middle" class="sky-label">HOME / REFERENCE EDGE</text>
    <path d="${path}" fill="${deck}" stroke="#4d3b2d" stroke-width="3"/>${boards}${rails}${stair}
    <line x1="${x0}" y1="${Math.min(296,y0+h+48)}" x2="${x0+w}" y2="${Math.min(296,y0+h+48)}" stroke="#172033" stroke-width="1.5"/><text x="${x0+w/2}" y="${Math.min(314,y0+h+66)}" text-anchor="middle" class="dim">${esc(length)} ft</text>
    <text x="${Math.min(430,x0+w/2)}" y="${Math.min(240,y0+h/2)}" text-anchor="middle" class="dim">${Math.round(length*depth*(shape==='l_shape'?.75:1))} sq. ft.</text>
  </svg>`;
}

function buildPerspectiveSvg(length, depth, height, shape, railing, stairs, deck, rail, mode) {
  const L = Math.min(28, Math.max(8,length)), D = Math.min(20,Math.max(6,depth)), H = Math.max(.5,Math.min(7,height));
  const z = 3.2 + H*.65;
  const p00=projectPoint(0,0,z,mode), p10=projectPoint(L,0,z,mode), p11=projectPoint(L,D,z,mode), p01=projectPoint(0,D,z,mode);
  let surface = polygon([p00,p10,p11,p01]);
  if(shape === "l_shape") {
    const a=projectPoint(L*.58,D*.55,z,mode), b=projectPoint(L,D*.55,z,mode), c=projectPoint(L,D,z,mode), d=projectPoint(L*.58,D,z,mode);
    surface = polygon([p00,p10,b,a,d,p01]);
  }
  let boards="";
  for(let i=1;i<12;i++) {
    const y=D*i/12;
    boards += line(projectPoint(0,y,z+.01,mode), projectPoint(L,y,z+.01,mode), "", `stroke="rgba(255,255,255,.28)" stroke-width="1.4"`);
  }
  let supports="";
  const xs=[0,L*.33,L*.66,L];
  for(const x of xs) {
    const top=projectPoint(x,D,z-.1,mode), bottom=projectPoint(x,D,0,mode);
    supports += line(top,bottom,"",`stroke="#5f4937" stroke-width="7"`);
  }
  const railH=2.2;
  let rails="";
  const railStroke=`stroke="${rail}" stroke-width="4"`;
  function railEdge(a,b) {
    const aTop=projectPoint(a[0],a[1],z+railH,mode), bTop=projectPoint(b[0],b[1],z+railH,mode);
    const aBase=projectPoint(a[0],a[1],z,mode), bBase=projectPoint(b[0],b[1],z,mode);
    let out=line(aTop,bTop,"rail",railStroke);
    for(let t=0;t<=1.001;t+=.2) {
      const x=a[0]+(b[0]-a[0])*t, y=a[1]+(b[1]-a[1])*t;
      out+=line(projectPoint(x,y,z,mode),projectPoint(x,y,z+railH,mode),"rail",`stroke="${rail}" stroke-width="2"`);
    }
    out+=line(aBase,bBase,"rail",`stroke="${rail}" stroke-width="2" opacity=".65"`);
    return out;
  }
  if(railing!=="none") rails+=railEdge([0,D],[L,D]);
  if(["open_sides","full"].includes(railing)) { rails+=railEdge([0,0],[0,D]); rails+=railEdge([L,0],[L,D]); }
  if(railing==="full") rails+=railEdge([0,0],[L,0]);
  let stair="";
  if(stairs!=="none" && height>.5) {
    const count=Math.max(2,Math.min(6,Math.ceil(height*12/7.5)));
    const sw=Math.min(5,Math.max(3,num("stairWidth",4)));
    for(let i=0;i<count;i++) {
      const t=i/(count-1||1), zz=z-(z-.2)*t;
      if(stairs==="front") {
        const cy=L/2, yy=D+1.1+i*.85;
        const a=projectPoint(cy-sw/2,yy,zz,mode), b=projectPoint(cy+sw/2,yy,zz,mode), c=projectPoint(cy+sw/2,yy+.7,zz,mode), d=projectPoint(cy-sw/2,yy+.7,zz,mode);
        stair+=`<polygon points="${polygon([a,b,c,d])}" fill="#896746" stroke="#58422f"/>`;
      } else {
        const xx=stairs==="left"? -1.1-i*.85 : L+1.1+i*.85, cy=D*.58;
        const a=projectPoint(xx,cy-sw/2,zz,mode), b=projectPoint(xx,cy+sw/2,zz,mode), c=projectPoint(xx+(stairs==="left"?-.7:.7),cy+sw/2,zz,mode), d=projectPoint(xx+(stairs==="left"?-.7:.7),cy-sw/2,zz,mode);
        stair+=`<polygon points="${polygon([a,b,c,d])}" fill="#896746" stroke="#58422f"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 500 330" role="img" aria-label="Live perspective deck design">
    <defs><linearGradient id="houseWall" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dce4eb"/><stop offset="1" stop-color="#b8c4cf"/></linearGradient></defs>
    <rect width="500" height="330" fill="transparent"/>
    <polygon points="60,78 440,78 402,28 98,28" fill="url(#houseWall)" stroke="#8995a1"/><rect x="205" y="40" width="88" height="38" fill="#687582"/><text x="250" y="21" text-anchor="middle" class="sky-label">LIVE CUSTOMER DECK CONCEPT</text>
    ${supports}<polygon points="${surface}" fill="${deck}" stroke="#4e3b2d" stroke-width="3"/>${boards}${stairs?stair:""}${rails}
    <text x="250" y="306" text-anchor="middle" class="dim">${esc(length)} ft × ${esc(depth)} ft · ${esc(height)} ft high</text>
    <text x="250" y="323" text-anchor="middle" class="note">Visual concept updates as selections change</text>
  </svg>`;
}

function buildVisual(mode) {
  const length=num("length",16), depth=num("depth",12), height=num("height",3);
  const shape=val("shape","rectangle"), railing=val("railing","open_sides"), stairs=val("stairLocation","front");
  const deck=deckColor(), rail=railColor();
  const svg=mode==="top" ? buildTopSvg(length,depth,height,shape,railing,stairs,deck,rail) : buildPerspectiveSvg(length,depth,height,shape,railing,stairs,deck,rail,mode);
  const area=Math.round(length*depth*(shape==="l_shape"?.75:1));
  return `<div class="jbs-recovery-live-head"><span class="jbs-recovery-live-badge">Live visual</span><div class="jbs-recovery-view-toggle" role="group" aria-label="Deck preview angle"><button type="button" data-recovery-view="front" class="${mode==='front'?'active':''}">Front</button><button type="button" data-recovery-view="left" class="${mode==='left'?'active':''}">Left</button><button type="button" data-recovery-view="top" class="${mode==='top'?'active':''}">Top</button></div></div><div class="jbs-recovery-stage">${svg}</div><div class="jbs-recovery-specs"><div><span>Size</span><b>${esc(length)} × ${esc(depth)} ft · ${area} sq. ft.</b></div><div><span>Decking</span><b>${esc(materialName())} · ${esc(val('color','Natural'))}</b></div><div><span>Railing</span><b>${esc(railingName())} · ${esc(val('railStyle','Wood rail'))}</b></div><div><span>Stairs</span><b>${esc(stairName())}</b></div></div><p class="jbs-recovery-tip"><b>Changes update instantly.</b> Adjust the dimensions, decking, railing, stairs, or color on the left and this view redraws without waiting for the next step.</p>`;
}

function enhanceBuilder(panel) {
  const content=panel.querySelector(".jbs-builder-preview-content");
  if(!content) return;
  let box=content.querySelector(".jbs-recovery-live");
  if(!box) {
    box=document.createElement("div"); box.className="jbs-recovery-live";
    content.prepend(box); content.classList.add("jbs-recovery-enhanced");
    viewState.set(box,"front");
  }
  const mode=viewState.get(box)||"front";
  box.innerHTML=buildVisual(mode);
}
function enhanceAll() {
  document.querySelectorAll(".jbs-builder-preview-panel").forEach(enhanceBuilder);
  const previewButton=document.querySelector('[data-owner-action="preview-guest"]');
  if(previewButton && !previewButton.dataset.recoveryLabeled) {
    previewButton.dataset.recoveryLabeled="true";
    const small=previewButton.querySelector("small"); if(small) small.textContent="Full customer side · stay signed in";
  }
}

document.addEventListener("click", (event) => {
  const button=event.target.closest("[data-recovery-view]");
  if(!button) return;
  event.preventDefault(); event.stopPropagation();
  const box=button.closest(".jbs-recovery-live"); if(!box) return;
  viewState.set(box,button.dataset.recoveryView||"front"); box.innerHTML=buildVisual(viewState.get(box));
}, true);

document.addEventListener("input", (event) => {
  if(event.target?.matches?.('[data-field^="builder."]')) requestAnimationFrame(enhanceAll);
}, true);
document.addEventListener("change", (event) => {
  if(event.target?.matches?.('[data-field^="builder."], [data-builder-extra]')) requestAnimationFrame(enhanceAll);
}, true);

const observer=new MutationObserver(() => requestAnimationFrame(enhanceAll));
observer.observe(document.documentElement,{subtree:true,childList:true});
enhanceAll();
console.info(`[JBs recovery] visual patch ${PATCH_VERSION} active`);
