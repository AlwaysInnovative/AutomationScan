(function(){
"use strict";
function init(){
 var b=document.getElementById("consentBanner")||document.getElementById("cookie-consent"); if(!b)return;
 var accept=document.getElementById("consentAccept"), reject=document.getElementById("consentReject")||document.getElementById("consentDecline");
 function choose(v){try{localStorage.setItem("automationscan_consent",v);localStorage.setItem("as-analytics-consent",v)}catch(e){} window.__analyticsConsent=v; b.hidden=true; if(v==="granted"&&typeof window.enableAnalytics==="function")window.enableAnalytics();}
 var saved=null;try{saved=localStorage.getItem("automationscan_consent")||localStorage.getItem("as-analytics-consent")}catch(e){}
 if(saved==="granted"||saved==="denied")choose(saved); else b.hidden=false;
 [accept,reject].forEach(function(btn){if(!btn)return;btn.disabled=false;btn.removeAttribute("disabled");btn.style.pointerEvents="auto";btn.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();choose(btn===accept?"granted":"denied")},{capture:true});});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();