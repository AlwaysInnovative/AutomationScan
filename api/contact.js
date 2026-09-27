const ALLOWED_ORIGIN="https://automation-scan-neon.vercel.app";
function cors(res){res.setHeader("Access-Control-Allow-Origin",ALLOWED_ORIGIN);res.setHeader("Vary","Origin");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Cache-Control","no-store");}
function emailOk(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
async function send({key,from,to,subject,text,idempotencyKey}){return fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`,"Idempotency-Key":idempotencyKey},body:JSON.stringify({from,to,subject,text})});}
async function hubspotUpsert({email,name,subject,message,source}){
 const token=process.env.HUBSPOT_ACCESS_TOKEN;if(!token)return {configured:false};
 const headers={"Content-Type":"application/json","Authorization":`Bearer ${token}`};
 const props={email,firstname:name.split(/\s+/)[0]||""};
 const search=await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search",{method:"POST",headers,body:JSON.stringify({filterGroups:[{filters:[{propertyName:"email",operator:"EQ",value:email}]}],properties:["email"],limit:1})});
 if(search.ok){const data=await search.json();if(data.results?.[0]){const id=data.results[0].id;const update=await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${id}`,{method:"PATCH",headers,body:JSON.stringify({properties:props})});return {configured:true,created:false,id,updated:update.ok};}}
 const create=await fetch("https://api.hubapi.com/crm/v3/objects/contacts",{method:"POST",headers,body:JSON.stringify({properties:props})});
 if(create.ok){const data=await create.json();return {configured:true,created:true,id:data.id};}
 return {configured:true,error:true};
}
export default async function handler(req,res){
 cors(res); if(req.method==="OPTIONS")return res.status(204).end(); if(req.method!=="POST")return res.status(405).json({error:"method_not_allowed"});
 try{
  const body=req.body||{}; if(body.website)return res.status(400).json({error:"invalid_request"});
  const name=String(body.name||"").trim(),email=String(body.email||"").trim().toLowerCase(),subject=String(body.subject||"").trim(),message=String(body.message||"").trim(),source=body.source||{};
  if(!name||!emailOk(email)||!subject||!message||body.consent!==true)return res.status(400).json({error:"required_fields"});
  const key=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM,to=process.env.LEAD_NOTIFICATION_TO;
  if(!key||!from||!to)return res.status(503).json({error:"contact_not_configured"});
  const safe=`Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nLead source: ${source.utm_source||"direct"} / ${source.utm_medium||"(none)"}\nLanding page: ${source.landing_page||"/"}\nReferrer: ${source.referrer||"(none)"}\n\nMessage:\n${message}`;
  let crm={configured:false}; try{crm=await hubspotUpsert({email,name,subject,message,source});}catch{crm={configured:true,error:true};}\n   const sent=await send({key,from,to:[to],subject:`AutomationScan contact: ${subject}`,text:safe,idempotencyKey:`contact:${email}:${Date.now()}`});
  if(!sent.ok)return res.status(502).json({error:"email_provider_error"});
  return res.status(200).json({ok:true,crmSynced:!!crm.id});
 }catch{return res.status(500).json({error:"server_error"});}
}