(function(){
"use strict";
var KEY="automationScanWorkbenchV1", I=window.AutomationScanIntelligence||{}, E=window.AutomationScanDecisionEngine||{};
var state={profile:{},processes:[],applications:[],selection:[],economics:{},governance:[],roadmap:[],requirements:[],vendorResponses:[],evidence:[]};
function $(id){return document.getElementById(id)}
function esc(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function val(id){return $(id)?$(id).value:""}
function set(id,v){if($(id))$(id).value=v==null?"":v}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function load(){try{var x=JSON.parse(localStorage.getItem(KEY)||"null");if(x)state=Object.assign(state,x)}catch(e){}}
function track(n,p){try{if(window.trackEvent)window.trackEvent(n,p)}catch(e){}}
function renderList(id,items,headers,rows){
 var el=$(id); if(!el)return;
 if(!items.length){el.innerHTML="<div class='wb-note'>No items yet.</div>";return}
 el.innerHTML="<table class='wb-table'><thead><tr>"+headers.map(function(h){return"<th>"+h+"</th>"}).join("")+"</tr></thead><tbody>"+items.map(function(x){return"<tr>"+rows(x).map(function(c){return"<td>"+c+"</td>"}).join("")+"</tr>"}).join("")+"</tbody></table>"
}
function renderProfileOut(){
 var p=state.profile; $("profileOut").innerHTML=p.industry?"<div class='wb-kpis'><div class='wb-kpi'><small>Industry</small><strong>"+esc(p.industry)+"</strong></div><div class='wb-kpi'><small>Platform</small><strong>"+esc(p.current||"Not set")+"</strong></div><div class='wb-kpi'><small>Scale</small><strong>"+esc(p.scale)+"</strong></div><div class='wb-kpi'><small>Horizon</small><strong>"+esc(p.horizon)+"</strong></div></div><div class='wb-note'>Profile saved locally. Downstream sections use this same context.</div>":""
}
function renderProcesses(){
 renderList("processOut",state.processes,["Process","Volume","Effort/month","Exceptions","Errors","Treatment"],function(x){return[esc(x.name),esc(x.volume.toLocaleString()),esc(Math.round(x.volume*x.minutes/60).toLocaleString())+" hrs",esc(x.exceptions)+"%",esc(x.errors)+"%",'<span class="wb-tag">'+esc(x.treatment)+'</span>']})
}
function renderApps(){
 renderList("appsOut",state.applications,["Application","Cost","Value","Tech","Usage","Overlap","Disposition"],function(x){return[esc(x.name),esc(Number(x.cost||0).toLocaleString()),esc(x.value),esc(x.tech),esc(x.usage),esc(x.redundancy),'<span class="wb-tag">'+esc(x.disposition)+'</span>']})
}
function renderGov(){
 renderList("governOut",state.governance,["Requirement","Capability","Evidence","Gate","AI / Risk"],function(x){return[esc(x.req),esc(x.cap),esc(x.evidence),esc(x.gate),esc((x.ai||"")+" "+(x.risk||""))]})
}
function renderRoadmap(){
 renderList("roadmapOut",state.roadmap,["Horizon","Workstream","Owner","Gate","Dependency","Value"],function(x){return[esc(x.horizon),esc(x.workstream),esc(x.owner),esc(x.gate),esc(x.dependency),esc(x.value)]})
}
function renderRequirements(){renderList("requirementsOut",state.requirements,["ID","Requirement","Type","Priority","Process","Acceptance","Gate"],function(x){return[esc(x.id),esc(x.text),esc(x.type),esc(x.priority),esc(x.process),esc(x.acceptance),esc(x.gate)]})}
function renderCompare(){renderList("compareOut",state.vendorResponses,["Candidate","Requirement","Status","Evidence","Response","Dependencies"],function(x){return[esc(x.candidate),esc(x.req),'<span class="wb-tag">'+esc(x.status)+'</span>','<span class="wb-tag">'+esc(x.evidence)+'</span>',esc(x.response),esc(x.dependency)]})}
function exportRequirements(){var rows=[["ID","Requirement","Type","Priority","Process","Acceptance","Gate"]].concat(state.requirements.map(function(x){return[x.id,x.text,x.type,x.priority,x.process,x.acceptance,x.gate]}));var csv=rows.map(function(r){return r.map(function(v){return '"'+String(v||"").replace(/"/g,'""')+'"'}).join(",")}).join("\n");var b=new Blob([csv],{type:"text/csv"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="automationscan-requirements.csv";a.click();URL.revokeObjectURL(a.href)}
function renderEvidence(){
 renderList("evidenceOut",state.evidence,["Claim","Source","Date","Reviewer","Status","Next validation"],function(x){return[esc(x.claim),esc(x.source),esc(x.date),esc(x.reviewer),'<span class="wb-tag">'+esc(x.status)+'</span>',esc(x.next)]})
}
function renderSelection(){
 var p=state.profile, ctx={industry:p.industry,current:p.current,scale:p.scale,custom:p.custom,integration:p.integration,processes:state.processes.map(function(x){return x.name}),pains:p.pain?[p.pain]:[]};
 var rows=E.shortlist?E.shortlist(ctx):[];
 state.selection=rows.slice(0,5).map(function(x){return {name:x.name,score:x.score,processHits:x.processHits||[],painHits:x.painHits||[],industryFit:x.industryFit,continuity:x.continuity}})
 renderList("selectOut",state.selection,["Investigation candidate","Signal","Why it surfaced","Evidence still needed"],function(x){
 return[esc(x.name),esc(x.score)+"/100",esc((x.industryFit?"Industry fit; ":"")+(x.processHits.length?"Process match; ":"")+(x.continuity?"Continuity signal":"Contextual investigation")), '<span class="wb-tag">Scripted demo + reference + integration proof + TCO</span>']})
}
function calcEconomics(){
 var n=function(id){return Number(val(id))||0}, years=Math.max(1,n("tYears"));
 var input={licence:n("tCurrentLicence"),support:n("tCurrentSupport"),infrastructure:n("tCurrentInfra"),internal:n("tCurrentInternal"),futureSubscription:n("tFutureSub"),futureServices:n("tFutureServices"),futureInfrastructure:n("tFutureInfra"),implementation:n("tImplementation"),migration:n("tMigration"),change:n("tChange"),years:years};
 var cur=(input.licence+input.support+input.infrastructure+input.internal)*years;
 var fut=(input.futureSubscription+input.futureServices+input.futureInfrastructure)*years+input.implementation+input.migration+input.change;
 var value=n("tValue")*(n("tRealisation")/100)*years, net=value-(fut-cur), payback=value?Math.max(0,(fut-cur)/Math.max(1,n("tValue")*(n("tRealisation")/100))):0;
 state.economics={years:years,currentTotal:cur,futureTotal:fut,realisedValue:value,netValue:net,paybackYears:payback};
 $("economicsOut").innerHTML='<div class="wb-kpis"><div class="wb-kpi"><small>Current '+years+'Y cost</small><strong>'+cur.toLocaleString()+'</strong></div><div class="wb-kpi"><small>Future '+years+'Y cost</small><strong>'+fut.toLocaleString()+'</strong></div><div class="wb-kpi"><small>Realised value</small><strong>'+value.toLocaleString()+'</strong></div><div class="wb-kpi"><small>Net value</small><strong>'+net.toLocaleString()+'</strong></div></div><div class="wb-note">These are calculations from your assumptions, not a market benchmark or guarantee. Add tax, inflation, contract terms and unquantified benefits before using the result as a business case.</div>';save()
}
function renderExecute(kind){
 var p=state.profile, names=state.selection.map(function(x){return x.name}), processes=state.processes.map(function(x){return x.name});
 if(kind==="rfp"){var r=E.rfp?E.rfp({industry:p.industry,businessModel:p.businessModel,revenueModel:p.revenueModel,fulfilmentModel:p.fulfilmentModel,deliveryModel:p.deliveryModel,current:p.current,processes:processes,pains:p.pain?[p.pain]:[]},state.selection):null;
 $("executeOut").innerHTML="<div class='wb-list'>"+((r&&r.sections)||["Business context","Functional requirements","Non-functional requirements","Integration/API","Security & compliance","Data & migration","AI capabilities","Commercials/SLA","Evidence and references"]).map(function(x){return"<div class='wb-card'>"+esc(x)+"</div>"}).join("")+"</div>";}
 else {var rows=E.poc?E.poc({processes:processes},state.selection):[]; $("executeOut").innerHTML="<div class='wb-list'>"+rows.map(function(x){return"<div class='wb-card'><strong>"+esc(x.candidate)+"</strong><small>"+x.tests.map(esc).join(" · ")+"</small></div>"}).join("")+"</div>"}
 track("workbench_execute",{type:kind});save()
}
function report(){
 var p=state.profile,e=state.economics;
 $("wbReport").innerHTML='<div class="wb-kpis"><div class="wb-kpi"><small>Processes</small><strong>'+state.processes.length+'</strong></div><div class="wb-kpi"><small>Applications</small><strong>'+state.applications.length+'</strong></div><div class="wb-kpi"><small>Requirements</small><strong>'+state.requirements.length+'</strong></div><div class="wb-kpi"><small>Evidence items</small><strong>'+state.evidence.length+'</strong></div><div class="wb-kpi"><small>Investigation set</small><strong>'+state.selection.length+'</strong></div></div><h3>Transformation context</h3><p>'+esc(p.industry||"Not set")+" · "+esc(p.current||"Current platform not set")+" · "+esc(p.scale||"Scale not set")+'</p><h3>Investigation set</h3><p>'+esc(state.selection.map(function(x){return x.name}).join(", ")||"Run Selection first")+'</p><h3>Economics</h3><p>'+((e.currentTotal!=null)?"Current: "+e.currentTotal.toLocaleString()+" · Future: "+e.futureTotal.toLocaleString()+" · Realised value: "+e.realisedValue.toLocaleString():"Not calculated")+'</p><h3>Evidence posture</h3><p>'+esc(state.evidence.filter(function(x){return x.status==="POC validated"||x.status==="Demonstrated"}).length)+" validated/demonstrated items; "+esc(state.evidence.filter(function(x){return x.status==="NOT VERIFIED"}).length)+" marked NOT VERIFIED.</p><div class="wb-note">This dossier is decision support. Vendor claims, compliance conclusions and savings require independent validation.</div>"
}
function exportJson(){var blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="automationscan-transformation-workbench.json";a.click();URL.revokeObjectURL(a.href);track("workbench_export",{format:"json"})}
function importApps(file){var reader=new FileReader();reader.onload=function(){var lines=reader.result.split(/\r?\n/).filter(Boolean);if(!lines.length)return;var head=lines.shift().split(",").map(function(x){return x.trim().toLowerCase()});lines.forEach(function(line){var c=line.split(",");var o={};head.forEach(function(h,i){o[h]=c[i]||""});if(o.application)state.applications.push({name:o.application,cost:Number(o.cost||0),value:o.value||"Unknown",tech:o.technical_health||o.tech||"Unknown",usage:o.usage||"Unknown",redundancy:o.redundancy||"None known",lifecycle:o.lifecycle||"Stable",integration:o.integration||"Medium",disposition:"Assess"})});save();renderApps()};reader.readAsText(file)}
function bind(){
 var industries=Object.keys(I.industries||{});$("wbIndustry").innerHTML=industries.map(function(x){return"<option>"+esc(x)+"</option>"}).join("");
 document.querySelectorAll("[data-tab]").forEach(function(b){b.onclick=function(){document.querySelectorAll(".wb-nav button").forEach(function(x){x.classList.remove("active")});b.classList.add("active");document.querySelectorAll(".wb-panel").forEach(function(x){x.classList.remove("active")});$("tab-"+b.dataset.tab).classList.add("active");if(b.dataset.tab==="report")report();}});
 $("saveProfile").onclick=function(){state.profile={industry:val("wbIndustry"),current:val("wbCurrent"),businessModel:val("wbBusiness"),scale:val("wbScale"),revenueModel:val("wbRevenue"),fulfilmentModel:val("wbFulfilment"),deliveryModel:val("wbDelivery"),regulatoryIntensity:val("wbRegulatory"),appetite:val("wbAppetite"),horizon:val("wbHorizon"),goals:val("wbGoals"),pain:val("wbPain"),integration:val("wbIntegration")};save();renderProfileOut();track("workbench_profile_saved")};
 $("loadProfile").onclick=function(){var p=state.profile;Object.keys({industry:1,current:1,businessModel:1,scale:1,revenueModel:1,fulfilmentModel:1,deliveryModel:1,regulatoryIntensity:1,appetite:1,horizon:1,goals:1,pain:1}).forEach(function(k){var map={industry:"wbIndustry",current:"wbCurrent",businessModel:"wbBusiness",scale:"wbScale",revenueModel:"wbRevenue",fulfilmentModel:"wbFulfilment",deliveryModel:"wbDelivery",regulatoryIntensity:"wbRegulatory",appetite:"wbAppetite",horizon:"wbHorizon",goals:"wbGoals",pain:"wbPain"};set(map[k],p[k])});renderProfileOut()};
 $("addProcess").onclick=function(){var x={name:val("pName").trim(),volume:Number(val("pVolume"))||0,minutes:Number(val("pMinutes"))||0,exceptions:Number(val("pExceptions"))||0,errors:Number(val("pErrors"))||0,human:val("pHuman"),notes:val("pNotes")};if(!x.name)return alert("Enter a process name.");x.treatment=x.human==="High"?"Keep human / simplify":"Automate / simplify";if(x.exceptions>=20||x.errors>=10)x.treatment="Simplify / standardise first";state.processes.push(x);save();renderProcesses()};
 $("clearProcesses").onclick=function(){state.processes=[];save();renderProcesses()};
 $("addApp").onclick=function(){var x={name:val("aName").trim(),cost:Number(val("aCost"))||0,value:val("aValue"),tech:val("aTech"),usage:val("aUsage"),redundancy:val("aRedundancy"),lifecycle:val("aLifecycle"),integration:val("aIntegration")};if(!x.name)return alert("Enter an application name.");x.disposition=x.redundancy==="Duplicate"?"Consolidate":(x.lifecycle==="End of life"||x.tech==="Legacy"?"Modernise / replace":"Keep / assess");state.applications.push(x);save();renderApps()};
 $("importApps").onclick=function(){$("appFile").click()};$("appFile").onchange=function(){if(this.files[0])importApps(this.files[0])};
 $("runSelection").onclick=function(){renderSelection();save();track("workbench_selection_run")};
 $("calcEconomics").onclick=calcEconomics;
 $("generateRfp").onclick=function(){renderExecute("rfp")};$("generatePoc").onclick=function(){renderExecute("poc")};
 $("addRequirement").onclick=function(){var n=state.requirements.length+1;state.requirements.push({id:"REQ-"+String(n).padStart(3,"0"),text:val("qText"),type:val("qType"),priority:val("qPriority"),process:val("qProcess"),acceptance:val("qAcceptance"),gate:val("qGate")});save();renderRequirements()};$("exportRequirements").onclick=exportRequirements;
 $("addVendorResponse").onclick=function(){state.vendorResponses.push({candidate:val("vCandidate"),req:val("vReq"),status:val("vStatus"),evidence:val("vEvidence"),response:val("vResponse"),dependency:val("vDependency")});save();renderCompare()};$("clearVendorResponses").onclick=function(){state.vendorResponses=[];save();renderCompare()};
 $("addGovern").onclick=function(){state.governance.push({req:val("gReq"),cap:val("gCap"),evidence:val("gEvidence"),gate:val("gGate"),ai:val("gAi"),risk:val("gRisk")});save();renderGov()};
 $("addRoadmap").onclick=function(){state.roadmap.push({horizon:val("rHorizon"),workstream:val("rWorkstream"),owner:val("rOwner"),gate:val("rGate"),dependency:val("rDependency"),value:val("rValue")});save();renderRoadmap()};
 $("addEvidence").onclick=function(){state.evidence.push({claim:val("eClaim"),source:val("eSource"),date:val("eDate"),reviewer:val("eReviewer"),status:val("eStatus"),next:val("eNext")});save();renderEvidence()};
 $("exportJson").onclick=exportJson;$("printReport").onclick=function(){report();window.print()};$("resetAll").onclick=function(){if(confirm("Reset the local workbench?")){localStorage.removeItem(KEY);location.reload()}};
 load();renderProfileOut();renderProcesses();renderApps();renderGov();renderRoadmap();renderRequirements();renderCompare();renderEvidence();report();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
})();