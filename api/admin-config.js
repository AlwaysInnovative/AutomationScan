const TABLES={industry_profiles:["id"],country_market_profiles:["country_code"],industry_country_scenarios:["id"],journey_templates:["id"],option_catalog:["catalog_key","option_value"],ui_config:["config_key"],demo_scenarios:["id"]};
const URL=process.env.SUPABASE_URL||"https://jbxeaqitujkmzulbpjmy.supabase.co",KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
const crypto=require("crypto");
const send=(res,s,b)=>{res.status(s).setHeader("Cache-Control","no-store").json(b)};
const sb=async(p,o={})=>{const r=await fetch(URL+"/rest/v1/"+p,{...o,headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json",Prefer:"return=representation",...(o.headers||{})}});const t=await r.text();let b;try{b=JSON.parse(t)}catch{b=t}if(!r.ok)throw Error(typeof b==="string"?b:JSON.stringify(b));return b};
const currentUser=async(token)=>{const r=await fetch(URL+"/auth/v1/user",{headers:{apikey:process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||"",Authorization:"Bearer "+token}});if(!r.ok)return null;return r.json()};
module.exports=async(req,res)=>{try{
 const token=(req.headers.authorization||"").replace(/^Bearer /,""); const action=req.query.action||"";
 if(action==="bootstrap"){const u=await currentUser(token);if(!u)return send(res,401,{error:"Sign in first"});const raw=String(req.body?.token||"");const h=crypto.createHash("sha256").update(raw).digest("hex");const admins=await sb("admin_roles?select=user_id&limit=1");const bt=await sb("admin_bootstrap_tokens?token_hash=eq."+h+"&used_at=is.null&expires_at=gt."+encodeURIComponent(new Date().toISOString())+"&select=id");if(admins.length||!bt.length)return send(res,403,{error:"Bootstrap unavailable"});await sb("admin_roles",{method:"POST",body:JSON.stringify({user_id:u.id})});await sb("admin_bootstrap_tokens?id=eq."+bt[0].id,{method:"PATCH",body:JSON.stringify({used_at:new Date().toISOString()})});return send(res,200,{ok:true})}
 const u=await currentUser(token);if(!u)return send(res,401,{error:"Authentication required"});const a=await sb("admin_roles?user_id=eq."+encodeURIComponent(u.id)+"&select=user_id");if(!a.length)return send(res,403,{error:"Administrator access required"});
 if(action==="tables")return send(res,200,{tables:Object.keys(TABLES)});
 const table=String(req.query.table||"");if(!TABLES[table])return send(res,400,{error:"Unsupported configuration"});
 const keys=TABLES[table];const body=req.body||{};
 if(req.method==="GET")return send(res,200,{rows:await sb(table+"?select=*")});
 const filter=keys.map(k=>k+"=eq."+encodeURIComponent(String(body[k]??""))).join("&");
 let rows;
 if(req.method==="POST")rows=await sb(table,{method:"POST",body:JSON.stringify(body)});
 else if(req.method==="PATCH"){const patch={...body};keys.forEach(k=>delete patch[k]);rows=await sb(table+"?"+filter,{method:"PATCH",body:JSON.stringify(patch)})}
 else if(req.method==="DELETE")rows=await sb(table+"?"+filter,{method:"DELETE"});
 else return send(res,405,{error:"Method not supported"});
 await sb("admin_audit_log",{method:"POST",body:JSON.stringify({actor_user_id:u.id,action:req.method.toLowerCase(),config_table:table,record_id:keys.map(k=>String(body[k]||"")).join("|")})});
 return send(res,200,{rows});
}catch(e){return send(res,500,{error:e.message||"Admin error"})}};