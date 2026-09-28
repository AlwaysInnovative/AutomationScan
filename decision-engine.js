(function(){
"use strict";
var I=window.AutomationScanIntelligence||{};
function norm(v){return String(v||"").toLowerCase();}
function uniq(a){return Array.from(new Set(a||[]));}
function match(text,term){
 var t=norm(text), q=norm(term);
 if(!q)return false;
 if(t.indexOf(q)>=0||q.indexOf(t)>=0)return true;
 var aliases={
  finance:["financial","accounting","accounts payable","accounts receivable","ledger","controlling"],
  procurement:["purchasing","sourcing","source to pay"],
  supply:["supply chain","logistics","distribution","fulfilment","fulfillment"],
  inventory:["stock","warehouse inventory"],
  planning:["demand planning","supply planning","forecast"],
  manufacturing:["production","mrp","shop floor"],
  projects:["project accounting","project management"],
  service:["field service","after-sales","after sales"],
  compliance:["quality","regulatory","audit","controls"],
  customer:["crm","customer service","order management"]
 };
 return (aliases[q]||[]).some(function(x){return t.indexOf(x)>=0;});
}
function candidateScore(c,ctx){
 var fit=(c.industries||c.fit||[]).some(function(x){return norm(x)===norm(ctx.industry);});
 var processHits=(ctx.processes||[]).filter(function(p){return (c.caps||[]).some(function(cap){return match(p,cap);});});
 var painHits=(ctx.pains||[]).filter(function(p){return (c.caps||[]).some(function(cap){return match(p,cap);});});
 var current=norm(ctx.current), continuity=current&&((c.name||"").toLowerCase().indexOf(current.split(" ")[0])>=0);
 var score=(fit?35:5)+Math.min(25,processHits.length*5)+Math.min(15,painHits.length*3)+(continuity?15:0);
 if(ctx.scale==="Enterprise"&&/oracle|sap|dynamics|infor|ifs/.test(norm(c.name)))score+=5;
 if(ctx.custom==="Very high"&&/oracle|sap|dynamics|infor|ifs/.test(norm(c.name)))score+=5;
 return {score:Math.min(100,score),processHits:processHits,painHits:painHits,industryFit:fit,continuity:continuity};
}
function shortlist(ctx){
 var lib=I.candidates||{};
 return Object.keys(lib).map(function(name){
  var c=Object.assign({name:name},lib[name]);
  var d=candidateScore(c,ctx); d.name=name; d.meta=c; return d;
 }).sort(function(a,b){return b.score-a.score;});
}
function weightedScore(rows,weights){
 var total=0,w=0;
 rows.forEach(function(r){var x=Math.max(0,Math.min(100,Number(r.score)||0)),wt=Number(weights&&weights[r.key])||1;total+=x*wt;w+=wt;});
 return w?Math.round(total/w):0;
}
function tco(input){
 var cur=(+input.licence||0)+(+input.support||0)+(+input.infrastructure||0)+(+input.internal||0);
 var fut=(+input.futureSubscription||0)+(+input.futureServices||0)+(+input.futureInfrastructure||0);
 var one=(+input.implementation||0)+(+input.migration||0)+(+input.change||0);
 var years=Number(input.years)||5;
 return {currentAnnual:cur,futureAnnual:fut,oneTime:one,currentTotal:cur*years,futureTotal:fut*years+one,delta:(cur*years)-(fut*years+one),years:years};
}
function maturity(ctx){
 var points=0;
 points+=Math.min(25,(ctx.processes||[]).length*3);
 points+=Math.min(20,(ctx.pains||[]).length*3);
 if(ctx.current&&ctx.current!=="Not specified")points+=15;
 if(ctx.integration&&/high|very high/i.test(ctx.integration))points+=5;
 if(ctx.custom&&/high|very high/i.test(ctx.custom))points+=5;
 if(ctx.goals&&ctx.goals.length)points+=10;
 if(ctx.revenueModel&&ctx.revenueModel!=="Mixed")points+=5;
 var level=points<25?1:points<45?2:points<65?3:points<82?4:5;
 return {level:level,name:(I.maturityLevels&&I.maturityLevels[level-1]?I.maturityLevels[level-1].name:"Discovery"),points:points};
}
function portfolio(ctx){
 return (ctx.applications||[]).map(function(a){
  var text=norm(a), state="Assess";
  if(ctx.current&&text===norm(ctx.current))state="Keep / modernise";
  else if(/duplicate|legacy|retire/.test(text))state="Rationalise";
  return {application:a,state:state,reason:state==="Keep / modernise"?"Current baseline; prove value before replacement.":"Validate business value, overlap, integration and retirement cost."};
 });
}
function evidence(ctx,short){
 return [
  {gate:"Business requirement",status:(ctx.processes||[]).length?"Defined":"Missing",proof:"Signed process baseline and measurable KPI"},
  {gate:"Industry fit",status:short.length&&short[0].meta.industries&&short[0].meta.industries.some(function(x){return norm(x)===norm(ctx.industry);})?"Signal":"Validate",proof:"Comparable customer reference + scripted demonstration"},
  {gate:"Integration",status:ctx.integration||"Unknown",proof:"Interface inventory, API/event proof and monitoring design"},
  {gate:"Data",status:"Validate",proof:"Data-quality profile, migration rehearsal and reconciliation"},
  {gate:"Security & compliance",status:ctx.regulatoryIntensity||"Unknown",proof:"Architecture, access controls, audit, residency and applicable controls"},
  {gate:"Economics",status:ctx.erpSpend&&ctx.erpSpend!=="Unknown"?"Baseline supplied":"Missing baseline",proof:"Five-year TCO and business-case assumptions"},
  {gate:"Change readiness",status:ctx.migration||"Unknown",proof:"Change impact, adoption plan, ownership and training evidence"}
 ];
}
function rfp(ctx,short){
 var names=short.slice(0,5).map(function(x){return x.name;});
 return {
  title:"AutomationScan structured RFP/RFI pack",
  sections:[
   "Business context: "+ctx.industry+" / "+ctx.businessModel,
   "Operating model: "+ctx.revenueModel+" / "+ctx.fulfilmentModel+" / "+ctx.deliveryModel,
   "Current baseline: "+ctx.current,
   "Priority processes: "+((ctx.processes||[]).join(", ")||"Not specified"),
   "Pain signals: "+((ctx.pains||[]).join(", ")||"Not specified"),
   "Transformation scenarios: Stay / Optimise; Modernise / Extend; Complement; Replace",
   "Shortlist for investigation: "+(names.join(", ")||"Build after requirements baseline"),
   "Required evidence: scripted demo, real exception, integration proof, security/compliance, migration rehearsal, references and five-year TCO"
  ]
 };
}
function poc(ctx,short){
 return short.slice(0,5).map(function(x){
  return {candidate:x.name,tests:[
   "Demonstrate "+(x.processHits[0]||ctx.processes[0]||"priority process")+" using the customer's real exception.",
   "Show configuration versus extension versus custom development.",
   "Demonstrate integration/API/event handling with the current ecosystem.",
   "Show security, audit, role/segregation and applicable regulatory controls.",
   "Provide comparable reference evidence and implementation/migration assumptions."
  ]};
 });
}
window.AutomationScanDecisionEngine={shortlist:shortlist,weightedScore:weightedScore,tco:tco,maturity:maturity,portfolio:portfolio,evidence:evidence,rfp:rfp,poc:poc};
})();