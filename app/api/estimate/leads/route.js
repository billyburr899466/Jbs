import { createClient } from '@supabase/supabase-js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const OWNER_EMAILS=new Set(['billyburr89@gmail.com','jeremiahgrider24@gmail.com']);
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(request){
 const match=/^Bearer ([A-Za-z0-9._-]+)$/.exec(request.headers.get('authorization')||'');
 if(!match)return json({error:'Sign in to your JB\'s owner account first.'},401);
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return json({error:'Lead storage is not configured.'},503);
 try{
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:{user},error:authError}=await db.auth.getUser(match[1]);
  if(authError||!user||!OWNER_EMAILS.has((user.email||'').toLowerCase())||!user.email_confirmed_at)return json({error:'Owner access required.'},403);
  const {data,error}=await db.from('public_estimate_leads').select('id,customer_name,customer_email,phone,city,project_type,description,timeframe,preferred_contact,source,created_at').order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  return json({leads:data||[]});
 }catch(error){console.error('[owner-estimates]',error?.message);return json({error:'Could not load estimate requests.'},503);}
}
