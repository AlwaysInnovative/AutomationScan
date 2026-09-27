function contactTrack(name,params){try{if(window.trackEvent)window.trackEvent(name,params)}catch(e){}}
function contactSource(){const u=new URL(location.href),keys=["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid"],source={referrer:document.referrer||"",landing_page:location.pathname};keys.forEach(k=>{if(u.searchParams.get(k))source[k]=u.searchParams.get(k)});return source}
(function(){
 const f=document.getElementById("contactForm"),banner=document.getElementById("consentBanner");
 if(!f)return;
 function analytics(){if(!window.__ga4Loaded&&window.AUTOMATIONSCAN_GA4_ID&&window.__analyticsConsent==="granted"&&window.enableAnalytics)window.enableAnalytics()}
 let choice=null;try{choice=localStorage.getItem("automationscan_consent")}catch(e){}
 window.__analyticsConsent=choice==="granted"?"granted":choice==="denied"?"denied":null;
 if(window.__analyticsConsent==="granted")analytics(); else if(banner)banner.hidden=false;
 document.getElementById("consentAccept")?.addEventListener("click",()=>{window.__analyticsConsent="granted";try{localStorage.setItem("automationscan_consent","granted")}catch(e){}analytics();banner.hidden=true});
 document.getElementById("consentReject")?.addEventListener("click",()=>{window.__analyticsConsent="denied";try{localStorage.setItem("automationscan_consent","denied")}catch(e){}banner.hidden=true});
 f.addEventListener("submit",async e=>{
  e.preventDefault();if(!f.checkValidity()){f.reportValidity();return}if(f.elements.website.value)return;
  const status=document.getElementById("contactStatus"),button=f.querySelector("button[type=submit]");button.disabled=true;status.textContent="Sending…";
  const source=contactSource();contactTrack("contact_submitted",{subject:f.elements.subject.value.slice(0,80)});
  try{const res=await fetch((window.AUTOMATIONSCAN_API_BASE||"")+"/api/contact",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:f.elements.name.value.trim(),email:f.elements.email.value.trim(),subject:f.elements.subject.value.trim(),message:f.elements.message.value.trim(),consent:f.elements.consent.checked,website:"",source})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||"send_failed");status.textContent="Thanks — your message has been submitted. We’ll follow up by email.";f.reset();contactTrack("contact_success")}catch(err){status.textContent="We couldn’t send the message right now. Please try again shortly.";contactTrack("contact_error")}finally{button.disabled=false}
 });
})();