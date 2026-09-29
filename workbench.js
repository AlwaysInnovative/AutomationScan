(function(){
"use strict";
var KEY="automationScanWorkbenchV2", E=window.AutomationScanDecisionEngine||{};
var bound=false;
var state={profile:{},processes:[],applications:[],selection:[],candidates:[],economics:{},governance:[],roadmap:[],requirements:[],capabilities:[],vendorResponses:[],pocResults:[],evidence:[]};
function $(id){return document.getElementById(id)}
function esc(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function norm(v){return String(v||"").toLowerCase().trim()}
function val(id){return $(id)?$(id).value:""}
function set(id,v){if($(id))$(id).value=v==null?"":v}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch(e){return false}}
function load(){try{var x=JSON.parse(localStorage.getItem(KEY)||"null");if(x){state=Object.assign(state,x);state.profile=state.profile||{};["processes","applications","selection","candidates","governance","roadmap","requirements","capabilities","vendorResponses","pocResults","evidence"].forEach(function(k){if(!Array.isArray(state[k]))state[k]=[]});state.economics=state.economics||{}}}catch(e){state={profile:{},processes:[],applications:[],selection:[],candidates:[],economics:{},governance:[],roadmap:[],requirements:[],capabilities:[],vendorResponses:[],pocResults:[],evidence:[]}}}
function cloudId(){if(!state.cloudId){if(window.crypto&&crypto.randomUUID)state.cloudId=crypto.randomUUID();else state.cloudId="as-"+Date.now()+"-"+Math.random().toString(36).slice(2)}return state.cloudId}
async function cloudSave(){var s=$("cloudStatus");s.textContent="Saving cloud copy…";try{var id=cloudId(),body={id:id,state:state};if(state.cloudToken)body.token=state.cloudToken;var r=await fetch("api/workbench?id="+encodeURIComponent(id),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.error||"save_failed");state.cloudToken=d.accessToken||state.cloudToken;state.cloudExpiresAt=d.expiresAt||state.cloudExpiresAt;save();s.textContent="Cloud copy saved. Assessment ID: "+id+" · Access token retained in this browser for 30 days."}catch(e){s.textContent="Cloud save unavailable: "+e.message}}
async function cloudLoad(){var id=state.cloudId||prompt("Enter the assessment ID");if(!id)return;var tokenValue=state.cloudToken||prompt("Enter the assessment access token");if(!tokenValue)return;var s=$("cloudStatus");s.textContent="Loading cloud copy…";try{var r=await fetch("api/workbench?id="+encodeURIComponent(id)+"&token="+encodeURIComponent(tokenValue)),d=await r.json();if(!r.ok)throw new Error(d.error||"load_failed");state=Object.assign(state,d.state||{});state.cloudId=d.id||id;state.cloudToken=tokenValue;state.cloudExpiresAt=d.expires_at||state.cloudExpiresAt;save();location.reload()}catch(e){s.textContent="Cloud load unavailable: "+e.message}}
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
 renderList("processOut",state.processes,["Process","Volume","Effort/month","Exceptions","Errors","Treatment"],function(x){var volume=Number(x.volume)||0,minutes=Number(x.minutes)||0;return[esc(x.name),esc(volume.toLocaleString()),esc(Math.round(volume*minutes/60).toLocaleString())+" hrs",esc(Number(x.exceptions)||0)+"%",esc(Number(x.errors)||0)+"%",'<span class="wb-tag">'+esc(x.treatment||"Assess")+'</span>']})
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
function renderCapabilities(){renderList("capabilityOut",state.capabilities,["Capability","Criticality","Current","Target","Gap","Application","Requirement","Evidence"],function(x){return[esc(x.name),esc(x.criticality),esc(x.current)+"%",esc(x.target)+"%",esc(x.gap),esc(x.app),esc(x.req),esc(x.evidence)]})}
function renderRequirements(){renderList("requirementsOut",state.requirements,["ID","Requirement","Type","Priority","Process","Acceptance","Gate"],function(x){return[esc(x.id),esc(x.text),esc(x.type),esc(x.priority),esc(x.process),esc(x.acceptance),esc(x.gate)]})}
function renderCompare(){renderList("compareOut",state.vendorResponses,["Candidate","Requirement","Status","Evidence","Response","Dependencies"],function(x){return[esc(x.candidate),esc(x.req),'<span class="wb-tag">'+esc(x.status)+'</span>','<span class="wb-tag">'+esc(x.evidence)+'</span>',esc(x.response),esc(x.dependency)]})}
function exportRequirements(){var rows=[["ID","Requirement","Type","Priority","Process","Acceptance","Gate"]].concat(state.requirements.map(function(x){return[x.id,x.text,x.type,x.priority,x.process,x.acceptance,x.gate]}));var csv=rows.map(function(r){return r.map(function(v){return '"'+String(v||"").replace(/"/g,'""')+'"'}).join(",")}).join("\n");var b=new Blob([csv],{type:"text/csv"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="automationscan-requirements.csv";a.click();URL.revokeObjectURL(a.href)}
function renderPortfolio(){
 var out=$("portfolioOut");if(!state.applications.length){out.innerHTML="<div class='wb-note'>Add or import applications first.</div>";return}
 var rows=state.applications.map(function(a){var risk=0;if(a.value==="Low")risk+=2;if(a.value==="Unknown")risk+=1;if(a.tech==="Legacy"||a.tech==="Fragile")risk+=2;if(a.usage==="Low")risk+=1;if(a.redundancy==="Duplicate")risk+=2;if(a.lifecycle==="End of life")risk+=2;if(a.integration==="High")risk+=1;var d=risk>=6?"Replace / consolidate":risk>=4?"Modernise / assess":risk>=2?"Watch / rationalise":"Keep / assess";return Object.assign({},a,{risk:risk,health:d})});
 state.applications=state.applications.map(function(a){var r=rows.filter(function(x){return x.name===a.name})[0];return Object.assign({},a,{portfolioRisk:r.risk,portfolioHealth:r.health})});
 renderList("portfolioOut",rows,["Application","Risk signal","Disposition","Cost","Key drivers"],function(x){return[esc(x.name),esc(x.risk)+"/10",'<span class="wb-tag">'+esc(x.health)+'</span>',esc(Number(x.cost||0).toLocaleString()),esc([x.tech,x.usage,x.redundancy,x.lifecycle,x.integration].join(" · "))]});save()
}
function renderPoc(){renderList("pocOut",state.pocResults,["Candidate","Scenario","Expected","Observed","Evidence","Decision"],function(x){return[esc(x.candidate),esc(x.scenario),esc(x.expected),esc(x.observed),'<span class="wb-tag">'+esc(x.evidence)+'</span>',esc(x.decision)]})}
function scoreMigration(){
 var ids=["mData","mIntegration","mCustom","mPeople","mSecurity","mTesting"],values={};ids.forEach(function(id){values[id]=Math.min(100,Math.max(0,Number(val(id))||0))});var score=Math.round(ids.reduce(function(s,id){return s+values[id]},0)/ids.length);
 var critical=[];if(values.mData<50)critical.push("Data readiness below 50%");if(values.mSecurity<70)critical.push("Security/control readiness below 70%");if(values.mIntegration<50)critical.push("Integration readiness below 50%");
 var band=critical.length?"Gate blocked":score>=80?"High readiness":score>=60?"Moderate readiness":score>=40?"Material gaps":"Low readiness";
 state.migrationReadiness={values:values,score:score,criticalGates:critical,band:band};save();
 $("migrationOut").innerHTML='<div class="wb-kpis"><div class="wb-kpi"><small>Readiness</small><strong>'+score+'%</strong></div><div class="wb-kpi"><small>Status</small><strong>'+band+'</strong></div></div>'+(critical.length?'<div class="wb-note"><b>Critical gates:</b> '+esc(critical.join(" · "))+'</div>':"")+'<div class="wb-note">The score is an input model, not an implementation prediction. Critical security, data and integration gates can block a high average. Validate each dimension with evidence and programme owners.</div>';track("migration_readiness_scored",{score:score,blocked:critical.length>0})}
function renderEvidence(){
 renderList("evidenceOut",state.evidence,["Claim","Source","Date","Reviewer","Status","Next validation"],function(x){return[esc(x.claim),esc(x.source),esc(x.date),esc(x.reviewer),'<span class="wb-tag">'+esc(x.status)+'</span>',esc(x.next)]})
}
function renderCandidates(){renderList("candidateOut",state.candidates,["Candidate","Capabilities / scope","Notes"],function(x){return[esc(x.name),esc(x.capabilities),esc(x.notes)]})}
function renderSelection(){
 if(!state.profile.industry){$("selectOut").innerHTML="<div class='wb-note'>Save the transformation profile before running the investigation set.</div>";return}
 var p=state.profile, ctx={industry:p.industry,businessModel:p.businessModel,current:p.current,scale:p.scale,custom:p.custom,customProcesses:p.customProcesses,integration:p.integration,goals:p.goals,revenueModel:p.revenueModel,fulfilmentModel:p.fulfilmentModel,deliveryModel:p.deliveryModel,regulatoryIntensity:p.regulatoryIntensity,erpSpend:p.erpSpend,processes:state.processes.map(function(x){return x.name}),pains:p.pain?[p.pain]:[],requirements:state.requirements,capabilities:state.capabilities,evidence:state.evidence,candidates:state.candidates};
 var rows=E.shortlist?E.shortlist(ctx):[];
 state.selection=rows.slice(0,5).map(function(x){return {name:x.name,score:x.score,processHits:x.processHits||[],painHits:x.painHits||[],industryFit:x.industryFit,continuity:x.continuity}})
 renderList("selectOut",state.selection,["Investigation candidate","Signal","Why it surfaced","Evidence still needed"],function(x){
 return[esc(x.name),esc(x.score)+"/100",esc((x.explanation||[]).join("; ")), '<span class="wb-tag">Validate with evidence / POC</span>']})
}
function traceRequirements(){
 var out=$("traceOut");
 if(!state.requirements.length){out.innerHTML="<div class='wb-note'>Add requirements first.</div>";return}
 if(!state.selection.length){renderSelection()}
 var html="";
 state.requirements.forEach(function(q){
   html+="<div class='wb-card'><strong>"+esc(q.id)+" - "+esc(q.text)+"</strong><small>"+esc(q.type)+" / "+esc(q.priority)+" / Gate: "+esc(q.gate||"Not defined")+"</small>";
   state.selection.forEach(function(candidate){
     var found=state.vendorResponses.filter(function(v){return v.req===q.id&&v.candidate===candidate.name})[0];
     html+="<div class='wb-card'><strong>"+esc(candidate.name)+"</strong><small>"+(found?esc(found.status)+" / "+esc(found.evidence):"No response recorded - evidence or POC required")+"</small></div>";
   });
   html+="</div>";
 });
 out.innerHTML=html;
}
function scenarioEconomics(){
 var base=state.economics;
 if(!base||base.currentTotal==null)return;
 var html="<h3>Scenario lens</h3><table class='wb-table'><tr><th>Path</th><th>What must be proven</th><th>Economic inputs required</th></tr>";
 [["Stay / Optimise","Baseline value, process improvement and avoidable cost","Current run cost, improvement cost, benefits"],["Modernise / Extend","Target capability without unnecessary replacement","Upgrade/extension cost, integration, support and benefit assumptions"],["Complement","Specialist capability alongside the current core","New licence, integration, operating and retirement costs"],["Replace","Business case for a new core and transition","Licence, implementation, migration, change, coexistence, decommissioning and benefit assumptions"]].forEach(function(s){html+="<tr><td><b>"+esc(s[0])+"</b></td><td>"+esc(s[1])+"</td><td>"+esc(s[2])+"</td></tr>"});
 html+="</table><div class='wb-note'>No scenario multiplier is invented here. Enter customer-specific assumptions before comparing paths; a scenario label is not evidence of savings.</div>";
 $("economicsOut").innerHTML+=html;
}
function calcEconomics(){
 var n=function(id){return Math.max(0,Number(val(id))||0)}, years=Math.max(1,n("tYears")), inflation=n("tInflation")/100, discount=n("tDiscount")/100, contingency=n("tContingency")/100;
 var currentAnnual=n("tCurrentLicence")+n("tCurrentSupport")+n("tCurrentInfra")+n("tCurrentInternal")+n("tCurrentExternal")+n("tCurrentUpgrade");
 var futureAnnual=n("tFutureSub")+n("tFutureServices")+n("tFutureInfra")+n("tFutureInternal")+n("tFutureExternal")+n("tFutureUpgrade");
 var oneTime=n("tImplementation")+n("tMigration")+n("tIntegration")+n("tTesting")+n("tChange")+n("tCoexistence")+n("tDecommissioning");
 var currentTotal=0,futureTotal=oneTime*(1+contingency),pvCurrent=0,pvFuture=oneTime*(1+contingency);
 for(var y=1;y<=years;y++){var factor=Math.pow(1+inflation,y-1),df=Math.pow(1+discount,y);currentTotal+=currentAnnual*factor;futureTotal+=futureAnnual*factor;pvCurrent+=currentAnnual*factor/df;pvFuture+=futureAnnual*factor/df}
 var annualValue=n("tValue")*(n("tRealisation")/100),realisedValue=0,pvValue=0;
 for(var vy=1;vy<=years;vy++){var vv=annualValue*Math.pow(1+inflation,vy-1);realisedValue+=vv;pvValue+=vv/Math.pow(1+discount,vy)}
 var delta=currentTotal-futureTotal,netValue=realisedValue-delta,payback=delta>0&&annualValue>0?delta/annualValue:null;
 state.economics={years:years,inflation:inflation*100,discountRate:discount*100,contingency:contingency*100,currentAnnual:currentAnnual,futureAnnual:futureAnnual,oneTime:oneTime,currentTotal:currentTotal,futureTotal:futureTotal,pvCurrent:pvCurrent,pvFuture:pvFuture,realisedValue:realisedValue,pvValue:pvValue,netValue:netValue,paybackYears:payback};
 $("economicsOut").innerHTML='<div class="wb-kpis"><div class="wb-kpi"><small>Current '+years+'Y cost</small><strong>'+Math.round(currentTotal).toLocaleString()+'</strong></div><div class="wb-kpi"><small>Future '+years+'Y cost</small><strong>'+Math.round(futureTotal).toLocaleString()+'</strong></div><div class="wb-kpi"><small>PV future cost</small><strong>'+Math.round(pvFuture).toLocaleString()+'</strong></div><div class="wb-kpi"><small>Realised value</small><strong>'+Math.round(realisedValue).toLocaleString()+'</strong></div><div class="wb-kpi"><small>Net value</small><strong>'+Math.round(netValue).toLocaleString()+'</strong></div><div class="wb-kpi"><small>Payback</small><strong>'+(payback==null?"Not calculable":payback.toFixed(1)+" yrs")+'</strong></div></div><div class="wb-note">Calculated only from customer-entered assumptions, including inflation, discount rate and contingency. No market benchmark or savings multiplier is embedded.</div>';save()
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
 $("wbReport").innerHTML='<div class="wb-kpis"><div class="wb-kpi"><small>Processes</small><strong>'+state.processes.length+'</strong></div><div class="wb-kpi"><small>Applications</small><strong>'+state.applications.length+'</strong></div><div class="wb-kpi"><small>Capabilities</small><strong>'+state.capabilities.length+'</strong></div><div class="wb-kpi"><small>Requirements</small><strong>'+state.requirements.length+'</strong></div><div class="wb-kpi"><small>Evidence items</small><strong>'+state.evidence.length+'</strong></div><div class="wb-kpi"><small>Investigation set</small><strong>'+state.selection.length+'</strong></div></div><h3>Transformation context</h3><p>'+esc(p.industry||"Not set")+" · "+esc(p.current||"Current platform not set")+" · "+esc(p.scale||"Scale not set")+'</p><h3>Investigation set</h3><p>'+esc(state.selection.map(function(x){return x.name}).join(", ")||"Run Selection first")+'</p><h3>Capability gaps</h3><p>'+esc(state.capabilities.filter(function(x){return x.target>x.current}).length)+" capability gaps recorded."+'</p><h3>Economics</h3><p>'+((e.currentTotal!=null)?"Current: "+e.currentTotal.toLocaleString()+" · Future: "+e.futureTotal.toLocaleString()+" · Realised value: "+e.realisedValue.toLocaleString():"Not calculated")+'</p><h3>Evidence posture</h3><p>'+esc(state.evidence.filter(function(x){return x.status==="POC validated"||x.status==="Demonstrated"}).length)+" validated/demonstrated items; "+esc(state.evidence.filter(function(x){return x.status==="NOT VERIFIED"}).length)+' marked NOT VERIFIED.</p><div class="wb-note">This dossier is decision support. Vendor claims, compliance conclusions and savings require independent validation.</div>'
}
function exportJson(){var blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="automationscan-transformation-workbench.json";a.click();URL.revokeObjectURL(a.href);track("workbench_export",{format:"json"})}
function parseCsvLine(line){var out=[],cur="",quoted=false;for(var i=0;i<line.length;i++){var ch=line[i];if(ch==="\""&&line[i+1]==="\""&&quoted){cur+="\"";i++;continue}if(ch==="\""){quoted=!quoted;continue}if(ch===","&&!quoted){out.push(cur);cur="";continue}cur+=ch}out.push(cur);return out}
function importApps(file){var reader=new FileReader();reader.onload=function(){var lines=reader.result.split(/\r?\n/).filter(function(x){return x.trim()});if(!lines.length)return;var head=parseCsvLine(lines.shift()).map(function(x){return x.trim().toLowerCase()});lines.forEach(function(line){var c=parseCsvLine(line),o={};head.forEach(function(h,i){o[h]=String(c[i]||"").trim()});if(o.application)state.applications.push({name:o.application,cost:Math.max(0,Number(o.cost)||0),value:o.value||"Unknown",tech:o.technical_health||o.tech||"Unknown",usage:o.usage||"Unknown",redundancy:o.redundancy||"None known",lifecycle:o.lifecycle||"Stable",integration:o.integration||"Medium",disposition:"Assess"})});save();renderApps()};reader.readAsText(file)}
function journeyContext(){var p=state.profile||{},a=[];if(p.industry)a.push("Industry: "+p.industry);if(p.businessModel)a.push("Business model: "+p.businessModel);if(p.current)a.push("Platform: "+p.current);if(state.processes.length)a.push(state.processes.length+" processes");if(state.applications.length)a.push(state.applications.length+" applications");if(state.requirements.length)a.push(state.requirements.length+" requirements");if(state.candidates.length)a.push(state.candidates.length+" candidates");if(state.evidence.length)a.push(state.evidence.length+" evidence items");return a}
function journeyActivate(key,preserveStage){var b=document.querySelector('[data-tab="'+key+'"]');if(b){state._preserveJourneyStage=!!preserveStage;b.click()}}
function syncJourneyNav(){
 var allowed=(state.journeyTemplate&&state.journeyTemplate.stages||[]).map(function(s){return s.section;});
 document.querySelectorAll(".wb-nav button").forEach(function(b){
   b.hidden=allowed.length>0&&!allowed.includes(b.dataset.tab);
 });
}
function journeyRender(){var j=state.journeyTemplate;if(!j||!$("journeyTitle"))return;$("journeyTitle").textContent=j.name;$("journeySummary").textContent=j.summary+" "+j.objective_prompt;var c=journeyContext();$("journeyContext").innerHTML=c.map(function(x){return'<span class="wb-context-pill">'+esc(x)+'</span>'}).join("")||'<span class="wb-context-pill">No previous context — start with Profile</span>';var st=j.stages||[],i=Number(state.journeyStage||0);$("journeyStages").innerHTML=st.map(function(s,n){return'<button type="button" aria-current="'+(n===i?'step':'false')+'" class="wb-stage '+(n===i?'active ':'')+(n<i?'done':'')+'" data-journey-index="'+n+'"><strong>'+String(n+1).padStart(2,'0')+'. '+esc(s.label)+'</strong><small>'+esc(s.why||"")+'</small></button>'}).join("");document.querySelectorAll("[data-journey-index]").forEach(function(b){b.onclick=function(){state.journeyStage=Number(b.dataset.journeyIndex);save();journeyActivate(st[state.journeyStage].section,true);journeyRender()}});syncJourneyNav();$("journeyNext").textContent=i>=st.length-1?"Review dossier":"Continue: "+(st[i]?st[i].label:"Profile")}
function journeyScore(j){
 var p=state.profile||{},r=j.context_rules||{},score=Number(r.priority)||0,hay=[String(p.industry||""),String(p.businessModel||""),String(p.current||""),String(p.revenueModel||"")].map(function(x){return x.toLowerCase()});
 (r.industry_ids||[]).forEach(function(x){if(hay[0]===String(x).toLowerCase())score+=20});
 (r.current_platforms||[]).forEach(function(x){if(hay[2]===String(x).toLowerCase())score+=15});
 (r.business_models||[]).forEach(function(x){if(hay[1]===String(x).toLowerCase())score+=10});
 (r.requires_any||[]).forEach(function(x){if((state[x]&&state[x].length)||(p[x]&&String(p[x]).trim()))score+=8});
 return score;
}
async function loadJourneys(){try{var r=await fetch("api/journeys");if(!r.ok)throw new Error();var d=await r.json(),list=d.journeys||[],sel=$("journeySelect");window.AutomationScanJourneys=list;var ranked=list.map(function(j){return{j:j,score:journeyScore(j)}}).sort(function(a,b){return b.score-a.score});var preferred=state.journeyId?list.find(function(x){return x.id===state.journeyId}):null;var j=preferred||((ranked[0]||{}).j);sel.innerHTML=list.map(function(x){return'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>'}).join("");if(!j)return;state.journeyId=j.id;state.journeyTemplate=j;if(state.journeyStage==null)state.journeyStage=0;state.journeyStage=Math.max(0,Math.min(Number(state.journeyStage)||0,(j.stages||[]).length-1));sel.value=j.id;journeyRender();journeyActivate(((j.stages||[])[state.journeyStage]||(j.stages||[])[0]||{section:"profile"}).section,true);save()}catch(e){if($("journeySummary"))$("journeySummary").textContent="Your saved Workbench remains available. Journey guidance is temporarily unavailable."}}
function bind(){
 if(bound)return;
 bound=true;
 var industryField=$("wbIndustry"); if(industryField && industryField.tagName==="SELECT" && !industryField.options.length){industryField.innerHTML="<option value=\"\">Enter or choose an industry</option>";}
 document.querySelectorAll("[data-tab]").forEach(function(b){b.onclick=function(){document.querySelectorAll(".wb-nav button").forEach(function(x){x.classList.remove("active")});b.classList.add("active");document.querySelectorAll(".wb-panel").forEach(function(x){x.classList.remove("active")});var panel=$("tab-"+b.dataset.tab);if(panel)panel.classList.add("active");if(b.dataset.tab==="report")report();if(!state._preserveJourneyStage&&state.journeyTemplate){var st=state.journeyTemplate.stages||[],ix=st.findIndex(function(s){return s.section===b.dataset.tab});if(ix>=0){state.journeyStage=ix;save();journeyRender()}}state._preserveJourneyStage=false;}});
 $("journeySelect").onchange=function(){var j=(window.AutomationScanJourneys||[]).find(function(x){return x.id===this.value},this);if(!j)return;state.journeyId=j.id;state.journeyTemplate=j;state.journeyStage=0;save();journeyRender();journeyActivate((j.stages||[])[0].section,true);track("journey_switched",{journey:j.id})};$("journeyNext").onclick=function(){var j=state.journeyTemplate;if(!j)return;var st=j.stages||[],i=Number(state.journeyStage||0);if(i<st.length-1){state.journeyStage=i+1;save();journeyActivate(st[i+1].section,true);journeyRender()}else journeyActivate("report")};$("journeyStartOver").onclick=function(){state.journeyStage=0;save();journeyActivate((state.journeyTemplate?.stages||[])[0]?.section||"profile",true);journeyRender()}; $("cloudSave").onclick=cloudSave;$("cloudLoad").onclick=cloudLoad;
 $("saveProfile").onclick=function(){state.profile={industry:val("wbIndustry").trim(),current:val("wbCurrent"),businessModel:val("wbBusiness"),scale:val("wbScale"),revenueModel:val("wbRevenue"),fulfilmentModel:val("wbFulfilment"),deliveryModel:val("wbDelivery"),regulatoryIntensity:val("wbRegulatory"),appetite:val("wbAppetite"),horizon:val("wbHorizon"),goals:val("wbGoals"),pain:val("wbPain"),integration:val("wbIntegration"),custom:val("wbCustom"),erpSpend:val("wbErpSpend")};save();renderProfileOut();track("workbench_profile_saved")};
 $("loadProfile").onclick=function(){var p=state.profile;var map={industry:"wbIndustry",current:"wbCurrent",businessModel:"wbBusiness",scale:"wbScale",revenueModel:"wbRevenue",fulfilmentModel:"wbFulfilment",deliveryModel:"wbDelivery",regulatoryIntensity:"wbRegulatory",appetite:"wbAppetite",horizon:"wbHorizon",goals:"wbGoals",pain:"wbPain",integration:"wbIntegration",custom:"wbCustom",erpSpend:"wbErpSpend"};Object.keys(map).forEach(function(k){set(map[k],p[k])});renderProfileOut()};
 $("addProcess").onclick=function(){var x={name:val("pName").trim(),volume:Math.max(0,Number(val("pVolume"))||0),minutes:Math.max(0,Number(val("pMinutes"))||0),exceptions:Math.min(100,Math.max(0,Number(val("pExceptions"))||0)),errors:Math.min(100,Math.max(0,Number(val("pErrors"))||0)),human:val("pHuman"),notes:val("pNotes")};if(!x.name)return alert("Enter a process name.");x.treatment=x.human==="High"?"Keep human / simplify":"Automate / simplify";if(x.exceptions>=20||x.errors>=10)x.treatment="Simplify / standardise first";state.processes.push(x);save();renderProcesses()};
 $("clearProcesses").onclick=function(){state.processes=[];save();renderProcesses()};
 $("addApp").onclick=function(){var x={name:val("aName").trim(),cost:Number(val("aCost"))||0,value:val("aValue"),tech:val("aTech"),usage:val("aUsage"),redundancy:val("aRedundancy"),lifecycle:val("aLifecycle"),integration:val("aIntegration")};if(!x.name)return alert("Enter an application name.");x.disposition=x.redundancy==="Duplicate"?"Consolidate":(x.lifecycle==="End of life"||x.tech==="Legacy"?"Modernise / replace":"Keep / assess");state.applications.push(x);save();renderApps()};
 $("importApps").onclick=function(){$("appFile").click()};$("appFile").onchange=function(){if(this.files[0])importApps(this.files[0])};
 $("addCandidate").onclick=function(){var name=val("candName").trim();if(!name)return alert("Enter a candidate name.");if(state.candidates.some(function(x){return norm(x.name)===norm(name)}))return alert("That candidate already exists.");state.candidates.push({name:name,capabilities:val("candCapabilities").trim(),notes:val("candNotes").trim()});save();renderCandidates();set("candName","");set("candCapabilities","");set("candNotes","")};
 $("clearCandidates").onclick=function(){state.candidates=[];state.selection=[];save();renderCandidates();$("selectOut").innerHTML=""};
 $("runSelection").onclick=function(){renderSelection();save();track("workbench_selection_run")};$("scorePortfolio").onclick=function(){renderPortfolio()};$("addPoc").onclick=function(){var candidate=val("pocCandidate").trim(),scenario=val("pocScenario").trim();if(!candidate||!scenario)return alert("Enter a POC candidate and critical scenario.");state.pocResults.push({candidate:candidate,scenario:scenario,expected:val("pocExpected").trim(),observed:val("pocObserved").trim(),evidence:val("pocEvidence"),decision:val("pocDecision").trim()});save();renderPoc()};$("scoreMigration").onclick=scoreMigration;$("runTraceability").onclick=function(){traceRequirements()};
 $("calcEconomics").onclick=function(){calcEconomics();scenarioEconomics()};
 $("generateRfp").onclick=function(){renderExecute("rfp")};$("generatePoc").onclick=function(){renderExecute("poc")};
 $("addCapability").onclick=function(){var name=val("cName").trim();if(!name)return alert("Enter a capability name.");state.capabilities.push({name:name,criticality:val("cCriticality"),current:Math.min(100,Math.max(0,Number(val("cCurrent"))||0)),target:Math.min(100,Math.max(0,Number(val("cTarget"))||0)),app:val("cApp").trim(),req:val("cReq").trim(),evidence:val("cEvidence"),gap:val("cGap").trim()});save();renderCapabilities()};$("addRequirement").onclick=function(){var text=val("qText").trim();if(!text)return alert("Enter the requirement.");var n=state.requirements.length+1;state.requirements.push({id:"REQ-"+String(n).padStart(3,"0"),text:text,type:val("qType"),priority:val("qPriority"),process:val("qProcess").trim(),acceptance:val("qAcceptance").trim(),gate:val("qGate").trim()});save();renderRequirements()};$("exportRequirements").onclick=exportRequirements;
 $("addVendorResponse").onclick=function(){var candidate=val("vCandidate").trim(),req=val("vReq").trim(),response=val("vResponse").trim();if(!candidate||!req||!response)return alert("Enter candidate, requirement ID and the recorded response.");state.vendorResponses.push({candidate:candidate,req:req,status:val("vStatus"),evidence:val("vEvidence"),response:response,dependency:val("vDependency").trim()});save();renderCompare()};$("clearVendorResponses").onclick=function(){state.vendorResponses=[];save();renderCompare()};
 $("addGovern").onclick=function(){state.governance.push({req:val("gReq"),cap:val("gCap"),evidence:val("gEvidence"),gate:val("gGate"),ai:val("gAi"),risk:val("gRisk")});save();renderGov()};
 $("addRoadmap").onclick=function(){state.roadmap.push({horizon:val("rHorizon"),workstream:val("rWorkstream"),owner:val("rOwner"),gate:val("rGate"),dependency:val("rDependency"),value:val("rValue")});save();renderRoadmap()};
 $("addEvidence").onclick=function(){var claim=val("eClaim").trim(),source=val("eSource").trim();if(!claim||!source)return alert("Enter the claim and its source.");state.evidence.push({claim:claim,source:source,date:val("eDate"),reviewer:val("eReviewer").trim(),status:val("eStatus"),next:val("eNext").trim()});save();renderEvidence()};
 $("exportJson").onclick=exportJson;$("printReport").onclick=function(){report();window.print()};$("resetAll").onclick=function(){if(confirm("Reset the local workbench?")){localStorage.removeItem(KEY);location.reload()}};
 load();
  try{
    if(!state._upstreamImported){
      var raw=sessionStorage.getItem("automationscan_transform");
      if(raw){
        var a=JSON.parse(raw);
        state.profile=Object.assign({},state.profile,{industry:a.industry||"",current:a.current||"",businessModel:a.businessModel||"",scale:a.scale||"",revenueModel:a.revenueModel||"",fulfilmentModel:a.fulfilmentModel||"",deliveryModel:a.deliveryModel||"",regulatoryIntensity:a.regulatoryIntensity||"",appetite:a.migration||"",horizon:a.horizon||"",goals:(a.goals||[]).join(", "),pain:(a.pains||[]).join("; "),integration:a.integration||"",custom:a.custom||"",customProcesses:a.customProcesses||"",erpSpend:a.erpSpend||"",ecosystem:a.ecosystem||""});
        (a.processes||[]).forEach(function(x){if(x&&!state.processes.some(function(p){return p.name===x}))state.processes.push({name:x,volume:0,minutes:0,exceptions:0,errors:0,human:"Medium",notes:"Imported from Transformation Navigator",treatment:"Assess"});});
        (a.candidates||[]).forEach(function(x){var n=typeof x==="string"?x:x.name;if(n&&!state.candidates.some(function(c){return c.name===n}))state.candidates.push({name:n,capabilities:"",notes:"Imported from Transformation Navigator; validate source evidence."});});
        state._upstreamImported=true; save();
      }
      var scan=sessionStorage.getItem("automationScanAssessment");
      if(scan){
        var s=JSON.parse(scan);
        state.profile=Object.assign({},state.profile,{industry:s.industry||state.profile.industry||"",goals:s.goal||state.profile.goals||"",pain:(s.selectedPainPoints||[]).join("; ")||state.profile.pain||""});
        Object.keys(s.workload||{}).forEach(function(k){var hours=Number(s.workload[k])||0;if(hours>0&&!state.processes.some(function(p){return p.name===k}))state.processes.push({name:k,volume:0,minutes:hours*60/4.33,exceptions:0,errors:0,human:"Medium",notes:"Imported from Automation Assessment; weekly hours: "+hours,treatment:"Assess"});});
        (s.topOpportunities||[]).forEach(function(x){var n=x&&x.name;if(n&&!state.processes.some(function(p){return p.name===n}))state.processes.push({name:n,volume:0,minutes:0,exceptions:0,errors:0,human:"Medium",notes:"Top opportunity imported from automation assessment",treatment:"Assess"});});
        state._upstreamAutomationImported=true; save();
      }
    }
  }catch(e){console.warn("Upstream assessment import skipped",e)}
  var savedProfile=state.profile||{};[["industry","wbIndustry"],["current","wbCurrent"],["businessModel","wbBusiness"],["scale","wbScale"],["revenueModel","wbRevenue"],["fulfilmentModel","wbFulfilment"],["deliveryModel","wbDelivery"],["regulatoryIntensity","wbRegulatory"],["appetite","wbAppetite"],["horizon","wbHorizon"],["goals","wbGoals"],["pain","wbPain"],["integration","wbIntegration"],["custom","wbCustom"],["customProcesses","wbCustomProcesses"],["erpSpend","wbErpSpend"]].forEach(function(pair){if($(pair[1])&&savedProfile[pair[0]]!=null)set(pair[1],savedProfile[pair[0]])});
  loadJourneys();
  renderProfileOut();renderProcesses();renderApps();renderCandidates();renderCapabilities();renderGov();renderRoadmap();renderRequirements();renderCompare();renderPortfolio();renderPoc();renderEvidence();report();
}
document.addEventListener("automationScanUIReady",bind);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
})();