(function(){
"use strict";
window.AutomationScanUI={};
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function populate(select,options){
 if(!select||!Array.isArray(options))return;
 const current=select.value;
 select.innerHTML="";
 options.forEach(function(pair){
   const o=document.createElement("option");o.value=String(pair[0]??"");o.textContent=String(pair[1]??pair[0]??"");select.appendChild(o);
 });
 if(current && options.some(function(x){return String(x[0])===current;}))select.value=current;
}
async function load(){
 try{
  const r=await fetch("api/ui-config",{cache:"no-store"});
  if(!r.ok)throw new Error("ui config "+r.status);
  const data=await r.json(),cfg=data.config||{};
  window.AutomationScanUI.config=cfg;
  const page=location.pathname.endsWith("transformation-advisor.html")?"navigator":location.pathname.endsWith("transformation-workbench.html")?"workbench":"assessment";
  const fields=cfg.fields&&cfg.fields[page]||{};
  Object.keys(fields).forEach(function(key){
    const s=document.querySelector('[name="'+CSS.escape(key)+'"]');
    if(s)populate(s,fields[key]);
    const byId=document.getElementById(key);
    if(byId&&byId.tagName==="SELECT")populate(byId,fields[key]);
  });
  return cfg;
 }catch(e){console.warn("Dynamic UI configuration unavailable",e);return null;}
}
window.AutomationScanUI.load=load;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load);else load();
})();