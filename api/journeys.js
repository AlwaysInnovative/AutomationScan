const ALLOWED_ORIGINS=new Set(["https://automation-scan-neon.vercel.app","https://automation-scan-7rg404ewn-alwaysinnovatives-projects.vercel.app"]);
function cors(res,origin){res.setHeader("Access-Control-Allow-Origin",ALLOWED_ORIGINS.has(origin)?origin:"https://automation-scan-neon.vercel.app");res.setHeader("Vary","Origin");res.setHeader("Cache-Control","no-store");}
module.exports=async function(req,res){
 cors(res,req.headers.origin||"");
 if(req.method!=="GET")return res.status(405).json({error:"method_not_allowed"});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(503).json({error:"journeys_not_configured"});
 try{
  const r=await fetch(url+"/rest/v1/journey_templates?active=eq.true&select=id,name,summary,objective_prompt,entry_rules,stages,version&order=sort_order.asc",{headers:{apikey:key,Authorization:"Bearer "+key}});
  if(!r.ok)return res.status(502).json({error:"journey_catalog_unavailable"});
  return res.status(200).json({journeys:await r.json()});
 }catch(e){return res.status(500).json({error:"journey_catalog_error"});}
};