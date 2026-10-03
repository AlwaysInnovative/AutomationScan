const { chromium } = require("playwright");
const fs=require("fs"),path=require("path");
const BASE="https://automation-scan-neon.vercel.app";
// Acceptance always targets the current production alias; do not substitute preview deployments.
const defaultIndustries=[["retail","Retail"],["manufacturing","Manufacturing"],["healthcare","Healthcare"],["financial_services","Financial Services"],["professional_services","Professional Services"],["logistics","Logistics"],["generic","Other / Custom"]];
const defaultCountries=["AE","DE","GB","IN","SG","US"];
const out="test-artifacts";fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
async function sel(p,id){const l=p.locator("#"+id);if(await l.count()){const v=await l.locator("option").evaluateAll(x=>x.map(o=>o.value).find(Boolean));if(v)await l.selectOption(v)}}
async function fill(p,id,v){const l=p.locator("#"+id);if(await l.count())await l.fill(v)}
async function stage(p,sec,industry){
 const map={
 profile:[["wbIndustry",industry],["wbGoals","Reduce cycle time and control risk"],["wbPain","Manual exceptions and reconciliation"],["wbIntegration","High"],"#saveProfile"],
 process:[["pName",industry+" priority process"],["pVolume","1000"],["pMinutes","5"],["pExceptions","3"],["pErrors","1"],"#addProcess"],
 apps:[["aName","Current core application"],["aCost","120000"],"#addApp"],
 capabilities:[["cName",industry+" core capability"],["cCurrent","55"],["cTarget","85"],["cReq","REQ-001"],["cGap","Validate capability and integration"],"#addCapability"],
 select:[["candName","Industry candidate"],["candCapabilities","Core process, integration, reporting and controls"],"#addCandidate","#runSelection"],
 economics:[["tYears","5"],["tCurrentLicence","100000"],["tFutureSub","120000"],["tImplementation","180000"],["tMigration","60000"],["tIntegration","50000"],["tTesting","25000"],["tChange","25000"],["tValue","150000"],["tRealisation","70"],"#calcEconomics"],
 execute:["#generateRfp","#generatePoc"],
 portfolio:["#scorePortfolio"],
 poc:[["pocCandidate","Industry candidate"],["pocScenario","Critical end-to-end customer scenario"],["pocExpected","Required process and controls"],["pocObserved","Acceptance observation recorded"],"#addPoc"],
 govern:[["gReq","Applicable control"],["gCap","Required capability"],["gEvidence","Architecture/vendor evidence"],["gGate","Security/legal/POC review"],"#addGovern"],
 roadmap:[["rWorkstream","Transformation"],["rOwner","Business owner"],["rGate","Evidence gate"],["rDependency","Validated baseline"],["rValue","Measurable outcome"],"#addRoadmap"],
 requirements:[["qText","Support priority customer process"],["qProcess",industry+" priority process"],["qAcceptance","Demonstrate process, exception and control path"],["qGate","POC/evidence/security"],"#addRequirement"],
 compare:[["vCandidate","Industry candidate"],["vReq","REQ-001"],["vResponse","Recorded response"],"#addVendorResponse"],
 evidence:[["eClaim","Customer problem requires validation"],["eValue","Production acceptance evidence"],["eSource","Production acceptance test"],["eDate","2026-10-04"],["eReviewer","Transformation consultant"],["eNext","Scripted demo / POC"],"#addEvidence"]
 };
 const a=map[sec]||[];
 for(const x of a)if(Array.isArray(x))await fill(p,x[0],x[1]);
 for(const x of a)if(typeof x==="string")await p.locator(x).click();
 if(sec==="poc"){for(const id of ["mData","mIntegration","mCustom","mPeople","mSecurity","mTesting"])await fill(p,id,"75");await p.locator("#scoreMigration").click()}
 await p.waitForTimeout(100);
}
(async()=>{
 const b=await chromium.launch({headless:true});
 const result={expected:{},passed:{},navigator:0,scenario:0,journeys:0,stages:0,resume:0,pdf:0,failures:[],consoleErrors:[],caseResults:[]};
 const probe=await b.newPage();
 const [ir,cr,jr]=await Promise.all([probe.request.get(BASE+"/api/industries"),probe.request.get(BASE+"/api/countries"),probe.request.get(BASE+"/api/journeys")]);
 if(!ir.ok()||!cr.ok()||!jr.ok())throw Error("Production inventory APIs unavailable");
 const idata=await ir.json(), cdata=await cr.json(), jdata=await jr.json();
 const liveIndustries=(idata.industries||[]).map(x=>[x.id,x.name]);
 const liveCountries=(cdata.countries||[]).map(x=>x.code||x.country_code);
 const industries=liveIndustries.length?liveIndustries:defaultIndustries;
 const countries=liveCountries.length?liveCountries:defaultCountries;
 const journeys=jdata.journeys||[];result.journeys=journeys.length;
 if(!industries.length||!countries.length||!journeys.length)throw Error("Production inventory is empty");
 result.expected.industryCountry=industries.length*countries.length;
 result.expected.journeyCases=result.expected.industryCountry*journeys.length;
 result.expected.stageExecutions=journeys.reduce((n,j)=>n+(j.stages||[]).length,0)*industries.length*countries.length;
 result.expected.resumeCases=result.expected.journeyCases;
 result.expected.pdfCases=result.expected.journeyCases;
 result.expected.navigatorCases=result.expected.industryCountry;
 const selectedIndustry=process.env.ACCEPTANCE_INDUSTRY; const selectedCountry=process.env.ACCEPTANCE_COUNTRY; const matrix=industries.filter(x=>!selectedIndustry||x[0]===selectedIndustry).flatMap(x=>countries.filter(c=>!selectedCountry||c===selectedCountry).map(c=>[x[0],x[1],c]));\n for(const [iid,industry,country] of matrix){
   const p=await b.newPage();const errs=[];p.on("console",m=>{if(m.type()==="error")errs.push(m.text())});
   try{
    const sr=await p.request.get(BASE+"/api/industry-scenario?industry="+iid+"&country="+country);
    if(!sr.ok())throw Error("scenario API "+iid+"/"+country+" "+sr.status());
    const sd=await sr.json();if(!sd.scenario||!sd.applications?.length)throw Error("missing scenario/catalogue "+iid+"/"+country);result.scenario++;
    await p.goto(BASE+"/transformation-advisor.html",{waitUntil:"domcontentloaded",timeout:60000});await p.waitForTimeout(1000);
    await p.locator("#industry").selectOption({label:industry});await p.locator("#country").selectOption(country);await p.waitForTimeout(800);
    for(let n=0;n<await p.locator('input[name="processes"]').count();n++)await p.locator('input[name="processes"]').nth(n).check();
    for(let n=0;n<Math.min(2,await p.locator('input[name="painSignals"]').count());n++)await p.locator('input[name="painSignals"]').nth(n).check();
    await p.locator("#tGenerate").click();await p.locator("#transformResults").waitFor({state:"visible",timeout:30000});
    const cards=await p.locator("#tCandidates .candidate-card").count();if(!cards)throw Error("no recommendations "+iid+"/"+country);result.navigator++;
    for(const j of journeys){
      await p.goto(BASE+"/transformation-workbench.html",{waitUntil:"domcontentloaded",timeout:60000});await p.waitForFunction(()=>window.AutomationScanJourneys?.length>=8,{timeout:30000});
      await p.selectOption("#journeySelect",j.id);await p.waitForTimeout(200);
      for(const st of j.stages||[]){
        const btn=p.locator('[data-canonical-section="'+st.section+'"]');await btn.waitFor({state:"visible",timeout:10000});await btn.click();await stage(p,st.section,industry);
        if(st.section!=="report"){const status=await p.locator('.wb-nav button[data-tab="'+st.section+'"]').getAttribute("data-status");if(status!=="completed")throw Error("not completed "+j.id+"/"+st.section);result.stages++}
      }
      await p.locator('[data-canonical-section="report"]').click();const txt=(await p.locator("#wbReport").innerText()).trim();if(txt.length<500)throw Error("short dossier "+j.id);const pdf=path.join(out,iid+"_"+country+"_"+j.id+".pdf");await p.pdf({path:pdf,format:"A4",printBackground:true});if(fs.statSync(pdf).size<5000)throw Error("bad PDF "+j.id);result.pdf++;
      await p.reload({waitUntil:"domcontentloaded",timeout:60000});await p.waitForFunction(()=>window.AutomationScanJourneys?.length>=8,{timeout:30000});await p.selectOption("#journeySelect",j.id);result.resume++;
    }
   }catch(e){result.failures.push(iid+"/"+country+" :: "+e.message)}finally{result.consoleErrors.push(...errs.map(x=>iid+"/"+country+" :: "+x));await p.close()}
 }
 result.expected.caseCount=result.caseResults.length;
 result.coverage={industryCountryPassed:result.navigator,journeyPassed:result.resume,pdfPassed:result.pdf,stageExecutionsPassed:result.stages,consoleErrors:result.consoleErrors.length,failures:result.failures.length};
 const fullCoverage=result.navigator===result.expected.navigatorCases&&result.resume===result.expected.resumeCases&&result.pdf===result.expected.pdfCases&&result.stages===result.expected.stageExecutions&&result.failures.length===0&&result.consoleErrors.length===0;
 result.certified=fullCoverage;
 fs.writeFileSync("acceptance-summary.json",JSON.stringify(result,null,2));
 if(!fullCoverage)process.exit(1);
 console.log(JSON.stringify(result,null,2));await b.close();
})();