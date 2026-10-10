const ALLOWED_ORIGINS = new Set([
  "https://automation-scan-neon.vercel.app",
  "https://automation-scan-7rg404ewn-alwaysinnovatives-projects.vercel.app"
]);
function cors(res, origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "https://automation-scan-neon.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}
function emailOk(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
function field(v,max){return String(v||"").trim().slice(0,max);}
async function send({key,from,to,subject,text,idempotencyKey}){
 return fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`,"Idempotency-Key":idempotencyKey},body:JSON.stringify({from,to,subject,text})});
}
async function hubspotUpsert({email,name}){
 const token=process.env.HUBSPOT_ACCESS_TOKEN;if(!token)return {configured:false};
 const headers={"Content-Type":"application/json","Authorization":`Bearer ${token}`};
 const search=await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search",{method:"POST",headers,body:JSON.stringify({filterGroups:[{filters:[{propertyName:"email",operator:"EQ",value:email}]}],properties:["email"],limit:1})});
 if(search.ok){const data=await search.json();if(data.results?.[0]){const id=data.results[0].id;const update=await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${id}`,{method:"PATCH",headers,body:JSON.stringify({properties:{email,firstname:name.split(/\s+/)[0]||""}})});return {configured:true,created:false,id,updated:update.ok};}}
 const create=await fetch("https://api.hubapi.com/crm/v3/objects/contacts",{method:"POST",headers,body:JSON.stringify({properties:{email,firstname:name.split(/\s+/)[0]||""}})});
 if(create.ok){const data=await create.json();return {configured:true,created:true,id:data.id};}
 return {configured:true,error:true};
}
module.exports=async function handler(req,res){
 cors(res,req.headers.origin||"");
 if(req.method==="OPTIONS")return res.status(204).end();
 if(req.method!=="POST")return res.status(405).json({error:"method_not_allowed"});
 try{
  const body=req.body||{}; if(body.website)return res.status(400).json({error:"invalid_request"});
  const name=field(body.name,80),email=field(body.email,160).toLowerCase(),subject=field(body.subject,140),message=field(body.message,2000);
  if(!name||!emailOk(email)||!subject||!message||body.consent!==true)return res.status(400).json({error:"required_fields"});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(url&&key){
    const ip=String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"unknown").split(",")[0].slice(0,100);
    const rr=await fetch(url+"/rest/v1/rpc/consume_api_rate_limit",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({p_rate_key:"contact:"+ip,p_limit:5,p_window_seconds:300})});
    if(rr.ok && (await rr.json())!==true)return res.status(429).json({error:"Too many messages. Please try again later."});
  }
  if(!url||!key)return res.status(503).json({error:"contact_storage_not_configured"});
  const stored=await fetch(url+"/rest/v1/lead_submissions",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({lead_type:"contact",email,name,report_consent:true,marketing_consent:false,subject,message,source:body.source||{},report_summary:{contact_request:true},email_delivery_status:"pending",crm_sync_status:"not_requested"})});
  if(!stored.ok)return res.status(502).json({error:"contact_storage_failed"});
  const storedRows=await stored.json();const leadId=storedRows&&storedRows[0]?storedRows[0].id:null;
  const resendKey=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM,to=process.env.LEAD_NOTIFICATION_TO;
  if(!resendKey||!from||!to){
    if(leadId)await fetch(url+"/rest/v1/lead_submissions?id=eq."+encodeURIComponent(leadId),{method:"PATCH",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({email_delivery_status:"not_configured"})}).catch(()=>{});
    return res.status(202).json({ok:true,leadStored:true,emailQueued:false,configurationPending:true});
  }
  const source=body.source||{};
  const safe=`Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nLead source: ${field(source.utm_source,100)||"direct"} / ${field(source.utm_medium,100)||"(none)"}\nLanding page: ${field(source.landing_page,200)||"/"}\nReferrer: ${field(source.referrer,500)||"(none)"}\n\nMessage:\n${message}`;
  const crm={configured:false}; // Contact-response consent is not marketing consent; do not sync to CRM here.
  const sent=await send({key:resendKey,from,to:[to],subject:`AutomationScan contact: ${subject}`,text:safe,idempotencyKey:`contact:${email}:${subject}:${message.slice(0,40)}`});
  if(leadId)await fetch(url+"/rest/v1/lead_submissions?id=eq."+encodeURIComponent(leadId),{method:"PATCH",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({email_delivery_status:sent.ok?"sent":"failed"})}).catch(()=>{});
  if(!sent.ok)return res.status(502).json({error:"email_provider_error",leadStored:true});
  return res.status(200).json({ok:true,leadStored:true,crmSynced:false});
 }catch{return res.status(500).json({error:"server_error"});}
};
