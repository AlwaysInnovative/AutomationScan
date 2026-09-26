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
 const coverage=Math.round(((Object.values(h).filter(x=>x>0).length/8)+(pain.length>20?1:0)+(tools.length?1:0))/3*100);
 return {h,total,copy,rep,emp,score,low,high,label:score>=75?"High opportunity signal":score>=55?"Moderate opportunity signal":"Early opportunity signal",industry:form.elements.industry.value,goal:form.elements.goal.value,pain,tools,coverage};
}
const ideas={"Data entry":"data capture and document workflows","Email / follow-ups":"email triage and follow-up sequences","Invoices / payments":"invoice extraction, matching and approval workflows","Customer support":"FAQ, ticket routing and response assistance","Scheduling":"online scheduling and reminders","Reporting":"automated reports and exception alerts","Documents / admin":"document generation, approvals and filing","Sales admin / CRM":"lead capture, enrichment and CRM follow-ups"};

function buildReport(){
 const r=calc();
 const top=Object.entries(r.h).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,6);
 return {r,top};
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function renderResult(){
 const {r,top}=buildReport();
 document.getElementById("score").textContent=r.score;
 document.getElementById("label").textContent=r.label;
 document.getElementById("range").textContent=r.low+"-"+r.high+" hours/month";
 document.getElementById("sub").textContent="Based on your "+r.industry+" business inputs.";
 document.getElementById("reportMeta").textContent="Input coverage: "+r.coverage+"% · Goal: "+r.goal+" · Tools selected: "+r.tools.length;
 document.getElementById("scanSummary").value=JSON.stringify({score:r.score,label:r.label,estimatedHours:r.low+"-"+r.high+"/month",industry:r.industry,goal:r.goal,topOpportunities:top.map(x=>x[0]),coverage:r.coverage});
 document.getElementById("opportunities").innerHTML=top.length?top.map((x,i)=>'<article class="opp"><span class="tag">PRIORITY '+(i+1)+'</span><h3>'+escapeHtml(x[0])+'</h3><p><strong>'+x[1]+' hrs/week</strong> entered. Investigate '+escapeHtml(ideas[x[0]])+' first.</p></article>').join(""):'<article class="opp"><span class="tag">START HERE</span><h3>Measure recurring work</h3><p>Track one week of repeat admin and run the assessment again.</p></article>';
 document.getElementById("results").classList.remove("hidden");
 document.getElementById("results").scrollIntoView({behavior:"smooth"});
 submitLeadIfConsented(r,top);
}

form.onsubmit=e=>{e.preventDefault();if(valid())renderResult()};

function reportData(){
 const {r,top}=buildReport();
 return {r,top,date:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})};
}
function drawPdf(){
 if(!window.jspdf){document.getElementById("saveStatus").textContent="PDF library is still loading. Please try again.";return}
 const {jsPDF}=window.jspdf, {r,top,date}=reportData(),doc=new jsPDF({unit:"pt",format:"a4"});
 const navy=[20,37,45],teal=[23,107,112],copper=[182,111,77],paper=[247,244,237],muted=[104,119,125],ink=[32,50,58];
 const W=595,H=842,margin=48;
 const pageHeader=()=>{doc.setFillColor(...navy);doc.rect(0,0,W,84,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text("Automation",margin,38);doc.setTextColor(184,214,208);doc.text("Scan",margin+89,38);doc.setFontSize(8);doc.setTextColor(190,205,204);doc.text("BUSINESS AUTOMATION ASSESSMENT",margin,57);doc.setDrawColor(...copper);doc.setLineWidth(2);doc.line(margin,70,W-margin,70)};
 const footer=()=>{doc.setDrawColor(220,218,211);doc.setLineWidth(.5);doc.line(margin,H-42,W-margin,H-42);doc.setTextColor(...muted);doc.setFontSize(7);doc.text("AutomationScan · Directional assessment · Validate actual process and economics before investing.",margin,H-25);doc.text(String(doc.getNumberOfPages()),W-margin,H-25,{align:"right"})};
 pageHeader();
 doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text("ASSESSMENT REPORT",margin,116);
 doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(...muted);doc.text(date,W-margin,116,{align:"right"});
 doc.setFont("times","normal");doc.setFontSize(30);doc.setTextColor(...ink);doc.text("Business Automation",margin,155);doc.text("Visibility Report",margin,190);
 doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(...muted);doc.text("Industry: "+r.industry,margin,218);doc.text("Goal: "+r.goal,margin,234);
 doc.setFillColor(...paper);doc.rect(margin,260,W-margin*2,145,"F");doc.setFillColor(...navy);doc.rect(margin,260,4,145,"F");
 doc.setTextColor(...muted);doc.setFont("helvetica","bold");doc.setFontSize(7);doc.text("OPPORTUNITY SIGNAL",margin+22,286);
 doc.setTextColor(...ink);doc.setFontSize(55);doc.text(String(r.score),margin+22,345);doc.setFontSize(11);doc.setTextColor(...muted);doc.text("/ 100",margin+89,345);
 doc.setTextColor(...teal);doc.setFontSize(10);doc.text(r.label,margin+22,366);
 doc.setTextColor(...muted);doc.setFontSize(8);doc.text("ESTIMATED WORK WORTH INVESTIGATING",margin+190,286);doc.setTextColor(...ink);doc.setFont("times","normal");doc.setFontSize(24);doc.text(r.low+"-"+r.high+" hours/month",margin+190,320);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(...muted);doc.text("This is a directional estimate based on the information entered.",margin+190,343);doc.text("It is not a guarantee of savings or a technical automation audit.",margin+190,357);
 doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("Priority areas",margin,440);
 let y=464;
 (top.length?top:[["Recurring work","Measure one week of repeat admin before investing."]]).forEach((x,i)=>{if(y>735){footer();doc.addPage();pageHeader();y=110}doc.setFillColor(250,249,245);doc.rect(margin,y,W-margin*2,47,"F");doc.setTextColor(...copper);doc.setFontSize(7);doc.text("0"+(i+1),margin+12,y+18);doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text(String(x[0]),margin+40,y+17);doc.setFont("helvetica","normal");doc.setTextColor(...muted);doc.setFontSize(8);doc.text(typeof x[1]==="number"?x[1]+" hrs/week entered - investigate "+ideas[x[0]]:String(x[1]),margin+40,y+33,{maxWidth:W-margin*2-55});y+=56});
 footer();doc.save("AutomationScan-Business-Visibility-Report.pdf");
 document.getElementById("saveStatus").textContent="Your branded PDF report has been downloaded.";
}
document.getElementById("downloadPdf").onclick=drawPdf;
document.getElementById("print").onclick=()=>window.print();

async function submitLeadIfConsented(r,top){
 const email=form.elements.emailAddress?.value?.trim(),consent=form.elements.consent?.checked;
 if(!email||!consent)return;
 try{const res=await fetch((window.AUTOMATIONSCAN_API_BASE||"")+"/api/lead",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,consent:true,report:{score:r.score,label:r.label,low:r.low,high:r.high,industry:r.industry,goal:r.goal,top:top.slice(0,3).map(x=>x[0]),coverage:r.coverage}})});document.getElementById("saveStatus").textContent=res.ok?"Report generated; email request submitted.":"Report generated locally; email delivery is not configured yet."}catch{document.getElementById("saveStatus").textContent="Report generated locally."}
}

const demos={accounting:{name:"Accounting firm",meta:"12-person practice · B2B · monthly client reporting",score:84,hours:"64-92",headline:"Invoice processing and client reporting are absorbing the most repeat effort.",areas:[["Invoices / payments","18 hrs/week","Document extraction + approval workflow"],["Reporting","11 hrs/week","Scheduled report generation + delivery"],["Email / follow-ups","8 hrs/week","Reminder sequences + exception handling"]],next:"Start with invoice intake because it touches finance, documents and approvals."},clinic:{name:"Healthcare clinic",meta:"8-person clinic · B2C · appointment-heavy",score:76,hours:"42-61",headline:"Scheduling and reminders are creating avoidable administrative load.",areas:[["Scheduling","14 hrs/week","Self-service booking + reminders"],["Customer support","8 hrs/week","FAQ and message triage"],["Documents / admin","7 hrs/week","Digital forms + document routing"]],next:"Start with scheduling and reminders; keep clinical decisions outside automation."},realestate:{name:"Real estate team",meta:"15-person team · mixed clients · lead-driven",score:81,hours:"49-70",headline:"Lead follow-up and CRM updates are competing with time spent selling.",areas:[["Sales admin / CRM","13 hrs/week","Lead capture + CRM enrichment"],["Email / follow-ups","10 hrs/week","Task-based follow-up sequences"],["Documents / admin","6 hrs/week","Template-driven document preparation"]],next:"Start with lead capture and follow-up consistency before adding more tools."},ecommerce:{name:"E-commerce business",meta:"22-person operation · B2C · multi-channel",score:79,hours:"55-79",headline:"Order support, reporting and data movement are the biggest repeat-work signals.",areas:[["Customer support","15 hrs/week","FAQ automation + ticket routing"],["Data entry","12 hrs/week","Order and inventory data sync"],["Reporting","8 hrs/week","Automated daily/weekly dashboards"]],next:"Start with support triage and repetitive order questions."},logistics:{name:"Logistics company",meta:"35-person operation · B2B · document-heavy",score:88,hours:"71-103",headline:"Documents and status updates create a large coordination burden.",areas:[["Documents / admin","22 hrs/week","Document capture + workflow routing"],["Data entry","16 hrs/week","System-to-system data transfer"],["Email / follow-ups","9 hrs/week","Exception alerts + customer updates"]],next:"Start with document intake and status-event workflows; preserve human review for exceptions."},agency:{name:"Professional services",meta:"10-person agency · project-based · B2B",score:68,hours:"34-49",headline:"Recurring reporting and client communication are taking time away from delivery.",areas:[["Reporting","9 hrs/week","Reusable report generation"],["Email / follow-ups","7 hrs/week","Client update workflows"],["Documents / admin","5 hrs/week","Templates and approval steps"]],next:"Start with recurring reports where inputs and outputs are already structured."}};
function renderDemo(key){const d=demos[key]||demos.accounting;document.getElementById("demoPanel").innerHTML='<div class="demo-top"><div><span class="demo-kicker">ILLUSTRATIVE SCAN</span><h3>'+d.name+'</h3><p>'+d.meta+'</p></div><div class="demo-score"><strong>'+d.score+'</strong><span>/100</span></div></div><div class="demo-headline">'+d.headline+'</div><div class="demo-hours"><span>Estimated work worth investigating</span><strong>'+d.hours+' hrs/month</strong></div><div class="demo-areas">'+d.areas.map((x,i)=>'<div class="demo-area"><small>PRIORITY '+(i+1)+'</small><b>'+x[0]+'</b><span>'+x[1]+'</span><p>'+x[2]+'</p></div>').join("")+'</div><div class="demo-next"><b>What the output suggests</b><span>'+d.next+'</span></div>'}
document.querySelectorAll(".demo-tab").forEach(t=>t.addEventListener("click",()=>{document.querySelectorAll(".demo-tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");renderDemo(t.dataset.demo)}));
renderDemo("accounting");show(0);