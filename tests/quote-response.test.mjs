import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/api/quote-response/route.js',import.meta.url),'utf8').replace('import { NextResponse } from "next/server";','').replace('export async function POST','async function POST');
const handler=fetch=>new Function('fetch','NextResponse',source+'\nreturn POST;')(fetch,{json:(data,init)=>Response.json(data,init)});
const request=(body,token='test')=>new Request('https://test.invalid/api/quote-response',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
const payload={quoteId:'quote-1',responseStatus:'accepted',consented:true,signerName:'Test Customer',signatureData:'data:image/png;base64,dGVzdA==',selectedIds:['extra'],acceptedTotal:1};
function backend({email='test@example.invalid',failure=false,saveStatus=200}={}){
 const writes=[];
 return {writes,fetch:async(url,options={})=>{
  if(failure)throw Error('Network unavailable');
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'test-user',email:'test@example.invalid'});
  if(url.includes('/customer_records?'))return Response.json([{id:'quote-1',title:'Test quote',customer_email:email,line_items:[{id:'base',label:'Work',amount:1000},{id:'extra',label:'Option',amount:200,optional:true},{id:'unselected',label:'Not selected',amount:500,optional:true}]}]);
  if(url.includes('/quote_responses?')){writes.push(JSON.parse(options.body));return Response.json(saveStatus===200?[writes[0]]:{message:'Already signed'},{status:saveStatus});}
  throw Error('Unexpected request');
 }};
}
test('quote response rejects absent auth and malformed/null payloads without backend writes',async()=>{
 const b=backend();const post=handler(b.fetch);
 assert.equal((await post(request({},''))).status,401);
 for(const body of [null,[],{},'bad'])assert.equal((await post(request(body))).status,400);
 assert.equal(b.writes.length,0);
});
test('another customer cannot accept an unassigned quote',async()=>{
 const b=backend({email:'other@example.invalid'});assert.equal((await handler(b.fetch)(request(payload))).status,403);assert.equal(b.writes.length,0);
});
test('acceptance uses server prices and identity, preserves consent and snapshot',async()=>{
 const b=backend();const res=await handler(b.fetch)(request({...payload,user_id:'spoofed',customer_email:'spoofed@example.invalid'}));
 assert.equal(res.status,200);assert.equal(b.writes[0].accepted_total,1200);assert.equal(b.writes[0].user_id,'test-user');assert.equal(b.writes[0].customer_email,'test@example.invalid');assert.equal(b.writes[0].selected_items.length,2);assert.equal(b.writes[0].quote_snapshot.accepted_total,1200);assert.ok(b.writes[0].signed_at);assert.equal(b.writes[0].consented,true);
});
test('signature and consent are required, and change requests do not sign a quote',async()=>{
 const b=backend();const post=handler(b.fetch);
 assert.equal((await post(request({...payload,consented:false}))).status,400);assert.equal((await post(request({...payload,signatureData:''}))).status,400);assert.equal(b.writes.length,0);
 assert.equal((await post(request({quoteId:'quote-1',responseStatus:'changes_requested',requestedChanges:'Change finish'}))).status,200);assert.equal(b.writes[0].signed_at,null);assert.equal(b.writes[0].accepted_total,null);
});
test('backend outages and signed-response conflicts return useful errors',async()=>{
 assert.equal((await handler(backend({failure:true}).fetch)(request(payload))).status,503);
 assert.equal((await handler(backend({saveStatus:409}).fetch)(request(payload))).status,409);
});
