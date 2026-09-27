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

function renderReport() {
  var ind = value("industry") || "Other";
  var model = value("businessModel") || "Not specified";
  var platform = value("current") || "Not specified";
  var processes = checked("process");
  var pains = checked("pain");
  var scale = value("scale") || "Not specified";
  var custom = value("custom") || "Low";
  var integration = value("integration") || "Low";
  var migration = value("migration") || "Balanced";
  var candidates = ["Oracle","SAP","Microsoft Dynamics","Infor","NetSuite","IFS"];
  var score = Math.min(96, 55 + processes.length * 3 + pains.length * 2 + (platform !== "Not specified" ? 8 : 0));

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
  if (summary) summary.innerHTML = "<p>Your assessment describes a " + escapeHtml(ind) + " organisation operating as " + escapeHtml(model) + " with " + escapeHtml(platform) + " as the current platform. The next decision is whether to stay, modernise, replace, or complement the current ecosystem.</p>";
  if (contextLabel) contextLabel.textContent = "Assessment context";
  if (context) context.innerHTML = "<b>" + escapeHtml(ind) + " / " + escapeHtml(model) + "</b><p>Scale: " + escapeHtml(scale) + "</p><p>Customisation: " + escapeHtml(custom) + " | Integration: " + escapeHtml(integration) + "</p><p>Transformation appetite: " + escapeHtml(migration) + "</p>";
  if (capCount) capCount.textContent = processes.length + " selected";
  if (caps) caps.innerHTML = processes.length ? processes.map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") : "<li>No specific processes selected yet.</li>";
  if (kpis) kpis.innerHTML = "<article><b>" + processes.length + "</b><span>process areas</span></article><article><b>" + pains.length + "</b><span>pain areas</span></article><article><b>" + candidates.length + "</b><span>ecosystems to explore</span></article>";
  if (opportunities) opportunities.innerHTML = "<ul><li>Standardise high-friction processes before replacing them.</li><li>Map integrations and customisations before committing to migration.</li><li>Separate core ERP needs from specialist industry applications.</li></ul>";
  if (need) need.innerHTML = "<p>Do not assume ERP replacement is necessary. Compare three scenarios: modernise the current platform, replace the core ERP, or simplify the application landscape with SaaS and specialist products.</p>";
  if (approach) approach.innerHTML = "<p>Use a fit-to-standard first approach. Preserve differentiating industry capabilities and challenge customisations that do not create measurable business value.</p>";
  if (savings) savings.innerHTML = "<ul><li>Retire unused customisations.</li><li>Reduce duplicate applications and interfaces.</li><li>Clean data before migration rather than carrying historical complexity forward.</li></ul>";
  if (future) future.innerHTML = "<ul><li>Lower operational friction</li><li>Improved business visibility</li><li>Scalable SaaS operating model</li><li>Better data and AI readiness</li></ul>";
  if (tradeoffs) tradeoffs.innerHTML = "<p>Current-platform modernisation may reduce change risk; replacement may provide greater process redesign potential but usually creates greater migration and change impact. Best-of-breed can improve specialist capability while increasing integration complexity.</p>";
  if (risks) risks.innerHTML = "<ul><li>Incomplete requirements</li><li>Data quality and migration effort</li><li>Integration dependencies</li><li>Over-customisation</li><li>Change-management capacity</li></ul>";
  if (val) val.innerHTML = "<p>Validate value with a baseline covering operating cost, cycle time, error rate, working capital, revenue leakage and user effort before selecting a platform.</p>";
  if (evidence) evidence.innerHTML = "<ul><li>Require relevant industry customer references.</li><li>Require scripted demonstrations using your processes.</li><li>Require architecture, security and integration evidence.</li><li>Require a transparent implementation and five-year TCO model.</li></ul>";
  if (questions) questions.innerHTML = "<ol><li>Show our highest-value end-to-end process using standard capability.</li><li>Which requirements require configuration, extension or third-party products?</li><li>What happens to our current customisations and integrations?</li><li>Provide comparable industry references and measurable outcomes.</li><li>Demonstrate identity, audit, resilience and required compliance controls.</li></ol>";
  if (roadmap) roadmap.innerHTML = "<article><span>0-30 days</span><b>Baseline</b><p>Confirm process, data, integrations, customisations and value baseline.</p></article><article><span>31-60 days</span><b>Prove fit</b><p>Run scripted demonstrations and fit-gap assessment.</p></article><article><span>61-90 days</span><b>Compare</b><p>Validate POC, TCO, migration and partner evidence.</p></article>";
  if (candidatesBox) candidatesBox.innerHTML = candidates.map(function (x) { return "<article><b>" + x + "</b><p>Candidate ecosystem to investigate against your selected " + escapeHtml(ind) + " requirements.</p></article>"; }).join("");
  if (explore) explore.innerHTML = candidates.slice(0,4).map(function (x,i) { return "<article class='explore-card'><div class='explore-head'><span>" + (i < 2 ? "SHORTLIST" : "ALTERNATIVE") + "</span><b>" + x + "</b><strong>Investigate</strong></div><p><b>Industry fit:</b> Validate " + escapeHtml(ind) + " capability coverage.</p><p><b>Security:</b> Validate identity, audit, data residency and regulatory controls.</p><p><b>Migration:</b> Map data, integrations and current customisations.</p><p><b>Evidence:</b> Require comparable customer references and scripted demos.</p><p><b>POC:</b> Demonstrate the most critical end-to-end business process.</p></article>"; }).join("");
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
var print = document.getElementById("tPrint");
if (print) print.addEventListener("click", function () { window.print(); });

showStep(0);
populateBusinessModels();
})();