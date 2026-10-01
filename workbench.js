(function(){
"use strict";
var KEY="automationScanWorkbenchV2", E=window.AutomationScanDecisionEngine||{};
var bound=false;
var state={profile:{},processes:[],applications:[],selection:[],candidates:[],economics:{},governance:[],roadmap:[],requirements:[],capabilities:[],vendorResponses:[],pocResults:[],evidence:[]};
function downloadEvidenceTemplate(){var rows=[
["Section","Business Question","Field","Allowed Values","Required","Example","Your Answer"],
["Application Portfolio","Which applications run the business?","Application","","Yes","ERP",""],
["Application Portfolio","Who owns it?","Department","","No","Finance",""],
["Application Portfolio","What does it cost annually?","Annual Cost","","No","250000",""],
["Application Portfolio","How many users?","Users","","No","120",""],
["Application Portfolio","Who is accountable?","Business Owner","","No","CFO",""],
["Application Portfolio","When does it renew?","Renewal Date","","No","2027-03-31",""],
["Application Portfolio","How critical is it?","Criticality","Low | Medium | High | Mission critical","No","High",""],
["Application Portfolio","How many integrations?","Integration Count","","No","8",""],
["Application Portfolio","What is the contract term?","Contract Term","","No","3 years",""],
["Spend / Renewal","What supplier spend should be investigated?","Vendor","","Yes","Example Vendor",""],
["Spend / Renewal","What is the spend category?","Category","","No","SaaS",""],
["Spend / Renewal","What amount was paid?","Amount","","No","50000",""],
["Spend / Renewal","What currency applies?","Currency","","No","INR",""],
["Spend / Renewal","When does it renew?","Renewal Date","","No","2027-03-31",""],
["Evidence","What supports an important finding?","Evidence Type","User stated | Uploaded | System derived | Sourced | Calculated | Assumption","Yes","Uploaded",""],
["Evidence","What is the finding or observation?","Claim / evidence","","Yes","Renewal dates need validation",""],
["Evidence","Where did it come from?","Source","","Yes","Contract / invoice / meeting",""],
["Evidence","How confident are we?","Confidence","Low | Medium | High","Yes","Medium",""],
["Evidence","What must happen next?","Next validation","","No","Confirm with owner",""]
];var ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Evidence Intake");XLSX.writeFile(wb,"AutomationScan-Evidence-Intake.xlsx")}
function parseEvidenceWorkbook(file){if(!window.XLSX||!file)return;var max=10*1024*1024;if(file.size>max)return alert("Workbook is larger than 10 MB. Please split the intake into smaller files.");var reader=new FileReader();reader.onload=function(e){try{var wb=XLSX.read(e.target.result,{type:"array",cellFormula:false});var imported=0;wb.SheetNames.forEach(function(sn){var rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:""});rows.forEach(function(r){var field=String(r.Field||r.field||"").trim(),ans=String(r["Your Answer"]||r.yourAnswer||"").trim();if(!ans)return;if(field==="Application"){state.applications=state.applications||[];state.applications.push({name:ans,department:String(r.Department||"").trim(),annualCost:Number(r["Annual Cost"])||null,users:Number(r.Users)||null,businessOwner:String(r["Business Owner"]||"").trim(),renewalDate:String(r["Renewal Date"]||"").trim(),criticality:String(r.Criticality||"").trim(),integrationCount:Number(r["Integration Count"])||null,contractTerm:String(r["Contract Term"]||"").trim(),provenance:"Uploaded"});imported++;}else if(field==="Vendor"){upsertEvidence({type:"Uploaded",claim:"Spend / renewal record: "+ans,value:JSON.stringify(r),source:file.name,date:new Date().toISOString().slice(0,10),confidence:"Medium",status:"Needs validation",next:"Reconcile against source invoice or contract",capturedAt:new Date().toISOString()});imported++;}else if(field==="Evidence Type"){upsertEvidence({type:String(ans),claim:String(r["Claim / evidence"]||"").trim(),value:String(r["Your Answer"]||"").trim(),source:String(r.Source||file.name).trim(),date:new Date().toISOString().slice(0,10),confidence:String(r.Confidence||"Low"),status:"Needs validation",next:String(r["Next validation"]||"").trim(),capturedAt:new Date().toISOString()});imported++;}})});save();journeyRender();initRecommendationFeedback();renderEvidence();alert(imported+" evidence/application records imported.");}catch(err){alert("Could not read this workbook. Check that it uses the AutomationScan Evidence Intake template.");}};reader.readAsArrayBuffer(file)}
function evidenceKey(x){return [x.type||"",x.claim||"",x.source||""].join("|").toLowerCase();}
function upsertEvidence(x){var k=evidenceKey(x);if(!k)return;var i=state.evidence.findIndex(function(e){return evidenceKey(e)===k});if(i<0)state.evidence.push(x);else state.evidence[i]=Object.assign({},state.evidence[i],x);}
function evidenceSummary(){var items=Array.isArray(state.evidence)?state.evidence:[],counts={};items.forEach(function(x){var t=x.type||"User stated";counts[t]=(counts[t]||0)+1});var validated=items.filter(function(x){return /validated|confirmed|high/i.test(String(x.status||""))}).length;var gaps=items.filter(function(x){return /needs|pending|validate|assumption/i.test(String(x.status||""))||x.type==="Assumption"}).length;return {total:items.length,counts:counts,validated:validated,gaps:gaps};}
function $(id){return document.getElementById(id)}
function esc(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function norm(v){return String(v||"").toLowerCase().trim()}
function val(id){return $(id)?$(id).value:""}
function set(id,v){if($(id))$(id).value=v==null?"":v}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch(e){return false}}
function markVisited(section){state.sectionStatus=state.sectionStatus||{};var x=state.sectionStatus[section]||{};x.visitedAt=x.visitedAt||new Date().toISOString();state.sectionStatus[section]=x}
function markCompleted(section){state.sectionStatus=state.sectionStatus||{};state.sectionStatus[section]={visitedAt:(state.sectionStatus[section]||{}).visitedAt||new Date().toISOString(),completedAt:new Date().toISOString()};save()}
function sectionStatus(section){var x=(state.sectionStatus||{})[section]||{};return x.completedAt?"COMPLETED":x.visitedAt?"VISITED":"NOT STARTED"}
function load(){try{var x=JSON.parse(localStorage.getItem(KEY)||"null");if(x){state=Object.assign(state,x);state.profile=state.profile||{};["processes","applications","selection","candidates","governance","roadmap","requirements","capabilities","vendorResponses","pocResults","evidence"].forEach(function(k){if(!Array.isArray(state[k]))state[k]=[]});state.economics=state.economics||{}}}catch(e){state={profile:{},processes:[],applications:[],selection:[],candidates:[],economics:{},governance:[],roadmap:[],requirements:[],capabilities:[],vendorResponses:[],pocResults:[],evidence:[]}}}
function fieldBusinessMeta(el,section){
 var label=el.closest("label"),txt=label?label.textContent.replace(/\s+/g," ").trim():"";
 var name=el.name||el.id||"",example=el.getAttribute("placeholder")||"";
 if(!example&&el.tagName==="SELECT"){var o=el.options&&el.options[1];example=o?o.textContent.trim():"Select an option"}
 var allowed=el.tagName==="SELECT"?[].slice.call(el.options||[]).filter(function(o){return o.value}).map(function(o){return o.textContent.trim()}).join(" | "):el.type==="checkbox"?"Yes | No":"";
 return {question:txt.replace(example,"").trim(),allowed:allowed,example:example||"Enter the business value"};
}
function workbookRowsForPanel(panel){
 var sec=(panel.id||"").replace(/^tab-/,""),rows=[];
 panel.querySelectorAll('input:not([type="hidden"]),select,textarea').forEach(function(el){
   if(!el.name&&!el.id)return;
   var m=fieldBusinessMeta(el,sec);
   rows.push(["Section","Business Question","Field","Allowed Values","Required","Example","Your Answer"].map(function(h){return h}));
   rows.push([sec,m.question,el.name||el.id,m.allowed,el.required?"Yes":"No",m.example,""]);
 });
 return rows;
}
function downloadWorkbenchWorkbook(){
 if(!window.XLSX)throw new Error("Workbook engine is unavailable");
 var wb=XLSX.utils.book_new();
 var intro=[["AutomationScan — Workbench Data Entry"],["Complete this workbook once. Each sheet represents a Workbench section."],["Instructions"],["1. Fill only the 'Your Answer' column."],["2. Keep the Field and Section columns unchanged."],["3. Do not rename sheets."],["4. Save the workbook and upload it once in AutomationScan."],["5. AutomationScan will populate the matching fields, mark sections as VISITED, and let you review/save them."],["6. A section becomes COMPLETED only after its form is saved."],[""],["Sheets included"],["Profile","Processes","Applications","Capabilities","Selection","Economics","RFP / POC","Portfolio","Readiness","Governance","Roadmap","Requirements","Compare","Evidence","Dossier"]];
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(intro),"Instructions");
 document.querySelectorAll(".wb-panel").forEach(function(panel){
   var sec=(panel.id||"").replace(/^tab-/,""),rows=[["Section","Business Question","Field","Allowed Values","Required","Example","Your Answer"]];
   panel.querySelectorAll('input:not([type="hidden"]),select,textarea').forEach(function(el){
     if(!el.name&&!el.id)return;var m=fieldBusinessMeta(el,sec);
     rows.push([sec,m.question,el.name||el.id,m.allowed,el.required?"Yes":"No",m.example,""]);
   });
   var label=(document.querySelector('.wb-nav button[data-tab="'+sec+'"] .wb-nav-label')||{}).textContent||sec;
   label=label.trim().slice(0,31)||sec;
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),label.replace(/[\\/?*\[\]:]/g," ").trim());
 });
 XLSX.writeFile(wb,"AutomationScan-Workbench-Complete.xlsx");
}
function importWorkbenchWorkbook(file){
 if(!window.XLSX) return Promise.reject(new Error("Workbook engine is unavailable"));
 return file.arrayBuffer().then(function(buf){
   var wb=XLSX.read(buf,{type:"array"}),updated=0,unknown=[];
   wb.SheetNames.forEach(function(sheet){
     if(sheet==="Instructions")return;
     var rows=XLSX.utils.sheet_to_json(wb.Sheets[sheet],{defval:""});
     rows.forEach(function(row){
       var sec=String(row.Section||"").trim(),field=String(row.Field||"").trim(),value=row["Your Answer"];
       if(!field)return;
       var panel=document.getElementById("tab-"+sec),el=null;
       if(panel)el=panel.querySelector("[name='"+CSS.escape(field)+"'],#"+CSS.escape(field));
       if(!el)el=document.querySelector("[name='"+CSS.escape(field)+"'],#"+CSS.escape(field));
       if(!el){unknown.push(sec+"."+field);return}
       if(value===undefined||value==="")return;
       if(el.type==="checkbox")el.checked=/^(true|yes|1|y)$/i.test(String(value));
       else el.value=String(value);
       el.dispatchEvent(new Event("change",{bubbles:true}));markVisited(sec);updated++;
     });
   });
   save(); if(typeof renderAll==="function")renderAll(); journeyRender(); if(typeof renderEvidence==="function")renderEvidence();
   return {updated,unknown};
 });
}
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
function initRecommendationFeedback(){var b=$("saveFeedback");if(!b)return;b.onclick=function(){var outcome=$("recommendationFeedback").value,note=$("feedbackNote").value.trim();if(!outcome){$("feedbackStatus").textContent="Choose an outcome first.";return}var f={outcome:outcome,note:note,at:new Date().toISOString()};state.recommendationFeedback=f;save();$("feedbackStatus").textContent="Feedback saved to this Workbench copy.";trackEvent&&trackEvent("recommendation_feedback",{outcome:outcome})}}\nfunction renderEvidenceFindings(){var out=$("evidenceFindings");if(!out)return;var apps=Array.isArray(state.applications)?state.applications:[],items=Array.isArray(state.evidence)?state.evidence:[],cost=apps.reduce(function(s,a){return s+(Number(a.annualCost)||Number(a.cost)||0)},0),renewals=apps.filter(function(a){return a.renewalDate}).length,missingOwners=apps.filter(function(a){return !String(a.businessOwner||"").trim()}).length,missingCost=apps.filter(function(a){return !(Number(a.annualCost)||Number(a.cost))}).length,high=apps.filter(function(a){return /high|mission/i.test(a.criticality||"")}).length,gaps=items.filter(function(e){return e.type==="Assumption"||/needs validation/i.test(e.status||"")).length,dup={};apps.forEach(function(a){var n=String(a.name||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();if(n)dup[n]=(dup[n]||0)+1});var duplicates=Object.keys(dup).filter(function(k){return dup[k]>1});var vendors={};apps.forEach(function(a){var n=String(a.name||"").split(/\s+/)[0].toLowerCase();if(n)vendors[n]=(vendors[n]||0)+1});var findings=[];if(duplicates.length)findings.push("Potential duplicate records: "+duplicates.slice(0,5).join(", ")+" — confirm whether these are duplicate entries or genuinely separate systems.");if(missingOwners)findings.push(missingOwners+" application(s) have no business owner recorded.");if(missingCost)findings.push(missingCost+" application(s) have no annual cost recorded; portfolio economics are incomplete.");if(renewals<apps.length)findings.push((apps.length-renewals)+" application(s) have no renewal date; renewal exposure cannot yet be fully assessed.");if(high)findings.push(high+" high/mission-critical application(s) require explicit resilience, security and integration validation.");if(gaps)findings.push(gaps+" evidence item(s) remain assumptions or need validation.");if(!findings.length&&apps.length)findings.push("No material portfolio flags were detected from the fields supplied. This is a data-derived screen, not an assurance.");var fhtml=findings.map(function(x){return"<div class='wb-card'><strong>Investigation finding</strong><p>"+esc(x)+"</p><small>Derived from supplied portfolio/evidence fields · validate before decision</small></div>"}).join("");out.innerHTML='<div class="wb-kpis"><div class="wb-kpi"><small>Applications</small><strong>'+apps.length+'</strong></div><div class="wb-kpi"><small>Known annual cost</small><strong>'+ (cost?cost.toLocaleString():"—")+'</strong></div><div class="wb-kpi"><small>Renewal dates</small><strong>'+renewals+'/'+apps.length+'</strong></div><div class="wb-kpi"><small>Missing owners</small><strong>'+missingOwners+'</strong></div><div class="wb-kpi"><small>Critical apps</small><strong>'+high+'</strong></div><div class="wb-kpi"><small>Validation gaps</small><strong>'+gaps+'</strong></div></div>'+(apps.length?'<h3>Portfolio intelligence</h3>'+fhtml:'<div class="wb-note">Upload an application portfolio to unlock portfolio-level analysis.</div>')}function renderEvidence(){
 renderList("evidenceOut",state.evidence,["Type","Claim / evidence","Source","Date","Confidence","Status","Next validation"],function(x){return[esc(x.type||"User stated"),esc(x.claim),esc(x.source),esc(x.date),esc(x.confidence||"Low"),'<span class="wb-tag">'+esc(x.status||"Needs validation")+'</span>',esc(x.next)]})
 renderEvidenceFindings();if($("wbReport"))$("wbReport").innerHTML=buildDecisionBrief();if($("evidenceStrength")){var s=evidenceSummary();$("evidenceStrength").innerHTML='<strong>Evidence strength</strong><span>'+s.total+" item(s) · "+s.validated+" validated · "+s.gaps+" needing validation"+'</span><small>'+esc(Object.keys(s.counts).map(function(k){return k+" "+s.counts[k]}).join(" · ")||"No evidence captured yet")+"</small>"}
}
function renderCandidates(){renderList("candidateOut",state.candidates,["Candidate","Capabilities / scope","Notes"],function(x){return[esc(x.name),esc(x.capabilities),esc(x.notes)]})}
function renderSelection(){
 if(!state.profile.industry){$("selectOut").innerHTML="<div class='wb-note'>Save the transformation profile before running the investigation set.</div>";return}
 var p=state.profile, ctx={industry:p.industry,businessModel:p.businessModel,current:p.current,scale:p.scale,custom:p.custom,customProcesses:p.customProcesses,integration:p.integration,goals:p.goals,revenueModel:p.revenueModel,fulfilmentModel:p.fulfilmentModel,deliveryModel:p.deliveryModel,regulatoryIntensity:p.regulatoryIntensity,erpSpend:p.erpSpend,processes:state.processes.map(function(x){return x.name}),pains:p.pain?[p.pain]:[],requirements:state.requirements,capabilities:state.capabilities,evidence:state.evidence,candidates:state.candidates,engineConfig:(window.AutomationScanUI.config&&window.AutomationScanUI.config.decisionEngine)||{}};
 var rows=E.shortlist?E.shortlist(ctx):[];
 state.selection=rows.slice(0,5).map(function(x){return {name:x.name,score:x.score,explanation:x.explanation||[],processHits:x.processHits||[],painHits:x.painHits||[],industryFit:x.industryFit,continuity:x.continuity}})
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
function journeyActivate(key,preserveStage){var b=document.querySelector('[data-tab="'+key+'"]');if(b){state._preserveJourneyStage=!!preserveStage;b.click();setTimeout(renderJourneyPanelCue,0)}}
function renderJourneyPanelCue(){
 var j=state.journeyTemplate,st=j&&j.stages||[],i=Number(state.journeyStage||0),b=document.querySelector('.wb-nav button.active'),panel=b?document.getElementById('tab-'+b.dataset.tab):null;
 if(!panel||!st.length)return;
 var old=panel.querySelector('.wb-step-cue');if(old)old.remove();
 var cue=document.createElement('div');cue.className='wb-step-cue';
 var stateText=i===0?'START HERE':i===st.length-1?'FINAL REVIEW':'IN PROGRESS';
 var next=st[i+1]?st[i+1].label:'Review dossier';
 cue.innerHTML='<span class="wb-step-cue-number">'+String(i+1).padStart(2,'0')+' / '+String(st.length).padStart(2,'0')+'</span><div><strong>Step '+(i+1)+' of '+st.length+': '+esc(st[i]?st[i].label:'Current step')+'</strong><small>'+stateText+(st[i+1]?' · Next: '+esc(next):' · This is the final stage')+'</small></div>';
 panel.insertBefore(cue,panel.firstChild);
}
function canonicalWorkbenchStages(){
 var out=[];
 document.querySelectorAll(".wb-nav button[data-tab]").forEach(function(btn){
   out.push({section:btn.dataset.tab,label:btn.textContent.replace(/^\\d+\\.\\s*/,"").trim()});
 });
 return out;
}
function syncJourneyNav(){
 var st=(state.journeyTemplate&&state.journeyTemplate.stages)||[],allowed=st.map(function(s){return s.section}),current=st[Number(state.journeyStage||0)]?.section||allowed[0]||"profile";
 document.querySelectorAll(".wb-nav button[data-tab]").forEach(function(b){
   var ix=allowed.indexOf(b.dataset.tab);
   b.hidden=ix<0;b.style.display=ix<0?"none":"block";
   b.dataset.journeyIndex=ix;
   b.classList.toggle("active",b.dataset.tab===current);
   b.classList.toggle("done",ix>=0&&ix<allowed.indexOf(current));
   b.setAttribute("aria-current",b.dataset.tab===current?"step":"false");
   var old=b.querySelector(".wb-nav-number"),label=b.querySelector(".wb-nav-label");
   if(!old){var txt=b.textContent.replace(/^\\d+\\.\\s*/,"").trim();b.innerHTML='<span class="wb-nav-number">'+String(ix+1).padStart(2,"0")+'</span><span class="wb-nav-label">'+esc(txt)+'</span>';}
   else old.textContent=String(ix+1).padStart(2,"0");
   b.title=ix>=0?(b.dataset.tab===current?"Current journey step":"Open journey step"):"";
   b.setAttribute("data-status",sectionStatus(b.dataset.tab).toLowerCase().replace(/ /g,"-"));
 });
}
function journeyRender(){
 var j=state.journeyTemplate;if(!j||!$("journeyTitle"))return;
 var st=j.stages||[],i=Math.max(0,Math.min(Number(state.journeyStage)||0,Math.max(0,st.length-1))),current=st[i]?st[i].section:(st[0]?st[0].section:"profile");
 state.journeyStage=i;
 $("journeyTitle").textContent=j.name;
 $("journeySummary").textContent=(j.summary||"")+" "+(j.objective_prompt||"");
 var c=journeyContext();
 $("journeyContext").innerHTML=c.map(function(x){return'<span class="wb-context-pill">'+esc(x)+'</span>'}).join("")||'<span class="wb-context-pill">No previous context — start with Profile</span>';
 var es=evidenceSummary(),strength=es.total===0?"No evidence register entries yet":(es.validated+" validated · "+es.gaps+" needing validation · "+es.total+" total");
 if($("evidenceStrength"))$("evidenceStrength").innerHTML='<strong>Evidence strength</strong><span>'+esc(strength)+'</span><small>Source mix: '+esc(Object.keys(es.counts).map(function(k){return k+" "+es.counts[k]}).join(" · ")||"User stated inputs only")+'</small>';
 $("journeyStages").innerHTML='<div class="wb-path-intro"><strong>Your journey flow</strong><span>Only stages relevant to this journey are shown. Each card opens the same form as the left menu.</span></div>'+st.map(function(s,n){
   var isCurrent=s.section===current,status=sectionStatus(s.section);
   return '<button type="button" aria-current="'+(isCurrent?'step':'false')+'" class="wb-stage '+(isCurrent?'active ':'')+'" data-canonical-section="'+esc(s.section)+'"><span class="wb-stage-number">'+String(n+1).padStart(2,"0")+'</span><strong>'+esc(s.label||s.section)+'</strong><small>'+esc(s.why||"Relevant to this journey")+'</small><em>'+(isCurrent?"YOU ARE HERE":status)+'</em></button>';
 }).join("");
 document.querySelectorAll("[data-canonical-section]").forEach(function(btn){btn.onclick=function(){
   var ix=st.findIndex(function(x){return x.section===btn.dataset.canonicalSection});
   if(ix<0)return;
   state.journeyStage=ix;save();journeyActivate(btn.dataset.canonicalSection,true);journeyRender();
 };});
 syncJourneyNav();
 $("journeyNext").textContent=i>=st.length-1?"Review dossier":"Continue to "+(st[i+1]?st[i+1].label:"next stage");
 $("journeyNext").setAttribute("aria-label",i>=st.length-1?"Review dossier":"Continue to "+(st[i+1]?st[i+1].label:"next stage"));
}
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
 document.querySelectorAll(".wb-nav").forEach(function(nav){
   if(nav.dataset.bound==="1")return;
   nav.dataset.bound="1";
   nav.addEventListener("click",function(ev){
     var b=ev.target.closest("button[data-tab]");
     if(!b||b.hidden)return;
     ev.preventDefault();
     document.querySelectorAll(".wb-nav button").forEach(function(x){x.classList.remove("active")});
     b.classList.add("active");
     document.querySelectorAll(".wb-panel").forEach(function(x){x.classList.remove("active")});
     var panel=$("tab-"+b.dataset.tab);
     if(panel)panel.classList.add("active");
     var st=state.journeyTemplate&&state.journeyTemplate.stages||[];
     var ix=st.findIndex(function(s){return s.section===b.dataset.tab});
     if(ix>=0){
       state.journeyStage=ix;
       markVisited(b.dataset.tab);
       save();
       journeyRender();
     }
     if(b.dataset.tab==="report")report();
     renderJourneyPanelCue();
     var hub=document.getElementById("journeyHub");
     if(hub&&window.innerWidth<900)window.scrollTo({top:hub.offsetTop-20,behavior:"smooth"});
   });
 });

 var industryField=$("wbIndustry"); if(industryField && industryField.tagName==="SELECT" && !industryField.options.length){industryField.innerHTML="<option value=\"\">Enter or choose an industry</option>";}
  $("journeySelect").onchange=function(){var j=(window.AutomationScanJourneys||[]).find(function(x){return x.id===this.value},this);if(!j)return;state.journeyId=j.id;state.journeyTemplate=j;state.journeyStage=0;save();journeyRender();journeyActivate((j.stages||[])[0].section,true);track("journey_switched",{journey:j.id})};$("journeyNext").onclick=function(){var j=state.journeyTemplate;if(!j)return;var st=j.stages||[],i=Number(state.journeyStage||0);if(i<st.length-1){state.journeyStage=i+1;save();journeyActivate(st[i+1].section,true);journeyRender()}else journeyActivate("report")};$("journeyStartOver").onclick=function(){state.journeyStage=0;save();journeyActivate((state.journeyTemplate?.stages||[])[0]?.section||"profile",true);journeyRender();window.scrollTo({top:document.getElementById("journeyHub").offsetTop-20,behavior:"smooth"})}; $("cloudSave").onclick=cloudSave;$("cloudLoad").onclick=cloudLoad;
var excelDownload=$("downloadExcelTemplate");if(excelDownload)excelDownload.onclick=function(){try{downloadWorkbenchWorkbook();$("excelStatus").textContent="Complete workbook downloaded. Fill Your Answer on each sheet, save it, then upload it once."}catch(e){$("excelStatus").textContent="Download failed: "+e.message}};
var excelInput=$("workbenchExcelImport");if(excelInput)excelInput.onchange=function(){var f=excelInput.files&&excelInput.files[0];if(!f)return;var s=$("excelStatus");s.textContent="Reading "+f.name+"…";importWorkbenchWorkbook(f).then(function(r){s.textContent=r.updated+" field(s) populated across the Workbench. Review and save the relevant sections before generating the report."+((r.unknown||[]).length?" "+r.unknown.length+" field(s) were not found.":"")}).catch(function(e){s.textContent="Workbook import failed: "+e.message});excelInput.value=""};
 $("saveProfile").onclick=function(){state.profile={industry:val("wbIndustry").trim(),current:val("wbCurrent"),businessModel:val("wbBusiness"),scale:val("wbScale"),revenueModel:val("wbRevenue"),fulfilmentModel:val("wbFulfilment"),deliveryModel:val("wbDelivery"),regulatoryIntensity:val("wbRegulatory"),appetite:val("wbAppetite"),horizon:val("wbHorizon"),goals:val("wbGoals"),pain:val("wbPain"),integration:val("wbIntegration"),custom:val("wbCustom"),erpSpend:val("wbErpSpend")};upsertEvidence({type:"User stated",claim:"Transformation profile",value:JSON.stringify(state.profile),source:"Workbench profile",date:new Date().toISOString().slice(0,10),confidence:"Low",status:"Needs validation",next:"Confirm current-state facts with business owner"});save();markCompleted("profile");renderProfileOut();track("workbench_profile_saved")};
 $("loadProfile").onclick=function(){var p=state.profile;var map={industry:"wbIndustry",current:"wbCurrent",businessModel:"wbBusiness",scale:"wbScale",revenueModel:"wbRevenue",fulfilmentModel:"wbFulfilment",deliveryModel:"wbDelivery",regulatoryIntensity:"wbRegulatory",appetite:"wbAppetite",horizon:"wbHorizon",goals:"wbGoals",pain:"wbPain",integration:"wbIntegration",custom:"wbCustom",erpSpend:"wbErpSpend"};Object.keys(map).forEach(function(k){set(map[k],p[k])});renderProfileOut()};
 $("addProcess").onclick=function(){var x={name:val("pName").trim(),volume:Math.max(0,Number(val("pVolume"))||0),minutes:Math.max(0,Number(val("pMinutes"))||0),exceptions:Math.min(100,Math.max(0,Number(val("pExceptions"))||0)),errors:Math.min(100,Math.max(0,Number(val("pErrors"))||0)),human:val("pHuman"),notes:val("pNotes")};if(!x.name)return alert("Enter a process name.");x.treatment=x.human==="High"?"Keep human / simplify":"Automate / simplify";if(x.exceptions>=20||x.errors>=10)x.treatment="Simplify / standardise first";state.processes.push(x);save();markCompleted("process");renderProcesses()};
 $("clearProcesses").onclick=function(){state.processes=[];save();renderProcesses()};
 $("addApp").onclick=function(){var x={name:val("aName").trim(),cost:Number(val("aCost"))||0,value:val("aValue"),tech:val("aTech"),usage:val("aUsage"),redundancy:val("aRedundancy"),lifecycle:val("aLifecycle"),integration:val("aIntegration")};if(!x.name)return alert("Enter an application name.");x.disposition=x.redundancy==="Duplicate"?"Consolidate":(x.lifecycle==="End of life"||x.tech==="Legacy"?"Modernise / replace":"Keep / assess");state.applications.push(x);save();markCompleted("apps");renderApps()};
 $("importApps").onclick=function(){$("appFile").click()};$("appFile").onchange=function(){if(this.files[0])importApps(this.files[0])};
 $("addCandidate").onclick=function(){var name=val("candName").trim();if(!name)return alert("Enter a candidate name.");if(state.candidates.some(function(x){return norm(x.name)===norm(name)}))return alert("That candidate already exists.");state.candidates.push({name:name,capabilities:val("candCapabilities").trim(),notes:val("candNotes").trim()});save();renderCandidates();set("candName","");set("candCapabilities","");set("candNotes","")};
 $("clearCandidates").onclick=function(){state.candidates=[];state.selection=[];save();renderCandidates();$("selectOut").innerHTML=""};
 $("runSelection").onclick=function(){renderSelection();markCompleted("select");track("workbench_selection_run")};$("scorePortfolio").onclick=function(){renderPortfolio();markCompleted("portfolio")};$("addPoc").onclick=function(){var candidate=val("pocCandidate").trim(),scenario=val("pocScenario").trim();if(!candidate||!scenario)return alert("Enter a POC candidate and critical scenario.");state.pocResults.push({candidate:candidate,scenario:scenario,expected:val("pocExpected").trim(),observed:val("pocObserved").trim(),evidence:val("pocEvidence"),decision:val("pocDecision").trim()});markCompleted("poc");renderPoc()};$("scoreMigration").onclick=function(){scoreMigration();markCompleted("poc")};$("runTraceability").onclick=function(){traceRequirements()};
 $("calcEconomics").onclick=function(){calcEconomics();scenarioEconomics();markCompleted("economics")};
 $("generateRfp").onclick=function(){renderExecute("rfp");markCompleted("execute")};$("generatePoc").onclick=function(){renderExecute("poc");markCompleted("execute")};
 $("addCapability").onclick=function(){var name=val("cName").trim();if(!name)return alert("Enter a capability name.");state.capabilities.push({name:name,criticality:val("cCriticality"),current:Math.min(100,Math.max(0,Number(val("cCurrent"))||0)),target:Math.min(100,Math.max(0,Number(val("cTarget"))||0)),app:val("cApp").trim(),req:val("cReq").trim(),evidence:val("cEvidence"),gap:val("cGap").trim()});markCompleted("capabilities");renderCapabilities()};$("addRequirement").onclick=function(){var text=val("qText").trim();if(!text)return alert("Enter the requirement.");var n=state.requirements.length+1;state.requirements.push({id:"REQ-"+String(n).padStart(3,"0"),text:text,type:val("qType"),priority:val("qPriority"),process:val("qProcess").trim(),acceptance:val("qAcceptance").trim(),gate:val("qGate").trim()});markCompleted("requirements");renderRequirements()};$("exportRequirements").onclick=exportRequirements;
 $("addVendorResponse").onclick=function(){var candidate=val("vCandidate").trim(),req=val("vReq").trim(),response=val("vResponse").trim();if(!candidate||!req||!response)return alert("Enter candidate, requirement ID and the recorded response.");state.vendorResponses.push({candidate:candidate,req:req,status:val("vStatus"),evidence:val("vEvidence"),response:response,dependency:val("vDependency").trim()});markCompleted("compare");renderCompare()};$("clearVendorResponses").onclick=function(){state.vendorResponses=[];save();renderCompare()};
 $("addGovern").onclick=function(){state.governance.push({req:val("gReq"),cap:val("gCap"),evidence:val("gEvidence"),gate:val("gGate"),ai:val("gAi"),risk:val("gRisk")});markCompleted("govern");renderGov()};
 $("addRoadmap").onclick=function(){state.roadmap.push({horizon:val("rHorizon"),workstream:val("rWorkstream"),owner:val("rOwner"),gate:val("rGate"),dependency:val("rDependency"),value:val("rValue")});markCompleted("roadmap");renderRoadmap()};
 if($("downloadEvidenceTemplate"))$("downloadEvidenceTemplate").onclick=downloadEvidenceTemplate;if($("evidenceWorkbook"))$("evidenceWorkbook").addEventListener("change",function(){if(this.files&&this.files[0])parseEvidenceWorkbook(this.files[0]);this.value="";});
$("addEvidence").onclick=function(){var claim=val("eClaim").trim(),source=val("eSource").trim(),type=val("eType")||"User stated";if(!claim||!source)return alert("Enter the claim and its source.");upsertEvidence({type:type,claim:claim,value:val("eValue").trim(),source:source,date:val("eDate"),reviewer:val("eReviewer").trim(),confidence:val("eConfidence")||"Low",status:val("eStatus")||"Needs validation",next:val("eNext").trim(),capturedAt:new Date().toISOString()});save();markCompleted("evidence");renderEvidence()};
 function buildDecisionBrief(){var apps=Array.isArray(state.applications)?state.applications:[],items=Array.isArray(state.evidence)?state.evidence:[],processes=Array.isArray(state.processes)?state.processes:[],cost=apps.reduce(function(s,a){return s+(Number(a.annualCost)||Number(a.cost)||0)},0),gaps=items.filter(function(e){return e.type==="Assumption"||/needs validation/i.test(e.status||"")),selection=Array.isArray(state.selection)?state.selection:[],vendorResponses=Array.isArray(state.vendorResponses)?state.vendorResponses:[],findings=[];if(apps.length){var missingOwner=apps.filter(function(a){return !String(a.businessOwner||"").trim()}).length,missingCost=apps.filter(function(a){return !(Number(a.annualCost)||Number(a.cost))}).length;if(missingOwner)findings.push(missingOwner+" application(s) lack a business owner.");if(missingCost)findings.push(missingCost+" application(s) lack annual cost data.");if(apps.filter(function(a){return !a.renewalDate}).length)findings.push("Renewal coverage is incomplete.");}if(!items.length)findings.push("No explicit evidence register entries have been captured.");if(!findings.length)findings.push("No material flags were detected from the supplied fields.");var scenarioPaths=[
{name:"Stay / Optimise",evidence:"Baseline process performance, avoidable cost and current-system capability",unknowns:"Benefit baseline and improvement effort",gates:"Measured baseline; process owner validation"},
{name:"Modernise / Extend",evidence:"Current-platform lifecycle, target capability and upgrade constraints",unknowns:"Upgrade effort, integration and support economics",gates:"Architecture; lifecycle; integration; security"},
{name:"Complement",evidence:"Specific capability gap that a specialist product addresses",unknowns:"Integration, operating model and overlap",gates:"POC; API/security review; commercial terms"},
{name:"Replace",evidence:"Material business or lifecycle case for a new core",unknowns:"Migration, coexistence, change and total cost",gates:"Business case; migration proof; security; references"}];
var scenarioHtml=scenarioPaths.map(function(s){return"<div class='wb-card'><h4>"+esc(s.name)+"</h4><p><b>Supporting evidence:</b> "+esc(s.evidence)+"</p><p><b>Unknowns:</b> "+esc(s.unknowns)+"</p><p><b>Validation gates:</b> "+esc(s.gates)+"</p></div>"}).join("");
var html='<div class="wb-brief"><p class="eyebrow">DECISION BRIEF</p><h3>Evidence-based transformation discovery</h3><p><b>Context:</b> '+esc(state.profile.industry||"Not specified")+' · '+esc(state.profile.current||"Current platform not specified")+'</p><p><b>Candidate paths:</b> '+(selection.length?esc(selection.map(function(x){return x.name}).join(", ")):"No candidates recorded; establish the evidence baseline first.")+'</p><h4>Evidence position</h4><p>'+apps.length+' applications · '+processes.length+' processes · '+items.length+' evidence items · '+gaps.length+' validation gaps</p><h4>Findings requiring investigation</h4><ul>'+findings.map(function(x){return"<li>"+esc(x)+"</li>"}).join("")+'</ul><h4>Known economics</h4><p>Known annual application cost: '+(cost?cost.toLocaleString():"Not supplied")+'. This is supplied-data coverage, not a savings estimate.</p><h4>Decision gates</h4><ul><li>Reconcile application inventory, contracts and spend.</li><li>Validate critical processes, integrations, security and adoption constraints.</li><li>Verify vendor claims through current documentation, demonstrations and reference checks.</li></ul><h4>Scenario comparison</h4><div class="wb-scenarios">'+scenarioHtml+'</div>'}<h4>90-day action plan</h4><ol><li>Complete missing application ownership, cost and renewal records.</li><li>Validate the highest-impact process with measurable baseline data.</li><li>Run targeted vendor / architecture validation and record evidence.</li><li>Compare scenarios only after material evidence gaps are closed.</li></ol><p class="wb-note">Generated from the current Workbench state. Findings are directional and must be validated before an investment decision.</p></div>';return html}
$("exportJson").onclick=exportJson;$("printReport").onclick=function(){report();window.print()};if($("wbReport"))$("wbReport").innerHTML=buildDecisionBrief();$("resetAll").onclick=function(){if(confirm("Reset the local workbench?")){localStorage.removeItem(KEY);location.reload()}};
 load();
  try{
    {
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
        upsertEvidence({type:"User stated",claim:"Automation assessment input set",value:"Industry, goal, workload and reported pain points supplied by the assessment",source:"AutomationScan assessment",date:new Date().toISOString().slice(0,10),confidence:"Low",status:"Needs validation",next:"Validate process volume, cycle time, exceptions and systems of record",capturedAt:new Date().toISOString()});
        Object.keys(s.workload||{}).forEach(function(k){var hours=Number(s.workload[k])||0;if(hours>0&&!state.processes.some(function(p){return p.name===k}))state.processes.push({name:k,volume:0,minutes:hours*60/4.33,exceptions:0,errors:0,human:"Medium",notes:"Imported from Automation Assessment; weekly hours: "+hours,treatment:"Assess"});});
        (s.topOpportunities||[]).forEach(function(x){var n=x&&x.name;if(n&&!state.processes.some(function(p){return p.name===n}))state.processes.push({name:n,volume:0,minutes:0,exceptions:0,errors:0,human:"Medium",notes:"Top opportunity imported from automation assessment",treatment:"Assess"});});
        state._upstreamAutomationImported=true; save();
      }
    }
  }catch(e){console.warn("Upstream assessment import skipped",e)}
  var savedProfile=state.profile||{};[["industry","wbIndustry"],["current","wbCurrent"],["businessModel","wbBusiness"],["scale","wbScale"],["revenueModel","wbRevenue"],["fulfilmentModel","wbFulfilment"],["deliveryModel","wbDelivery"],["regulatoryIntensity","wbRegulatory"],["appetite","wbAppetite"],["horizon","wbHorizon"],["goals","wbGoals"],["pain","wbPain"],["integration","wbIntegration"],["custom","wbCustom"],["customProcesses","wbCustomProcesses"],["erpSpend","wbErpSpend"]].forEach(function(pair){if($(pair[1])&&savedProfile[pair[0]]!=null)set(pair[1],savedProfile[pair[0]])});
  renderProfileOut();renderProcesses();renderApps();renderCandidates();renderCapabilities();renderGov();renderRoadmap();renderRequirements();renderCompare();renderPortfolio();renderPoc();renderEvidence();report();
  loadJourneys();
}
document.addEventListener("automationScanUIReady",bind);if(window.AutomationScanUI&&window.AutomationScanUI.ready&&typeof window.AutomationScanUI.ready.then==="function")window.AutomationScanUI.ready.then(bind);
if(window.AutomationScanUI&&window.AutomationScanUI.ready&&typeof window.AutomationScanUI.ready.then==="function")window.AutomationScanUI.ready.then(bind);
})();