const platforms={
Oracle:{label:"Oracle",caps:{Finance:3,Procurement:3,"Supply Chain":3,Warehouse:3,Merchandising:3,Planning:3,Inventory:3,Commerce:3,CRM:1,Data:3,AI:3,Integration:3},reason:"Broad enterprise ERP plus a deep retail cloud portfolio; especially relevant where retail merchandising, planning and inventory are core."},
SAP:{label:"SAP",caps:{Finance:3,Procurement:3,"Supply Chain":3,Warehouse:3,Merchandising:2,Planning:3,Inventory:3,Commerce:2,CRM:2,Data:3,AI:3,Integration:3},reason:"Broad enterprise platform for finance and supply chain transformation, with retail capabilities that need to be mapped to the target operating model."},
Microsoft:{label:"Microsoft",caps:{Finance:3,Procurement:3,"Supply Chain":3,Warehouse:3,Merchandising:2,Planning:3,Inventory:3,Commerce:3,CRM:3,Data:3,AI:3,Integration:3},reason:"Strong fit to investigate where Finance, Supply Chain and Commerce intersect with the Microsoft ecosystem and AI capabilities."},
Infor:{label:"Infor",caps:{Finance:3,Procurement:3,"Supply Chain":3,Warehouse:3,Merchandising:3,Planning:3,Inventory:3,Commerce:2,CRM:1,Data:2,AI:3,Integration:3},reason:"Industry-focused cloud path worth examining when the current Infor estate already aligns closely to the target business processes."},
NetSuite:{label:"NetSuite",caps:{Finance:3,Procurement:2,"Supply Chain":2,Warehouse:2,Merchandising:1,Planning:2,Inventory:3,Commerce:2,CRM:2,Data:2,AI:2,Integration:3},reason:"Cloud ERP candidate to investigate where scope, complexity and operating model fit; complex retail requirements may need specialist ecosystem products."},
IFS:{label:"IFS",caps:{Finance:3,Procurement:3,"Supply Chain":3,Warehouse:3,Merchandising:1,Planning:2,Inventory:3,Commerce:1,CRM:2,Data:2,AI:3,Integration:3},reason:"Relevant to investigate for complex operations, supply chain, asset/service and enterprise workflows; retail-specific scope needs validation."}
};
const capabilityLabels={Finance:"Finance & controls",Procurement:"Procurement","Supply Chain":"Supply chain",Warehouse:"Warehouse / WMS",Merchandising:"Merchandising",Planning:"Demand / supply planning",Inventory:"Inventory optimisation",Commerce:"Commerce / POS / omnichannel",CRM:"CRM / customer",Data:"Data / analytics",AI:"AI / intelligent automation",Integration:"Integration / APIs"};
const form=document.getElementById("transformForm");
const steps=[...document.querySelectorAll(".t-step")];
const next=document.getElementById("tNext"),back=document.getElementById("tBack"),generate=document.getElementById("tGenerate");
let current=0;
function esc(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));}
function show(index){
 current=index;
 steps.forEach((step,i)=>step.classList.toggle("active",i===index));
 document.getElementById("tProgress").textContent="Step "+(index+1)+" of "+steps.length;
 document.getElementById("tProgressBar").style.width=((index+1)/steps.length*100)+"%";
 back.hidden=index===0;
 next.hidden=index===steps.length-1;
 generate.hidden=index!==steps.length-1;
}
function valid(){
 const required=steps[current].querySelectorAll("[required]");
 for(const field of required){if(!field.checkValidity()){field.reportValidity();return false;}}
 return true;
}
next.addEventListener("click",()=>{if(valid())show(Math.min(current+1,steps.length-1));});
back.addEventListener("click",()=>show(Math.max(current-1,0)));
function radioValue(name){return form.querySelector('input[name="'+name+'"]:checked')?.value||"";}
function read(){
 return {
  industry:form.elements.industry.value,
  current:form.elements.current.value,
  scale:form.elements.scale.value,
  trigger:form.elements.trigger.value,
  caps:[...form.querySelectorAll('input[name="cap"]:checked')].map(x=>x.value),
  custom:form.elements.custom.value,
  integration:form.elements.integration.value,
  migration:form.elements.migration.value,
  ecosystem:form.elements.ecosystem.value,
  concern:form.elements.concern.value.trim(),
  output:radioValue("output"),
  email:form.elements.email.value.trim()
 };
}
function scorePlatform(platform,data){
 let score=0;
 data.caps.forEach(cap=>score+=platform.caps[cap]||0);
 const max=data.caps.length*3||1;
 if(data.ecosystem==="Microsoft-heavy"&&platform.label==="Microsoft")score+=3;
 if(data.ecosystem==="SAP-heavy"&&platform.label==="SAP")score+=3;
 if(data.ecosystem==="Oracle-heavy"&&platform.label==="Oracle")score+=3;
 if(data.current===platform.label)score+=data.migration==="Conservative"?3:1;
 if(data.custom==="Very high"&&platform.label===data.current)score-=2;
 return Math.round(Math.max(0,Math.min(100,score/(max+3)*100)));
}
function fitLabel(score){return score>=82?"Strong capability alignment":score>=68?"Worth detailed discovery":score>=52?"Selective fit — validate gaps":"Requires significant scope validation";}
function render(data){
 const entries=Object.values(platforms).map(p=>({...p,score:scorePlatform(p,data)})).sort((a,b)=>b.score-a.score);
 const score=data.caps.length?Math.round(data.caps.reduce((sum,cap)=>sum+Math.max(...Object.values(platforms).map(p=>p.caps[cap]||0)),0)/(data.caps.length*3)*100):0;
 document.getElementById("tScore").textContent=score;
 document.getElementById("tResultSub").textContent=data.industry+" · current platform: "+data.current+" · target trigger: "+data.trigger;
 document.getElementById("tInterpretation").textContent=score>=80?"Your requirements are specific enough to support a structured market comparison.":"Your requirements need more discovery before a defensible shortlist can be made.";
 document.getElementById("tSummary").textContent="This is a decision-support starting point. It identifies ecosystems whose capability areas overlap with your selected needs, then highlights questions requiring workshops, demos and commercial validation.";
 document.getElementById("tCapCount").textContent=data.caps.length+" selected";
 document.getElementById("tCaps").innerHTML=data.caps.length?data.caps.map(cap=>"<span>"+esc(capabilityLabels[cap])+"</span>").join(""):"<span>No capabilities selected — add them on Step 2 for a sharper comparison.</span>";
 const signals=[["Current platform",data.current],["Customisation",data.custom],["Integration complexity",data.integration],["Migration appetite",data.migration],["Existing ecosystem",data.ecosystem]];
 document.getElementById("tSignals").innerHTML=signals.map(item=>"<div class='signal-row'><span>"+esc(item[0])+"</span><b>"+esc(item[1])+"</b></div>").join("");
 document.getElementById("tCandidates").innerHTML=entries.map(p=>"<article class='candidate-card'><div><b>"+esc(p.label)+"</b><span>"+fitLabel(p.score)+"</span></div><strong>"+p.score+"<small>/100</small></strong><p>"+esc(p.reason)+"</p></article>").join("");
 const tbody=document.querySelector("#tMatrix tbody");
 tbody.innerHTML=data.caps.length?data.caps.map(cap=>"<tr><th>"+esc(capabilityLabels[cap])+"</th>"+Object.values(platforms).map(p=>"<td><span class='fit-dot fit-"+p.caps[cap]+"'>"+(p.caps[cap]===3?"Core":p.caps[cap]===2?"Consider":"Validate")+"</span></td>").join("")+"</tr>").join(""):"<tr><td colspan='7'>Select capabilities on Step 2 to populate the matrix.</td></tr>";
 const questions=[
 "Which Infor customisations are genuinely business-critical, and which can be retired rather than reproduced?",
 "Which integrations are system-of-record dependencies versus convenience interfaces?",
 "Which retail capabilities must be native versus acceptable through an ecosystem product or specialist solution?",
 "What historical data must move, what can be archived, and what data-quality remediation is required?",
 "Which reports, controls and localisations are mandatory on day one?",
 "What are the peak transaction volumes, store/warehouse patterns and country requirements?",
 "What is the target operating model for merchandising, planning, finance and supply chain?",
 "Which capabilities require a proof-of-concept before commercial selection?"
 ];
 document.getElementById("tQuestions").innerHTML=questions.map(q=>"<li>"+esc(q)+"</li>").join("");
 const phases=[
 ["Days 1–30","Capability discovery","Process workshops · current-state application inventory · customisation and integration catalogue · data scope"],
 ["Days 31–60","Market validation","Scripted demos · fit/gap workshops · architecture options · migration waves · security/localisation checks"],
 ["Days 61–90","Selection readiness","Shortlist evidence · TCO inputs · implementation partner assessment · risk register · RFP/POC plan"]
 ];
 document.getElementById("tRoadmap").innerHTML=phases.map(p=>"<article><span>"+p[0]+"</span><b>"+p[1]+"</b><p>"+p[2]+"</p></article>").join("");
 const results=document.getElementById("transformResults");
 results.classList.remove("hidden");
 results.scrollIntoView({behavior:"smooth",block:"start"});
 try{sessionStorage.setItem("automationscan_transform",JSON.stringify(data));}catch(e){}
}
form.addEventListener("submit",event=>{event.preventDefault();if(!valid())return;render(read());});
document.getElementById("tPrint").addEventListener("click",()=>{
 document.body.classList.add("printing-transform");
 window.addEventListener("afterprint",()=>document.body.classList.remove("printing-transform"),{once:true});
 setTimeout(()=>window.print(),80);
});
show(0);