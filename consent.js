(function(){
"use strict";
function init(){
 const banner=document.getElementById("consentBanner")||document.getElementById("cookie-consent"); if(!banner)return;
 const accept=document.getElementById("consentAccept"),reject=document.getElementById("consentReject")||document.getElementById("consentDecline");
 function setChoice(value){window.__analyticsConsent=value;try{localStorage.setItem("automationscan_consent",value);localStorage.setItem("as-analytics-consent",value)}catch(e){}banner.hidden=true;if(value==="granted"&&typeof window.enableAnalytics==="function")window.enableAnalytics();if(typeof window.trackEvent==="function"){try{window.trackEvent("consent_choice",{choice:value})}catch(e){}}}
 let saved=null;try{saved=localStorage.getItem("automationscan_consent")||localStorage.getItem("as-analytics-consent")}catch(e){}
 if(saved==="granted"||saved==="denied")setChoice(saved);else banner.hidden=false;
 if(accept)accept.onclick=function(e){e.preventDefault();setChoice("granted")};
 if(reject)reject.onclick=function(e){e.preventDefault();setChoice("denied")};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
