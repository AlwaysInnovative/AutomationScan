const form=document.getElementById("scanForm");
const steps=[...document.querySelectorAll(".step")];
const next=document.getElementById("next"),back=document.getElementById("back"),submit=document.getElementById("submit");
let current=0;
function track(name,params){try{if(window.trackEvent)window.trackEvent(name,params)}catch(e){}}
function captureLeadSource(){
  const u=new URL(location.href), keys=["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid"];
  const source={referrer:document.referrer||"",landing_page:location.pathname};
  keys.forEach(k=>{if(u.searchParams.get(k))source[k]=u.searchParams.get(k)});
  try{if(!sessionStorage.getItem("automationscan_source"))sessionStorage.setItem("automationscan_source",JSON.stringify(source));}catch(e){}
  return source;
}
const leadSource=captureLeadSource();
track("scan_page_view",{page_location:location.pathname,utm_source:leadSource.utm_source||"(direct)",utm_medium:leadSource.utm_medium||"(none)"});


function show(i){current=i;steps.forEach((s,n)=>s.classList.toggle("active",n===i));document.getElementById("progressText").textContent="Step "+(i+1)+" of "+steps.length;document.getElementById("progressBar").style.width=((i+1)/steps.length*100)+"%";back.hidden=i===0;next.hidden=i===steps.length-1;submit.hidden=i!==steps.length-1}
function valid(){for(const f of steps[current].querySelectorAll("[required]")){if(!f.checkValidity()){f.reportValidity();return false}}return true}
next.onclick=()=>{if(valid()){track("step_"+(current+1)+"_completed");show(Math.min(current+1,steps.length-1));}};
back.onclick=()=>show(Math.max(current-1,0));
const n=k=>Number(form.elements[k]?.value||0);

function calc(){
 const h={"Data entry":n("dataEntry"),"Email / follow-ups":n("email"),"Invoices / payments":n("invoices"),"Customer support":n("support"),Scheduling:n("scheduling"),Reporting:n("reporting"),"Documents / admin":n("documents"),"Sales admin / CRM":n("salesAdmin")};
 const total=Object.values(h).reduce((a,b)=>a+b,0);
 const copy={Rarely:0,Sometimes:5,Often:12,Constantly:20}[form.elements.copyPaste.value]||0;
 const rep={Low:0,Medium:6,High:12,"Very high":18}[form.elements.repetition.value]||0;
 const emp=n("employees");
 let score=Math.round(Math.min(100,12+Math.min(45,total*1.6)+copy+rep+Math.min(15,emp/8)));
 if(!total)score=Math.min(score,42);
 const pain=(form.elements.pain.value||"").toLowerCase();
 const signals=[["copy|paste|re-enter|retype",6],["excel|spreadsheet|csv",5],["email|inbox|follow-up|remind",5],["invoice|bill|payment|receipt",5],["crm|lead|pipeline",5],["schedule|appointment|calendar|booking",5],["support|ticket|faq|question",5],["report|dashboard|monthly|weekly",5]];
 let textPoints=0;signals.forEach(([rx,p])=>{if(new RegExp(rx).test(pain))textPoints+=p});
 score=Math.min(100,score+Math.min(18,textPoints));
 const monthly=Math.min(total,total*.45+copy/8+rep/8+textPoints/8)*4.33;
 const low=Math.max(2,Math.round(monthly*.65)),high=Math.max(low+2,Math.round(monthly*1.15));
 const tools=[...form.querySelectorAll('input[name="tools"]:checked')].map(x=>x.value);
 const textPointsCapped=Math.min(18,textPoints); const coverage=Math.round(((Object.values(h).filter(x=>x>0).length/8)+(pain.length>20?1:0)+(tools.length?1:0))/3*100);
 return {h,total,copy,rep,emp,textPoints:textPointsCapped,score,low,high,label:score>=75?"High opportunity signal":score>=55?"Moderate opportunity signal":"Early opportunity signal",industry:form.elements.industry.value,goal:form.elements.goal.value,pain,tools,coverage};
}
const ideas={"Data entry":"data capture and document workflows","Email / follow-ups":"email triage and follow-up sequences","Invoices / payments":"invoice extraction, matching and approval workflows","Customer support":"FAQ, ticket routing and response assistance","Scheduling":"online scheduling and reminders","Reporting":"automated reports and exception alerts","Documents / admin":"document generation, approvals and filing","Sales admin / CRM":"lead capture, enrichment and CRM follow-ups"};

function buildReport(){
 const r=calc();
 const top=Object.entries(r.h).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,6);
 return {r,top};
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function renderAnalysis(r,top){
 const rows=Object.entries(r.h).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
 const total=Math.max(r.total,0.01);
 const max=Math.max(...rows.map(x=>x[1]),1);
 document.getElementById("workloadTotal").textContent=r.total+" hrs/week";
 document.getElementById("scoreCoverage").textContent=r.coverage+"% input coverage";
 document.getElementById("workloadChart").innerHTML=rows.length?rows.map(([name,h])=>{
   const pct=Math.round(h/total*100);
   return '<div class="bar-row"><div class="bar-label"><span>'+escapeHtml(name)+'</span><b>'+h+'h · '+pct+'%</b></div><div class="bar-track"><i style="width:'+Math.max(4,h/max*100)+'%"></i></div></div>';
 }).join(""):'<p class="analysis-empty">No weekly hours were entered. Run the scan again with rough estimates.</p>';
 const scoreParts=[
   ["Weekly workload",Math.min(45,Math.round(Math.min(45,r.total*1.6))),45],
   ["Copy / paste friction",r.copy,20],
   ["Repetition level",r.rep,18],
   ["Team-size signal",Math.min(15,Math.round(r.emp/8)),15],
   ["Text signals",Math.min(18,r.textPoints||0),18]
 ];
 document.getElementById("scoreBreakdown").innerHTML=scoreParts.map(x=>'<div class="break-row"><div><span>'+x[0]+'</span><b>'+x[1]+' pts</b></div><div class="break-track"><i style="width:'+Math.min(100,x[1]/x[2]*100)+'%"></i></div></div>').join("");
 const monthlyHours=(r.low+r.high)/2;
 const annual=Math.round(monthlyHours*12);
 const concentration=rows.length?Math.round(rows.slice(0,3).reduce((a,x)=>a+x[1],0)/total*100):0;
 const metrics=[
   ["Weekly repeat work",r.total+" hrs","Entered across 8 categories"],
   ["Monthly range",r.low+"–"+r.high+" hrs","Directional investigation range"],
   ["Annualized range",Math.round(r.low*12)+"–"+Math.round(r.high*12)+" hrs","Simple 12-month view"],
   ["Top-3 concentration",concentration+"%","Share of entered weekly hours"]
 ];
 document.getElementById("analysisMetrics").innerHTML=metrics.map(x=>'<div class="analysis-metric"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><span>'+x[2]+'</span></div>').join("");
 document.getElementById("analysisTable").innerHTML=rows.length?rows.slice(0,6).map(([name,h],i)=>{
   const pct=Math.round(h/total*100);
   return '<div class="analysis-row"><span class="rank">0'+(i+1)+'</span><strong>'+escapeHtml(name)+'</strong><span>'+h+' hrs/wk</span><b>'+pct+'%</b><em>'+escapeHtml(ideas[name])+'</em></div>';
 }).join(""):'<div class="analysis-row"><span>No workload categories entered yet.</span></div>';
}
function renderResult(){
 const {r,top}=buildReport();
 renderAnalysis(r,top);
 document.getElementById("score").textContent=r.score;
 document.getElementById("label").textContent=r.label;
 document.getElementById("range").textContent=r.low+"-"+r.high+" hours/month";
 document.getElementById("sub").textContent="Based on your "+r.industry+" business inputs.";
 document.getElementById("reportMeta").textContent="Input coverage: "+r.coverage+"% · Goal: "+r.goal+" · Tools selected: "+r.tools.length;
 document.getElementById("scanSummary").value=JSON.stringify({score:r.score,label:r.label,estimatedHours:r.low+"-"+r.high+"/month",industry:r.industry,goal:r.goal,topOpportunities:top.map(x=>x[0]),coverage:r.coverage});
 document.getElementById("opportunities").innerHTML=top.length?top.map((x,i)=>'<article class="opp"><span class="tag">PRIORITY '+(i+1)+'</span><h3>'+escapeHtml(x[0])+'</h3><p><strong>'+x[1]+' hrs/week</strong> entered · <b>'+Math.round(x[1]/Math.max(r.total,0.01)*100)+'%</b> of entered workload. Investigate '+escapeHtml(ideas[x[0]])+' first.</p></article>').join(""):'<article class="opp"><span class="tag">START HERE</span><h3>Measure recurring work</h3><p>Track one week of repeat admin and run the assessment again.</p></article>';
 document.getElementById("results").classList.remove("hidden");
 document.getElementById("results").scrollIntoView({behavior:"smooth"});
 submitLeadIfConsented(r,top);
}

form.addEventListener("submit",e=>e.preventDefault());
submit.onclick=()=>{
 try{ track("report_generated",{industry:form.elements.industry?.value||"unknown"}); renderResult(); }
 catch(err){
  console.error("AutomationScan report generation failed:",err);
  const status=document.getElementById("saveStatus");
  if(status) status.textContent="We couldn't generate the report. Please refresh the page and try again.";
 }
};

function reportData(){
 const {r,top}=buildReport();
 return {r,top,date:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})};
}
function drawPdf(){
  track("pdf_downloaded",{format:"browser_pdf"});
  const status=document.getElementById("saveStatus"); if(status)status.textContent="";
  document.body.classList.add("printing-report");
  const restore=()=>document.body.classList.remove("printing-report");
  window.addEventListener("afterprint",restore,{once:true});
  window.setTimeout(()=>window.print(),80);
}
const pdfButton=document.getElementById("downloadPdf"); if(pdfButton) pdfButton.addEventListener("click",drawPdf);
const printButton=document.getElementById("print"); if(printButton) printButton.addEventListener("click",()=>window.print());

async function submitLeadIfConsented(r,top){
 const email=form.elements.emailAddress?.value?.trim(),consent=form.elements.consent?.checked;
 if(!email||!consent)return;
 try{
  const res=await fetch((window.AUTOMATIONSCAN_API_BASE||"")+"/api/lead",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,consent:true,source:leadSource,report:{score:r.score,label:r.label,low:r.low,high:r.high,industry:r.industry,goal:r.goal,top:top.slice(0,3).map(x=>x[0]),coverage:r.coverage}})});
  document.getElementById("saveStatus").textContent=res.ok?"Report generated; email request submitted.":"Report generated locally; email delivery is not configured yet.";
 }catch{document.getElementById("saveStatus").textContent="Report generated locally."}
}

const demos={
 accounting:{name:"Accounting firm",meta:"12-person practice · B2B · monthly client reporting",score:84,hours:"64-92",headline:"Invoice processing and client reporting are absorbing the most repeat effort.",areas:[["Invoices / payments","18 hrs/week","Document extraction + approval workflow"],["Reporting","11 hrs/week","Scheduled report generation + delivery"],["Email / follow-ups","8 hrs/week","Reminder sequences + exception handling"]],next:"Start with invoice intake because it touches finance, documents and approvals."},
 clinic:{name:"Healthcare clinic",meta:"8-person clinic · B2C · appointment-heavy",score:76,hours:"42-61",headline:"Scheduling and reminders are creating avoidable administrative load.",areas:[["Scheduling","14 hrs/week","Self-service booking + reminders"],["Customer support","8 hrs/week","FAQ and message triage"],["Documents / admin","7 hrs/week","Digital forms + document routing"]],next:"Start with scheduling and reminders; keep clinical decisions outside automation."},
 realestate:{name:"Real estate team",meta:"15-person team · mixed clients · lead-driven",score:81,hours:"49-70",headline:"Lead follow-up and CRM updates are competing with time spent selling.",areas:[["Sales admin / CRM","13 hrs/week","Lead capture + CRM enrichment"],["Email / follow-ups","10 hrs/week","Task-based follow-up sequences"],["Documents / admin","6 hrs/week","Template-driven document preparation"]],next:"Start with lead capture and follow-up consistency before adding more tools."},
 ecommerce:{name:"E-commerce business",meta:"22-person operation · B2C · multi-channel",score:79,hours:"55-79",headline:"Order support, reporting and data movement are the biggest repeat-work signals.",areas:[["Customer support","15 hrs/week","FAQ automation + ticket routing"],["Data entry","12 hrs/week","Order and inventory data sync"],["Reporting","8 hrs/week","Automated daily/weekly dashboards"]],next:"Start with support triage and repetitive order questions."},
 logistics:{name:"Logistics company",meta:"35-person operation · B2B · document-heavy",score:88,hours:"71-103",headline:"Documents and status updates create a large coordination burden.",areas:[["Documents / admin","22 hrs/week","Document capture + workflow routing"],["Data entry","16 hrs/week","System-to-system data transfer"],["Email / follow-ups","9 hrs/week","Exception alerts + customer updates"]],next:"Start with document intake and status-event workflows; preserve human review for exceptions."},
 agency:{name:"Professional services",meta:"10-person agency · project-based · B2B",score:68,hours:"34-49",headline:"Recurring reporting and client communication are taking time away from delivery.",areas:[["Reporting","9 hrs/week","Reusable report generation"],["Email / follow-ups","7 hrs/week","Client update workflows"],["Documents / admin","5 hrs/week","Templates and approval steps"]],next:"Start with recurring reports where inputs and outputs are already structured."}
};
function renderDemo(key){
 const d=demos[key]||demos.accounting;
 const demoTotal=d.areas.reduce((sum,x)=>sum+Number(String(x[1]).match(/\d+/)?.[0]||0),0);
 const demoBars=d.areas.map((x)=>{const hrs=Number(String(x[1]).match(/\d+/)?.[0]||0);const pct=Math.round(hrs/Math.max(demoTotal,1)*100);return '<div class="demo-bar-row"><div><span>'+escapeHtml(x[0])+'</span><b>'+pct+'%</b></div><i style="width:'+Math.max(8,pct)+'%"></i></div>';}).join("");
 document.getElementById("demoPanel").innerHTML='<div class="demo-top"><div><span class="demo-kicker">ILLUSTRATIVE SCAN</span><h3>'+d.name+'</h3><p>'+d.meta+'</p></div><div class="demo-score"><strong>'+d.score+'</strong><span>/100</span></div></div><div class="demo-headline">'+d.headline+'</div><div class="demo-hours"><span>Estimated work worth investigating</span><strong>'+d.hours+' hrs/month</strong></div><div class="demo-mini-chart"><div class="demo-chart-title"><b>Illustrative workload share</b><span>Entered hours</span></div>'+demoBars+'</div><div class="demo-areas">'+d.areas.map((x,i)=>'<div class="demo-area"><small>PRIORITY '+(i+1)+'</small><b>'+x[0]+'</b><span>'+x[1]+'</span><p>'+x[2]+'</p></div>').join("")+'</div><div class="demo-next"><b>What the output suggests</b><span>'+d.next+'</span></div>';
}
document.querySelectorAll(".demo-tab").forEach(t=>t.addEventListener("click",()=>{document.querySelectorAll(".demo-tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");renderDemo(t.dataset.demo)}));
renderDemo("accounting");
show(0);


function setupAds(){
 const enabled=window.AUTOMATIONSCAN_ADS_ENABLED&&window.AUTOMATIONSCAN_AD_CLIENT&&window.__analyticsConsent==="granted";
 document.querySelectorAll(".ad-slot").forEach(slot=>{
   if(!enabled){slot.remove();return;}
   slot.innerHTML='<ins class="adsbygoogle" style="display:block" data-ad-client="'+escapeHtml(window.AUTOMATIONSCAN_AD_CLIENT)+'" data-ad-slot="'+escapeHtml(window.AUTOMATIONSCAN_AD_SLOT||"")+'" data-ad-format="auto" data-full-width-responsive="true"></ins>';
   slot.style.display="block";
 });
 if(enabled&&!document.querySelector('script[data-adsense]')){
   const s=document.createElement("script");s.async=true;s.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+encodeURIComponent(window.AUTOMATIONSCAN_AD_CLIENT);s.crossOrigin="anonymous";s.dataset.adsense="true";document.head.appendChild(s);
   window.setTimeout(()=>document.querySelectorAll(".adsbygoogle").forEach(()=>{try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(e){}}),500);
 }
}
function setupContact(){
 const f=document.getElementById("contactForm"); if(!f)return;
 f.addEventListener("submit",async e=>{
   e.preventDefault(); const s=document.getElementById("contactStatus"); const btn=f.querySelector("button[type=submit]");
   if(!f.checkValidity()){f.reportValidity();return;}
   if(f.elements.website.value)return;
   btn.disabled=true; s.textContent="Sending…"; track("contact_submitted",{subject:f.elements.subject.value.slice(0,80)});
   try{
     const res=await fetch((window.AUTOMATIONSCAN_API_BASE||"")+"/api/contact",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:f.elements.name.value.trim(),email:f.elements.email.value.trim(),subject:f.elements.subject.value.trim(),message:f.elements.message.value.trim(),consent:f.elements.consent.checked,website:"",source:captureLeadSource()})});
     const data=await res.json().catch(()=>({}));
     if(!res.ok)throw new Error(data.error||"send_failed");
     s.textContent="Thanks — your message has been submitted. We’ll follow up by email.";
     f.reset(); track("contact_success");
   }catch(err){s.textContent="We couldn't send the message right now. Please try again shortly."; track("contact_error");}
   finally{btn.disabled=false;}
 });
}
function setupConsent(){
 const banner=document.getElementById("consentBanner"); if(!banner)return;
 let choice=null; try{choice=localStorage.getItem("automationscan_consent")}catch(e){}
 function apply(v){window.__analyticsConsent=v;if(v==="granted")window.enableAnalytics();banner.hidden=true;try{localStorage.setItem("automationscan_consent",v)}catch(e){}track("consent_choice",{choice:v});}
 if(choice==="granted"||choice==="denied"){window.__analyticsConsent=choice;if(choice==="granted")window.enableAnalytics();banner.hidden=true}
 else banner.hidden=false;
 document.getElementById("consentAccept")?.addEventListener("click",()=>apply("granted"));
 document.getElementById("consentReject")?.addEventListener("click",()=>apply("denied"));
}
setupAds(); setupContact(); setupConsent();
