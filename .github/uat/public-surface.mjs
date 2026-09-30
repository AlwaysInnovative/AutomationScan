import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "https://automation-scan-neon.vercel.app";
const failures = [];
const checks = [];
function check(ok,msg){checks.push({ok,msg});if(!ok)failures.push(msg);}
async function waitReady(page){await page.waitForLoadState("domcontentloaded");await page.waitForTimeout(1200);}
async function fillAll(page,scope="body"){
  const fields=page.locator(scope+" input, "+scope+" select, "+scope+" textarea");
  const n=await fields.count();
  for(let i=0;i<n;i++){
    const f=fields.nth(i); if(!(await f.isVisible().catch(()=>false))) continue;
    const type=await f.getAttribute("type");
    if(["hidden","file","submit","button","reset"].includes(type)) continue;
    if(type==="checkbox"||type==="radio"){await f.check().catch(()=>{});continue;}
    if(await f.evaluate(e=>e.tagName==="SELECT")){
      const opts=await f.locator("option").evaluateAll(os=>os.map(o=>o.value).filter(Boolean));
      for(const v of opts) await f.selectOption(v).catch(()=>{});
    } else if(type==="number"){
      await f.fill("1").catch(()=>{});
    } else if(type==="date"){
      await f.fill("2026-10-01").catch(()=>{});
    } else {
      await f.fill("UAT business evidence").catch(()=>{});
    }
  }
}
async function clickActionButtons(page,scope){
  const btns=page.locator(scope+" button");
  const n=await btns.count();
  for(let i=0;i<n;i++){
    const b=btns.nth(i); if(!(await b.isVisible().catch(()=>false)))continue;
    const t=((await b.innerText().catch(()=>""))||"").trim();
    if(!/^(Add|Save|Calculate|Generate|Run|Score|Trace|Build|Create)/i.test(t))continue;
    if(/reset|clear|print|pdf|export|download/i.test(t))continue;
    await b.click().catch(()=>{});
    await page.waitForTimeout(100);
  }
}
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
page.on("pageerror",e=>failures.push("PAGEERROR "+e.message));
page.on("console",m=>{if(m.type()==="error")failures.push("CONSOLE "+m.text())});

await page.goto(BASE+"/",{waitUntil:"networkidle"}); await waitReady(page);
check(await page.locator("#scanForm").count()===1,"Assessment form present");
check(await page.locator("select[name=industry] option").count()>1,"Assessment industries loaded dynamically");
check(await page.locator("select[name=copyPaste] option").count()>1,"Assessment copy/paste options loaded");
await fillAll(page,"#scanForm");
await page.locator("#next").click(); await page.locator("#next").click(); await page.locator("#next").click();
await page.locator("#submit").click(); await page.waitForTimeout(1000);
check(await page.locator("#results").isVisible().catch(()=>false),"Assessment generated report");
check((await page.locator("#score").innerText().catch(()=>"")).trim()!=="","Assessment score populated");

await page.goto(BASE+"/transformation-advisor.html",{waitUntil:"networkidle"}); await waitReady(page);
check(await page.locator("#transformForm").count()===1,"Navigator form present");
check(await page.locator("#industry option").count()>1,"Navigator industries loaded dynamically");
await fillAll(page,"#transformForm");
await page.locator("#tGenerate").click(); await page.waitForTimeout(500);
check(await page.locator("#transformResults").isVisible().catch(()=>false),"Navigator report generated");

await page.goto(BASE+"/transformation-workbench.html",{waitUntil:"networkidle"}); await waitReady(page);
check(await page.locator("#journeySelect option").count()>1,"Workbench journeys loaded dynamically");
const journeyValues=await page.locator("#journeySelect option").evaluateAll(os=>os.map(o=>o.value).filter(Boolean));
check(journeyValues.length>0,"At least one journey available");
for(const journey of journeyValues){
  await page.evaluate(()=>localStorage.removeItem("automationScanWorkbenchV2"));
  await page.reload({waitUntil:"networkidle"}); await waitReady(page);
  await page.locator("#journeySelect").selectOption(journey); await page.waitForTimeout(300);
  const stages=page.locator("#journeyStages button[data-canonical-section]");
  const sn=await stages.count();
  check(sn>0,journey+" exposes journey stages");
  for(let i=0;i<sn;i++){
    const stage=stages.nth(i); const section=await stage.getAttribute("data-canonical-section");
    await stage.click(); await page.waitForTimeout(150);
    const panel=page.locator("#tab-"+section);
    check(await panel.count()===1,journey+" stage "+section+" has a panel");
    if(await panel.count()) await fillAll(page,"#tab-"+section);
    if(await panel.count()) await clickActionButtons(page,"#tab-"+section);
    check(await page.locator('.wb-nav button[data-tab="'+section+'"][data-status="visited"], .wb-nav button[data-tab="'+section+'"][data-status="completed"]').count()>0,journey+" stage "+section+" records visit status");
  }
}
const dl=page.locator("#downloadExcelTemplate");
if(await dl.count()){const [download]=await Promise.all([page.waitForEvent("download"),dl.click()]);check((await download.suggestedFilename()).includes("AutomationScan-Workbench-Complete"),"Workbench Excel template downloads");}
await page.goto(BASE+"/contact.html",{waitUntil:"networkidle"}); await waitReady(page);
check(await page.locator("#contactForm").count()===1,"Contact form present");
check(await page.locator("#consentBanner").count()===1,"Privacy consent banner present");
await page.goto(BASE+"/privacy.html",{waitUntil:"networkidle"}); await waitReady(page);
check((await page.locator("body").innerText()).includes("Cloud copies"),"Privacy policy documents cloud copies");
await browser.close();
console.log(JSON.stringify({checks,failures,summary:{passed:checks.filter(x=>x.ok).length,failed:failures.length}},null,2));
if(failures.length)process.exit(1);