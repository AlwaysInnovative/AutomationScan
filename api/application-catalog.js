module.exports=async function(req,res){
 if(req.method!=="GET")return res.status(405).json({error:"method_not_allowed"});
 res.setHeader("Cache-Control","no-store");
 var industry=String((req.query||{}).industry||"").trim().toLowerCase();
 if(!industry)return res.status(400).json({error:"industry_required"});
 var url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(503).json({error:"application_catalog_not_configured"});
 try{
  var q="?industry_id=eq."+encodeURIComponent(industry)+"&active=eq.true&select=id,vendor,solution,scope,capabilities,source_refs,version&order=vendor.asc,solution.asc";
  var r=await fetch(url+"/rest/v1/application_catalog"+q,{headers:{apikey:key,Authorization:"Bearer "+key}});
  if(!r.ok)return res.status(502).json({error:"application_catalog_unavailable"});
  var rows=await r.json();return res.status(200).json({industry:industry,applications:Array.isArray(rows)?rows:[],count:Array.isArray(rows)?rows.length:0});
 }catch(e){return res.status(500).json({error:"application_catalog_error"});}
};