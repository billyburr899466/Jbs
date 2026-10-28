import test from 'node:test';
import assert from 'node:assert/strict';
import { scansResponse, extractModel } from '../lib/xray-scans.js';
import { inspectGlb, validateManifest, SCAN_LIMITS } from '../lib/xray-formats.js';
import { boundedBytes, createScanServices } from '../lib/xray-services.js';
import { ScanError } from '../lib/xray-services.js';
import { fakeScanServices, manifest, owner, testGlb } from './scan-fixtures.mjs';
import { zipSync } from 'fflate';

function api(services, user=owner) {return async (path='',method='GET',body,token='valid-token')=>{
  const request=new Request('https://test.invalid/api/owner/scans'+path,{method,headers:token?{authorization:'Bearer '+token,'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const result=await scansResponse(request,path.split('/').filter(Boolean),{services,fetchUser:async()=>Response.json(user)});
  return {status:result.status,body:await result.json(),headers:result.headers};
};}
async function prepare(s) {const a=api(s),m=manifest();const r=await a('','POST',m);assert.equal(r.status,201);s.uploaded.set(m.id,m.photos.map((_,i)=>i));return {a,m};}
async function complete(s) {const {a,m}=await prepare(s);await a('/'+m.id+'/start','POST',{});for(let i=0;i<12;i++)assert.equal((await a('/'+m.id+'/forward','POST',{})).status,200);await a('/'+m.id+'/commit','POST',{});s.options.code=40;await a('/'+m.id);return {a,m};}

test('scan endpoints verify owner identity before touching private jobs',async()=>{
 const s=fakeScanServices();
 for(const path of ['', '/connection', '/11111111-1111-4111-8111-111111111111/model']){
  assert.equal((await api(s)(path,'GET',undefined,'')).status,401);
  assert.equal((await api(s,{...owner,email:'customer@example.com'})(path)).status,403);
 }
 assert.equal(s.calls.length,0);
});
test('unconfigured processor cannot accept photos or claim a scan was created',async()=>{
 const s=fakeScanServices();s.configured=false;const a=api(s);
 assert.equal((await a()).body.configured,false);
 assert.equal((await a('','POST',manifest())).status,503);assert.equal(s.rows.size,0);assert.equal(s.calls.length,0);
});
test('manifest validation rejects insufficient, duplicate, unsupported and oversized photos',async()=>{
 const m=manifest();assert.equal(validateManifest(m).photos.length,12);
 for(const value of [{...m,photos:m.photos.slice(0,4)},{...m,photos:Array(12).fill(m.photos[0])},{...m,photos:m.photos.map(p=>({...p,type:'image/heic'}))},{...m,photos:m.photos.map(p=>({...p,size:SCAN_LIMITS.photoBytes+1}))}]){
  assert.throws(()=>validateManifest(value));assert.equal((await api(fakeScanServices())('','POST',value)).status,400);
 }
});
test('create retries are idempotent and another owner cannot access or mutate a scan',async()=>{
 const s=fakeScanServices(),{a,m}=await prepare(s);
 assert.equal((await a('','POST',m)).status,200);assert.equal(s.rows.size,1);
 assert.equal((await a('','POST',{...m,name:'different'})).status,409);
 const other=api(s,{id:'22222222-2222-4222-8222-222222222222',email:'jeremiahgrider24@gmail.com'});
 for(const [path,method] of [['','GET'],['/upload','POST'],['/model','POST'],['','DELETE']])assert.equal((await other('/'+m.id+path,method,method==='POST'?{}:undefined)).status,404);
});
test('upload completion, serialized forwarding, commit and cached GLB form one complete lifecycle',async()=>{
 const s=fakeScanServices(),a=api(s),m=manifest();await a('','POST',m);
 assert.equal((await a('/'+m.id+'/start','POST',{})).status,409);
 assert.equal((await a('/'+m.id+'/upload','POST',{index:-1})).status,400);
 s.uploaded.set(m.id,m.photos.map((_,i)=>i));
 assert.equal((await a('/'+m.id+'/start','POST',{})).body.scan.status,'sending');
 assert.equal((await a('/'+m.id+'/commit','POST',{})).status,409);
 for(let i=0;i<12;i++)assert.equal((await a('/'+m.id+'/forward','POST',{})).body.scan.forwarded,i+1);
 await a('/'+m.id+'/commit','POST',{});await a('/'+m.id+'/commit','POST',{});
 assert.equal(s.calls.filter(x=>x[0]==='commit').length,1);
 s.options.code=20;s.options.progress=42;assert.equal((await a('/'+m.id)).body.scan.progress,42);
 s.options.code=40;assert.equal((await a('/'+m.id)).body.scan.status,'completed');
 for(let i=0;i<2;i++){const r=await a('/'+m.id+'/model','POST',{});assert.equal(r.status,200);assert.match(r.body.url,/model.glb/);assert.match(r.headers.get('cache-control'),/private, no-store/);assert.equal('provider_task_id' in r.body.scan,false);}
 assert.equal(s.calls.filter(x=>x[0]==='archive').length,1);
 assert.equal((await a('/'+m.id,'DELETE')).status,200);assert.equal(s.rows.size,0);assert.ok(s.calls.some(x=>x[0]==='remove'));
});
test('ambiguous interrupted transfers require a fresh task instead of duplicating a photo',async()=>{
 const s=fakeScanServices(),{a,m}=await prepare(s);await a('/'+m.id+'/start','POST',{});s.options.failUpload=true;
 const r=await a('/'+m.id+'/forward','POST',{});assert.equal(r.status,502);assert.equal(r.body.scan.status,'failed');assert.doesNotMatch(JSON.stringify(r),/must-not-leak/);
 s.options.failUpload=false;await a('/'+m.id+'/start','POST',{});assert.equal(s.calls.filter(x=>x[0]==='init').length,2);
 assert.equal((await a('/'+m.id+'/forward','POST',{})).body.scan.forwarded,1);
 s.rows.get(m.id).inflight=1;assert.equal((await a('/'+m.id+'/forward','POST',{})).status,409);
 assert.equal(s.calls.filter(x=>x[0]==='upload').length,2);
});
test('database leases prevent concurrent changes and processor changes cannot mix private jobs',async()=>{
 const s=fakeScanServices(),{a,m}=await prepare(s);s.options.lock=true;
 assert.equal((await a('/'+m.id+'/start','POST',{})).status,409);s.options.lock=false;await a('/'+m.id+'/start','POST',{});
 s.fingerprint='replacement';assert.equal((await a('/'+m.id+'/forward','POST',{})).status,409);
});
test('cancel and retry keep originals; deletion removes submitted provider tasks',async()=>{
 const s=fakeScanServices(),{a,m}=await complete(s);s.rows.get(m.id).status='running';
 assert.equal((await a('/'+m.id+'/cancel','POST',{})).body.scan.status,'canceled');
 assert.equal(s.uploaded.get(m.id).length,12);
 await a('/'+m.id+'/start','POST',{});assert.ok(s.calls.some(x=>x[0]==='remove'));
});
test('GLB and archive validation reject external requests, invalid data and absent models',()=>{
 assert.equal(inspectGlb(testGlb()).meshes.length,1);
 assert.throws(()=>inspectGlb(testGlb({images:[{uri:'https://attacker.invalid/photo'}]})),/External/);
 assert.throws(()=>inspectGlb(testGlb({buffers:[{uri:'file:///secret'}]})),/External/);
 assert.throws(()=>inspectGlb(testGlb({extensionsRequired:['KHR_draco_mesh_compression']})),/compression/);
 assert.throws(()=>inspectGlb(testGlb().subarray(0,50)),/valid GLB/);
 assert.throws(()=>extractModel(zipSync({'not-a-model.txt':new Uint8Array([1])})),/without a GLB/);
 assert.throws(()=>extractModel(new Uint8Array([1,2])),/invalid model archive/);
 assert.deepEqual(Buffer.from(extractModel(zipSync({'a.glb':testGlb(),'bad.txt':new Uint8Array([1])}))),testGlb());
});
test('private provider configuration is server-controlled and large responses are bounded',async()=>{
 const env={SUPABASE_URL:'https://bjmdtxxlzzhxskxkllvt.supabase.co',SUPABASE_SECRET_KEY:'test-secret',XRAY_NODEODM_TOKEN:'server-token',NODE_ENV:'production'};
 for(const endpoint of ['http://localhost:3000','https://user:pass@example.com','https://example.com?token=bad','ftp://example.com'])assert.equal(createScanServices({...env,XRAY_NODEODM_URL:endpoint}).configured,false);
 assert.equal(createScanServices({...env,XRAY_NODEODM_URL:'https://processor.example.com'}).configured,true);
 await assert.rejects(()=>boundedBytes(new Response(new Uint8Array(20),{headers:{'content-length':'20'}}),10),/too large/);
 await assert.rejects(()=>boundedBytes(new Response(new Uint8Array(20)),10),/size limit/);
});

test('expired provider tasks become retryable while originals remain saved',async()=>{
 const s=fakeScanServices(),{a,m}=await complete(s);s.rows.get(m.id).status='queued';
 s.provider.info=async()=>{throw new ScanError('Expired',404);};
 const result=await a('/'+m.id);assert.equal(result.body.scan.status,'failed');assert.match(result.body.scan.error,/expired/);assert.equal(s.uploaded.get(m.id).length,12);
});

test('NodeODM adapter uses documented staging protocol and never returns the processor token',async()=>{
 const calls=[];const id='11111111-1111-4111-8111-111111111111';
 const provider=createScanServices({SUPABASE_URL:'https://bjmdtxxlzzhxskxkllvt.supabase.co',SUPABASE_SECRET_KEY:'server-test',XRAY_NODEODM_URL:'https://processor.example.test',XRAY_NODEODM_TOKEN:'never-public',NODE_ENV:'production'},async(url,options)=>{
  assert.equal(url.searchParams.get('token'),'never-public');assert.equal(options.redirect,'error');calls.push(url.pathname);
  if(url.pathname==='/options')return Response.json([{name:'gltf'}]);
  if(url.pathname==='/task/new/init'){const settings=JSON.parse(options.body.get('options'));assert.ok(settings.some(o=>o.name==='gltf'&&o.value===true));assert.deepEqual(JSON.parse(options.body.get('outputs')),['odm_texturing']);return Response.json({uuid:id});}
  if(url.pathname.includes('/upload/')){assert.equal(options.body.get('images').name,'0000.jpg');return Response.json({success:true});}
  if(url.pathname.includes('/commit/'))return Response.json({uuid:id});
  if(url.pathname.endsWith('/info'))return Response.json({status:{code:40}});
  if(url.pathname.endsWith('/all.zip'))return new Response(zipSync({'model.glb':testGlb()}));
  return Response.json({error:'Invalid UUID'});
 }).provider;
 await provider.check();const j={...manifest(),owner_id:owner.id,provider_task_id:id};assert.equal(await provider.init(j),id);
 await provider.upload(j,0,new Blob(['photo']));await provider.commit(j);assert.equal((await provider.info(j)).status.code,40);
 assert.ok(extractModel(await provider.archive(j)));await provider.remove(j);await provider.cancel(j);
 assert.equal(calls.length,8);
});
