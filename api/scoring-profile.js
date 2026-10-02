module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).json({error:"method_not_allowed"});
 const q=req.query||{},industry=String(q.industry||"").trim().toLowerCase(),country=String(q.country||"").trim().toUpperCase(),journey=String(q.journey||"").trim(),businessModel=String(q.businessModel||"").trim();
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(503).json({error:"scoring_profiles_not_configured"});
 try{
  const parts=[];
  if(industry)parts.push("industry_id=eq."+encodeURIComponent(industry));
  if(country)parts.push("country_code=eq."+encodeURIComponent(country));
  if(journey)parts.push("journey_id=eq."+encodeURIComponent(journey));
  if(businessModel)parts.push("business_model=eq."+encodeURIComponent(businessModel));
  const qs="active=eq.true&select=profile_key,industry_id,country_code,journey_id,business_model,priority,rules,version";
  const r=await fetch(url+"/rest/v1/decision_scoring_profiles?"+qs,{headers:{apikey:key,Authorization:"Bearer "+key}});
  if(!r.ok)return res.status(502).json({error:"scoring_profiles_unavailable"});
  const rows=await r.json();
  const matches=(Array.isArray(rows)?rows:[]).filter(function(x){
   return (!x.industry_id||x.industry_id===industry)&&(!x.country_code||x.country_code===country)&&(!x.journey_id||x.journey_id===journey)&&(!x.business_model||x.business_model===businessModel);
  }).sort(function(a,b){
   const sa=[a.industry_id,a.country_code,a.journey_id,a.business_model].filter(Boolean).length;
   const sb=[b.industry_id,b.country_code,b.journey_id,b.business_model].filter(Boolean).length;
   return (Number(b.priority)||0)-(Number(a.priority)||0)||sb-sa;
  });
  const chosen=matches[0]||null;
  const global=Array.isArray(rows)?rows.find(function(x){return x.profile_key==="global_default";}):null;
  function merge(a,b){if(!a)return b||{};if(!b)return a||{};var o=Array.isArray(a)?a.slice():Object.assign({},a);Object.keys(b).forEach(function(k){o[k]=(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&o[k]&&typeof o[k]==="object"&&!Array.isArray(o[k]))?merge(o[k],b[k]):b[k];});return o;}
  if(chosen&&global&&chosen.profile_key!=="global_default")chosen.rules=merge(global.rules,chosen.rules);
  return res.status(200).json({profile:chosen,match:chosen?{specificity:[chosen.industry_id,chosen.country_code,chosen.journey_id,chosen.business_model].filter(Boolean).length}:0,inputs:{industry,country,journey,businessModel}});
 }catch(e){return res.status(500).json({error:"scoring_profile_error"});}
};