const form=document.getElementById("scanForm");
const steps=[...document.querySelectorAll(".step")];
const next=document.getElementById("next"),back=document.getElementById("back"),submit=document.getElementById("submit");
let current=0;

function show(i){current=i;steps.forEach((s,n)=>s.classList.toggle("active",n===i));document.getElementById("progressText").textContent="Step "+(i+1)+" of "+steps.length;document.getElementById("progressBar").style.width=((i+1)/steps.length*100)+"%";back.hidden=i===0;next.hidden=i===steps.length-1;submit.hidden=i!==steps.length-1}
function valid(){for(const f of steps[current].querySelectorAll("[required]")){if(!f.checkValidity()){f.reportValidity();return false}}return true}
next.onclick=()=>valid()&&show(Math.min(current+1,steps.length-1));
back.onclick=()=>show(Math.max(current-1,0));
const n=k=>Number(form.elements[k]?.value||0);

function calc(){
 const h={"Data entry":n("dataEntry"),"Email / follow-ups":n("email"),"Invoices / payments":n("invoices"),"Customer support":n("support"),Scheduling:n("scheduling"),Reporting:n("reporting"),"Documents / admin":n("documents"),"Sales admin / CRM":n("salesAdmin")};
 const total=Object.values(h).reduce((a,b)=>a+b,0);
 const copy={Rarely:0,Sometimes:5,Often:12,Constantly:20}[form.elements.copyPaste.value]||0;
 const rep={Low:0,Medium:6,High:12,"Very high":18}[form.elements.repetition.value]||0;
 const emp=n("employees");
 let score=Math.round(Math.min(100,12+Math.min(45,total*1.6)+copy+rep+Math.min(15,emp/8)));
 if(!total)score=Math.min(score,42);
 const pain=(form.elements.pain.value||"").toLowerCase();
 const signals=[["copy|paste|re-enter|retype",6],["excel|spreadsheet|csv",5],["email|inbox|follow-up|remind",5],["invoice|bill|payment|receipt",5],["crm|lead|pipeline",5],["schedule|appointment|calendar|booking",5],["support|ticket|faq|question",5],["report|dashboard|monthly|weekly",5]];
 let textPoints=0;signals.forEach(([rx,p])=>{if(new RegExp(rx).test(pain))textPoints+=p});
 score=Math.min(100,score+Math.min(18,textPoints));
 const monthly=Math.min(total,total*.45+copy/8+rep/8+textPoints/8)*4.33;
 const low=Math.max(2,Math.round(monthly*.65)),high=Math.max(low+2,Math.round(monthly*1.15));
 const tools=[...form.querySelectorAll('input[name="tools"]:checked')].map(x=>x.value);
 const textPointsCapped=Math.min(18,textPoints); const coverage=Math.round(((Object.values(h).filter(x=>x>0).length/8)+(pain.length>20?1:0)+(tools.length?1:0))/3*100);
 return {h,total,copy,rep,emp,textPoints:textPointsCapped,score,low,high,label:score>=75?"High opportunity signal":score>=55?"Moderate opportunity signal":"Early opportunity signal",industry:form.elements.industry.value,goal:form.elements.goal.value,pain,tools,coverage};
}
const ideas={"Data entry":"data capture and document workflows","Email / follow-ups":"email triage and follow-up sequences","Invoices / payments":"invoice extraction, matching and approval workflows","Customer support":"FAQ, ticket routing and response assistance","Scheduling":"online scheduling and reminders","Reporting":"automated reports and exception alerts","Documents / admin":"document generation, approvals and filing","Sales admin / CRM":"lead capture, enrichment and CRM follow-ups"};

function buildReport(){
 const r=calc();
 const top=Object.entries(r.h).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,6);
 return {r,top};
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function renderAnalysis(r,top){
 const rows=Object.entries(r.h).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
 const total=Math.max(r.total,0.01);
 const max=Math.max(...rows.map(x=>x[1]),1);
 document.getElementById("workloadTotal").textContent=r.total+" hrs/week";
 document.getElementById("scoreCoverage").textContent=r.coverage+"% input coverage";
 document.getElementById("workloadChart").innerHTML=rows.length?rows.map(([name,h])=>{
   const pct=Math.round(h/total*100);
   return '<div class="bar-row"><div class="bar-label"><span>'+escapeHtml(name)+'</span><b>'+h+'h · '+pct+'%</b></div><div class="bar-track"><i style="width:'+Math.max(4,h/max*100)+'%"></i></div></div>';
 }).join(""):'<p class="analysis-empty">No weekly hours were entered. Run the scan again with rough estimates.</p>';
 const scoreParts=[
   ["Weekly workload",Math.min(45,Math.round(Math.min(45,r.total*1.6))),45],
   ["Copy / paste friction",r.copy,20],
   ["Repetition level",r.rep,18],
   ["Team-size signal",Math.min(15,Math.round(r.emp/8)),15],
   ["Text signals",Math.min(18,r.textPoints||0),18]
 ];
 document.getElementById("scoreBreakdown").innerHTML=scoreParts.map(x=>'<div class="break-row"><div><span>'+x[0]+'</span><b>'+x[1]+' pts</b></div><div class="break-track"><i style="width:'+Math.min(100,x[1]/x[2]*100)+'%"></i></div></div>').join("");
 const monthlyHours=(r.low+r.high)/2;
 const annual=Math.round(monthlyHours*12);
 const concentration=rows.length?Math.round(rows.slice(0,3).reduce((a,x)=>a+x[1],0)/total*100):0;
 const metrics=[
   ["Weekly repeat work",r.total+" hrs","Entered across 8 categories"],
   ["Monthly range",r.low+"–"+r.high+" hrs","Directional investigation range"],
   ["Annualized range",Math.round(r.low*12)+"–"+Math.round(r.high*12)+" hrs","Simple 12-month view"],
   ["Top-3 concentration",concentration+"%","Share of entered weekly hours"]
 ];
 document.getElementById("analysisMetrics").innerHTML=metrics.map(x=>'<div class="analysis-metric"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><span>'+x[2]+'</span></div>').join("");
 document.getElementById("analysisTable").innerHTML=rows.length?rows.slice(0,6).map(([name,h],i)=>{
   const pct=Math.round(h/total*100);
   return '<div class="analysis-row"><span class="rank">0'+(i+1)+'</span><strong>'+escapeHtml(name)+'</strong><span>'+h+' hrs/wk</span><b>'+pct+'%</b><em>'+escapeHtml(ideas[name])+'</em></div>';
 }).join(""):'<div class="analysis-row"><span>No workload categories entered yet.</span></div>';
}
function renderResult(){
 const {r,top}=buildReport();
 renderAnalysis(r,top);
 document.getElementById("score").textContent=r.score;
 document.getElementById("label").textContent=r.label;
 document.getElementById("range").textContent=r.low+"-"+r.high+" hours/month";
 document.getElementById("sub").textContent="Based on your "+r.industry+" business inputs.";
 document.getElementById("reportMeta").textContent="Input coverage: "+r.coverage+"% · Goal: "+r.goal+" · Tools selected: "+r.tools.length;
 document.getElementById("scanSummary").value=JSON.stringify({score:r.score,label:r.label,estimatedHours:r.low+"-"+r.high+"/month",industry:r.industry,goal:r.goal,topOpportunities:top.map(x=>x[0]),coverage:r.coverage});
 document.getElementById("opportunities").innerHTML=top.length?top.map((x,i)=>'<article class="opp"><span class="tag">PRIORITY '+(i+1)+'</span><h3>'+escapeHtml(x[0])+'</h3><p><strong>'+x[1]+' hrs/week</strong> entered · <b>'+Math.round(x[1]/Math.max(r.total,0.01)*100)+'%</b> of entered workload. Investigate '+escapeHtml(ideas[x[0]])+' first.</p></article>').join(""):'<article class="opp"><span class="tag">START HERE</span><h3>Measure recurring work</h3><p>Track one week of repeat admin and run the assessment again.</p></article>';
 document.getElementById("results").classList.remove("hidden");
 document.getElementById("results").scrollIntoView({behavior:"smooth"});
 submitLeadIfConsented(r,top);
}

form.addEventListener("submit",e=>{
 e.preventDefault();
 try{
  if(!valid())return;
  renderResult();
 }catch(err){
  console.error("AutomationScan report generation failed:",err);
  const status=document.getElementById("saveStatus");
  if(status)status.textContent="We couldn't generate the report. Please refresh the page and try again.";
 }
});

function reportData(){
 const {r,top}=buildReport();
 return {r,top,date:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})};
}
function drawPdf(){
 if(!window.jspdf){document.getElementById("saveStatus").textContent="PDF library is still loading. Please try again.";return}
 const {jsPDF}=window.jspdf,{r,top,date}=reportData(),doc=new jsPDF({unit:"pt",format:"a4"}); const T=(txt,x,y,opt)=>doc.text(String(txt==null?"":txt),Number(x),Number(y),opt||{});
 const navy=[20,37,45],teal=[23,107,112],copper=[182,111,77],paper=[247,244,237],muted=[104,119,125],ink=[32,50,58],line=[220,218,211];
 const W=595,H=842,margin=46,contentW=W-margin*2;
 const header=()=>{doc.setFillColor(...navy);doc.rect(0,0,W,82,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(18);T("Automation",margin,37);doc.setTextColor(184,214,208);T("Scan",margin+88,37);doc.setFontSize(8);doc.setTextColor(190,205,204);T("BUSINESS AUTOMATION ASSESSMENT",margin,55);doc.setDrawColor(...copper);doc.setLineWidth(2);doc.line(margin,68,W-margin,68)};
 const footer=()=>{doc.setDrawColor(...line);doc.setLineWidth(.5);doc.line(margin,H-40,W-margin,H-40);doc.setTextColor(...muted);doc.setFont("helvetica","normal");doc.setFontSize(7);T("AutomationScan · Directional assessment · Validate actual process and economics before investing.",margin,H-24);T(String(doc.getNumberOfPages()),W-margin,H-24,{align:"right"})};
 const title=(k,t)=>{doc.setTextColor(...copper);doc.setFont("helvetica","bold");doc.setFontSize(7);T(k,margin,t);doc.setTextColor(...ink);doc.setFont("times","normal");doc.setFontSize(24);T(t,margin,t+31);};
 const bar=(x,y,w,h,pct,color)=>{doc.setFillColor(232,231,226);doc.roundedRect(x,y,w,h,3,3,"F");doc.setFillColor(...color);doc.roundedRect(x,y,Math.max(3,w*Math.max(0,Math.min(1,pct))),h,3,3,"F")};
 const rows=Object.entries(r.h).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]),total=Math.max(r.total,.01),max=Math.max(...rows.map(x=>x[1]),1);
 header();
 doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(8);T("ASSESSMENT REPORT",margin,110);doc.setTextColor(...muted);doc.setFont("helvetica","normal");T(date,W-margin,110,{align:"right"});
 doc.setFont("times","normal");doc.setFontSize(30);doc.setTextColor(...ink);T("Business Automation",margin,150);T("Visibility Report",margin,184);
 doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(...muted);T("Industry: "+r.industry,margin,211);T("Goal: "+r.goal,margin,226);
 doc.setFillColor(...paper);doc.roundedRect(margin,250,contentW,136,5,5,"F");doc.setFillColor(...navy);doc.roundedRect(margin,250,5,136,2,2,"F");
 doc.setTextColor(...muted);doc.setFont("helvetica","bold");doc.setFontSize(7);T("OPPORTUNITY SIGNAL",margin+20,274);doc.setTextColor(...ink);doc.setFontSize(50);T(String(r.score),margin+20,330);doc.setFontSize(10);doc.setTextColor(...muted);T("/ 100",margin+84,330);doc.setTextColor(...teal);T(r.label,margin+20,351);
 doc.setTextColor(...muted);doc.setFontSize(7);T("ESTIMATED WORK WORTH INVESTIGATING",margin+190,274);doc.setTextColor(...ink);doc.setFont("times","normal");doc.setFontSize(21);T(r.low+"–"+r.high+" hours/month",margin+190,306);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(...muted);T("Input coverage: "+r.coverage+"% · "+r.total+" hrs/week entered",margin+190,329);T("Directional estimate, not guaranteed savings.",margin+190,344);
 doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(11);T("Workload distribution",margin,421);doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(...muted);T("Each percentage is the category share of entered weekly hours.",margin,434);
 let y=454; rows.forEach(([name,h],i)=>{if(y>760){footer();doc.addPage();header();y=110}const pct=h/total;doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(8);T(name,margin,y);doc.setTextColor(...muted);doc.setFont("helvetica","normal");T(h+" hrs/wk · "+Math.round(pct*100)+"%",W-margin,y,{align:"right"});bar(margin,y+7,contentW,7,pct,i<3?teal:[130,151,127]);y+=31});
 footer();doc.addPage();header();title("ANALYSIS","Score & opportunity detail");
 const parts=[["Weekly workload",Math.min(45,Math.round(Math.min(45,r.total*1.6))),45],["Copy / paste friction",r.copy,20],["Repetition level",r.rep,18],["Team-size signal",Math.min(15,Math.round(r.emp/8)),15],["Text signals",Math.min(18,r.textPoints||0),18]];
 y=126;parts.forEach(p=>{doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(8);T(p[0],margin,y);doc.setTextColor(...muted);doc.setFont("helvetica","normal");T(p[1]+" pts",W-margin,y,{align:"right"});bar(margin,y+8,contentW,p[2]?8:8,p[1]/p[2],copper);y+=34});
 const monthlyMid=(r.low+r.high)/2,annualLow=Math.round(r.low*12),annualHigh=Math.round(r.high*12),concentration=rows.length?Math.round(rows.slice(0,3).reduce((a,x)=>a+x[1],0)/total*100):0;
 doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(11);T("Key metrics",margin,322);
 const metrics=[["Weekly repeat work",r.total+" hrs"],["Monthly range",r.low+"–"+r.high+" hrs"],["Annualized range",annualLow+"–"+annualHigh+" hrs"],["Top-3 concentration",concentration+"%"]];
 metrics.forEach((m,i)=>{const x=margin+(i%2)*(contentW/2), yy=345+Math.floor(i/2)*66;doc.setFillColor(...paper);doc.roundedRect(x,yy,contentW/2-8,51,4,4,"F");doc.setTextColor(...muted);doc.setFontSize(7);T(m[0].toUpperCase(),x+12,yy+17);doc.setTextColor(...ink);doc.setFont("times","normal");doc.setFontSize(18);T(m[1],x+12,yy+38)});
 doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(...ink);T("Priority analysis",margin,486);
 y=510;rows.slice(0,6).forEach((x,i)=>{if(y>750){footer();doc.addPage();header();y=110}const pct=Math.round(x[1]/total*100);doc.setFillColor(250,249,245);doc.roundedRect(margin,y,contentW,43,4,4,"F");doc.setTextColor(...copper);doc.setFont("helvetica","bold");doc.setFontSize(7);T("0"+(i+1),margin+11,y+18);doc.setTextColor(...ink);doc.setFontSize(8);T(x[0],margin+35,y+17);doc.setTextColor(...muted);doc.setFont("helvetica","normal");T(x[1]+" hrs/wk · "+pct+"%",margin+35,y+32);T("Investigate "+ideas[x[0]],margin+190,y+24);y+=50});
 footer();doc.save("AutomationScan-Detailed-Automation-Assessment.pdf");document.getElementById("saveStatus").textContent="Your detailed branded PDF report has been downloaded.";
};
const pdfButton=document.getElementById("downloadPdf"); if(pdfButton) pdfButton.addEventListener("click",()=>{try{drawPdf()}catch(err){console.error("PDF generation failed:",err);const s=document.getElementById("saveStatus");if(s)s.textContent="PDF generation failed. Your free report is still available above.";}});
const printButton=document.getElementById("print"); if(printButton) printButton.addEventListener("click",()=>window.print());

async function submitLeadIfConsented(r,top){
 const email=form.elements.emailAddress?.value?.trim(),consent=form.elements.consent?.checked;
 if(!email||!consent)return;
 try{
  const res=await fetch((window.AUTOMATIONSCAN_API_BASE||"")+"/api/lead",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,consent:true,report:{score:r.score,label:r.label,low:r.low,high:r.high,industry:r.industry,goal:r.goal,top:top.slice(0,3).map(x=>x[0]),coverage:r.coverage}})});
  document.getElementById("saveStatus").textContent=res.ok?"Report generated; email request submitted.":"Report generated locally; email delivery is not configured yet.";
 }catch{document.getElementById("saveStatus").textContent="Report generated locally."}
}

const demos={
 accounting:{name:"Accounting firm",meta:"12-person practice · B2B · monthly client reporting",score:84,hours:"64-92",headline:"Invoice processing and client reporting are absorbing the most repeat effort.",areas:[["Invoices / payments","18 hrs/week","Document extraction + approval workflow"],["Reporting","11 hrs/week","Scheduled report generation + delivery"],["Email / follow-ups","8 hrs/week","Reminder sequences + exception handling"]],next:"Start with invoice intake because it touches finance, documents and approvals."},
 clinic:{name:"Healthcare clinic",meta:"8-person clinic · B2C · appointment-heavy",score:76,hours:"42-61",headline:"Scheduling and reminders are creating avoidable administrative load.",areas:[["Scheduling","14 hrs/week","Self-service booking + reminders"],["Customer support","8 hrs/week","FAQ and message triage"],["Documents / admin","7 hrs/week","Digital forms + document routing"]],next:"Start with scheduling and reminders; keep clinical decisions outside automation."},
 realestate:{name:"Real estate team",meta:"15-person team · mixed clients · lead-driven",score:81,hours:"49-70",headline:"Lead follow-up and CRM updates are competing with time spent selling.",areas:[["Sales admin / CRM","13 hrs/week","Lead capture + CRM enrichment"],["Email / follow-ups","10 hrs/week","Task-based follow-up sequences"],["Documents / admin","6 hrs/week","Template-driven document preparation"]],next:"Start with lead capture and follow-up consistency before adding more tools."},
 ecommerce:{name:"E-commerce business",meta:"22-person operation · B2C · multi-channel",score:79,hours:"55-79",headline:"Order support, reporting and data movement are the biggest repeat-work signals.",areas:[["Customer support","15 hrs/week","FAQ automation + ticket routing"],["Data entry","12 hrs/week","Order and inventory data sync"],["Reporting","8 hrs/week","Automated daily/weekly dashboards"]],next:"Start with support triage and repetitive order questions."},
 logistics:{name:"Logistics company",meta:"35-person operation · B2B · document-heavy",score:88,hours:"71-103",headline:"Documents and status updates create a large coordination burden.",areas:[["Documents / admin","22 hrs/week","Document capture + workflow routing"],["Data entry","16 hrs/week","System-to-system data transfer"],["Email / follow-ups","9 hrs/week","Exception alerts + customer updates"]],next:"Start with document intake and status-event workflows; preserve human review for exceptions."},
 agency:{name:"Professional services",meta:"10-person agency · project-based · B2B",score:68,hours:"34-49",headline:"Recurring reporting and client communication are taking time away from delivery.",areas:[["Reporting","9 hrs/week","Reusable report generation"],["Email / follow-ups","7 hrs/week","Client update workflows"],["Documents / admin","5 hrs/week","Templates and approval steps"]],next:"Start with recurring reports where inputs and outputs are already structured."}
};
function renderDemo(key){
 const d=demos[key]||demos.accounting;
 document.getElementById("demoPanel").innerHTML='<div class="demo-top"><div><span class="demo-kicker">ILLUSTRATIVE SCAN</span><h3>'+d.name+'</h3><p>'+d.meta+'</p></div><div class="demo-score"><strong>'+d.score+'</strong><span>/100</span></div></div><div class="demo-headline">'+d.headline+'</div><div class="demo-hours"><span>Estimated work worth investigating</span><strong>'+d.hours+' hrs/month</strong></div><div class="demo-areas">'+d.areas.map((x,i)=>'<div class="demo-area"><small>PRIORITY '+(i+1)+'</small><b>'+x[0]+'</b><span>'+x[1]+'</span><p>'+x[2]+'</p></div>').join("")+'</div><div class="demo-next"><b>What the output suggests</b><span>'+d.next+'</span></div>';
}
document.querySelectorAll(".demo-tab").forEach(t=>t.addEventListener("click",()=>{document.querySelectorAll(".demo-tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");renderDemo(t.dataset.demo)}));
renderDemo("accounting");
show(0);
