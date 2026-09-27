(function () {
"use strict";

var form = document.getElementById("transformForm");
var industry = document.getElementById("industry");
var businessModel = form ? form.querySelector('[name="businessModel"]') : null;
var current = form ? form.querySelector('[name="current"]') : null;
var steps = Array.prototype.slice.call(document.querySelectorAll(".t-step"));
var next = document.getElementById("tNext");
var back = document.getElementById("tBack");
var generate = document.getElementById("tGenerate");

var businessModels = {
  Retail: ["Department / specialty retail","Grocery / convenience","Fashion / apparel","Wholesale + retail","Omnichannel / marketplace"],
  Manufacturing: ["Discrete manufacturing","Process manufacturing","Engineer-to-order","Make-to-stock","Contract manufacturing"],
  Distribution: ["Wholesale distribution","B2B distribution","Consumer distribution","Import / export","3PL / logistics"],
  Healthcare: ["Provider","Hospital","Clinic network","Healthcare services","Medical distribution"],
  "Professional Services": ["Consulting","IT services","Engineering services","Managed services","Project-based services"],
  Hospitality: ["Hotel","Resort","Restaurant group","Travel / leisure","Multi-property hospitality"],
  Other: ["B2B","B2C","Subscription","Project-based","Mixed / diversified"]
};

var processMap = {
  Retail: ["Merchandising","Buying and procurement","Pricing and promotions","Demand planning","Replenishment","POS and store operations","E-commerce","Order fulfilment","Returns","Customer loyalty","Finance"],
  Manufacturing: ["Product lifecycle","Bill of materials","Planning and scheduling","Procurement","Production","Quality","Warehouse","Maintenance","Costing","Finance"],
  Distribution: ["Procurement","Demand planning","Inventory","Warehouse","Order management","Pricing","Transportation","Returns","Customer management","Finance"],
  Healthcare: ["Patient / member administration","Scheduling","Supply chain","Procurement","Billing","Finance","Compliance","Workforce","Reporting","Data management"],
  "Professional Services": ["Opportunity management","Project delivery","Resource planning","Time and expenses","Billing","Revenue recognition","Procurement","Finance","Customer management"],
  Hospitality: ["Reservations","Property operations","Procurement","Inventory","Point of sale","Housekeeping","Revenue management","Guest experience","Finance"],
  Other: ["Sales","Procurement","Operations","Inventory","Customer service","Finance","Reporting","People and workforce"]
};

var painMap = {
  Retail: ["Poor inventory visibility","Slow merchandising decisions","Spreadsheet-driven planning","High integration effort","Customer data fragmentation","Margin pressure"],
  Manufacturing: ["Planning volatility","Manual production processes","Inventory imbalance","Quality issues","Legacy customisation","High operational cost"],
  Distribution: ["Inventory imbalance","Slow order fulfilment","Manual pricing","Warehouse inefficiency","Integration complexity","Margin leakage"],
  Healthcare: ["Manual administration","Fragmented data","Compliance burden","Scheduling inefficiency","Supply chain cost","Reporting delays"],
  "Professional Services": ["Poor resource utilisation","Manual project administration","Billing leakage","Forecasting difficulty","Disconnected systems","Margin pressure"],
  Hospitality: ["Fragmented property systems","Manual operations","Revenue leakage","Poor guest data","Procurement inefficiency","Reporting delays"],
  Other: ["Manual work","Disconnected applications","Poor visibility","High operating cost","Legacy technology","Slow decision making"]
};

function showStep(n) {
  var i;
  if (n < 0) n = 0;
  if (n >= steps.length) n = steps.length - 1;
  for (i = 0; i < steps.length; i++) steps[i].classList.toggle("active", i === n);
  if (document.getElementById("tProgress")) document.getElementById("tProgress").textContent = "Step " + (n + 1) + " of " + steps.length;
  if (document.getElementById("tProgressBar")) document.getElementById("tProgressBar").style.width = ((n + 1) / steps.length * 100) + "%";
  if (back) back.hidden = n === 0;
  if (next) next.hidden = n === steps.length - 1;
  if (generate) generate.hidden = n !== steps.length - 1;
  window._advisorStep = n;
}

function populateBusinessModels() {
  var key = industry ? industry.value : "";
  var list = businessModels[key] || businessModels.Other;
  var html = '<option value="">Choose</option>';
  for (var i = 0; i < list.length; i++) html += '<option value="' + list[i] + '">' + list[i] + "</option>";
  if (businessModel) {
    businessModel.innerHTML = html;
    businessModel.disabled = false;
  }
  renderIndustry(key);
}

function renderIndustry(key) {
  var processes = processMap[key] || processMap.Other;
  var pains = painMap[key] || painMap.Other;
  var intro = document.getElementById("industryIntro");
  var processBox = document.getElementById("industryProcesses");
  var painBox = document.getElementById("industryPains");
  if (intro) intro.textContent = key ? key + " business context loaded. The next questions are tailored to this industry." : "Choose an industry to load the relevant business model and process library.";
  if (processBox) {
    processBox.innerHTML = processes.map(function (x) { return '<label><input type="checkbox" name="process" value="' + x + '"><span>' + x + "</span></label>"; }).join("");
  }
  if (painBox) {
    painBox.innerHTML = pains.map(function (x) { return '<label><input type="checkbox" name="pain" value="' + x + '"><span>' + x + "</span></label>"; }).join("");
  }
}

function validStep() {
  var step = steps[window._advisorStep || 0];
  if (!step) return true;
  var required = step.querySelectorAll("[required]");
  for (var i = 0; i < required.length; i++) {
    if (!required[i].checkValidity()) {
      required[i].reportValidity();
      return false;
    }
  }
  return true;
}

function value(name) {
  var el = form ? form.querySelector('[name="' + name + '"]') : null;
  return el ? el.value : "";
}

function checked(name) {
  return form ? Array.prototype.slice.call(form.querySelectorAll('[name="' + name + '"]:checked')).map(function (x) { return x.value; }) : [];
}

function escapeHtml(v) {
  return String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function buildDecisionNarrative(ind, model, platform, scale, migration, candidates, scores, processes, pains) {
  var top = scores.slice(0,3);
  var continuity = platform !== "Not specified" && platform.toLowerCase().indexOf("infor") >= 0;
  var route = migration.indexOf("Transformational") >= 0 ? "transformation" : migration.indexOf("Conservative") >= 0 ? "modernisation / continuity" : "structured comparison";
  var text = "Your assessment points toward a " + route + " decision. ";
  if (continuity) text += "Because the current platform is Infor, test the value of staying on the Infor path before committing to replacement. ";
  text += "The report should treat " + top.map(function(x){return x.name;}).join(", ") + " as the first investigation set, not as an automatic winner. ";
  text += "The next decision gate is evidence: scripted process demonstrations, industry references, security architecture, integration proof, migration approach and five-year TCO.";
  return text;
}

function renderReport() {
  var ind = value("industry") || "Other";
  var model = value("businessModel") || "Not specified";
  var platform = value("current") || "Not specified";
  var processes = checked("process");
  var pains = checked("pain");
  var scale = value("scale") || "Not specified";
  var custom = value("custom") || "Low";
  var customProcess = value("customProcess") || value("customProcesses") || "None provided";
  var revenue = value("revenue") || "Prefer not to say";
  var employees = value("employees") || "Not specified";
  var erpSpend = value("erpSpend") || "Unknown";
  var integration = value("integration") || "Low";
  var migration = value("migration") || "Balanced";
  var goals = checked("goal");
  var painText = value("painText") || "";
  var horizon = value("horizon") || "Not specified";
  var ecosystem = value("ecosystem") || "Not specified";
  var candidateMeta = {
    "Oracle": {type:"ERP + industry suite", products:"Fusion Cloud ERP + Oracle Retail", fit:["Retail","Distribution","Manufacturing","Healthcare","Hospitality"], caps:["Finance","Procurement","Supply Chain","Order Management","Inventory","Retail Merchandising","Planning","Analytics"], url:"https://www.oracle.com/retail/"},
    "SAP": {type:"ERP + industry suite", products:"SAP Cloud ERP + SAP Retail", fit:["Retail","Manufacturing","Distribution","Healthcare","Consumer Products"], caps:["Finance","Procurement","Supply Chain","Merchandising","Assortment","Pricing","Planning","Warehouse","Analytics"], url:"https://www.sap.com/industries/retail.html"},
    "Microsoft Dynamics 365": {type:"ERP + commerce ecosystem", products:"Dynamics 365 Finance / Supply Chain / Commerce", fit:["Retail","Distribution","Manufacturing","Professional Services","Healthcare"], caps:["Finance","Procurement","Supply Chain","Inventory","Commerce","POS","Warehouse","CRM","Analytics"], url:"https://www.microsoft.com/en-in/dynamics-365"},
    "Infor": {type:"Industry ERP + cloud suite", products:"Infor CloudSuite", fit:["Retail","Manufacturing","Distribution","Healthcare","Hospitality"], caps:["Finance","Procurement","Supply Chain","Retail","Merchandising","Inventory","Warehouse","Analytics","Industry workflows"], url:"https://www.infor.com/industries/retail/"},
    "NetSuite": {type:"Cloud ERP", products:"Oracle NetSuite", fit:["Retail","Distribution","Professional Services","Manufacturing"], caps:["Financials","Procurement","Inventory","Order Management","Commerce","Planning","Analytics"], url:"https://www.netsuite.com/portal/industries/retail.shtml"},
    "IFS Cloud": {type:"ERP + operational suite", products:"IFS Cloud", fit:["Manufacturing","Distribution","Aerospace","Energy","Construction","Service"], caps:["Finance","Supply Chain","Manufacturing","Asset Management","Service","Projects","Planning"], url:"https://www.ifs.com/solutions/industries"},
    "Epicor": {type:"Industry ERP", products:"Epicor Kinetic / industry ERP", fit:["Manufacturing","Distribution","Retail"], caps:["Finance","Procurement","Inventory","Manufacturing","Supply Chain","Distribution","Commerce"], url:"https://www.epicor.com/en-us/industries/"},
    "Sage X3": {type:"ERP", products:"Sage X3", fit:["Manufacturing","Distribution","Consumer Products","Chemicals","Food & Beverage"], caps:["Finance","Procurement","Inventory","Manufacturing","Supply Chain","Distribution"], url:"https://www.sage.com/en-us/products/sage-business-cloud/sage-x3/"},
    "Acumatica": {type:"Cloud ERP", products:"Acumatica Cloud ERP", fit:["Retail","Distribution","Manufacturing","Construction"], caps:["Financials","Distribution","Inventory","Order Management","Manufacturing","Commerce"], url:"https://www.acumatica.com/industries/"},
    "Odoo": {type:"Modular business suite", products:"Odoo", fit:["Retail","Distribution","Manufacturing","Professional Services"], caps:["Finance","Sales","Inventory","Purchase","Manufacturing","POS","eCommerce"], url:"https://www.odoo.com/page/industries"},
    "Unit4": {type:"ERP", products:"Unit4 ERP", fit:["Professional Services","Public Sector","Education","Nonprofit"], caps:["Finance","Procurement","Projects","Services","Planning","Analytics"], url:"https://www.unit4.com/"},
    "Workday": {type:"Cloud business suite", products:"Workday Financial Management", fit:["Professional Services","Healthcare","Education","Public Sector"], caps:["Finance","Procurement","Projects","Workforce","Planning","Analytics"], url:"https://www.workday.com/"},
    "Oracle Retail + Fusion": {type:"Industry application + ERP", products:"Oracle Retail + Fusion Cloud", fit:["Retail"], caps:["Merchandising","Pricing","Assortment","Inventory","Planning","Store Operations","Finance","Procurement"], url:"https://www.oracle.com/retail/"},
    "SAP Retail + Cloud ERP": {type:"Industry application + ERP", products:"SAP Retail + SAP Cloud ERP", fit:["Retail"], caps:["Merchandising","Assortment","Pricing","Allocation","Replenishment","POS integration","Finance","Supply Chain"], url:"https://www.sap.com/industries/retail.html"},
    "Manhattan Associates": {type:"Specialist supply-chain platform", products:"Manhattan Active", fit:["Retail","Distribution","Manufacturing"], caps:["Warehouse","Order Management","Inventory","Transportation","Fulfilment"], url:"https://www.manh.com/"},
    "Blue Yonder": {type:"Specialist supply-chain platform", products:"Blue Yonder", fit:["Retail","Manufacturing","Distribution","Consumer Products"], caps:["Planning","Demand","Supply","Warehouse","Order Management","Merchandising"], url:"https://blueyonder.com/"},
    "S/4HANA + specialist ecosystem": {type:"ERP + best-of-breed", products:"SAP core plus specialist applications", fit:["Retail","Manufacturing","Distribution","Consumer Products"], caps:["Finance","Supply Chain","Procurement","Manufacturing","Retail","Integration","Analytics"], url:"https://www.sap.com/"}
  };
var allCandidates = Object.keys(candidateMeta).filter(function(name){
    var meta=candidateMeta[name];
    var currentName=platform.toLowerCase();
    var platformMatch=currentName.indexOf(name.toLowerCase().split(" ")[0])>=0 || (name==="IFS Cloud" && currentName.indexOf("ifs")>=0) || (name==="Microsoft Dynamics 365" && currentName.indexOf("dynamics")>=0);
    var industryMatch=meta.fit.indexOf(ind)>=0;
    var processText=processes.join(" ").toLowerCase();
    var capabilitySignal=meta.caps.some(function(cap){return processText.indexOf(cap.toLowerCase())>=0;});
    return industryMatch || platformMatch || capabilitySignal;
  });
  function capabilityMatches(processName, cap) {
    var p=String(processName||"").toLowerCase();
    var q=String(cap||"").toLowerCase();
    var aliases={
      "finance":["financial","accounting","accounts payable","accounts receivable","general ledger","controlling"],
      "financials":["finance","accounting","accounts payable","accounts receivable","general ledger"],
      "procurement":["purchasing","source to pay","sourcing"],
      "supply chain":["logistics","planning","distribution","fulfilment","fulfillment"],
      "inventory":["stock","warehouse inventory","availability"],
      "order management":["orders","order fulfilment","order fulfillment","sales order"],
      "commerce":["ecommerce","e-commerce","online sales","digital commerce"],
      "pos":["point of sale","store"],
      "merchandising":["retail merchandising","assortment","pricing","allocation","replenishment"],
      "planning":["demand planning","supply planning","forecasting"],
      "warehouse":["wms","warehouse management","distribution centre","distribution center"],
      "manufacturing":["production","shop floor","mrp"],
      "projects":["project accounting","project management"],
      "asset management":["assets","eam","maintenance"],
      "service":["field service","after sales","after-sales"]
    };
    if(p.indexOf(q)>=0 || q.indexOf(p)>=0) return true;
    var a=aliases[q]||[];
    return a.some(function(x){return p.indexOf(x)>=0;});
  }
  var scores = allCandidates.map(function (name) {
    var m = candidateMeta[name];
    var industryFit = m.fit.indexOf(ind) >= 0 ? 30 : 4;
    var continuity = platform.toLowerCase().indexOf(name.toLowerCase().split(" ")[0]) >= 0 ? 18 : 0;
    var processCoverage = processes.reduce(function(total,p){ return total + (m.caps.some(function(cap){ return capabilityMatches(p,cap); }) ? 5 : 0); },0);
    var painCoverage = pains.reduce(function(total,p){ return total + (m.caps.some(function(cap){ return capabilityMatches(p,cap); }) ? 3 : 0); },0);
    var scaleSignal = scale === "Enterprise" && ["Oracle","SAP","Microsoft Dynamics 365","Infor","IFS Cloud","S/4HANA + specialist ecosystem"].indexOf(name)>=0 ? 10 : 5;
    var customSignal = custom === "Very high" && ["Oracle","SAP","Microsoft Dynamics 365","Infor","IFS Cloud"].indexOf(name)>=0 ? 5 : 2;
    return {name:name, score:industryFit+Math.min(20,processCoverage)+Math.min(12,painCoverage)+scaleSignal+customSignal+continuity};
  }).sort(function(a,b){return b.score-a.score;});
  var candidates = scores.slice(0,5).map(function(x){return x.name;});
  var score = Math.min(96, 40 + processes.length * 5 + pains.length * 3 + (platform !== "Not specified" ? 12 : 0) + (model !== "Not specified" ? 8 : 0));
  var route = migration.indexOf("Transformational") >= 0 ? "Transformation" : migration.indexOf("Conservative") >= 0 ? "Modernise / preserve continuity" : "Structured market comparison";
  var painText = value("painText") || "";

  function candidateDecision(app, idx) {
    var m = candidateMeta[app];
    var industryFit = m.fit.indexOf(ind) >= 0;
    var coveredProcesses = processes.filter(function(p){return m.caps.some(function(cap){return capabilityMatches(p,cap);});});
    var uncoveredProcesses = processes.filter(function(p){return coveredProcesses.indexOf(p)<0;});
    var painAligned = pains.filter(function(p){return m.caps.some(function(cap){return capabilityMatches(p,cap);});});
    var continuity = platform.toLowerCase().indexOf(app.toLowerCase().split(" ")[0])>=0;
    return {industry:industryFit ? "Aligned" : "Not industry-specific in this assessment",current:continuity ? "Current-platform continuity signal" : "Replacement / complement",covered:coveredProcesses,uncovered:uncoveredProcesses,painAligned:painAligned,total:Math.round((industryFit?35:10)+(coveredProcesses.length*10)+(painAligned.length*5)+(continuity?15:0)),band:industryFit && coveredProcesses.length===processes.length && processes.length ? "Direct requirement alignment" : industryFit ? "Industry fit — validate process coverage" : "Broader option — validate specialist fit"};
  }
  var decisionScores = candidates.map(function(app, idx){ return {name:app, d:candidateDecision(app, idx)}; });
  var title = document.getElementById("tResultTitle");
  var sub = document.getElementById("tResultSub");
  var scoreEl = document.getElementById("tScore");
  var interpretation = document.getElementById("tInterpretation");
  var summary = document.getElementById("tSummary");
  var context = document.getElementById("tContext");
  var contextLabel = document.getElementById("tContextLabel");
  var caps = document.getElementById("tCaps");
  var capCount = document.getElementById("tCapCount");
  var kpis = document.getElementById("tKpis");
  var opportunities = document.getElementById("tOpportunities");
  var matrix = document.getElementById("tMatrix");
  var need = document.getElementById("tNeedERP");
  var approach = document.getElementById("tApproach");
  var savings = document.getElementById("tSavings");
  var future = document.getElementById("tFutureBenefits");
  var tradeoffs = document.getElementById("tTradeoffs");
  var risks = document.getElementById("tRisks");
  var val = document.getElementById("tValue");
  var evidence = document.getElementById("tEvidence");
  var questions = document.getElementById("tQuestions");
  var roadmap = document.getElementById("tRoadmap");
  var candidatesBox = document.getElementById("tCandidates");
  var explore = document.getElementById("tExplore");
  var architecture = document.getElementById("tArchitecture");
  var inputsBox = document.getElementById("tInputs");
  var processDetail = document.getElementById("tProcessDetail");
  var painDetail = document.getElementById("tPainDetail");
  var scoreBreakdown = document.getElementById("tScoreBreakdown");
  var goalsBox = document.getElementById("tGoals");

  if (title) title.textContent = ind + " transformation decision brief";
  if (sub) sub.textContent = "Business model: " + model + " | Current platform: " + platform;
  if (scoreEl) scoreEl.textContent = score;
  if (interpretation) interpretation.textContent = "This is a discovery signal, not a procurement recommendation. Validate the shortlisted options against your detailed requirements.";
  var pack=document.getElementById("decisionPack");
  if(pack){
    var topApps=decisionScores.slice(0,3).map(function(x){return x.name;});
    pack.innerHTML="<div class='decision-pack-grid'><article><b>Transformation route</b><strong>"+escapeHtml(route)+"</strong><span>Validate whether replacement is actually required</span></article><article><b>Priority ecosystems</b><strong>"+escapeHtml(topApps.join(" · "))+"</strong><span>Investigation set derived from the assessment</span></article><article><b>Custom process</b><strong>"+(customProcess!=="None provided"?"Needs fit-gap":"Not supplied")+"</strong><span>Challenge before reproducing in SaaS</span></article><article><b>Business case</b><strong>"+(erpSpend!=="Unknown"?"Baseline available":"Baseline required")+"</strong><span>Validate TCO, retirement and efficiency effects</span></article></div>";
  }
  if (summary) summary.innerHTML = "<section class='executive-decision'><div class='eyebrow'>EXECUTIVE DECISION SUMMARY</div><h3>What should this customer decide next?</h3><p>" + escapeHtml(buildDecisionNarrative(ind, model, platform, scale, migration, candidates, decisionScores, processes, pains)) + "</p><div class='decision-path'><span>1. Confirm business requirements</span><span>2. Challenge custom processes</span><span>3. Compare candidate ecosystems</span><span>4. Validate with evidence and POC</span><span>5. Build the business case</span></div><div class='decision-questions'><b>Before selecting an application, answer:</b><ul><li>Do we actually need to replace the ERP?</li><li>Which processes should become standard SaaS processes?</li><li>Which custom processes genuinely differentiate the business?</li><li>Which capabilities belong in ERP versus specialist applications?</li><li>What evidence and POC results are required before committing?</li></ul></div></section>";
  if (contextLabel) contextLabel.textContent = "Assessment context";
  if (context) context.innerHTML = "<b>" + escapeHtml(ind) + " / " + escapeHtml(model) + "</b><p>Current platform: " + escapeHtml(platform) + "</p><p>Scale: " + escapeHtml(scale) + "</p><p>Customisation: " + escapeHtml(custom) + " | Integration: " + escapeHtml(integration) + "</p><p>Transformation appetite: " + escapeHtml(migration) + "</p>";
  if (inputsBox) inputsBox.innerHTML = [
    ["Industry",ind],["Business model",model],["Current platform",platform],["Operating footprint",scale],
    ["Revenue / turnover",revenue],["Employees",employees],["ERP / core-app spend",erpSpend],["Customisation today",custom],
    ["Integration complexity",integration],["Transformation appetite",migration],["Target horizon",horizon],["Existing ecosystem",ecosystem],
    ["Assessment goals",goals.length ? goals.join(", ") : "Not specified"],["Customer pain narrative",painText || "Not provided"],
    ["Custom business process",customProcess !== "None provided" ? customProcess : "Not provided"],["Selected process areas",processes.length ? processes.join(", ") : "Not specified"],
    ["Selected pain signals",pains.length ? pains.join(", ") : "Not specified"]
  ].map(function(x){return "<div class='input-summary'><small>"+escapeHtml(x[0])+"</small><b>"+escapeHtml(x[1])+"</b></div>";}).join("");
  if (processDetail) processDetail.innerHTML = processes.length ? processes.map(function(x){return "<div class=\"detail-item\"><b>"+escapeHtml(x)+"</b><span>In scope</span></div>";}).join("") : "<div class=\"detail-empty\">No process areas selected.</div>";
  if (painDetail) painDetail.innerHTML = pains.length ? pains.map(function(x){return "<div class=\"detail-item\"><b>"+escapeHtml(x)+"</b><span>Priority pain signal</span></div>";}).join("") : "<div class=\"detail-empty\">No pain signals selected.</div>";
  if (scoreBreakdown) scoreBreakdown.innerHTML = [
    ["Process coverage",Math.min(100,processes.length*10)],["Pain intensity",Math.min(100,pains.length*14)],["Technology context",platform !== "Not specified" ? 100 : 0],["Decision readiness",Math.min(100,40 + goals.length*10)]
  ].map(function(x){return "<div class=\"score-break-row\"><div><b>"+escapeHtml(x[0])+"</b><strong>"+x[1]+"%</strong></div><div class=\"score-break-track\"><i style=\"width:"+x[1]+"%\"></i></div></div>";}).join("");
  if (goalsBox) goalsBox.innerHTML = goals.length ? goals.map(function(x){return "<span>"+escapeHtml(x)+"</span>";}).join("") : "<span>No specific outcome selected</span>";
  if (capCount) capCount.textContent = processes.length + " selected";
  if (caps) caps.innerHTML = processes.length ? processes.map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") : "<li>No specific processes selected yet.</li>";
  if (kpis) kpis.innerHTML = "<article><b>" + processes.length + "</b><span>process areas</span></article><article><b>" + pains.length + "</b><span>pain areas</span></article><article><b>" + candidates.length + "</b><span>ecosystems assessed</span></article><article><b>" + candidates.slice(0,3).join(" / ") + "</b><span>priority investigation set</span></article>";
  var customProcesses = value("customProcesses");
  var customProcessText = customProcess || "No custom process supplied";
  var goals = checked("goal");
  function treatmentFor(app) {
    if (customProcessText === "No custom process supplied") return "No custom process provided";
    var c = candidateMeta[app];
    if (platform.toLowerCase().indexOf(app.toLowerCase()) >= 0) return "Retain / modernise candidate";
    if (c.fit.indexOf(ind) >= 0 && custom === "Low") return "Standard / configure first";
    if (c.fit.indexOf(ind) >= 0) return "Configure / extend only if justified";
    return "Specialist or third-party assessment";
  }
  var requirementRows = processes.map(function (p) {
    return decisionScores.map(function (x) {
      var d=x.d;
      var processPain=pains.filter(function(pa){return capabilityMatches(p,pa);});
      var currentState=platform + (processPain.length ? " · selected pain: "+processPain.join(", ") : " · current capability not independently verified");
      var candidateState=d.covered.indexOf(p)>=0 ? (candidateMeta[x.name].unique||candidateMeta[x.name].products)+" Relevant to "+p+"; validate exact release/configuration." : "No direct catalogue match for "+p+"; this is an evidence gap, not proof of product weakness.";
      var gap=d.covered.indexOf(p)>=0 ? (processPain.length ? "Potential improvement gap driven by selected pain; baseline KPI required." : "No proven gap from supplied inputs; validate exact release/configuration.") : "Requirement-to-capability evidence gap";
      return {process:p,app:x.name,current:currentState,candidate:candidateState,gap:gap,treatment:d.covered.indexOf(p)>=0 ? "Fit-to-standard / configure first" : "POC / specialist / extension assessment",evidence:"Comparable demo + current-state evidence + industry reference + architecture/security proof"};
    });
  }).flat();
  if (matrix) matrix.innerHTML = requirementRows.map(function (row) {
    return "<div class='requirement-block'><h4>"+escapeHtml(row.process)+" · "+escapeHtml(row.app)+"</h4><table><thead><tr><th>Current-state input</th><th>Candidate capability signal</th><th>Why gap?</th><th>Treatment</th><th>Evidence required</th></tr></thead><tbody><tr><td>"+escapeHtml(row.current)+"</td><td>"+escapeHtml(row.candidate)+"</td><td>"+escapeHtml(row.gap)+"</td><td>"+escapeHtml(row.treatment)+"</td><td>"+escapeHtml(row.evidence)+"</td></tr></tbody></table></div>";
  }).join("");
  if (matrix && customProcessText !== "No custom process supplied") {
    matrix.innerHTML += "<div class='requirement-block custom-process'><h4>Customer custom business process</h4><p>" + escapeHtml(customProcessText) + "</p><table><thead><tr><th>Decision</th><th>What to test</th><th>Preferred treatment</th><th>Evidence</th></tr></thead><tbody><tr><td>Preserve business differentiation</td><td>Why the process exists and measurable value</td><td>Standard capability first; configure where possible</td><td>POC with real exception scenarios</td></tr><tr><td>Replace / simplify</td><td>Whether the process is historical customisation</td><td>Challenge customisation before migration</td><td>Fit-gap and TCO evidence</td></tr></tbody></table></div>";
  }
  if (opportunities) opportunities.innerHTML = "<ul><li>Standardise high-friction processes before replacing them.</li><li>Map integrations and customisations before committing to migration.</li><li>Separate core ERP needs from specialist industry applications.</li></ul>" + (customProcess && customProcess !== "None provided" ? "<article class='custom-process-highlight'><b>Custom process requiring discovery</b><p>" + escapeHtml(customProcess) + "</p><small>Challenge this process before migration: preserve differentiation, standardise it, configure it, extend it, use a specialist product, or retire it.</small></article>" : "");
  if (need) need.innerHTML = "<p>Do not assume ERP replacement is necessary. Compare three scenarios: modernise the current platform, replace the core ERP, or simplify the application landscape with SaaS and specialist products.</p>";
  if (approach) approach.innerHTML = "<p>Use a fit-to-standard first approach. Preserve differentiating industry capabilities and challenge customisations that do not create measurable business value.</p>";
  if (savings) savings.innerHTML = "<ul><li>Retire unused customisations.</li><li>Reduce duplicate applications and interfaces.</li><li>Clean data before migration rather than carrying historical complexity forward.</li></ul>";
  if (future) future.innerHTML = "<ul><li>Lower operational friction</li><li>Improved business visibility</li><li>Scalable SaaS operating model</li><li>Better data and AI readiness</li></ul>";
  if (tradeoffs) tradeoffs.innerHTML = "<p>Current-platform modernisation may reduce change risk; replacement may provide greater process redesign potential but usually creates greater migration and change impact. Best-of-breed can improve specialist capability while increasing integration complexity.</p>";
  if (risks) risks.innerHTML = "<ul><li>Incomplete requirements</li><li>Data quality and migration effort</li><li>Integration dependencies</li><li>Over-customisation</li><li>Change-management capacity</li></ul>";
  if (val) {
    var spendBand = erpSpend === "Under $100K" ? [10000,25000] : erpSpend === "$100K–$500K" ? [25000,100000] : erpSpend === "$500K–$2M" ? [100000,400000] : erpSpend === "$2M–$10M" ? [300000,1500000] : erpSpend === "Over $10M" ? [750000,3000000] : [0,0];
    var efficiencySignal = Math.min(18, processes.length * 2 + pains.length);
    var low = spendBand[0] ? Math.round(spendBand[0] * (0.05 + efficiencySignal/100)) : 0;
    var high = spendBand[1] ? Math.round(spendBand[1] * (0.10 + efficiencySignal/100)) : 0;
    var bandText = spendBand[0] ? "$" + low.toLocaleString() + "–$" + high.toLocaleString() + " annual opportunity signal" : "Baseline required before a monetary range can be calculated";
    val.innerHTML = "<div><b>" + bandText + "</b><span>illustrative efficiency / simplification signal</span></div><div><b>" + processes.length + "</b><span>process areas in scope</span></div><div><b>" + pains.length + "</b><span>pain signals selected</span></div><div><b>" + escapeHtml(erpSpend) + "</b><span>current core-app spend input</span></div><p>Validate this signal against labour effort, application retirement, integration/support, working capital, revenue leakage and implementation investment. It is not a vendor quote or guaranteed saving.</p>";
  }

  if (evidence) evidence.innerHTML = [
    ["Business requirements", processes.length ? processes.join("; ") : "Process scope not selected", "Trace each requirement to measurable business outcome", "Requirements workshop + signed baseline"],
    ["Pain points", pains.length ? pains.join("; ") : "Pain scope not selected", "Compare current-state metrics with target-state outcomes", "Baseline KPI evidence"],
    ["Custom process", customProcessText === "No custom process supplied" ? "None supplied" : customProcessText, "Standardise / configure / extend / specialist / retire", "POC using the real exception"],
    ["Applications", candidates.slice(0,4).join("; "), "Capability coverage, integration and industry fit", "Scripted comparable demos"],
    ["Economics", erpSpend + " / " + revenue, "Five-year TCO, retirement, implementation and operating cost", "Transparent business case"],
    ["Migration", migration, "Data, integrations, customisations and coexistence waves", "Migration assessment + rehearsal evidence"]
  ].map(function(r){return "<tr><td><b>"+escapeHtml(r[0])+"</b></td><td>"+escapeHtml(r[1])+"</td><td>"+escapeHtml(r[2])+"</td><td>"+escapeHtml(r[3])+"</td></tr>";}).join("");
  if (questions) questions.innerHTML = [
    "Demonstrate " + (processes[0] || "the highest-value process") + " end-to-end using standard capability, including an exception and approval.",
    "Show how the selected pain areas are reduced and what KPI proves the improvement.",
    "Explain which requirements need configuration, extension, specialist applications or integration.",
    "Show how the current " + platform + " customisations and integrations are migrated, replaced or retired.",
    "Provide comparable " + ind + " references and a transparent five-year TCO including implementation and operating costs.",
    "Demonstrate identity, segregation of duties, audit, resilience, data residency and required compliance controls."
  ].map(function(x){return "<li>"+escapeHtml(x)+"</li>";}).join("");
  if (roadmap) roadmap.innerHTML = "<article><span>0-30 days</span><b>Baseline this customer</b><p>Confirm " + escapeHtml(ind) + " processes, selected pain points, data, integrations, customisations and value baseline.</p></article><article><span>31-60 days</span><b>Prove process fit</b><p>Run comparable scripted demonstrations for " + escapeHtml(processes.slice(0,3).join(", ") || "priority processes") + (customProcessText === "No custom process supplied" ? "." : " and the custom process.") + "</p></article><article><span>61-90 days</span><b>Compare & business-case</b><p>Validate POC results, five-year TCO, migration effort, partner evidence and the chosen transformation route.</p></article>";
  if (candidatesBox) candidatesBox.innerHTML = decisionScores.map(function (x,idx) {
    var m=candidateMeta[x.name], d=x.d;
    return "<article class='candidate-card'><div class='candidate-rank'>"+(idx+1)+"</div><div><div class='candidate-name'><b>"+escapeHtml(x.name)+"</b><span>"+escapeHtml(m.type)+"</span></div><p><b>Why it appears:</b> "+escapeHtml(m.why||d.industry)+"</p><p><b>Distinctive capability:</b> "+escapeHtml(m.unique||m.products)+"</p><p><b>Reference evidence:</b> "+escapeHtml(m.refs||"Request a comparable customer reference.")+"</p><a href='"+escapeHtml(m.refUrl||m.url)+"' target='_blank' rel='noopener'>Source evidence →</a></div></article>";
  }).join("");
  if (explore) explore.innerHTML = decisionScores.map(function (x,idx) {
    var m=candidateMeta[x.name], d=x.d;
    var matched=processes.filter(function(p){return d.covered.indexOf(p)>=0;});
    var unmatched=processes.filter(function(p){return d.covered.indexOf(p)<0;});
    var why = m.why || ("Selected because "+(d.industry==="Aligned" ? "the candidate has industry alignment" : "the candidate has relevant capability signals")+" for this assessment.");
    var unique = m.unique || m.products;
    var refs = m.refs || "Request a comparable customer reference during discovery.";
    return "<article class='explore-card'><div class='explore-head'><span>Top "+(idx+1)+" · "+escapeHtml(m.type)+"</span><b>"+escapeHtml(x.name)+"</b></div><p><b>Why relevant:</b> "+escapeHtml(why)+"</p><dl><dt>Distinctive value</dt><dd>"+escapeHtml(unique)+"</dd><dt>Matched requirements</dt><dd>"+escapeHtml(matched.length ? matched.join(" · ") : "None mapped yet")+"</dd><dt>Unproven requirements</dt><dd>"+escapeHtml(unmatched.length ? unmatched.join(" · ") : "None in the selected process list")+"</dd><dt>Customer reference</dt><dd>"+escapeHtml(refs)+"</dd></dl><p><b>POC focus:</b> "+escapeHtml(matched.length ? "Demonstrate the matched processes with the customer's exception, KPI and integration scenario." : "Build a scripted proof for the highest-priority requirement before treating this option as suitable.")+"</p><a href='"+escapeHtml(m.refUrl||m.url)+"' target='_blank' rel='noopener'>Official evidence →</a></article>";
  }).join("");
  if (architecture) architecture.innerHTML = "<p><b>Current:</b> " + escapeHtml(platform) + "</p><p><b>Target hypothesis:</b> SaaS core platform + industry capabilities + governed integrations + common data/identity layer.</p>";
  var results = document.getElementById("transformResults");
  if (results) {
    results.classList.remove("hidden");
    results.scrollIntoView({behavior:"smooth"});
  }
  try { sessionStorage.setItem("automationscan_transform", JSON.stringify({industry:ind,businessModel:model,current:platform,processes:processes,pains:pains,painText:painText,customProcess:customProcess,scale:scale,custom:custom,integration:integration,migration:migration,goals:goals,revenue:revenue,employees:employees,erpSpend:erpSpend})); } catch (e) {}
}

if (industry) industry.addEventListener("change", populateBusinessModels);
if (next) next.addEventListener("click", function () { if (validStep()) showStep((window._advisorStep || 0) + 1); });
if (back) back.addEventListener("click", function () { showStep((window._advisorStep || 0) - 1); });
if (form) form.addEventListener("submit", function (e) { e.preventDefault(); if (!validStep()) return; renderReport(); });
if (generate) generate.addEventListener("click", function (e) { e.preventDefault(); if (!validStep()) return; renderReport(); });
var download = document.getElementById("tDownload");
if (download) download.addEventListener("click", function () {
  var report = document.getElementById("transformResults");
  if (!report) return;
  var win = window.open("", "_blank");
  if (!win) { alert("Please allow pop-ups for AutomationScan to create the PDF-ready report."); return; }
  var reportHtml = report.outerHTML;
  win.document.open();
  win.document.write("<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>AutomationScan Transformation Decision Report</title><link rel='stylesheet' href='" + location.origin + "/site.css?v=20260928-4'><style>" +
    "@page{size:A4;margin:14mm 12mm 16mm}" +
    "html,body{background:#fff!important;color:#20323a!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;font-size:10pt;line-height:1.45}" +
    "body{margin:0!important}.transform-results{display:block!important;background:#fff!important;padding:0!important}.transform-results>.wrap{width:100%!important;max-width:none!important}.report-letterhead{margin-bottom:16px!important}.result-actions{display:none!important}.report-panel{box-shadow:none!important}.transform-results .report-panel{break-inside:avoid-page}.transform-results .report-panel,.transform-results .transform-score-grid{page-break-inside:avoid}.fit-table-wrap{overflow:visible!important}.fit-table-wrap table{width:100%!important;table-layout:fixed}.fit-table-wrap th,.fit-table-wrap td{white-space:normal!important;word-break:break-word!important}.evidence-table{font-size:8pt!important}.evidence-table th,.evidence-table td{padding:7px!important}.candidate-grid{grid-template-columns:1fr 1fr!important}.explore-grid{grid-template-columns:1fr 1fr!important}.transform-report-grid{grid-template-columns:1fr 1fr!important}.kpi-grid{grid-template-columns:repeat(4,1fr)!important}.input-summary-grid{grid-template-columns:repeat(3,1fr)!important}.priority-detail-grid{grid-template-columns:1fr 1fr!important}.transform-results a{color:#176b70!important}.print-only-footer{display:block!important;margin-top:18px;padding-top:10px;border-top:1px solid #dedbd2;font-size:8pt;color:#68777d}" +
    "</style></head><body class='print-report-shell'>" + reportHtml + "<div class='print-only-footer'>AutomationScan · Market Fit & Transformation Assessment · Directional decision support — validate current vendor scope, commercial terms, security, localisation, integrations and TCO before investment.</div></body></html>");
  win.document.close();
  win.focus();
  setTimeout(function(){win.print();},700);
});
var print = document.getElementById("tPrint");
if (print) print.addEventListener("click", function () { document.body.classList.add("printing-transform-report"); window.print(); setTimeout(function(){document.body.classList.remove("printing-transform-report");},1200); });

showStep(0);
populateBusinessModels();
})();