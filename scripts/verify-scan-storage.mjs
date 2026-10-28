// Explicit integration check. Uses one disposable job; never runs in normal builds.
// Auth and reconstruction are simulated. Database, original uploads, signed URLs,
// model storage, and cleanup use the configured Supabase project.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createScanServices } from '../lib/xray-services.js';
import { scansResponse } from '../lib/xray-scans.js';
import { testGlb } from '../tests/scan-fixtures.mjs';
import { zipSync } from 'fflate';
const ownerId = process.env.JBS_TEST_OWNER_ID;
if (!ownerId) throw Error('Set JBS_TEST_OWNER_ID to the owner UUID for this explicit integration check.');
const photos=Array.from({length:12},(_,i)=>Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(997,i)]));
const task=randomUUID(), uploads=[];
const archive=zipSync({'odm_texturing/model.glb':testGlb()});
const network=async(input,options)=>{
 const url=new URL(String(input));
 if(url.hostname!=='processor.test')return fetch(input,options);
 if(url.pathname==='/options')return Response.json([{name:'gltf'}]);
 if(url.pathname==='/task/new/init')return Response.json({uuid:task});
 if(url.pathname.includes('/task/new/upload/')){const image=options.body.get('images');const n=Number(image.name.split('.')[0]);assert.deepEqual(Buffer.from(await image.arrayBuffer()),photos[n]);uploads.push(n);return Response.json({success:true});}
 if(url.pathname.includes('/task/new/commit/'))return Response.json({uuid:task});
 if(url.pathname.endsWith('/info'))return Response.json({status:{code:40},progress:100});
 if(url.pathname.endsWith('/download/all.zip'))return new Response(archive);
 if(url.pathname==='/task/remove')return Response.json({success:true});
 throw Error('Unexpected test processor request');
};
const services=createScanServices({...process.env,XRAY_NODEODM_URL:'https://processor.test',XRAY_NODEODM_TOKEN:'test-processor-only'},network);
const id=randomUUID();
const call=async(path='',method='GET',body)=>{
 const response=await scansResponse(new Request('https://test.invalid/api/owner/scans'+path,{method,headers:{authorization:'Bearer mocked-owner-verification','content-type':'application/json'},body:body?JSON.stringify(body):undefined}),path.split('/').filter(Boolean),{services,fetchUser:async()=>Response.json({id:ownerId,email:'billyburr89@gmail.com'})});
 const data=await response.json();assert.ok(response.ok,`${method} ${path}: ${response.status} ${data.error}`);return data;
};
try {
 await call('','POST',{id,name:'Disposable storage integration test',photos:photos.map((p,i)=>({name:`test-${i}.jpg`,type:'image/jpeg',size:p.length,sha256:createHash('sha256').update(p).digest('hex')}))});
 for(let i=0;i<12;i++){
  const {url}=await call(`/${id}/upload`,'POST',{index:i});
  const uploaded=await fetch(url,{method:'PUT',headers:{'content-type':'image/jpeg'},body:photos[i]});assert.ok(uploaded.ok,`signed upload ${i}: ${uploaded.status}`);
 }
 assert.equal((await call('/'+id)).uploaded.length,12);
 await call(`/${id}/start`,'POST',{});
 for(let i=0;i<12;i++)await call(`/${id}/forward`,'POST',{});
 assert.deepEqual(uploads,Array.from({length:12},(_,i)=>i));
 await call(`/${id}/commit`,'POST',{});assert.equal((await call('/'+id)).scan.status,'completed');
 const model=await call(`/${id}/model`,'POST',{});const download=await fetch(model.url);assert.deepEqual(Buffer.from(await download.arrayBuffer()),testGlb());
 const anonymous=await fetch(process.env.SUPABASE_URL+`/storage/v1/object/public/owner-xray-scans/${ownerId}/${id}/model.glb`);assert.equal(anonymous.ok,false);
 console.log('PASS live private storage: 12 signed original uploads, exact-byte transfer, durable job transitions, private GLB save/download and anonymous denial; processor and owner verification mocked.');
} finally {
 const job=await services.store.get(id,ownerId);
 if(job)await services.store.delete(job);
 assert.equal(await services.store.get(id,ownerId),null);
 console.log('PASS disposable integration job and uploaded assets removed.');
}
process.exit(0);
