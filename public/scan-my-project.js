import { PROJECT_KEY, DIMENSIONS, MAX_PHOTOS, MAX_BACKUP_BYTES, normalizeDimensions, normalizeProject, parseBackup, readProjects, saveProject, modelDimensions } from './xray-project.js';


(()=>{'use strict';const NS='http://www.w3.org/2000/svg';const svg=document.getElementById('house'),root=document.getElementById('draw');const state={yaw:40,elev:30,zoom:1,opacity:22,roof:false,explode:false,selected:null,dimensions:null,layers:{skin:true,frame:true,insulation:true,electrical:true,plumbing:true,hvac:true}};let measuredModel=modelDimensions({});let shapes=[],tracking=null,activePointers=new Map(),pLast=null;const colors={skin:'#b8e6dc',frame:'#e7b77b',insulation:'#e4d777',electrical:'#ffbc60',plumbing:'#62d6ff',hvac:'#c3a0f8',roof:'#88b0ca'};const detail={skin:['Exterior wall assembly','A conceptual shell representing wall finish and sheathing. Fade it to see internal systems; actual house wall construction varies.'],frame:['Structural framing','Studs, plates, floor joists, and rafters form the illustrative load path. Stud spacing and member sizing are schematic, not a structural design.'],insulation:['Insulation bays','The yellow infill represents thermal insulation between framing members. Actual R-value, vapor controls and placement depend on climate zone and assembly.'],electrical:['Electrical rough-in','Amber paths illustrate a branch circuit, device drops, and outlet locations. These are not wiring diagrams or code-compliant routing instructions.'],plumbing:['Hot and cold water','Cyan and coral runs show example supply routing to a sink and bathroom fixture. Locations and pipe sizing are illustrative.'],hvac:['Heating / cooling ductwork','Purple ducts show a simplified supply trunk and branches. Duct layout, airflows and equipment sizing require actual calculations.'],roof:['Roof assembly','Pitched roof with example rafters and a central ridge. Solid roof can be toggled to expose the floor plan.']};
const pt=(x,y,z)=>({x,y,z});const rad=v=>v*Math.PI/180;function project(p){const a=rad(state.yaw),e=rad(state.elev),dims=measuredModel;
 const wx=dims.length/36, wy=dims.depth/27,wz=dims.height/14.55;
 const factor=Math.max(.74,wx,wy,wz,(dims.height+dims.rise)/21.6),sc=42*state.zoom/factor;
 const x=p.x*wx,y=p.y*wy,z=p.z*wz;
 let u=x*Math.cos(a)-y*Math.sin(a),v=x*Math.sin(a)+y*Math.cos(a);
 return {x:450+u*sc,y:355+(v*Math.sin(e)-z*Math.cos(e))*sc,depth:v*Math.cos(e)+z*Math.sin(e)}}function roofRidge(){const d=measuredModel;return 4.85+(d.rise/3)/(d.height/14.55)}function off(layer){if(!state.explode)return 0;return {skin:3.7,roof:4.6,frame:0,insulation:1.1,electrical:2.1,plumbing:-1.4,hvac:2.7}[layer]||0}const sh=(p,l)=>pt(p.x,p.y,p.z+off(l));const pos=p=>{let r=project(p);return `${r.x.toFixed(1)},${r.y.toFixed(1)}`};function entity(type,layer,points,opt={}){if(!state.layers[layer]&&layer!=='roof')return;const pts=points.map(p=>sh(p,layer));const depth=pts.reduce((sum,p)=>sum+project(p).depth,0)/pts.length;shapes.push({type,layer,pts,depth,opt})}const line=(layer,a,b,color,width=3,opacity=1)=>entity('line',layer,[a,b],{color,width,opacity}),quad=(layer,p,color,opacity=.6,stroke)=>entity('quad',layer,p,{color,opacity,stroke}),dot=(layer,p,r,color)=>entity('dot',layer,[p],{r,color});function seg(layer,p1,p2,c,w=4){line(layer,pt(...p1),pt(...p2),c,w)}function frameModel(){const tan='#e7b77b',accent='#fff0c7';const xs=[-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6];const ys=[-4.5,-3.5,-2.5,-1.5,-.5,.5,1.5,2.5,3.5,4.5];for(let z of [0,4.85]){for(let y of [-4.5,4.5])seg('frame',[-6,y,z],[6,y,z],tan,z?5:6);for(let x of [-6,6])seg('frame',[x,-4.5,z],[x,4.5,z],tan,z?5:6)}for(let x of xs){for(let y of [-4.5,4.5])seg('frame',[x,y,0],[x,y,4.85],tan,3.7)}for(let y of ys){for(let x of [-6,6])seg('frame',[x,y,0],[x,y,4.85],tan,3.7)}for(let x of xs){seg('frame',[x,-4.5,.14],[x,4.5,.14],tan,2.6)}for(let y of [-4.5,4.5]){seg('frame',[-6,y,2.35],[6,y,2.35],accent,2)}// interior wall
for(let y of ys)seg('frame',[.2,y,0],[.2,y,4.85],'#d8ad78',3.4);seg('frame',[.2,-4.5,4.85],[.2,4.5,4.85],tan,4);seg('frame',[.2,-4.5,.16],[.2,4.5,.16],tan,4);
// roof rafters and ridge
for(let x of xs){seg('frame',[x,-4.7,4.85],[x,0,roofRidge()],tan,3.8);seg('frame',[x,0,roofRidge()],[x,4.7,4.85],tan,3.8)}seg('frame',[-6,0,roofRidge()],[6,0,roofRidge()],accent,5);}
function fillInsulation(){for(let x=-5.9;x<5.7;x+=1){for(let y of [-4.48,4.48]){quad('insulation',[pt(x,y,.36),pt(x+.78,y,.36),pt(x+.78,y,4.55),pt(x,y,4.55)],'#e4d777',.37,'#d2c46f')}}for(let y=-4.37;y<4.3;y+=1){for(let x of [-5.98,5.98])quad('insulation',[pt(x,y,.35),pt(x,y+.78,.35),pt(x,y+.78,4.55),pt(x,y,4.55)],'#d6c969',.28)}}
function electrical(){const c='#ffc16d';function wiring(points){for(let i=1;i<points.length;i++)line('electrical',pt(...points[i-1]),pt(...points[i]),c,4)}wiring([[-5.8,-4.34,3.65],[5.6,-4.34,3.65],[5.6,0,3.65],[5.6,4.3,3.65]]);wiring([[-4.4,-4.34,3.65],[-4.4,-4.34,1.05]]);wiring([[-1.3,-4.34,3.65],[-1.3,-4.34,1.05]]);wiring([[3.25,-4.34,3.65],[3.25,-4.34,1.05]]);wiring([[5.6,2.5,3.65],[5.6,2.5,1.05]]);wiring([[-5.8,-4.34,3.65],[-5.8,2.9,3.65],[-2.5,2.9,3.65],[-2.5,2.9,1.05]]);for(let p of [[-4.4,-4.33,1.05],[-1.3,-4.33,1.05],[3.25,-4.33,1.05],[5.6,2.5,1.05],[-2.5,2.9,1.05]])dot('electrical',pt(...p),6,'#ffe8a7')}
function plumbing(){function pipe(points,c){for(let i=1;i<points.length;i++)line('plumbing',pt(...points[i-1]),pt(...points[i]),c,5.2)}pipe([[-4.5,3.7,.48],[-1.5,3.7,.48],[-1.5,2.1,.48],[3.9,2.1,.48],[3.9,3.6,.48],[3.9,3.6,2.3]],'#62d6ff');pipe([[-4.25,3.5,.5],[-1.7,3.5,.5],[-1.7,1.9,.5],[3.65,1.9,.5],[3.65,3.6,.5],[3.65,3.6,2.3]],'#ff8376');pipe([[-4.5,3.7,.48],[-4.5,3.7,2.2]],'#62d6ff');pipe([[-4.25,3.5,.5],[-4.25,3.5,2.2]],'#ff8376');for(let p of [[-4.5,3.7,2.2],[3.9,3.6,2.3]])dot('plumbing',pt(...p),7,'#d4f6ff');}
function hvac(){function duct(points,width){for(let i=1;i<points.length;i++){line('hvac',pt(...points[i-1]),pt(...points[i]),'#8b6cbd',width+5,.36);line('hvac',pt(...points[i-1]),pt(...points[i]),'#c8a4fc',width,1)}}duct([[-5,-.2,4.25],[5,-.2,4.25]],9);duct([[-3.8,-.2,4.25],[-3.8,-3.25,4.25]],6);duct([[3,-.2,4.25],[3,3.4,4.25]],6);duct([[.3,-.2,4.25],[.3,-3.3,4.25]],5);for(let p of [[-3.8,-3.25,4.25],[3,3.4,4.25],[.3,-3.3,4.25]])dot('hvac',pt(...p),7,'#eadbff');}
function skin(){const alp=state.opacity/100;for(let side of [-4.52,4.52]){quad('skin',[pt(-6.05,side,.12),pt(6.05,side,.12),pt(6.05,side,4.86),pt(-6.05,side,4.86)],'#b2f4df',alp,'#a0dbcc')}for(let x of [-6.07,6.07])quad('skin',[pt(x,-4.55,.12),pt(x,4.55,.12),pt(x,4.55,4.86),pt(x,-4.55,4.86)],'#a5dce5',alp,'#a6e3e0');if(alp>.08){for(let z=.8;z<4.85;z+=.7){for(let y of [-4.53,4.53])line('skin',pt(-6,y,z),pt(6,y,z),'#afefeb',.8,alp*.9)}}// windows and front entry
for(let x of [-3.8,1.6]){quad('skin',[pt(x,-4.59,1.9),pt(x+1.6,-4.59,1.9),pt(x+1.6,-4.59,3.62),pt(x,-4.59,3.62)],'#6cc5dd',Math.max(.18,alp*.8),'#d1fff7');line('skin',pt(x+.8,-4.6,1.9),pt(x+.8,-4.6,3.62),'#cdfef9',1.5)}quad('skin',[pt(3.65,-4.61,.12),pt(5.1,-4.61,.12),pt(5.1,-4.61,3.63),pt(3.65,-4.61,3.63)],'#6daba7',Math.max(.12,alp*.65),'#f5eed6');}
function roof(){if(!state.roof)return;for(let side of [-1,1]){let edge=side===-1?-4.75:4.75;quad('roof',[pt(-6.3,0,roofRidge()+.15),pt(6.3,0,roofRidge()+.15),pt(6.3,edge,4.84),pt(-6.3,edge,4.84)],'#587ca8',.83,'#acd4ff')} }
function fixtures(){// A subtle kitchen counter and bath markers for floor context; attach to frame
quad('frame',[pt(-5.8,2.75,.25),pt(-2.6,2.75,.25),pt(-2.6,4.25,.25),pt(-5.8,4.25,.25)],'#445f68',.75,'#a2d5c0');quad('frame',[pt(2.35,2.7,.23),pt(5.3,2.7,.23),pt(5.3,4.1,.23),pt(2.35,4.1,.23)],'#3c6671',.62,'#92d5ea');}
function ground(){const base=[pt(-6.35,-4.85,-.2),pt(6.35,-4.85,-.2),pt(6.35,4.85,-.2),pt(-6.35,4.85,-.2)];entity('quad','frame',base,{color:'#233c46',opacity:1,stroke:'#58b4af'});for(let x=-6;x<=6;x+=1)entity('line','frame',[pt(x,-4.5,-.19),pt(x,4.5,-.19)],{color:'#3a636d',width:.75,opacity:.65});for(let y=-4.5;y<=4.5;y+=1)entity('line','frame',[pt(-6,y,-.19),pt(6,y,-.19)],{color:'#3a636d',width:.75,opacity:.65});}
function create(tag,attr,parent=root){const el=document.createElementNS(NS,tag);for(let [k,v] of Object.entries(attr))el.setAttribute(k,v);parent.appendChild(el);return el}
function paint(){measuredModel=modelDimensions(state.dimensions||{});shapes=[];ground();fixtures();fillInsulation();skin();frameModel();electrical();plumbing();hvac();roof();shapes.sort((a,b)=>a.depth-b.depth);root.replaceChildren();for(let s of shapes){if(s.layer==='frame'&&!state.layers.frame)continue;const op=s.opt;let e;if(s.type==='line'){e=create('line',{x1:project(s.pts[0]).x,y1:project(s.pts[0]).y,x2:project(s.pts[1]).x,y2:project(s.pts[1]).y,stroke:op.color,'stroke-width':op.width,'stroke-linecap':'round',opacity:op.opacity??1})}else if(s.type==='quad'){e=create('polygon',{points:s.pts.map(pos).join(' '),fill:op.color,'fill-opacity':op.opacity,stroke:op.stroke||op.color,'stroke-opacity':.65,'stroke-width':1.1,'stroke-linejoin':'round'})}else{let p=project(s.pts[0]);e=create('circle',{cx:p.x,cy:p.y,r:op.r,fill:op.color,stroke:'#183037','stroke-width':2})}if(e){e.setAttribute('data-layer',s.layer);e.style.cursor='pointer';if(state.selected===s.layer)e.setAttribute('filter','url(#halo)')}}// category labels
const labels=[['STRUCTURE',[-5.6,-4.48,4.95],'frame'],['WATER',[-4.5,3.7,2.35],'plumbing'],['POWER',[3.25,-4.34,1.2],'electrical'],['AIR',[.5,-.2,4.6],'hvac']];for(const [txt,p,layer] of labels){if(!state.layers[layer])continue;let q=project(sh(pt(...p),layer));const w=txt.length*7+20;create('rect',{x:q.x-w/2,y:q.y-26,width:w,height:20,rx:5,fill:'#0a222b','fill-opacity':'.92',stroke:colors[layer],'stroke-opacity':'.85'}).setAttribute('data-layer',layer);let t=create('text',{x:q.x,y:q.y-12,'text-anchor':'middle',fill:'#e0f8f3','font-size':10,'font-weight':800,'letter-spacing':1.1});t.textContent=txt;t.setAttribute('data-layer',layer);create('line',{x1:q.x,y1:q.y-6,x2:q.x,y2:q.y,stroke:colors[layer],'stroke-width':1.5}).setAttribute('data-layer',layer)}document.getElementById('viewInfo').textContent=`ORBIT ${Math.round(state.yaw)}° · ELEV ${Math.round(state.elev)}° · ${Math.round(state.zoom*100)}%`;document.getElementById('sceneMode').textContent=state.explode?'· EXPLODED':state.opacity>=75?'· SOLID':'· X-RAY'}
function inspect(layer){state.selected=layer;const [title,body]=detail[layer]||['Component','Illustrative construction layer'];document.getElementById('detail').innerHTML=`<div class="detail-stat"><span class="inspector-icon" style="background:${colors[layer]||'#b6ff7b'}"></span> ${layer.toUpperCase()} SYSTEM</div><div class="detail-title">${title}</div><div class="detail-text">${body}</div>`;paint()}

function setMode(mode,notify=false){
 state.mode=mode;state.selected=null;state.explode=false;
 for(const k of Object.keys(state.layers))state.layers[k]=true;
 if(mode==='finished'){state.opacity=95;state.roof=true}
 if(mode==='xray'){state.opacity=22;state.roof=false}
 if(mode==='framing'){state.opacity=0;state.roof=false;state.layers.insulation=false;state.layers.electrical=false;state.layers.plumbing=false;state.layers.hvac=false}
 if(mode==='utilities'){state.opacity=0;state.roof=false;state.layers.insulation=false}
 document.getElementById('detail').innerHTML='<div class="inspector-title">☝ TAP ANY PART OF THE HOUSE</div><div class="inspector-copy">Tap a colored component to learn what it represents.</div>';
 sync(); if(notify)toast(mode.charAt(0).toUpperCase()+mode.slice(1)+' view');
}
function sync(){
 for(const b of document.querySelectorAll('.switch'))b.setAttribute('aria-pressed',String(state.layers[b.dataset.layer]));
 const revealed=100-state.opacity;
 document.getElementById('reveal').value=revealed;
 document.getElementById('peelValue').textContent=revealed+'% revealed';
 document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-pressed',String(state.mode===b.dataset.mode)));
 for(const id of ['roof','explode']){const b=document.getElementById(id);b.setAttribute('aria-pressed',String(state[id]));b.classList.toggle('active',state[id]);}
 paint();
}
state.mode='xray';
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
document.querySelectorAll('.switch').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.layer;state.layers[k]=!state.layers[k];state.mode='custom';sync();inspect(k)}));
document.getElementById('reveal').addEventListener('input',e=>{
 const revealed=Number(e.target.value); state.opacity=100-revealed;state.layers.skin=true;
 if(revealed>5)state.roof=false;
 if(state.mode==='framing'||state.mode==='utilities'){for(const k in state.layers)state.layers[k]=true;state.mode='xray';}
 sync();
});
document.getElementById('roof').onclick=()=>{state.roof=!state.roof;state.mode='custom';sync();if(state.roof)inspect('roof')};
document.getElementById('explode').onclick=()=>{state.explode=!state.explode;sync()};
document.getElementById('showAll').onclick=()=>{state.zoom=1;state.yaw=40;state.elev=30;setMode('xray');toast('Back to the simple X-ray view')};
document.getElementById('zoomIn').onclick=()=>{state.zoom=Math.min(2.2,state.zoom*1.2);paint()};
document.getElementById('zoomOut').onclick=()=>{state.zoom=Math.max(.55,state.zoom/1.2);paint()};
function setView(v){const views={iso:[40,30],front:[0,12],top:[40,85]};[state.yaw,state.elev]=views[v]||views.iso;document.querySelectorAll('.view-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));paint()}
document.querySelectorAll('.view-btn').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.getElementById('reset').onclick=()=>{state.zoom=1;setView('iso')};
let angleIndex=0;const angles=[[40,30],[0,22],[130,30],[40,85]];
document.getElementById('spinView').onclick=()=>{angleIndex=(angleIndex+1)%angles.length;[state.yaw,state.elev]=angles[angleIndex];paint()};
svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;svg.setPointerCapture(e.pointerId);activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});tracking={x:e.clientX,y:e.clientY,moved:0,layer:e.target.closest('[data-layer]')?.dataset.layer};pLast=null;svg.classList.add('dragging')});svg.addEventListener('pointermove',e=>{if(!activePointers.has(e.pointerId)||!tracking)return;const prior=activePointers.get(e.pointerId);activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size===2){const a=[...activePointers.values()];const dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pLast)state.zoom=Math.min(2.2,Math.max(.55,state.zoom*dist/pLast));pLast=dist;tracking.moved=100;paint();return}let dx=e.clientX-prior.x,dy=e.clientY-prior.y;if(Math.abs(dx)+Math.abs(dy)>.1){state.yaw=(state.yaw+dx*.48+360)%360;state.elev=Math.max(8,Math.min(87,state.elev+dy*.33));tracking.moved+=Math.abs(dx)+Math.abs(dy);document.querySelectorAll('.view-btn').forEach(b=>b.classList.remove('active'));paint()}});svg.addEventListener('pointerup',e=>{if(tracking&&tracking.moved<9&&tracking.layer){inspect(tracking.layer)}activePointers.delete(e.pointerId);pLast=null;if(!activePointers.size){svg.classList.remove('dragging');tracking=null}});svg.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);pLast=null;svg.classList.remove('dragging');tracking=null});svg.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.min(2.2,Math.max(.55,state.zoom*(e.deltaY<0?1.08:.92)));paint()},{passive:false});
let toastTimer;function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3000)}document.getElementById('export').onclick=()=>{let copy=svg.cloneNode(true);copy.setAttribute('xmlns',NS);copy.setAttribute('width','1350');copy.setAttribute('height','900');copy.setAttribute('viewBox','0 0 900 600');const bg=document.createElementNS(NS,'rect');bg.setAttribute('width','900');bg.setAttribute('height','600');bg.setAttribute('fill','#0d242d');copy.insertBefore(bg,copy.firstChild);const caption=document.createElementNS(NS,'text');caption.setAttribute('x','24');caption.setAttribute('y','580');caption.setAttribute('fill','#d6edec');caption.setAttribute('font-size','13');caption.textContent='JB’s • Concept only • Hidden systems illustrative; verify on site';copy.appendChild(caption);const xml=new XMLSerializer().serializeToString(copy),url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));const img=new Image;img.onload=()=>{let c=document.createElement('canvas');c.width=1350;c.height=900;let ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(blob=>{if(!blob){toast('Unable to export image');return}const file=URL.createObjectURL(blob);const a=document.createElement('a');a.href=file;a.download='JBs-XRay-House-Visualizer.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(file),3000);toast('PNG snapshot saved')},'image/png')};img.onerror=()=>{URL.revokeObjectURL(url);toast('Image export not supported in this browser')};img.src=url};
// Local project capture. No project photos or measurements leave this origin.
const PR_KEY=PROJECT_KEY;
let prActive=null,prPhotos=[],prRecords=[],prDirty=false,prBusy=false;
const prId=id=>document.getElementById(id);
const fieldIds={length:'prLength',depth:'prDepth',height:'prHeight',pitch:'prPitch'};
const newId=()=> 'pr-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
function prError(e){toast(e.name==='QuotaExceededError'?'Storage full. Back up your project, then delete an old saved project or remove photos.':e.name==='SecurityError'?'Browser storage is unavailable. Use Backup to keep this project.':e.message)}
function prLoadStore(){return readProjects(localStorage)}
function prStored(){
 try {prRecords=prLoadStore();prId('prExisting').replaceChildren(new Option('Open saved project…',''));for(const p of prRecords)prId('prExisting').add(new Option(p.name.slice(0,75),p.id));}
 catch(e){prError(e)}
 prId('prDelete').disabled=!prActive;
}
function prStep(step){
 for(const b of document.querySelectorAll('[data-step]')){const yes=b.dataset.step===step;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes))}
 for(const name of ['photos','measure','view'])prId('pr'+name[0].toUpperCase()+name.slice(1)).hidden=name!==step;
 if(step==='view')prSummarize();
}
function prGetNumbers(){
 const values={};
 for(const [key,id] of Object.entries(fieldIds)){const input=prId(id);if(input.validity.badInput)throw Error(DIMENSIONS[key][2]+' must be a number.');if(input.value.trim()!=='')values[key]=Number(input.value);}
 return normalizeDimensions(values);
}
function prDimensions(){
 try{
  state.dimensions=prGetNumbers();prId('prErrors').hidden=true;
  const d=state.dimensions,parts=Object.keys(DIMENSIONS).filter(k=>d[k]!==undefined).map(k=>k==='pitch'?'roof pitch '+d[k]+'/12':DIMENSIONS[k][2].toLowerCase()+' '+d[k]+' ft');
  prId('prMeasureSummary').textContent=parts.length?'Recorded: '+parts.join(' · ')+'. Unrecorded dimensions and interior locations remain illustrative.':'No actual dimensions recorded yet. Generic model shown.';
 }catch(e){state.dimensions={};prId('prErrors').textContent=e.message;prId('prErrors').hidden=false;prId('prMeasureSummary').textContent='Invalid measurement. Generic model shown until corrected.'}
 paint();prSummarize();
}
function prSummarize(){const d=state.dimensions||{};prId('prViewSummary').textContent=prPhotos.length+' real reference photos · '+Object.keys(d).length+' recorded dimensions · interior framing and utilities: illustrative.';}
function prMayLeave(){return !prBusy&&(!prDirty||window.confirm('Discard unsaved changes? Save or back up first to keep them.'))}
function prNewProject(){
 if(!prMayLeave())return;
 prActive=null;prPhotos=[];prId('prName').value='';prId('prNotes').value='';
 for(const id of Object.values(fieldIds))prId(id).value='';
 prId('prExisting').value='';prId('prPhotoPreview').classList.remove('show');prRenderPhotos();prDimensions();prStep('photos');prDirty=false;prId('prDelete').disabled=true;prId('prName').focus();
}
function prRenderPhotos(){
 const grid=prId('prPhotoGrid');grid.replaceChildren();
 for(const [i,p] of prPhotos.entries()){
  const wrap=document.createElement('div');wrap.className='pic';
  const previewButton=document.createElement('button');previewButton.className='photo-preview-button';previewButton.type='button';previewButton.setAttribute('aria-label','Preview '+p.side+' photo '+(i+1));
  const img=document.createElement('img');img.src=p.url;img.alt=p.side+' reference photo '+(i+1);img.loading='lazy';previewButton.appendChild(img);
  previewButton.onclick=()=>{const preview=prId('prPhotoPreview');preview.src=p.url;preview.classList.add('show')};
  const sm=document.createElement('small');sm.textContent=p.side;
  const del=document.createElement('button');del.type='button';del.textContent='×';del.setAttribute('aria-label','Remove '+p.side+' photo '+(i+1));
  del.onclick=()=>{if(prBusy)return;prPhotos.splice(i,1);prDirty=true;prRenderPhotos();prId('prPhotoPreview').classList.remove('show')};
  wrap.append(previewButton,sm,del);grid.appendChild(wrap);
 }
 prSummarize();
}
async function prImage(file,side){
 if(!file.type.startsWith('image/')||file.type==='image/svg+xml')throw Error('Choose a JPEG, PNG, WebP, or other supported photo.');
 if(file.size>22_000_000)throw Error('Photo over 22 MB. Choose a smaller photo.');
 let bitmap;
 if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(file).catch(()=>null);
 let url;
 try{
  if(!bitmap){url=URL.createObjectURL(file);bitmap=await new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>reject(Error('Photo could not be opened. Try JPEG or PNG.')),15000);img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);reject(Error('Photo could not be opened. Try JPEG or PNG.'))};img.src=url;});}
  const width=bitmap.width,height=bitmap.height;
  if(!width||!height)throw Error('This photo has no image data.');
  const scale=Math.min(1,1000/Math.max(width,height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  return {side,url:canvas.toDataURL('image/jpeg',.70)};
 }finally{bitmap?.close?.();if(url)URL.revokeObjectURL(url)}
}
async function prAddPhotos(files){
 if(prBusy||!files.length)return;
 if(prPhotos.length+files.length>MAX_PHOTOS){toast('Maximum 12 photos per project');return}
 prBusy=true;prId('prFiles').disabled=true;prId('prCamera').disabled=true;toast('Opening photos…');
 const side=prId('prSide').value;
 try{const added=[];for(const f of files)added.push(await prImage(f,side));prPhotos.push(...added);prDirty=true;prRenderPhotos();toast(files.length+' photo(s) added')}
 catch(e){prError(e)}finally{prBusy=false;prId('prFiles').disabled=false;prId('prCamera').disabled=false}
}
function prProject(){
 if(prBusy)throw Error('Wait for photos to finish opening.');
 if(!prId('prName').value.trim())throw Error('Give the project a name before saving.');
 return normalizeProject({version:1,id:prActive||newId(),name:prId('prName').value,dimensions:prGetNumbers(),notes:prId('prNotes').value,photos:prPhotos,updated:new Date().toISOString()});
}
function prSave(){try{const p=saveProject(localStorage,prProject());prActive=p.id;prDirty=false;prStored();prId('prExisting').value=p.id;toast('Project saved in this browser')}catch(e){prError(e)}}
function prShow(p){
 prActive=p.id;prId('prName').value=p.name;prId('prNotes').value=p.notes;
 for(const [key,id] of Object.entries(fieldIds))prId(id).value=p.dimensions[key]??'';
 prPhotos=p.photos.map(photo=>({...photo}));prId('prPhotoPreview').classList.remove('show');prRenderPhotos();prDimensions();prStep('view');prDirty=false;prId('prExisting').value=p.id;prId('prDelete').disabled=false;
}
function prOpen(id){
 if(!id)return;
 if(!prMayLeave()){prId('prExisting').value=prActive||'';return}
 try{const p=prLoadStore().find(p=>p.id===id);if(!p)throw Error('This project is no longer saved.');prShow(p);toast('Project opened')}catch(e){prError(e)}
}
function prDownload(p){const data=JSON.stringify({format:'jbs-xray-project',project:p},null,2),b=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=p.name.replace(/[^a-z0-9-]+/gi,'-').slice(0,55)+'-xray.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
prId('prSave').onclick=prSave;prId('prNew').onclick=prNewProject;
prId('prExisting').onchange=e=>prOpen(e.target.value);
prId('prDelete').onclick=()=>{
 if(prBusy||!prActive||!confirm('Delete this saved project from this browser? Download a backup first to keep a copy.'))return;
 try{const remaining=prLoadStore().filter(p=>p.id!==prActive);localStorage.setItem(PR_KEY,JSON.stringify(remaining));prDirty=false;prNewProject();prStored();toast('Saved project deleted')}catch(e){prError(e)}
};
for(const b of document.querySelectorAll('[data-step]'))b.onclick=()=>prStep(b.dataset.step);
for(const id of Object.values(fieldIds))prId(id).oninput=()=>{prDirty=true;prDimensions()};
for(const id of ['prName','prNotes'])prId(id).oninput=()=>{prDirty=true};
for(const id of ['prCamera','prFiles'])prId(id).onchange=async e=>{await prAddPhotos([...e.target.files]);e.target.value=''};
prId('prGoViewer').onclick=()=>document.getElementById('viewport').scrollIntoView({behavior:'smooth',block:'center'});
prId('prExport').onclick=()=>{try{prDownload(prProject());toast('Backup downloaded')}catch(e){prError(e)}};
prId('prImport').onchange=async e=>{
 try{
  const f=e.target.files[0];if(!f||!prMayLeave())return;
  if(f.size>MAX_BACKUP_BYTES)throw Error('Backup file is too large.');
  prBusy=true;
  const p=parseBackup(await f.text());p.id=newId();p.updated=new Date().toISOString();
  const saved=saveProject(localStorage,p);prStored();prShow(saved);toast('Backup restored');
 }catch(error){prError(error)}finally{prBusy=false;e.target.value=''}
};
window.addEventListener('beforeunload',e=>{if(prDirty||prBusy){e.preventDefault();e.returnValue=''}});
svg.addEventListener('keydown',e=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;
 e.preventDefault();
 if(e.key==='ArrowLeft')state.yaw-=10;if(e.key==='ArrowRight')state.yaw+=10;
 if(e.key==='ArrowUp')state.elev=Math.min(87,state.elev+5);if(e.key==='ArrowDown')state.elev=Math.max(8,state.elev-5);
 if(e.key==='+')state.zoom=Math.min(2.2,state.zoom*1.2);if(e.key==='-')state.zoom=Math.max(.55,state.zoom/1.2);
 paint();
});
prStored();prDimensions();sync();
})();
