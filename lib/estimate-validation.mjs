const text=(value,max)=>String(value??'').trim().slice(0,max);
export function validateEstimate(payload={}) {
  if (!payload || typeof payload!=='object' || Array.isArray(payload)) return {ok:false,error:'Invalid request.'};
  const customer_name=text(payload.name,121);
  const customer_email=text(payload.email,255).toLowerCase() || null;
  const phone=text(payload.phone,31) || null;
  const city=text(payload.city,121);
  const project_type=text(payload.projectType,81) || 'Renovation';
  const description=text(payload.description,3001);
  const timeframe=text(payload.timeframe,121) || null;
  const preferred_contact=['phone','email','either'].includes(payload.contactPreference)?payload.contactPreference:'either';
  const source=text(payload.source,101) || 'website';
  if(customer_name.length<2||customer_name.length>120) return {ok:false,error:'Enter your name.'};
  if(!customer_email&&!phone) return {ok:false,error:'Enter a phone number or email address.'};
  if(customer_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email))return {ok:false,error:'Enter a valid email address.'};
  if(phone&&!/^[+()\d.\s-]{7,30}$/.test(phone))return {ok:false,error:'Enter a valid phone number.'};
  if(city.length<2||city.length>120)return {ok:false,error:'Enter your city or town.'};
  if(project_type.length<2||project_type.length>80)return {ok:false,error:'Choose a project type.'};
  if(description.length<12||description.length>3000)return {ok:false,error:'Describe your project (at least 12 characters).'};
  if(timeframe&&timeframe.length>120)return {ok:false,error:'Timeframe is too long.'};
  if(source.length>100)return {ok:false,error:'Invalid source.'};
  if(payload.consent!==true)return {ok:false,error:'Please agree to be contacted about your estimate.'};
  return {ok:true,data:{customer_name,customer_email,phone,city,project_type,description,timeframe,preferred_contact,source}};
}
