import { escapeHtml } from './customer-core.js';
export const paintDefaults = () => ({name:'My Paint Preview',setting:'Interior',photo:'',areas:[],points:[],color:'#ebe5d9',strength:.82,active:-1,original:false});
export function validColor(s) { return /^#[0-9a-f]{6}$/i.test(s) ? s : '#ebe5d9'; }
export function paintMarkup(d) {
 return `<div class="jbs-paint-layout"><section class="jbs-paint-controls"><label>Design name<input data-paint="name" value="${escapeHtml(d.name)}" maxlength="200"></label><label>Setting<select data-paint="setting"><option ${d.setting==='Interior'?'selected':''}>Interior</option><option ${d.setting==='Exterior'?'selected':''}>Exterior</option></select></label><label class="jbs-paint-upload">Choose your room or exterior photo<input type="file" data-paint-file accept="image/jpeg,image/png,image/webp"></label><p>Tap around a wall, siding, ceiling, or trim area. Close the shape with <b>Paint this area</b>. Add separate areas to compare colors.</p><label>Area name<input data-paint="areaName" value="${escapeHtml(d.areaName||'Wall 1')}" maxlength="80"></label><label>Paint color<input type="color" data-paint="color" value="${validColor(d.color)}"></label><div class="jbs-paint-swatches">${['#ebe5d9','#b6b4a8','#697d72','#293d56','#a76549','#33393e'].map(c=>`<button type="button" data-paint-color="${c}" style="background:${c}" aria-label="Choose ${c}"></button>`).join('')}</div><label>Coverage <input type="range" data-paint="strength" min="0.25" max="1" step="0.05" value="${d.strength}"></label><div class="jbs-paint-buttons"><button class="jbs-primary" data-paint-action="apply">Paint this area</button><button class="jbs-outline" data-paint-action="undo">Undo point</button><button class="jbs-outline" data-paint-action="cancel-drawing">Clear outline</button></div><label>Saved areas<select data-paint="active"><option value="-1">New area</option>${d.areas.map((a,i)=>`<option value="${i}" ${d.active===i?'selected':''}>${escapeHtml(a.name)}</option>`).join('')}</select></label><button class="jbs-outline" data-paint-action="remove">Remove selected area</button><label class="jbs-paint-original"><input type="checkbox" data-paint="original" ${d.original?'checked':''}>Show original photo</label></section><section class="jbs-paint-preview"><div class="jbs-paint-canvas-wrap"><canvas data-paint-canvas width="1000" height="680" aria-label="Photo paint preview; tap to mark a paint area"></canvas></div><p data-paint-status role="status"></p><p class="jbs-muted">Your actual photo stays in place. This color preview is approximate; check a physical sample in your lighting.</p></section></div><div class="jbs-modal-actions"><button class="jbs-outline" data-paint-action="save">Save Paint Plan</button><button class="jbs-primary" data-paint-action="quote">Request Painting Quote</button></div>`;
}
function loadImage(src) { return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('This photo could not be opened. Try a JPG or PNG.'));i.src=src;}); }
export async function mountPaint(root,d,hooks) {
 const canvas=root.querySelector('[data-paint-canvas]');if(!canvas)return;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});let base=null,image=null,frame;
 const status=text=>{const e=root.querySelector('[data-paint-status]');if(e)e.textContent=text;};
 const mask=document.createElement('canvas');let maskCtx=mask.getContext('2d',{willReadFrequently:true});
 function areaPixels(area,source) {
  mask.width=canvas.width;mask.height=canvas.height;maskCtx.clearRect(0,0,mask.width,mask.height);maskCtx.beginPath();
  area.points.forEach(([x,y],i)=>i?maskCtx.lineTo(x*mask.width,y*mask.height):maskCtx.moveTo(x*mask.width,y*mask.height));maskCtx.closePath();maskCtx.fill();
  const m=maskCtx.getImageData(0,0,mask.width,mask.height).data;let total=0,count=0;
  for(let p=0;p<m.length;p+=4)if(m[p+3]){total+=source[p]*.2126+source[p+1]*.7152+source[p+2]*.0722;count++;}
  const mean=count?total/count:128,c=validColor(area.color),rgb=[1,3,5].map(n=>parseInt(c.slice(n,n+2),16));
  for(let p=0;p<m.length;p+=4)if(m[p+3]){const light=(source[p]*.2126+source[p+1]*.7152+source[p+2]*.0722)/Math.max(35,mean);const shade=Math.max(.2,Math.min(1.5,light));const alpha=(area.strength??.82)*m[p+3]/255;for(let k=0;k<3;k++)source[p+k]=Math.round(source[p+k]*(1-alpha)+Math.min(255,rgb[k]*shade)*alpha);}
 }
 function draw(outline=true) {
  if(!canvas.isConnected)return;
  if(!base){ctx.fillStyle='#edf1ed';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#43564d';ctx.font='26px system-ui';ctx.textAlign='center';ctx.fillText('Choose a photo to start',canvas.width/2,canvas.height/2);return;}
  const pixels=new ImageData(new Uint8ClampedArray(base.data),base.width,base.height);
  if(!d.original)d.areas.forEach(a=>areaPixels(a,pixels.data));
  ctx.putImageData(pixels,0,0);
  if(outline&&d.points.length){ctx.strokeStyle='#00bca1';ctx.lineWidth=Math.max(2,canvas.width/400);ctx.fillStyle='#fff';ctx.beginPath();d.points.forEach(([x,y],i)=>i?ctx.lineTo(x*canvas.width,y*canvas.height):ctx.moveTo(x*canvas.width,y*canvas.height));ctx.stroke();for(const [x,y] of d.points){ctx.beginPath();ctx.arc(x*canvas.width,y*canvas.height,canvas.width/180,0,7);ctx.fill();ctx.stroke();}}
  status(d.points.length?`${d.points.length} outline points · ${d.points.length<3?'Add at least 3 points.':'Tap Paint this area to apply.'}`:`${d.areas.length} painted area${d.areas.length===1?'':'s'} · ${d.original?'Original photo':'Color preview'}`);
 }
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>draw());};
 async function usePhoto(src) {
  image=await loadImage(src);if(!canvas.isConnected)return;
  const factor=Math.min(1,1100/Math.max(image.width,image.height));canvas.width=Math.round(image.width*factor);canvas.height=Math.round(image.height*factor);ctx.drawImage(image,0,0,canvas.width,canvas.height);base=ctx.getImageData(0,0,canvas.width,canvas.height);canvas.dataset.photoReady="true";draw();
 }
 function updateAreas(){const select=root.querySelector('[data-paint="active"]');select.innerHTML='<option value="-1">New area</option>'+d.areas.map((a,i)=>`<option value="${i}">${escapeHtml(a.name)}</option>`).join('');select.value=String(d.active);draw();}
 root.addEventListener('input',e=>{const k=e.target.dataset.paint;if(!k)return;if(k==='active')return;d[k]=k==='original'?e.target.checked:k==='strength'?Number(e.target.value):e.target.value;if(['color','strength','areaName'].includes(k)&&d.active>=0){const a=d.areas[d.active];if(a)a[k==='areaName'?'name':k]=d[k];}schedule();});
 root.addEventListener('change',async e=>{try{
  if(e.target.matches('[data-paint-file]')){const file=e.target.files[0];if(!file)return;if(file.size>15*1024*1024)throw new Error('Choose a photo smaller than 15 MB.');if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Use a JPG, PNG, or WebP photo.');const src=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});const img=await loadImage(src),tmp=document.createElement('canvas'),scale=Math.min(1,1100/Math.max(img.width,img.height));tmp.width=Math.round(img.width*scale);tmp.height=Math.round(img.height*scale);tmp.getContext('2d').drawImage(img,0,0,tmp.width,tmp.height);d.photo=tmp.toDataURL('image/jpeg',.82);d.areas=[];d.points=[];d.active=-1;await usePhoto(d.photo);updateAreas();}
  if(e.target.dataset.paint==='active'){d.active=Number(e.target.value);d.points=[];if(d.active>=0){const a=d.areas[d.active];d.color=a.color;d.strength=a.strength;d.areaName=a.name;for(const k of ['color','strength','areaName'])root.querySelector(`[data-paint="${k}"]`).value=d[k];}draw();}
 }catch(err){status(err.message||'The photo could not be loaded.');}});
 canvas.addEventListener('pointerdown',e=>{if(!base||d.original)return;const b=canvas.getBoundingClientRect();d.active=-1;if(d.points.length>=40){status('Use at most 40 points for one area.');return;}d.points.push([Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))]);draw();});
 root.addEventListener('click',async e=>{const b=e.target.closest('[data-paint-action],[data-paint-color]');if(!b)return;e.preventDefault();try{
  if(b.dataset.paintColor){d.color=b.dataset.paintColor;root.querySelector('[data-paint="color"]').value=d.color;if(d.active>=0)d.areas[d.active].color=d.color;draw();return;}
  const action=b.dataset.paintAction;
  if(action==='undo')d.points.pop();
  if(action==='cancel-drawing')d.points=[];
  if(action==='remove'&&d.active>=0){d.areas.splice(d.active,1);d.active=-1;updateAreas();}
  if(action==='apply'){if(d.points.length<3)throw new Error('Mark at least 3 corners around the area first.');if(d.areas.length>=12)throw new Error('Save up to 12 areas in one plan.');d.areas.push({name:(d.areaName||`Area ${d.areas.length+1}`).slice(0,80),color:validColor(d.color),strength:d.strength,points:d.points.map(p=>[...p])});d.active=d.areas.length-1;d.points=[];updateAreas();}
  if(action==='save'||action==='quote'){if(!d.photo||!d.areas.length)throw new Error('Add a photo and paint at least one area before saving.');if(d.points.length)throw new Error('Apply or clear the unfinished outline first.');b.disabled=true;const original=d.original;d.original=false;draw(false);const preview=canvas.toDataURL('image/jpeg',.84);d.original=original;await hooks[action](d,preview,b);b.disabled=false;}
  draw();
 }catch(err){b.disabled=false;status(err.message||'The paint plan could not be saved.');}});
 if(d.photo)try{await usePhoto(d.photo);}catch(err){status(err.message);}else draw();
}
