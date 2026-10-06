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
  const r=await fetch("/api/ui-config",{cache:"no-store"});
  if(!r.ok)throw new Error("ui config "+r.status);
  const data=await r.json(),cfg=data.config||{};
  window.AutomationScanUI.config=cfg;
  const brand=cfg.brand||{};
  document.querySelectorAll("header .brand,footer .brand").forEach(function(a){
    if(brand.href)a.href=brand.href.startsWith("/")?brand.href:"/"+brand.href.replace(/^\.\//,"");
    a.innerHTML="";
    const img=document.createElement("img");img.src=brand.logo||"/logo.svg";img.alt=brand.alt||"AutomationScan";img.className="brand-logo";a.appendChild(img);
    const span=document.createElement("span");span.textContent=brand.label||"AutomationScan";span.className="brand-label";a.appendChild(span);
    a.setAttribute("aria-label",brand.alt||"AutomationScan");
  });
  if(cfg.navigation&&Array.isArray(cfg.navigation.workbenchSections)){
    document.querySelectorAll(".wb-nav").forEach(function(box){
      box.innerHTML="";
      cfg.navigation.workbenchSections.forEach(function(item){
        const b=document.createElement("button");b.type="button";b.dataset.tab=item.key;b.textContent=item.label;box.appendChild(b);
      });
    });
  }
  const nav=cfg.navigation&&cfg.navigation.primary;
  const navEl=document.querySelector("header nav");
  if(navEl&&Array.isArray(nav)){
    navEl.innerHTML="";
    nav.forEach(function(item){
      const a=document.createElement("a");a.href=item.href;a.textContent=item.label;a.dataset.navKey=item.key;navEl.appendChild(a);
    });
  }
  if(Array.isArray(nav)&&navEl){
    document.querySelectorAll("header .nav-link-contact").forEach(function(el){el.remove();});
  }
  const footer=cfg.navigation&&cfg.navigation.footer;
  if(footer){
    document.querySelectorAll("footer .brand").forEach(function(a){if(footer.brand){a.href=footer.brand.href;a.textContent=footer.brand.label;}});
    const cols=document.querySelectorAll("footer .footer-grid>div");
    if(cols[1]&&Array.isArray(footer.explore)){cols[1].innerHTML="<b>Explore</b>";footer.explore.forEach(function(item){const a=document.createElement("a");a.href=item.href;a.textContent=item.label;cols[1].appendChild(a);});}
    if(cols[2]&&Array.isArray(footer.trust)){cols[2].innerHTML="<b>Trust</b>";footer.trust.forEach(function(item){const a=document.createElement("a");a.href=item.href;a.textContent=item.label;cols[2].appendChild(a);});}
  }
  const cta=document.querySelector("header .navcta");
  if(cta&&cfg.navigation&&cfg.navigation.cta){
    cta.href=cfg.navigation.cta.href;
    cta.innerHTML=esc(cfg.navigation.cta.label)+" <span>→</span>";
  }
  const page=location.pathname.endsWith("transformation-advisor.html")?"navigator":location.pathname.endsWith("transformation-workbench.html")?"workbench":"assessment";
  const groups=cfg.checkboxes&&cfg.checkboxes[page]||{};
  Object.keys(groups).forEach(function(key){
    const box=document.querySelector('[data-config-checkboxes="'+CSS.escape(key)+'"]');
    if(!box)return;
    box.innerHTML="";
    groups[key].forEach(function(item){
      const label=document.createElement("label");
      label.className=box.dataset.checkboxClass||"config-check";
      const input=document.createElement("input");input.type="checkbox";input.name=key;input.value=String(item[0]??"");
      label.appendChild(input);
      const span=document.createElement("span");span.innerHTML=esc(item[1]??item[0]??"");label.appendChild(span);
      if(item[2]){const small=document.createElement("small");small.textContent=String(item[2]);label.appendChild(small);}
      box.appendChild(label);
    });
  });
  const fields=cfg.fields&&cfg.fields[page]||{};
  Object.keys(fields).forEach(function(key){
    if(page==="assessment"&&key==="industry")return;
    const s=document.querySelector('[name="'+CSS.escape(key)+'"]');
    if(s)populate(s,fields[key]);
    const byId=document.getElementById(key);
    if(byId&&byId.tagName==="SELECT")populate(byId,fields[key]);
  });
  return cfg;
 }catch(e){console.warn("Dynamic UI configuration unavailable",e);return null;}
 finally{document.dispatchEvent(new CustomEvent("automationScanUIReady"));}
}
window.AutomationScanUI.load=load;
window.AutomationScanUI.ready=load();
})();