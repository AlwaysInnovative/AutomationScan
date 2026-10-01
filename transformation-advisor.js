(function(){
"use strict";
var form=document.getElementById("transformForm"),steps=[].slice.call(document.querySelectorAll(".t-step")),next=document.getElementById("tNext"),back=document.getElementById("tBack"),generate=document.getElementById("tGenerate"),industryProfiles=[];
function el(id){return document.getElementById(id)} function value(n){var x=form&&form.querySelector('[name="'+n+'"]');return x?x.value.trim():""} function esc(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function list(n){return value(n).split(/[\n,;]+/).map(function(x){return x.trim()}).filter(Boolean)}
function showStep(n){n=Math.max(0,Math.min(steps.length-1,n));steps.forEach(function(s,i){s.classList.toggle("active",i===n)});if(el("tProgress"))el("tProgress").textContent="Step "+(n+1)+" of "+steps.length;if(el("tProgressBar"))el("tProgressBar").style.width=((n+1)/steps.length*100)+"%";if(back)back.hidden=n===0;if(next)next.hidden=n===steps.length-1;if(generate)generate.hidden=n!==steps.length-1;window._advisorStep=n}
function valid(){var s=steps[window._advisorStep||0];if(!s)return true;var req=s.querySelectorAll("[required]");for(var i=0;i<req.length;i++)if(!req[i].checkValidity()){req[i].reportValidity();return false}return true}
function renderReport(){
 var industry=value("industry"),processes=[].slice.call(form.querySelectorAll('[name="processes"]:checked')).map(function(x){return x.value}),pains=list("painList").concat([].slice.call(form.querySelectorAll('[name="painSignals"]:checked')).map(function(x){return x.value})),candidates=list("candidateList"),goals=[].slice.call(form.querySelectorAll('[name="goal"]:checked')).map(function(x){return x.value});
 var reqs=processes.map(function(p,i){return{id:"REQ-"+String(i+1).padStart(3,"0"),text:p,type:"Business",priority:i<3?"Must":"Should",process:p,acceptance:"Demonstrate the process using the customer's real scenario",gate:"Evidence / POC"}});
 var caps=processes.map(function(p){return{name:p,current:0,target:100}});
 var cands=candidates.map(function(name){return{name:name,capabilities:"",notes:"Customer-entered candidate; source and scope must be validated."}});
 var ctx={industry:industry,businessModel:value("businessModel"),current:value("current"),processes:processes,requirements:reqs,capabilities:caps,candidates:cands,evidence:[]};
 var scores=[],maturity={score:0,name:"Not enough data"};
 try{
   if(window.AutomationScanDecisionEngine){
     scores=window.AutomationScanDecisionEngine.shortlist(ctx)||[];
     maturity=window.AutomationScanDecisionEngine.maturity(ctx)||maturity;
   }
 }catch(engineError){console.warn("Decision engine fallback",engineError);}
 var signalInputs=[
   {key:"businessContext",score:(value("businessModel")?100:0)+(value("current")?100:0),weight:1},
   {key:"processScope",score:Math.min(100,processes.length*20),weight:1},
   {key:"painSignals",score:Math.min(100,pains.length*20),weight:1},
   {key:"desiredOutcomes",score:Math.min(100,goals.length*20),weight:1}
 ];
 var score=window.AutomationScanDecisionEngine&&window.AutomationScanDecisionEngine.weightedScore?window.AutomationScanDecisionEngine.weightedScore(signalInputs,{businessContext:1,processScope:1,painSignals:1,desiredOutcomes:1}):0;
 var interpretation=score===0?"Insufficient customer evidence":score<40?"Early discovery — add more customer evidence":score<70?"Discovery signal — validate the recorded business evidence":"Discovery signal — proceed to evidence-led validation";
 if(el("tResultTitle"))el("tResultTitle").textContent="Customer-defined transformation assessment";
 if(el("tResultSub"))el("tResultSub").textContent="A practical summary of your business situation, the areas worth investigating first, and the questions to take into your next technology or process discussion.";
 if(el("tScore"))el("tScore").textContent=score;
 if(el("tInterpretation"))el("tInterpretation").textContent=interpretation;
 if(el("tSummary"))el("tSummary").innerHTML="<p><b>Industry:</b> "+esc(industry)+"</p><p><b>Current platform:</b> "+esc(value("current")||"Not specified")+"</p><p><b>Processes:</b> "+esc(processes.join(" · ")||"Not specified")+"</p><p><b>Pains:</b> "+esc(pains.join(" · ")||"Not specified")+"</p>";
 if(el("tContext"))el("tContext").innerHTML="<div class='context-lead'><strong>"+esc(industry||"Your business")+"</strong><span>"+esc(value("businessModel")||"Business model not specified")+" · "+esc(value("current")||"Current platform not specified")+"</span></div><p class='context-copy'>This report translates your answers into practical areas to investigate. It is a starting point for a business discussion, not a software recommendation or guaranteed savings forecast.</p>";
 if(el("tCapCount"))el("tCapCount").textContent=String(processes.length);
 if(el("tCaps"))el("tCaps").innerHTML=processes.map(function(p){return"<span>"+esc(p)+"</span>"}).join("")||"<span>No capabilities supplied</span>";
 if(el("tKpis"))el("tKpis").innerHTML="<article><b>Processes</b><strong>"+processes.length+"</strong><span>Customer supplied</span></article><article><b>Pain signals</b><strong>"+pains.length+"</strong><span>Customer supplied</span></article><article><b>Candidates</b><strong>"+candidates.length+"</strong><span>Customer supplied</span></article><article><b>Maturity signal</b><strong>"+esc(maturity.name)+"</strong><span>"+maturity.score+"% recorded capability maturity</span></article>";
 if(el("tOpportunities"))el("tOpportunities").innerHTML=processes.map(function(p){return"<article><b>"+esc(p)+"</b><p>Validate simplification, standardisation, automation and human-control requirements before selecting technology.</p></article>"}).join("")||"<article><b>Add processes</b><p>Enter priority processes to create a meaningful opportunity view.</p></article>";
 if(el("tMatrix"))el("tMatrix").innerHTML="<p>Requirements are generated only from the processes you entered. Candidate fit is a signal only and requires recorded evidence.</p>";
 if(el("tNeedERP"))el("tNeedERP").innerHTML="<b>Do you need an ERP?</b><p>Not determined from the current evidence. First test process, capability, application and integration requirements; then compare stay, optimise, extend, complement and replace paths.</p>";
 if(el("tApproach"))el("tApproach").innerHTML="<b>Recommended analysis path</b><p>Baseline → map processes → define requirements → compare customer-entered candidates → validate with POC → quantify TCO → decide.</p>";
 if(el("tSavings"))el("tSavings").innerHTML="<b>Value</b><p>No savings estimate is asserted. Enter customer-specific costs, benefits and realisation assumptions in the Workbench business case.</p>";
 if(el("tFutureBenefits"))el("tFutureBenefits").innerHTML="<p>Future benefits should be tied to measurable customer KPIs such as cycle time, error rate, service level, working capital, revenue leakage or control effort.</p>";
 if(el("tTradeoffs"))el("tTradeoffs").innerHTML="<p>Every path should be compared using explicit requirements, evidence, migration effort, integration impact, operating cost and change impact.</p>";
 if(el("tRisks"))el("tRisks").innerHTML="<p>Unverified requirements, incomplete application inventory, poor data quality, integration dependencies, security/control gaps and unvalidated commercial assumptions remain risks until evidenced.</p>";
 if(el("tValue"))el("tValue").innerHTML="<p>Value is intentionally left customer-specific. No market benchmark is embedded.</p>";
 if(el("tEvidence"))el("tEvidence").innerHTML="<ul><li>Requirement acceptance evidence</li><li>Scripted demonstration</li><li>Real exception test</li><li>Integration/API proof</li><li>Security/control review</li><li>Migration/data rehearsal</li><li>Customer reference where material</li></ul>";
 if(el("tQuestions"))el("tQuestions").innerHTML="<ul><li>What evidence proves each Must requirement?</li><li>Which requirements are configuration, extension, custom or specialist?</li><li>What data and integration constraints can block the path?</li><li>What costs and benefits are supported by customer evidence?</li></ul>";
 if(el("tRoadmap"))el("tRoadmap").innerHTML="<article><b>0–30 days</b><p>Baseline processes, applications, requirements and evidence.</p></article><article><b>31–60 days</b><p>Run comparable demonstrations and resolve critical gaps.</p></article><article><b>61–90 days</b><p>Validate POC, TCO, migration readiness and decision gates.</p></article>";
 if(el("tCandidates"))el("tCandidates").innerHTML=scores.map(function(x){return"<article class='candidate-card'><b>"+esc(x.name)+"</b><p>Business fit signal: "+x.score+"/100 · "+esc((x.explanation||[]).join("; "))+"</p><span>Use customer evidence and a practical proof of concept before deciding.</span></article>"}).join("")||"<p>No candidates entered. Add candidate names to compare them dynamically.</p>";
 if(el("tExplore"))el("tExplore").innerHTML=scores.map(function(x){return"<article class='explore-card'><b>"+esc(x.name)+"</b><dl><dt>Recorded matches</dt><dd>"+esc((x.requirementHits||[]).join(" · ")||"None")+"</dd><dt>Evidence</dt><dd>"+x.evidenceCount+"</dd><dt>Gap count</dt><dd>"+x.gaps+"</dd></dl></article>"}).join("");
 if(el("tArchitecture"))el("tArchitecture").innerHTML="<p><b>Current:</b> "+esc(value("current")||"Not specified")+"</p><p><b>Target hypothesis:</b> Derive from customer requirements; do not assume ERP replacement.</p>";
 if(el("tEngineOutputs"))el("tEngineOutputs").innerHTML="<article><b>Dynamic investigation set</b><strong>"+esc(scores.map(function(x){return x.name}).join(" · ")||"None entered")+"</strong><span>Customer-defined only.</span></article><article><b>Evidence posture</b><strong>"+(processes.length?"Requirements defined":"Requirements missing")+"</strong><span>Validate before commitment.</span></article>";
 if(el("tPoc"))el("tPoc").innerHTML=(window.AutomationScanDecisionEngine?window.AutomationScanDecisionEngine.poc(ctx,scores):[]).map(function(x){return"<article><b>"+esc(x.candidate)+"</b><ol>"+x.tests.map(function(t){return"<li>"+esc(t)+"</li>"}).join("")+"</ol></article>"}).join("")||"<p>Add candidates to generate POC tests.</p>";
 if(el("tRfp"))el("tRfp").innerHTML=(window.AutomationScanDecisionEngine?window.AutomationScanDecisionEngine.rfp(ctx,scores):{sections:[]}).sections.map(function(x){return"<li>"+esc(x)+"</li>"}).join("");
 if(el("tModernLens"))el("tModernLens").innerHTML="<article><b>Process</b><strong>"+processes.length+" supplied</strong><span>Customer-defined</span></article><article><b>Governance</b><strong>Evidence-led</strong><span>Human approval and auditability remain explicit.</span></article><article><b>Architecture</b><strong>Requirement-led</strong><span>Core + specialists + integration only where evidence supports it.</span></article>";
 if(el("tRegulatory"))el("tRegulatory").innerHTML="<article><b>Regulatory scope</b><strong>"+esc(value("regulatoryIntensity")||"Not specified")+"</strong><span>Validate jurisdiction, legal entity, data and process scope with qualified professionals.</span></article>";
 if(el("tInputs")){var inputCards=[["Industry",industry||"Not specified"],["Business model",value("businessModel")||"Not specified"],["Current platform",value("current")||"Not specified"],["Operating footprint",value("scale")||"Not specified"],["Revenue model",value("revenueModel")||"Not specified"],["Target horizon",value("horizon")||"Not specified"],["Processes selected",processes.length?processes.join(" · "):"None selected"],["Pain points",pains.length?pains.join(" · "):"None selected"]];el("tInputs").innerHTML=inputCards.map(function(x){return "<div class='input-summary'><small>"+esc(x[0])+"</small><b>"+esc(x[1])+"</b></div>"}).join("")}
 if(el("tProcessDetail"))el("tProcessDetail").innerHTML=processes.map(function(x){return"<p>"+esc(x)+" — define volume, effort, exceptions, controls and KPI baseline.</p>"}).join("");
 if(el("tPainDetail"))el("tPainDetail").innerHTML=pains.map(function(x){return"<p>"+esc(x)+" — define impact, frequency, owner and evidence.</p>"}).join("");
 if(el("tScoreBreakdown")){var scoreCards=[["Business context",((value("businessModel")?10:0)+(value("current")?10:0)),"Your business model and current platform establish the starting context."],["Process scope",Math.min(100,processes.length*20),"Each selected process adds to the breadth of the assessment."],["Business pain",pains.length*5,"Selected pain points show where the business is experiencing friction."],["Desired outcomes",goals.length*4,"Your selected goals help focus the discovery discussion."]];el("tScoreBreakdown").innerHTML=scoreCards.map(function(x){return "<div class='score-break-row'><div><span>"+esc(x[0])+"</span><strong>"+x[1]+" pts</strong></div><p>"+esc(x[2])+"</p><div class='score-break-track'><i style='width:"+Math.min(100,Math.round(x[1]/20*100))+"%'></i></div></div>"}).join("")}
 if(el("tGoals"))el("tGoals").innerHTML=goals.map(function(x){return"<span>"+esc(x)+"</span>"}).join("")||"No goals selected";
 if(el("decisionPack"))el("decisionPack").innerHTML="<p>Use the Workbench to persist requirements, evidence, candidate responses, POC results, migration readiness and customer-specific economics.</p>";
 var results=el("transformResults");if(results){results.classList.remove("hidden");results.hidden=false;results.style.display="block";results.scrollIntoView({behavior:"smooth"});window.__automationScanReportReady=true}
 var data={industry:industry,businessModel:value("businessModel"),current:value("current"),processes:processes,pains:pains,candidates:candidates,goals:goals,savedAt:new Date().toISOString()};try{sessionStorage.setItem("automationscan_transform",JSON.stringify(data))}catch(e){}
}
function selectedIndustry(){
 var term=value("industry").toLowerCase();
 return industryProfiles.find(function(p){return p.name.toLowerCase()===term||(p.aliases||[]).some(function(a){return String(a).toLowerCase()===term})})||industryProfiles.find(function(p){return p.id==="generic"})||{name:"Other / custom",intro:"Describe the processes and controls specific to your business.",processes:[],pain_points:[]};
}
function renderIndustryQuestions(){
 var p=selectedIndustry(),processBox=el("industryProcesses"),painBox=el("industryPainOptions"),intro=el("industryIntro");
 if(intro)intro.textContent=p.intro||"Choose relevant processes and describe your own operating context.";
 if(processBox)processBox.innerHTML=(p.processes||[]).map(function(x,i){return '<label class="capability-check"><input type="checkbox" name="processes" value="'+esc(x[0])+'" style="display:inline-block!important;visibility:visible!important;opacity:1!important;width:auto!important;height:auto!important;"><span><b>'+esc(x[0])+'</b><small>'+esc(x[1])+'</small></span></label>'}).join("")||"<p>Describe your custom processes in the field below.</p>";
 if(painBox)painBox.innerHTML=(p.pain_points||[]).map(function(x){return '<label class="capability-check"><input type="checkbox" name="painSignals" value="'+esc(x)+'" style="display:inline-block!important;visibility:visible!important;opacity:1!important;width:auto!important;height:auto!important;"><span>'+esc(x)+'</span></label>'}).join("");
}
async function loadIndustryProfiles(){
 try{
  var response=await fetch("api/industries",{cache:"no-store"});if(!response.ok)throw new Error("industry_api_"+response.status);
  var data=await response.json();industryProfiles=Array.isArray(data.profiles)?data.profiles:[];
  var select=el("industry");if(select){var current=select.value;select.innerHTML='<option value="">Choose industry</option>'+industryProfiles.map(function(p){return '<option value="'+esc(p.name)+'">'+esc(p.name)+'</option>'}).join("");if(current)select.value=current;}
  renderIndustryQuestions();
 }catch(e){console.error("Industry questionnaires unavailable",e);if(el("industryIntro"))el("industryIntro").textContent="Industry questionnaire data could not load. Refresh or contact support before continuing.";}
}
el("industry")&&el("industry").addEventListener("change",renderIndustryQuestions);
var industryProfilesReady=false, industryProfilesLoading=false;
async function ensureIndustryProfiles(){
 if(industryProfilesReady||industryProfilesLoading)return;
 industryProfilesLoading=true;
 try{await loadIndustryProfiles();industryProfilesReady=true;}finally{industryProfilesLoading=false;}
}
document.addEventListener("automationScanUIReady",ensureIndustryProfiles);
if(window.AutomationScanUI&&window.AutomationScanUI.ready&&typeof window.AutomationScanUI.ready.then==="function")window.AutomationScanUI.ready.then(ensureIndustryProfiles);
else if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensureIndustryProfiles);
if(next)next.onclick=function(){if(valid())showStep((window._advisorStep||0)+1)};if(back)back.onclick=function(){showStep((window._advisorStep||0)-1)};if(form)form.addEventListener("submit",function(e){e.preventDefault();if(!valid())return;try{renderReport();if(window.trackEvent)window.trackEvent("transformation_report_generated",{industry:value("industry")})}catch(err){console.error(err);alert("AutomationScan could not generate the report. Please refresh and try again.")}});if(generate)generate.onclick=function(){try{renderReport();if(window.trackEvent)window.trackEvent("transformation_report_generated",{industry:value("industry")})}catch(err){console.error(err);alert("AutomationScan could not generate the report. Please refresh and try again.")}};
var saveAssessment=document.getElementById("tSave");if(saveAssessment)saveAssessment.onclick=function(){try{var raw=sessionStorage.getItem("automationscan_transform")||"{}";var data=JSON.parse(raw);data.savedAt=new Date().toISOString();localStorage.setItem("automationscan_saved_assessment",JSON.stringify(data));var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="automationscan-assessment.json";a.click();URL.revokeObjectURL(u)}catch(e){alert("The assessment could not be saved in this browser.")}};
var resumeAssessment=document.getElementById("tResume");if(resumeAssessment)resumeAssessment.onclick=function(){try{var raw=localStorage.getItem("automationscan_saved_assessment");if(!raw){alert("No saved assessment was found in this browser.");return}var data=JSON.parse(raw),map={industry:data.industry,businessModel:data.businessModel,current:data.current};Object.keys(map).forEach(function(k){var el=document.querySelector("[name='"+k+"']");if(el){el.value=map[k];el.dispatchEvent(new Event("change",{bubbles:true}))}});var p=document.querySelector("[name=processes]");if(p&&Array.isArray(data.processes))p.value=data.processes.join(", ");var g=document.querySelector("[name=goals]");if(g&&Array.isArray(data.goals))g.value=data.goals.join(", ");var n=document.querySelector(".form-note");if(n)n.textContent="Saved assessment restored from this browser."; }catch(e){alert("The saved assessment could not be restored.")}};var download=document.getElementById("tDownload");if(download)download.onclick=function(){window.print()};var print=document.getElementById("tPrint");if(print)print.onclick=function(){window.print()};showStep(0);
})();