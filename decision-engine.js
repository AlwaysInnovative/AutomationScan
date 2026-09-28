(function(){
"use strict";
function norm(v){return String(v||"").toLowerCase().trim();}
function words(v){return norm(v).split(/[^a-z0-9]+/).filter(function(x){return x.length>2;});}
function overlap(a,b){
 var aa=words(a).filter(function(x){return b.some(function(y){return x===y;});});
 return Array.from(new Set(aa));
}
function candidateScore(c,ctx){
 var text=[c.name,c.scope,c.capabilities,c.notes].join(" ");
 var reqs=(ctx.requirements||[]).map(function(x){return x.text||x.name||x;});
 var procs=ctx.processes||[];
 var caps=ctx.capabilities||[];
 var reqHits=reqs.map(function(r){return overlap(r,text).length? r:null;}).filter(Boolean);
 var processHits=procs.map(function(p){return overlap(p,text).length? p:null;}).filter(Boolean);
 var capHits=caps.map(function(p){return overlap(p.name||p,text).length? (p.name||p):null;}).filter(Boolean);
 var evidence=(ctx.evidence||[]).filter(function(e){return norm(e.claim).indexOf(norm(c.name))>=0;});
 var score=0;
 score+=Math.min(35,reqHits.length*7);
 score+=Math.min(25,processHits.length*5);
 score+=Math.min(20,capHits.length*5);
 score+=Math.min(10,evidence.length*5);
 var gaps=Math.max(0,reqs.length-reqHits.length);
 var explanation=[];
 if(reqHits.length)explanation.push(reqHits.length+" requirement matches");
 if(processHits.length)explanation.push(processHits.length+" process matches");
 if(capHits.length)explanation.push(capHits.length+" capability matches");
 if(evidence.length)explanation.push(evidence.length+" linked evidence item(s)");
 if(!explanation.length)explanation.push("No recorded fit evidence yet");
 return {score:Math.min(100,score),processHits:processHits,requirementHits:reqHits,capabilityHits:capHits,evidenceCount:evidence.length,gaps:gaps,explanation:explanation};
}
function shortlist(ctx){
 return (ctx.candidates||[]).map(function(c){
   var d=candidateScore(c,ctx);d.name=c.name;d.meta=c;return d;
 }).sort(function(a,b){return b.score-a.score;});
}
function weightedScore(rows,weights){
 var total=0,w=0;(rows||[]).forEach(function(r){var x=Math.max(0,Math.min(100,Number(r.score)||0)),wt=Number(weights&&weights[r.key])||1;total+=x*wt;w+=wt;});return w?Math.round(total/w):0;
}
function tco(input){
 var years=Math.max(1,Number(input.years)||5);
 var curAnnual=["currentLicence","currentSupport","currentInfrastructure","currentInternal","currentExternal","currentUpgrade"].reduce(function(s,k){return s+(Number(input[k])||0)},0);
 var futureAnnual=["futureSubscription","futureSupport","futureInfrastructure","futureInternal","futureExternal","futureUpgrade"].reduce(function(s,k){return s+(Number(input[k])||0)},0);
 var oneTime=["implementation","migrationData","integration","testing","changeTraining","coexistence","decommissioning"].reduce(function(s,k){return s+(Number(input[k])||0)},0);
 var contingency=Math.max(0,Number(input.contingency)||0)/100;
 var currentTotal=curAnnual*years;
 var futureRecurring=futureAnnual*years;
 var futureTotal=(futureRecurring+oneTime)*(1+contingency);
 return {years:years,currentAnnual:curAnnual,futureAnnual:futureAnnual,oneTime:oneTime,currentTotal:currentTotal,futureRecurring:futureRecurring,futureTotal:futureTotal,delta:currentTotal-futureTotal};
}
function npv(cashflows,rate){
 var r=Math.max(-.99,Number(rate)||0)/100;
 return cashflows.reduce(function(s,v,i){return s+Number(v||0)/Math.pow(1+r,i)},0);
}
function maturity(ctx){
 var dimensions=(ctx.capabilities||[]).map(function(x){return Number(x.current)||0;}).filter(function(x){return isFinite(x);});
 var score=dimensions.length?Math.round(dimensions.reduce(function(a,b){return a+b},0)/dimensions.length):0;
 return {score:score,name:score<25?"Fragmented":score<45?"Standardising":score<65?"Integrated":score<82?"Optimised":"Intelligent / Adaptive"};
}
function portfolio(ctx){
 return (ctx.applications||[]).map(function(a){
  var w=ctx.weights||{value:1,tech:1,usage:1,redundancy:1,lifecycle:1,integration:1},risk=0;
  risk+=(a.value==="Low"||a.value==="Unknown"?2:0)*Number(w.value||1);
  risk+=(a.tech==="Legacy"||a.tech==="Fragile"?2:0)*Number(w.tech||1);
  risk+=(a.usage==="Low"||a.usage==="Unknown"?1:0)*Number(w.usage||1);
  risk+=(a.redundancy==="Duplicate"?2:a.redundancy==="Possible overlap"?1:0)*Number(w.redundancy||1);
  risk+=(a.lifecycle==="End of life"?2:a.lifecycle==="At risk"?1:0)*Number(w.lifecycle||1);
  risk+=(a.integration==="High"?1:0)*Number(w.integration||1);
  return {application:a,state:risk>=7?"Replace / consolidate":risk>=4?"Modernise / assess":risk>=2?"Watch / rationalise":"Keep / assess",risk:Math.round(risk*10)/10};
 });
}
function evidence(ctx,short){
 return [
  {gate:"Business requirement",status:(ctx.requirements||[]).length?"Defined":"Missing",proof:"Requirement, acceptance criterion and owner"},
  {gate:"Candidate fit",status:short&&short.some(function(x){return x.score>0;})?"Signal":"Missing",proof:"Customer-specific requirement mapping and demonstration"},
  {gate:"Integration",status:ctx.integration||"Unknown",proof:"Interface inventory, API/event proof and monitoring design"},
  {gate:"Data",status:"Validate",proof:"Data-quality profile, migration rehearsal and reconciliation"},
  {gate:"Security & compliance",status:ctx.regulatoryIntensity||"Unknown",proof:"Architecture, access controls, audit, residency and applicable controls"},
  {gate:"Economics",status:ctx.economics?"Baseline supplied":"Missing baseline",proof:"Five-year TCO and editable assumptions"},
  {gate:"Change readiness",status:ctx.migration?"Recorded":"Unknown",proof:"Change impact, adoption plan, ownership and training evidence"}
 ];
}
function rfp(ctx,short){
 return {title:"AutomationScan structured RFP/RFI pack",sections:[
  "Business context: "+(ctx.industry||"Customer-defined"),
  "Operating model: "+(ctx.businessModel||"Customer-defined"),
  "Current baseline: "+(ctx.current||"Not specified"),
  "Priority processes: "+((ctx.processes||[]).join(", ")||"Not specified"),
  "Requirements: "+((ctx.requirements||[]).map(function(x){return x.id+" - "+x.text}).join(" | ")||"Build requirements first"),
  "Candidates for investigation: "+((short||[]).map(function(x){return x.name}).join(", ")||"Add candidate records first"),
  "Required evidence: scripted demo, real exception, integration proof, security/compliance review, migration rehearsal, references and customer-specific TCO"
 ]};
}
function poc(ctx,short){
 return (short||[]).map(function(x){return {candidate:x.name,tests:[
 "Demonstrate the highest-priority customer requirement using the real process and exception.",
 "Show configuration versus extension versus custom development with evidence.",
 "Demonstrate integration/API/event handling against the recorded application landscape.",
 "Show security, audit, role/segregation and applicable control evidence.",
 "Record observed result, gap, owner and decision before treating the test as validated."
]};});
}
window.AutomationScanDecisionEngine={shortlist:shortlist,weightedScore:weightedScore,tco:tco,npv:npv,maturity:maturity,portfolio:portfolio,evidence:evidence,rfp:rfp,poc:poc};
})();