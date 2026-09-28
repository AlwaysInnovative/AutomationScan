async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  const origin=req.headers.origin||"";const allowed=new Set(["https://automation-scan-neon.vercel.app","https://automation-scan-7rg404ewn-alwaysinnovatives-projects.vercel.app"]);res.setHeader("Access-Control-Allow-Origin",allowed.has(origin)?origin:"https://automation-scan-neon.vercel.app");res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Headers","content-type");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  if(req.method==="OPTIONS")return res.status(204).end();
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return res.status(503).json({error:"Cloud persistence is not configured"});
  const id=(req.query&&req.query.id)||((req.body||{}).id);
  if(req.method==="GET"){
    if(!id)return res.status(400).json({error:"Missing assessment id"});
    const r=await fetch(url+"/rest/v1/workbench_assessments?id=eq."+encodeURIComponent(id)+"&select=id,state,created_at,updated_at",{headers:{apikey:key,Authorization:"Bearer "+key}});
    if(!r.ok)return res.status(502).json({error:"Persistence read failed"});
    const rows=await r.json();if(!rows.length)return res.status(404).json({error:"Assessment not found"});
    return res.status(200).json(rows[0]);
  }
  if(req.method==="POST"){
    const body=req.body||{}, state=body.state;
    if(!id||!state)return res.status(400).json({error:"Assessment id and state are required"});
    const payload={id:String(id).slice(0,120),state:state,updated_at:new Date().toISOString()};
    const r=await fetch(url+"/rest/v1/workbench_assessments?on_conflict=id",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(payload)});
    if(!r.ok)return res.status(502).json({error:"Persistence write failed"});
    return res.status(200).json({ok:true,id:payload.id});
  }
  return res.status(405).json({error:"Method not allowed"});
}
module.exports=handler;
