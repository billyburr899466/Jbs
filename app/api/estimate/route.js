import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { validateEstimate } from '../../../lib/estimate-validation.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
function reply(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function backend(){
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Private lead storage is not configured.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export async function POST(request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return reply({error:'This form must be submitted from the JB\'s estimate page.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Invalid request format.'},415);
 if(Number(request.headers.get('content-length')||0)>12000)return reply({error:'Request too large.'},413);
 let input;
 try{
  const raw=await request.text();
  if(raw.length>12000)return reply({error:'Request too large.'},413);
  input=JSON.parse(raw);
 }catch{return reply({error:'Invalid request.'},400);}
 // An invisible field protects against common automated spam.
 if(input?.companyWebsite)return reply({ok:true},201);
 const validated=validateEstimate(input);
 if(!validated.ok)return reply({error:validated.error},400);
 const ip=(request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
 const secret=process.env.SUPABASE_JWT_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
 const ip_hash=createHash('sha256').update(ip+'|'+secret+'|estimate-v1').digest('hex');
 try{
  const db=backend();
  const since=new Date(Date.now()-24*60*60*1000).toISOString();
  const {count,error:countError}=await db.from('public_estimate_leads').select('id',{head:true,count:'exact'}).eq('ip_hash',ip_hash).gte('created_at',since);
  if(countError)throw countError;
  if(count>=4)return reply({error:'Too many requests. Please call us at 574-366-0744.'},429);
  const {error}=await db.from('public_estimate_leads').insert({...validated.data,ip_hash});
  if(error)throw error;
  return reply({ok:true,message:'Your request has been received. JB\'s will follow up.'},201);
 }catch(error){
  console.error('[public-estimate]',error?.message||'Unknown storage error');
  return reply({error:'Unable to submit right now. Please call 574-366-0744.'},503);
 }
}
