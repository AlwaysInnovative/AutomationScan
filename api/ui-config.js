const ALLOWED_HOSTS=["automation-scan-neon.vercel.app","alwaysinnovatives-projects.vercel.app"];
function cors(res,origin){
  const ok=origin && (ALLOWED_HOSTS.some(function(h){return origin==="https://"+h;}) || /^https:\/\/automation-scan-[a-z0-9-]+-alwaysinnovatives-projects\.vercel\.app$/.test(origin));
  res.setHeader("Access-Control-Allow-Origin",ok?origin:"https://automation-scan-neon.vercel.app");
  res.setHeader("Vary","Origin");
  res.setHeader("Cache-Control","no-store");
}
module.exports=async function(req,res){
  cors(res,req.headers.origin||"");
  if(req.method!=="GET")return res.status(405).json({error:"method_not_allowed"});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return res.status(503).json({error:"ui_config_not_configured"});
  try{
    const r=await fetch(url+"/rest/v1/ui_config?config_key=eq.application_ui&active=eq.true&select=payload,version&limit=1",{headers:{apikey:key,Authorization:"Bearer "+key}});
    if(!r.ok)return res.status(502).json({error:"ui_config_unavailable"});
    const rows=await r.json();
    if(!rows[0])return res.status(404).json({error:"ui_config_missing"});
    return res.status(200).json({config:rows[0].payload,version:rows[0].version});
  }catch(e){return res.status(500).json({error:"ui_config_error"});}
};