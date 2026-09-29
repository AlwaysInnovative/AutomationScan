const ALLOWED_ORIGIN="https://automation-scan-neon.vercel.app";

function cors(res){
  res.setHeader("Access-Control-Allow-Origin",ALLOWED_ORIGIN);
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Cache-Control","no-store");
}

function emailOk(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);}

async function resendSend({key,from,to,subject,text,tags,idempotencyKey}){
  return fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`,"Idempotency-Key":idempotencyKey},body:JSON.stringify({from,to,subject,text,tags})});
}

async function hubspotUpsert(email,context={}){
  const token=process.env.HUBSPOT_ACCESS_TOKEN;
  if(!token)return {configured:false};
  const headers={"Content-Type":"application/json","Authorization":`Bearer ${token}`};
  const search=await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search",{method:"POST",headers,body:JSON.stringify({filterGroups:[{filters:[{propertyName:"email",operator:"EQ",value:email}]}],properties:["email"],limit:1})});
  if(search.ok){
    const data=await search.json();
    if(data.results?.[0])return {configured:true,created:false,id:data.results[0].id};
  }
  const create=await fetch("https://api.hubapi.com/crm/v3/objects/contacts",{method:"POST",headers,body:JSON.stringify({properties:{email}})});
  if(create.ok){const data=await create.json();return {configured:true,created:true,id:data.id};}
  return {configured:true,error:true};
}

export default async function handler(req,res){
  cors(res);
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"method_not_allowed"});
  try{
    const body=req.body||{};
    if(body.website)return res.status(400).json({error:"invalid_request"});
    const email=String(body.email||"").trim().toLowerCase();
    if(!emailOk(email)||body.consent!==true)return res.status(400).json({error:"consent_required"});

    const r=body.report||{};
    const source=body.source||{}; const summary=`Industry: ${String(r.industry||"Unknown")} | Signal: ${Number(r.score||0)}/100 | Estimated: ${String(r.low||0)}-${String(r.high||0)} hrs/month | Goal: ${String(r.goal||"Not specified")} | Source: ${String(source.utm_source||"direct")}/${String(source.utm_medium||"(none)")}`;
    const supabaseUrl=process.env.SUPABASE_URL, supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(supabaseUrl&&supabaseKey){
      const ip=String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"unknown").split(",")[0].slice(0,100);
      const rr=await fetch(supabaseUrl+"/rest/v1/rpc/consume_api_rate_limit",{method:"POST",headers:{apikey:supabaseKey,Authorization:"Bearer "+supabaseKey,"Content-Type":"application/json"},body:JSON.stringify({p_rate_key:"lead:"+ip,p_limit:10,p_window_seconds:300})});\n      if(rr.ok && (await rr.json())!==true)return res.status(429).json({error:"Too many requests. Please try again later."});
    }

    const key=process.env.RESEND_API_KEY;
    const from=process.env.RESEND_FROM;
    const owner=process.env.LEAD_NOTIFICATION_TO;
    const idempotencyKey=`automationscan:${email}:${Number(r.score||0)}:${String(r.industry||"unknown")}`;

    let hubspot={configured:false};
    try{hubspot=await hubspotUpsert(email,{source:body.source,report:r});}catch{hubspot={configured:true,error:true};}

    if(!key||!from){
      return res.status(202).json({ok:true,emailQueued:false,crmSynced:!!hubspot.id,configurationPending:true});
    }

    const reportEmail=await resendSend({
      key,from,to:[email],subject:"Your AutomationScan assessment",
      text:`Your AutomationScan assessment is ready.\n\n${summary}\n\nOpen AutomationScan: https://automation-scan-neon.vercel.app/`,
      tags:[{name:"source",value:"automationscan"},{name:"score",value:String(Number(r.score||0))}],
      idempotencyKey
    });

    if(owner){
      await resendSend({
        key,from,to:[owner],subject:"New AutomationScan lead",
        text:`New consented AutomationScan lead: ${email}\n\n${summary}\n\nHubSpot synced: ${hubspot.id?"yes":"no"}`,
        tags:[{name:"source",value:"automationscan-lead"}],
        idempotencyKey:`lead-notify:${idempotencyKey}`
      }).catch(()=>{});
    }

    if(!reportEmail.ok){
      return res.status(502).json({error:"email_provider_error",crmSynced:!!hubspot.id});
    }
    return res.status(200).json({ok:true,emailQueued:true,crmSynced:!!hubspot.id});
  }catch{
    return res.status(500).json({error:"server_error"});
  }
}