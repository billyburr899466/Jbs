import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium as playwright } from 'playwright-core';
import chromium from '@sparticuz/chromium';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3210'],{stdio:['ignore','pipe','pipe']});
server.stdout.on('data',s=>process.stdout.write(s));server.stderr.on('data',s=>process.stderr.write(s));
let browser;
const watchdog=setTimeout(()=>{console.error('Browser verification exceeded 4 minutes');server.kill();process.exit(1);},240000);
const url='http://127.0.0.1:3210';
async function ready(){for(let i=0;i<60;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw new Error('Test server did not start');}
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const user={id:'11111111-1111-4111-8111-111111111111',email:'billyburr89@gmail.com',role:'authenticated',aud:'authenticated',user_metadata:{full_name:'Owner Test'}};
const token=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:user.id,email:user.email,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})+'.testsignature';
async function context(owner=false,width=390){
 if(browser)await browser.close().catch(()=>{});
 browser=await playwright.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
 const actor=owner==='customer'?{...user,email:'customer-ui-test@example.com',user_metadata:{full_name:'Customer Test'}}:user;
 const actorToken=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:actor.id,email:actor.email,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})+'.testsignature';
 const plans=[];const requests=[];
 const ctx=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
 const writes=[];const errors=[];
 await ctx.route('**/*.supabase.co/**',async route=>{const req=route.request(),u=new URL(req.url);if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
  if(!['GET','HEAD'].includes(req.method()))writes.push({path:u.pathname,method:req.method(),data:req.postData()});
  let data=[];
  if(u.pathname==='/auth/v1/user')data=actor;
  else if(u.pathname.includes('/customer_plans')){if(req.method()==='POST'){const value=JSON.parse(req.postData());const saved={...value,id:'22222222-2222-4222-8222-222222222222'};plans.push(saved);data=saved;}else if(req.method()==='PATCH'){const value=JSON.parse(req.postData());Object.assign(plans[0],value);data=plans[0];}else data=plans;}
  else if(u.pathname.includes('/quote_requests')){if(req.method()==='POST'){const value=JSON.parse(req.postData());const saved={...value,id:'33333333-3333-4333-8333-333333333333'};requests.push(saved);data=saved;}else data=requests;}

  else if(u.pathname.includes('/auth/'))data={};
  else if(u.pathname.includes('/business_state'))return route.fulfill({status:406,contentType:'application/json',body:JSON.stringify({message:'No seeded business state in UI test'})});
  else if(u.pathname.includes('/customer_workspace'))data=null;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data),headers:{'access-control-allow-origin':'*'}});
 });
 if(owner)await ctx.addInitScript(({token,user})=>localStorage.setItem('sb-bjmdtxxlzzhxskxkllvt-auth-token',JSON.stringify({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user})),{token:actorToken,user:actor});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 return {ctx,page,writes,errors,plans,requests,actor};
}
async function visible(page,selector){await page.locator(selector).first().waitFor({state:'visible'});}
async function click(page,selector){await page.locator(selector).first().click();}
async function demoFlow(width){
 const {ctx,page,writes,errors}=await context(false,width);await page.goto(url);await click(page,'.jbs-demo-entry');
 await visible(page,'[data-action="open-builder"]');
 assert.equal(await page.locator('.jbs-bottom-nav [data-action="nav"][data-view="messages"]').count(),1);
 await click(page,'[data-action="open-builder"]');
 await page.locator('[data-field="builder.name"]').fill('Patio Design Test');
 await page.locator('[data-field="builder.length"]').fill('20');await page.locator('[data-field="builder.depth"]').fill('14');await page.locator('[data-field="builder.shape"]').selectOption('l_shape');
 await page.locator('[data-field="builder.notchLength"]').fill('8');await page.locator('[data-field="builder.notchDepth"]').fill('5');
 assert.match(await page.locator('[data-deck-scene]').textContent(),/240 sq ft/);
 await click(page,'[data-action="builder-next"]');assert.match(await page.locator('[data-deck-scene]').textContent(),/20 × 14 ft/);
 await page.locator('[data-field="builder.stairLocation"]').selectOption('right');
 await click(page,'[data-action="deck-view"][data-angle="top"]');assert.match(await page.locator('[data-deck-scene]').textContent(),/TOP VIEW/);
 await click(page,'[data-action="builder-next"]');await page.locator('[data-field="builder.color"]').selectOption('Charcoal');await page.locator('[data-field="builder.material"]').selectOption('composite');
 assert.match(await page.locator('[data-deck-scene]').getAttribute('aria-label'),/Charcoal, right stairs/);
 await click(page,'[data-action="builder-next"]');assert.match(await page.locator('[data-deck-scene]').textContent(),/240 sq ft/);
 await click(page,'[data-action="save-builder"]');await visible(page,'[data-action="edit-builder"]');
 await click(page,'[data-action="edit-builder"]');assert.equal(await page.locator('[data-field="builder.length"]').inputValue(),'20');assert.match(await page.locator('[data-deck-scene]').getAttribute('aria-label'),/Charcoal, right stairs/);
 for(let i=0;i<3;i++)await click(page,'[data-action="builder-next"]');
 await click(page,'[data-action="builder-to-quote"]');await visible(page,'[data-field="quote.description"]');assert.match(await page.locator('[data-field="quote.description"]').inputValue(),/20 ft × 14 ft/);
 await click(page,'[data-action="close-modal"]');await click(page,'[data-action="nav"][data-view="more"]');await click(page,'[data-action="open-paint"]');
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=500;c.height=350;const g=c.getContext('2d');g.fillStyle='#c6b998';g.fillRect(0,0,500,350);g.fillStyle='#e5d7b5';g.fillRect(0,175,500,175);return c.toDataURL('image/png').split(',')[1];});
 await page.locator('[data-paint-file]').setInputFiles({name:'test-room.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await visible(page,'canvas[data-photo-ready="true"]');const canvas=page.locator('[data-paint-canvas]');
 const pixels=()=>canvas.evaluate(c=>{const g=c.getContext('2d');return {inside:Array.from(g.getImageData(c.width*.3,c.height*.3,1,1).data),outside:Array.from(g.getImageData(c.width*.9,c.height*.9,1,1).data)};});
 const before=await pixels();await page.locator('[data-paint="color"]').fill('#293d56');
 const box=await canvas.boundingBox();for(const [x,y] of [[.1,.1],[.7,.1],[.7,.7],[.1,.7]])await canvas.click({position:{x:box.width*x,y:box.height*y}});
 await click(page,'[data-paint-action="apply"]');const after=await pixels();assert.notDeepEqual(after.inside,before.inside);assert.deepEqual(after.outside,before.outside);
 await click(page,'[data-paint-action="save"]');await visible(page,'[data-action="edit-paint"]');await click(page,'[data-action="edit-paint"]');await visible(page,'canvas[data-photo-ready="true"]');assert.equal(await page.locator('[data-paint="active"] option').count(),2);
 await click(page,'[data-paint-action="quote"]');await visible(page,'[data-field="quote.description"]');assert.match(await page.locator('[data-field="quote.description"]').inputValue(),/painting/);
 await click(page,'[data-action="close-modal"]');await click(page,'[data-action="nav"][data-view="messages"]');await visible(page,'.jbs-thread');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false,'Page overflows horizontally');
 assert.equal(writes.length,0,'Guest demo attempted a live write');assert.deepEqual(errors,[],'Browser page errors');
 console.log(`PASS browser ${width}px: demo, navigation, deck state across steps, geometry, saved deck, quote handoff, real-photo color mask, saved paint, messages, no live writes`);await ctx.close();
}
async function customerFlow(){
 const {ctx,page,writes,errors,plans,requests,actor}=await context('customer',390);await page.goto(url);await visible(page,'#jbs-customer-upgrade-root');assert.equal(await page.locator('#jbs-owner-upgrade-root').count(),0);
 await click(page,'[data-action="open-builder"]');await page.locator('[data-field="builder.name"]').fill('Customer Private Deck');for(let i=0;i<3;i++)await click(page,'[data-action="builder-next"]');await click(page,'[data-action="builder-to-quote"]');await visible(page,'[data-field="quote.phone"]');
 assert.equal(plans.length,1);assert.equal(plans[0].user_id,actor.id);assert.equal(plans[0].customer_email,actor.email);assert.ok(plans[0].analyzer_result.preview.startsWith('data:image/png'));
 await page.locator('[data-field="quote.phone"]').fill('5550100199');await page.locator('[data-field="quote.location"]').fill('UI test address');for(let i=0;i<3;i++)await click(page,'[data-action="quote-next"]');await click(page,'[data-action="submit-quote-request"]');await page.waitForFunction(()=>!document.querySelector('[data-action="submit-quote-request"]'));
 assert.equal(requests.length,1);assert.equal(requests[0].plan_id,plans[0].id);assert.equal(requests[0].customer_email,actor.email);assert.ok(requests[0].photos[0].startsWith('data:image/png'));assert.deepEqual(errors,[]);
 console.log('PASS customer: authenticated private design save and quote request preserve identity, plan link, scope and preview image; owner tools hidden');await ctx.close();
}
async function ownerFlow(){const {ctx,page,writes,errors}=await context(true,1280);await page.goto(url);await visible(page,'#jbs-owner-upgrade-root');await click(page,'[data-owner-action="toggle"]');await click(page,'[data-owner-action="preview-builder"]');await visible(page,'[data-deck-scene]');await click(page,'[data-action="close-modal"]');await page.getByRole('button',{name:'Back to Owner',exact:true}).click();await visible(page,'[data-owner-action="toggle"]');assert.equal(await page.locator('#jbs-customer-upgrade-root').count(),0);assert.ok(await page.evaluate(()=>localStorage.getItem('sb-bjmdtxxlzzhxskxkllvt-auth-token')));assert.equal(writes.length,0,'Owner preview mutated data');assert.deepEqual(errors,[]);console.log('PASS owner: guest builder preview returns to owner without signing out or writing records');await ctx.close();}
try{await ready();await demoFlow(390);await demoFlow(1365);await customerFlow();await ownerFlow();const denied=await fetch(url+'/api/quote-response',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(denied.status,401);console.log('PASS API: unauthenticated quote response rejected');console.log('JBs 2.2.0 verification complete');}catch(e){console.error(e);process.exitCode=1;}finally{clearTimeout(watchdog);await browser?.close().catch(()=>{});server.kill();}
