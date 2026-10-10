const ALLOWED_ORIGIN = "https://automation-scan-neon.vercel.app";
function cors(res) { res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN); res.setHeader("Vary", "Origin"); res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type"); res.setHeader("Cache-Control", "no-store"); }
function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function safeText(v, max=300) { return String(v ?? "").trim().slice(0,max); }
async function resendSend({key,from,to,subject,text,tags,idempotencyKey}) { return fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key,"Idempotency-Key":idempotencyKey},body:JSON.stringify({from,to,subject,text,tags})}); }
async function saveLead({url,key,email,reportConsent,marketingConsent,source,report,emailStatus,crmStatus}) {
 const response=await fetch(url+"/rest/v1/lead_submissions",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({email,report_consent:reportConsent,marketing_consent:marketingConsent,source,report_summary:report,email_delivery_status:emailStatus,crm_sync_status:crmStatus})});
 if(!response.ok) throw new Error("lead_storage_failed"); const rows=await response.json(); return rows&&rows[0]?rows[0].id:null;
}
async function updateLead(url,key,id,values) { if(!id)return; try { await fetch(url+"/rest/v1/lead_submissions?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(values)}); } catch (_) {} }
async function hubspotUpsert(email) {
 const token=process.env.HUBSPOT_ACCESS_TOKEN; if(!token)return {configured:false};
 const headers={"Content-Type":"application/json","Authorization":"Bearer "+token};
 const search=await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search",{method:"POST",headers,body:JSON.stringify({filterGroups:[{filters:[{propertyName:"email",operator:"EQ",value:email}]}],properties:["email"],limit:1})});
 if(!search.ok) return {configured:true,error:true}; const data=await search.json(); if(data.results&&data.results[0])return {configured:true,id:data.results[0].id,created:false};
 const create=await fetch("https://api.hubapi.com/crm/v3/objects/contacts",{method:"POST",headers,body:JSON.stringify({properties:{email}})});
 if(!create.ok)return {configured:true,error:true}; const result=await create.json(); return {configured:true,id:result.id,created:true};
}
module.exports=async function handler(req,res) {
 cors(res); if(req.method==="OPTIONS")return res.status(204).end(); if(req.method!=="POST")return res.status(405).json({error:"method_not_allowed"});
 try {
  const body=req.body||{}; if(body.website)return res.status(400).json({error:"invalid_request"});
  const email=safeText(body.email,160).toLowerCase(); const reportConsent=body.consent===true; const marketingConsent=body.marketingConsent===true;
  if(!emailOk(email)||!reportConsent)return res.status(400).json({error:"valid_email_and_report_consent_required"});
  const report=body.report&&typeof body.report==="object"?body.report:{}; const source=body.source&&typeof body.source==="object"?body.source:{};
  const summary="Industry: "+safeText(report.industry,100||"Unknown")+" | Evidence coverage: "+safeText(report.coverage,20)+" | Estimated investigation range: "+safeText(report.low,20)+"-"+safeText(report.high,20)+" hrs/month | Goal: "+safeText(report.goal,160)+" | Source: "+safeText(source.utm_source,100||"direct")+"/"+safeText(source.utm_medium,100||"(none)");
  const supabaseUrl=process.env.SUPABASE_URL; const supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!supabaseUrl||!supabaseKey)return res.status(503).json({error:"lead_storage_not_configured"});
  const ip=String((req.headers&&req.headers["x-forwarded-for"])||(req.socket&&req.socket.remoteAddress)||"unknown").split(",")[0].slice(0,100);
  const rateResponse=await fetch(supabaseUrl+"/rest/v1/rpc/consume_api_rate_limit",{method:"POST",headers:{apikey:supabaseKey,Authorization:"Bearer "+supabaseKey,"Content-Type":"application/json"},body:JSON.stringify({p_rate_key:"lead:"+ip,p_limit:10,p_window_seconds:300})});
  if(rateResponse.ok && (await rateResponse.json())!==true)return res.status(429).json({error:"Too many requests. Please try again later."});
  const key=process.env.RESEND_API_KEY, from=process.env.RESEND_FROM, owner=process.env.LEAD_NOTIFICATION_TO;
  const leadId=await saveLead({url:supabaseUrl,key:supabaseKey,email,reportConsent,marketingConsent,source,report,emailStatus:key&&from?"pending":"not_configured",crmStatus:marketingConsent?(process.env.HUBSPOT_ACCESS_TOKEN?"pending":"not_configured"):"not_requested"});
  let crm={configured:false}; if(marketingConsent) { try { crm=await hubspotUpsert(email); } catch (_) { crm={configured:true,error:true}; } await updateLead(supabaseUrl,supabaseKey,leadId,{crm_sync_status:crm.id?"synced":crm.configured?"failed":"not_configured"}); }
  if(!key||!from) return res.status(202).json({ok:true,leadStored:true,emailQueued:false,crmSynced:Boolean(crm.id),configurationPending:true});
  const idempotencyKey="automationscan:"+email+":"+safeText(report.coverage,20)+":"+safeText(report.industry,100);
  const reportEmail=await resendSend({key,from,to:[email],subject:"Your AutomationScan assessment",text:"Your AutomationScan assessment is ready.\\n\\n"+summary+"\\n\\nOpen AutomationScan: https://automation-scan-neon.vercel.app/",tags:[{name:"source",value:"automationscan"},{name:"coverage",value:safeText(report.coverage,20)||"na"}],idempotencyKey});
  await updateLead(supabaseUrl,supabaseKey,leadId,{email_delivery_status:reportEmail.ok?"sent":"failed"});
  if(owner) await resendSend({key,from,to:[owner],subject:"New AutomationScan lead",text:"New report-consented AutomationScan lead: "+email+"\\n\\n"+summary+"\\n\\nMarketing consent: "+marketingConsent+"\\nHubSpot synced: "+Boolean(crm.id),tags:[{name:"source",value:"automationscan-lead"}],idempotencyKey:"lead-notify:"+idempotencyKey}).catch(function(){});
  if(!reportEmail.ok)return res.status(502).json({error:"email_provider_error",leadStored:true,crmSynced:Boolean(crm.id)});
  return res.status(200).json({ok:true,leadStored:true,emailQueued:true,crmSynced:Boolean(crm.id)});
 } catch (_) { return res.status(500).json({error:"server_error"}); }
}