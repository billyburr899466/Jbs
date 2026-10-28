import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function xrayFlow(context, url, width, capture) {
 const {ctx,page,writes,errors}=await context(false,width);
 if(width===390)await ctx.addInitScript(()=>{window.createImageBitmap=undefined});
 await page.goto(url+'/scan-my-project.html');
 await page.waitForFunction(()=>document.querySelectorAll('#draw [data-layer]').length>100);
 const scene=()=>page.locator('#draw').innerHTML();
 const initial=await scene();
 for(const mode of ['finished','framing','utilities','xray']){
  await page.locator(`[data-mode="${mode}"]`).click();
  assert.equal(await page.locator(`[data-mode="${mode}"]`).getAttribute('aria-pressed'),'true');
  if(mode==='framing')assert.equal(await page.locator('#draw [data-layer="plumbing"]').count(),0);
  if(mode==='finished')assert.ok(await page.locator('#draw [data-layer="roof"]').count()>0);
 }
 await page.locator('#reveal').fill('50');assert.match(await page.locator('#peelValue').innerText(),/50%/);
 await page.locator('#house').focus();await page.keyboard.press('ArrowLeft');assert.notEqual(await scene(),initial);
 await page.locator('#zoomIn').click();await page.locator('#zoomOut').click();await page.locator('#reset').click();
 await page.locator('#advanced summary').click();
 await page.locator('[data-view="front"]').click();await page.locator('[data-view="top"]').click();await page.locator('[data-view="iso"]').click();
 await page.locator('#explode').click();assert.equal(await page.locator('#explode').getAttribute('aria-pressed'),'true');
 await page.locator('.switch[data-layer="electrical"]').click();assert.match(await page.locator('#detail').innerText(),/electrical/i);
 await page.locator('#showAll').click();assert.equal(await page.locator('#explode').getAttribute('aria-pressed'),'false');
 await page.locator('#prName').fill('Xray QA House');await page.locator('[data-step="measure"]').click();
 await page.locator('#prLength').fill('40');await page.locator('#prDepth').fill('30');await page.locator('#prHeight').fill('9');await page.locator('#prPitch').fill('0');
 const flat=await scene();await page.locator('#prPitch').fill('12');assert.notEqual(await scene(),flat);
 await page.locator('#prHeight').fill('100');assert.equal(await page.locator('#prErrors').isVisible(),true);
 await page.locator('#prSave').click();assert.equal(await page.locator('#prExisting option').count(),1);
 await page.locator('#prHeight').fill('9');await page.locator('#prPitch').fill('6');await page.locator('#prNotes').fill('Wall height measured on site.');
 await page.locator('[data-step="photos"]').click();
 const photo=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=180;c.height=120;c.getContext('2d').fillRect(0,0,180,120);return c.toDataURL('image/png').split(',')[1]}),'base64');
 await page.locator('#prFiles').setInputFiles({name:'front.png',mimeType:'image/png',buffer:photo});
 await page.waitForFunction(()=>document.querySelectorAll('#prPhotoGrid img').length===1);
 await page.getByRole('button',{name:'Preview Front photo 1',exact:true}).click();assert.equal(await page.locator('#prPhotoPreview').isVisible(),true);
 await page.locator('#prFiles').setInputFiles([{name:'good.png',mimeType:'image/png',buffer:photo},{name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')}]);
 await page.waitForFunction(()=>!document.querySelector('#prFiles').disabled);
 assert.equal(await page.locator('#prPhotoGrid img').count(),1,'failed photo batches must not partly import');
 await page.locator('#prFiles').setInputFiles(Array.from({length:12},(_,i)=>({name:`photo${i}.png`,mimeType:'image/png',buffer:photo})));
 assert.equal(await page.locator('#prPhotoGrid img').count(),1);
 await page.locator('#prSave').click();await page.waitForFunction(()=>document.querySelector('#prExisting').value!=='');
 const savedId=await page.locator('#prExisting').inputValue();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jbs-xray-projects-v1')));
 assert.equal(saved.length,1);assert.equal(saved[0].photos.length,1);assert.equal(saved[0].dimensions.pitch,6);
 const downloadPromise=page.waitForEvent('download');await page.locator('#prExport').click();const backup=await downloadPromise;
 const backupBytes=readFileSync(await backup.path());const data=JSON.parse(backupBytes);assert.deepEqual(data.project.dimensions,saved[0].dimensions);assert.equal(data.project.photos[0].url,saved[0].photos[0].url);
 await page.locator('#prName').fill('Unsaved change');page.once('dialog',d=>d.dismiss());await page.locator('#prNew').click();assert.equal(await page.locator('#prName').inputValue(),'Unsaved change');
 page.once('dialog',d=>d.accept());await page.locator('#prNew').click();await page.locator('#prExisting').selectOption(savedId);assert.match(await page.locator('#prViewSummary').innerText(),/1 real reference photos/);
 await page.locator('#prImport').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'jbs-xray-project',project:{...data.project,photos:[null]}}))});
 await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('invalid photo'));
 assert.equal(await page.locator('#prExisting option').count(),2);
 await page.locator('#prImport').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:backupBytes});
 await page.waitForFunction(()=>document.querySelectorAll('#prExisting option').length===3);
 await page.reload();await page.locator('#prExisting').selectOption(savedId);assert.equal(await page.locator('#prPhotoGrid img').count(),1);
 const pngPromise=page.waitForEvent('download');await page.locator('#export').click();const png=await pngPromise;
 assert.match(png.suggestedFilename(),/\.png$/);assert.equal(readFileSync(await png.path()).subarray(1,4).toString(),'PNG');
 const invalid=await page.locator('#draw').evaluate(root=>[...root.querySelectorAll('*')].flatMap(e=>[...e.attributes].filter(a=>/NaN|Infinity/.test(a.value)).map(a=>a.value)));
 assert.deepEqual(invalid,[]);
 await capture(page,{path:`test-results/xray-${width}.png`,fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Xray horizontal overflow');
 page.once('dialog',d=>d.accept());await page.locator('#prDelete').click();assert.equal(await page.locator('#prExisting option').count(),2);
 assert.deepEqual(errors,[]);assert.equal(writes.length,0);
 console.log(`PASS Xray ${width}px: presets, layers, measurements, partial/flat roof, photo fallback/batch errors, save/reopen, backup/restore, invalid imports, dirty-change guard, delete, PNG, no network writes`);
 await ctx.close();
}

export async function xrayAppNavigation(context,url){
 const {ctx,page,errors}=await context('customer',390);
 await page.goto(url);await page.locator('#jbs-customer-upgrade-root').waitFor({state:'visible'});
 await page.locator('[data-action="nav"][data-view="more"]').first().click();
 await page.locator('[data-action="open-xray"]').click();await page.waitForURL('**/scan-my-project.html');
 await page.locator('.workspace-links a[href="/portal"]').click();await page.locator('#jbs-customer-upgrade-root').waitFor({state:'visible'});
 assert.ok(await page.evaluate(()=>localStorage.getItem('sb-bjmdtxxlzzhxskxkllvt-auth-token')));
 await page.locator('[data-action="nav"][data-view="explore"]').first().click();await page.locator('[data-action="open-xray"]').click();await page.waitForURL('**/scan-my-project.html');
 assert.deepEqual(errors,[]);console.log('PASS app integration: Tools and Explore open Xray; return to app keeps the signed-in customer session');await ctx.close();
}
