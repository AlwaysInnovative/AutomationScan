const ALLOWED_HOSTS=["automation-scan-neon.vercel.app","alwaysinnovatives-projects.vercel.app"];
function cors(res,origin){const ok=origin&&(ALLOWED_HOSTS.some(h=>origin==="https://"+h)||/^https:\/\/automation-scan-[a-z0-9-]+-alwaysinnovatives-projects\.vercel\.app$/.test(origin));res.setHeader("Access-Control-Allow-Origin",ok?origin:"https://automation-scan-neon.vercel.app");res.setHeader("Vary","Origin");res.setHeader("Cache-Control","no-store");}
module.exports=async function(req,res){
 cors(res,req.headers.origin||"");if(req.method!=="GET")return res.status(405).json({error:"method_not_allowed"});
 const industry=String(req.query.industry||"").trim(),country=String(req.query.country||"").trim().toUpperCase();
 if(!industry||!country)return res.status(400).json({error:"industry_and_country_required"});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return res.status(503).json({error:"country_scenarios_not_configured"});
 try{
  const qs="?industry_id=eq."+encodeURIComponent(industry)+"&country_code=eq."+encodeURIComponent(country)+"&active=eq.true&select=*";
  const r=await fetch(url+"/rest/v1/industry_country_scenarios"+qs,{headers:{apikey:key,Authorization:"Bearer "+key}});
  if(!r.ok)return res.status(502).json({error:"country_scenario_unavailable"});
  const rows=await r.json();return res.status(200).json({scenario:rows[0]||null});
 }catch(e){return res.status(500).json({error:"country_scenario_error"});}
};