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
  var candidateMeta = {
  "Oracle": {url:"https://www.oracle.com/retail/", fit:["Retail","Distribution","Manufacturing"], reason:"Broad cloud applications with ERP, supply chain and industry capabilities.", proof:"Run finance, procurement, inventory, order management and the critical industry flow.", evidence:"Oracle retail portfolio, Fusion applications and current customer references."},
  "SAP": {url:"https://www.sap.com/industries/retail.html", fit:["Retail","Manufacturing","Distribution"], reason:"Deep enterprise process and industry ecosystem with retail, supply chain and finance capabilities.", proof:"Run merchandising, planning, procurement, inventory, fulfilment and finance scenarios.", evidence:"SAP retail solution portfolio, industry references and fit-to-standard evidence."},
  "Microsoft Dynamics": {url:"https://www.microsoft.com/en-in/dynamics-365", fit:["Retail","Distribution","Professional Services","Manufacturing"], reason:"Business applications ecosystem spanning ERP, commerce, data, CRM and analytics.", proof:"Demonstrate the priority customer journey across ERP, commerce/data and integrations.", evidence:"Dynamics 365 product scope, architecture and comparable customer references."},
  "Infor": {url:"https://www.infor.com/solutions/industries/retail", fit:["Retail","Manufacturing","Distribution","Healthcare","Hospitality"], reason:"Industry-focused cloud applications and a continuity option when current Infor capability is valuable.", proof:"Map current customisations and integrations to standard cloud capability.", evidence:"Current Infor roadmap, industry references and migration tooling."},
  "NetSuite": {url:"https://www.netsuite.com/portal/industries/retail.shtml", fit:["Retail","Distribution","Professional Services"], reason:"Cloud ERP candidate where scope can be standardised without excessive enterprise complexity.", proof:"Demonstrate finance, order, inventory and required industry extensions.", evidence:"Industry references, integration catalogue and five-year TCO."},
  "IFS": {url:"https://www.ifs.com/solutions/industries", fit:["Manufacturing","Distribution","Hospitality"], reason:"Operational ERP and industry workflows suited to asset, service and complex operational environments.", proof:"Demonstrate the most operationally complex end-to-end process.", evidence:"Industry references, security architecture and implementation evidence."}
};
var allCandidates = Object.keys(candidateMeta);
  var scores = allCandidates.map(function (name) {
    var m = candidateMeta[name];
    var fit = m.fit.indexOf(ind) >= 0 ? 28 : 8;
    var continuity = platform.toLowerCase().indexOf(name.toLowerCase()) >= 0 ? 18 : 0;
    var complexity = scale === "Enterprise" ? (name === "Oracle" || name === "SAP" || name === "Microsoft Dynamics" || name === "IFS" ? 16 : 6) : (name === "NetSuite" || name === "Microsoft Dynamics" || name === "Infor" ? 16 : 9);
    var migrationSignal = migration === "Replace" ? (continuity ? 4 : 10) : (continuity ? 12 : 7);
    var processSignal = Math.min(18, processes.length * 2);
    return {name:name, score:fit + continuity + complexity + migrationSignal + processSignal};
  }).sort(function(a,b){return b.score-a.score;});
  var candidates = scores.map(function(x){return x.name;});
  var score = Math.min(96, 55 + processes.length * 3 + pains.length * 2 + (platform !== "Not specified" ? 8 : 0));

  function candidateDecision(app, idx) {
    var m = candidateMeta[app];
    var fit = m.fit.indexOf(ind) >= 0 ? 5 : 2;
    var scaleFit = /Global|Multi-country/.test(scale) && ["Oracle","SAP","Microsoft Dynamics","IFS"].indexOf(app) >= 0 ? 5 : 3;
    var continuity = platform.toLowerCase().indexOf(app.toLowerCase()) >= 0 ? 5 : 2;
    var complexityPenalty = custom === "Very high" ? (["Oracle","SAP","Microsoft Dynamics","Infor"].indexOf(app) >= 0 ? 1 : 0) : 3;
    var integrationScore = integration === "Very high" ? (["Oracle","SAP","Microsoft Dynamics","Infor"].indexOf(app) >= 0 ? 4 : 2) : 3;
    var migrationScore = migration.indexOf("Conservative") >= 0 ? continuity + 2 : migration.indexOf("Transformational") >= 0 ? 4 : 3;
    var total = fit + scaleFit + continuity + complexityPenalty + integrationScore + migrationScore;
    var band = total >= 25 ? "Strong fit signal" : total >= 19 ? "Worth validating" : "Conditional fit";
    return {fit:fit, scale:scaleFit, continuity:continuity, complexity:complexityPenalty, integration:integrationScore, migration:migrationScore, total:total, band:band};
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

  if (title) title.textContent = ind + " transformation decision brief";
  if (sub) sub.textContent = "Business model: " + model + " | Current platform: " + platform;
  if (scoreEl) scoreEl.textContent = score;
  if (interpretation) interpretation.textContent = "This is a discovery signal, not a procurement recommendation. Validate the shortlisted options against your detailed requirements.";
  if (summary) summary.innerHTML = "<section class='executive-decision'><div class='eyebrow'>EXECUTIVE DECISION SUMMARY</div><h3>What should this customer decide next?</h3><p>" + escapeHtml(buildDecisionNarrative(ind, model, platform, scale, migration, candidates, decisionScores, processes, pains)) + "</p><div class='decision-path'><span>1. Confirm business requirements</span><span>2. Challenge custom processes</span><span>3. Compare candidate ecosystems</span><span>4. Validate with evidence and POC</span><span>5. Build the business case</span></div><div class='decision-questions'><b>Before selecting an application, answer:</b><ul><li>Do we actually need to replace the ERP?</li><li>Which processes should become standard SaaS processes?</li><li>Which custom processes genuinely differentiate the business?</li><li>Which capabilities belong in ERP versus specialist applications?</li><li>What evidence and POC results are required before committing?</li></ul></div></section>";
  if (contextLabel) contextLabel.textContent = "Assessment context";
  if (context) context.innerHTML = "<b>" + escapeHtml(ind) + " / " + escapeHtml(model) + "</b><p>Scale: " + escapeHtml(scale) + "</p><p>Customisation: " + escapeHtml(custom) + " | Integration: " + escapeHtml(integration) + "</p><p>Transformation appetite: " + escapeHtml(migration) + "</p>";
  if (capCount) capCount.textContent = processes.length + " selected";
  if (caps) caps.innerHTML = processes.length ? processes.map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") : "<li>No specific processes selected yet.</li>";
  if (kpis) kpis.innerHTML = "<article><b>" + processes.length + "</b><span>process areas</span></article><article><b>" + pains.length + "</b><span>pain areas</span></article><article><b>" + candidates.length + "</b><span>ecosystems assessed</span></article><article><b>" + candidates.slice(0,3).join(" / ") + "</b><span>priority investigation set</span></article>";
  var customProcesses = value("customProcesses") || value("custom") || "None provided";
  var customProcessText = customProcesses && customProcesses !== "None provided" ? customProcesses : "No custom process supplied";
  function treatmentFor(app) {
    if (customProcessText === "No custom process supplied") return "No custom process provided";
    var c = candidateMeta[app];
    if (platform.toLowerCase().indexOf(app.toLowerCase()) >= 0) return "Retain / modernise candidate";
    if (c.fit.indexOf(ind) >= 0 && custom === "Low") return "Standard / configure first";
    if (c.fit.indexOf(ind) >= 0) return "Configure / extend only if justified";
    return "Specialist or third-party assessment";
  }
  var requirementRows = processes.map(function (p) {
    return candidates.slice(0,4).map(function (app) {
      var d = candidateDecision(app, 0);
      var treatment = treatmentFor(app);
      var gap = d.fit >= 5 && d.integration >= 4 ? "Low-to-moderate validation gap" : "Requirement evidence required";
      var value = d.fit >= 5 ? "High potential" : "Needs validation";
      return {process:p, app:app, fit:d.band, gap:gap, treatment:treatment, value:value, evidence:"Scripted demo + industry reference + architecture/security evidence", poc:"Demonstrate " + p + " with normal flow, exception, approval and integration scenario."};
    });
  }).flat();
  if (matrix) matrix.innerHTML = requirementRows.map(function (row) {
    return "<div class='requirement-block'><h4>" + escapeHtml(row.process) + " - " + escapeHtml(row.app) + "</h4><table><tbody><tr><th>Fit</th><td>" + escapeHtml(row.fit) + "</td><th>Gap</th><td>" + escapeHtml(row.gap) + "</td></tr><tr><th>Treatment</th><td>" + escapeHtml(row.treatment) + "</td><th>Value</th><td>" + escapeHtml(row.value) + "</td></tr><tr><th>Evidence</th><td colspan='3'>" + escapeHtml(row.evidence) + "</td></tr><tr><th>POC</th><td colspan='3'>" + escapeHtml(row.poc) + "</td></tr></tbody></table></div>";
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
  if (val) val.innerHTML = "<p>Validate value with a baseline covering operating cost, cycle time, error rate, working capital, revenue leakage and user effort before selecting a platform.</p>";
  if (evidence) evidence.innerHTML = "<ul><li>Require relevant industry customer references.</li><li>Require scripted demonstrations using your processes.</li><li>Require architecture, security and integration evidence.</li><li>Require a transparent implementation and five-year TCO model.</li></ul>";
  if (questions) questions.innerHTML = "<ol><li>Show our highest-value end-to-end process using standard capability.</li><li>Which requirements require configuration, extension or third-party products?</li><li>What happens to our current customisations and integrations?</li><li>Provide comparable industry references and measurable outcomes.</li><li>Demonstrate identity, audit, resilience and required compliance controls.</li></ol>";
  if (roadmap) roadmap.innerHTML = "<article><span>0-30 days</span><b>Baseline</b><p>Confirm process, data, integrations, customisations and value baseline.</p></article><article><span>31-60 days</span><b>Prove fit</b><p>Run scripted demonstrations and fit-gap assessment.</p></article><article><span>61-90 days</span><b>Compare</b><p>Validate POC, TCO, migration and partner evidence.</p></article>";
  if (candidatesBox) candidatesBox.innerHTML = decisionScores.map(function(x){
    var m=candidateMeta[x.name];
    return "<article class='decision-card'><div><b>" + x.name + "</b><strong>" + x.d.band + "</strong></div><p>Industry fit " + x.d.fit + "/5 · Scale " + x.d.scale + "/5 · Continuity " + x.d.continuity + "/5 · Integration " + x.d.integration + "/5 · Migration " + x.d.migration + "/5</p><p><b>Why investigate:</b> " + escapeHtml(m.reason) + "</p><p><b>Evidence gate:</b> " + escapeHtml(m.evidence) + "</p><small>Signal " + x.d.total + "/30 — not a vendor ranking or purchase recommendation.</small></article>";
  }).join(""); if (candidatesBox) candidatesBox.innerHTML = candidates.map(function (x) { return "<article><b>" + x + "</b><p>Candidate ecosystem to investigate against your selected " + escapeHtml(ind) + " requirements.</p></article>"; }).join("");
  if (explore) explore.innerHTML = candidates.map(function (x,i) {
  var m=candidateMeta[x];
  var fit=m.fit.indexOf(ind)>=0 ? "Industry alignment signal" : "Broader ecosystem to validate";
  return "<article class='explore-card'><div class='explore-head'><span>" + (i < 2 ? "PRIMARY FIT TO EXPLORE" : "COMPARISON OPTION") + "</span><b>" + x + "</b><strong>" + fit + "</strong></div><p><b>Why explore:</b> " + escapeHtml(m.reason) + "</p><p><b>Key proof:</b> " + escapeHtml(m.proof) + "</p><p><b>Security:</b> Validate identity, roles, segregation of duties, audit, resilience, data residency and industry controls.</p><p><b>Migration:</b> Map data, integrations, customisations and coexistence waves before estimating effort.</p><p><b>Evidence:</b> " + escapeHtml(m.evidence) + "</p><p><b>Vendor POC:</b> Script the priority process using the customer's data, exceptions and controls.</p><p><a href='" + m.url + "' target='_blank' rel='noopener'>Official product evidence -&gt;</a></p></article>";
}).join("");
  if (architecture) architecture.innerHTML = "<p><b>Current:</b> " + escapeHtml(platform) + "</p><p><b>Target hypothesis:</b> SaaS core platform + industry capabilities + governed integrations + common data/identity layer.</p>";
  var results = document.getElementById("transformResults");
  if (results) {
    results.classList.remove("hidden");
    results.scrollIntoView({behavior:"smooth"});
  }
  try { sessionStorage.setItem("automationscan_transform", JSON.stringify({industry:ind,businessModel:model,current:platform,processes:processes,pains:pains})); } catch (e) {}
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
  if (!win) { window.print(); return; }
  win.document.write("<!doctype html><html><head><title>AutomationScan Transformation Decision Report</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#17242b}article{break-inside:avoid} @media print{button{display:none}}</style></head><body>" + report.outerHTML + "</body></html>");
  win.document.close();
  win.focus();
  setTimeout(function(){win.print();},300);
});
var print = document.getElementById("tPrint");
if (print) print.addEventListener("click", function () { window.print(); });

showStep(0);
populateBusinessModels();
})();