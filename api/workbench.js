const crypto = require("crypto");

const ALLOWED_ORIGINS = new Set([
  "https://automation-scan-neon.vercel.app",
  "https://automation-scan-7rg404ewn-alwaysinnovatives-projects.vercel.app"
]);

function cors(res, origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "https://automation-scan-neon.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Cache-Control", "no-store");
}

function token() { return crypto.randomBytes(32).toString("hex"); }
function hash(v) { return crypto.createHash("sha256").update(String(v)).digest("hex"); }
function validId(v) { return /^[A-Za-z0-9_-]{8,120}$/.test(String(v || "")); }
function validState(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  try { return JSON.stringify(v).length <= 900000; } catch { return false; }
}
function safeEq(a,b) {
  const aa=Buffer.from(String(a||"")), bb=Buffer.from(String(b||""));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}

async function rateLimit(url,key,limit=20,windowSeconds=60){
  try{
    const r=await fetch(url+"/rest/v1/rpc/consume_api_rate_limit",{
      method:"POST",
      headers:{"apikey":process.env.SUPABASE_SERVICE_ROLE_KEY,"Authorization":"Bearer "+process.env.SUPABASE_SERVICE_ROLE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({p_rate_key:key,p_limit:limit,p_window_seconds:windowSeconds})
    });
    return r.ok ? await r.json() : true;
  }catch{return true;}
}

module.exports = async function handler(req,res){
  cors(res, req.headers.origin || "");
  if(req.method==="OPTIONS") return res.status(204).end();

  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return res.status(503).json({error:"Cloud persistence is not configured"});
  const ip=String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"unknown").split(",")[0].slice(0,100);
  if(!(await rateLimit(url,"workbench:"+ip,30,60))) return res.status(429).json({error:"Too many requests. Please wait a minute."});

  const body=req.body||{};
  const id=String((req.query&&req.query.id)||body.id||"");
  const accessToken=String((req.query&&req.query.token)||body.token||"");

  if(!validId(id)) return res.status(400).json({error:"Invalid assessment id"});
  if(req.method==="GET"){
    if(!accessToken) return res.status(401).json({error:"Assessment access token required"});
    const r=await fetch(url+"/rest/v1/workbench_assessments?id=eq."+encodeURIComponent(id)+"&select=id,state,created_at,updated_at,expires_at,access_token_hash",{headers:{apikey:key,Authorization:"Bearer "+key}});
    if(!r.ok) return res.status(502).json({error:"Persistence read failed"});
    const rows=await r.json();
    if(!rows.length) return res.status(404).json({error:"Assessment not found"});
    const row=rows[0];
    if(row.expires_at && new Date(row.expires_at).getTime()<Date.now()) return res.status(410).json({error:"Assessment access has expired"});
    if(!safeEq(hash(accessToken),row.access_token_hash)) return res.status(403).json({error:"Invalid assessment access token"});
    delete row.access_token_hash;
    return res.status(200).json(row);
  }

  if(req.method==="POST"){
    if(!validState(body.state)) return res.status(400).json({error:"Invalid or oversized assessment state"});
    const now=new Date().toISOString();
    const lookup=await fetch(url+"/rest/v1/workbench_assessments?id=eq."+encodeURIComponent(id)+"&select=id,access_token_hash,expires_at",{headers:{apikey:key,Authorization:"Bearer "+key}});
    if(!lookup.ok) return res.status(502).json({error:"Persistence lookup failed"});
    const existing=(await lookup.json())[0];
    let writeToken=accessToken;
    let writeHash=existing?.access_token_hash;
    if(existing){
      if(!accessToken || !safeEq(hash(accessToken),writeHash)) return res.status(403).json({error:"Invalid assessment access token"});
      if(existing.expires_at && new Date(existing.expires_at).getTime()<Date.now()) return res.status(410).json({error:"Assessment access has expired"});
    } else {
      writeToken=token();
      writeHash=hash(writeToken);
    }
    const expiresAt=new Date(Date.now()+30*24*60*60*1000).toISOString();
    const payload={id,state:body.state,updated_at:now,access_token_hash:writeHash,expires_at:existing?.expires_at||expiresAt};
    const r=await fetch(url+"/rest/v1/workbench_assessments?on_conflict=id",{
      method:"POST",
      headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify(payload)
    });
    if(!r.ok) return res.status(502).json({error:"Persistence write failed"});
    return res.status(200).json({ok:true,id,accessToken:writeToken,expiresAt:payload.expires_at});
  }
  return res.status(405).json({error:"Method not allowed"});
};
