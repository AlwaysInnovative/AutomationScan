const ALLOWED_ORIGIN="https://automation-scan-neon.vercel.app";
function cors(res){res.setHeader("Access-Control-Allow-Origin",ALLOWED_ORIGIN);res.setHeader("Vary","Origin");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Cache-Control","no-store");}
function emailOk(v){return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v);}
async function send({key,from,to,subject,text,idempotencyKey}){return fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`,"Idempotency-Key":idempotencyKey},body:JSON.stringify({from,to,subject,text})});}
export default async function handler(req,res){
 cors(res); if(req.method==="OPTIONS")return res.status(204).end(); if(req.method!=="POST")return res.status(405).json({error:"method_not_allowed"});
 try{
  const body=req.body||{}; if(body.website)return res.status(400).json({error:"invalid_request"});
  const name=String(body.name||"").trim(),email=String(body.email||"").trim().toLowerCase(),subject=String(body.subject||"").trim(),message=String(body.message||"").trim();
  if(!name||!emailOk(email)||!subject||!message||body.consent!==true)return res.status(400).json({error:"required_fields"});
  const key=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM,to=process.env.LEAD_NOTIFICATION_TO;
  if(!key||!from||!to)return res.status(503).json({error:"contact_not_configured"});
  const safe=`Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`;
  const sent=await send({key,from,to:[to],subject:`AutomationScan contact: ${subject}`,text:safe,idempotencyKey:`contact:${email}:${Date.now()}`});
  if(!sent.ok)return res.status(502).json({error:"email_provider_error"});
  return res.status(200).json({ok:true});
 }catch{return res.status(500).json({error:"server_error"});}
}