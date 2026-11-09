const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../program-studio-board.html'),'utf8');const sample=require('./sample.js');
async function open(b,w,h,opts={}){const p=await b.newPage({viewport:{width:w,height:h}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('file://'+path.join(__dirname,'host.html'));
 await p.evaluate(([d,h,pv])=>{window.D=d;window.PREVIEW=pv;document.getElementById('f').srcdoc=h},[sample(),html,!!opts.preview]);
 const fr=()=>p.frames()[1];await p.waitForTimeout(500);return {p,f:fr(),errs}}
(async()=>{const b=await chromium.launch();let fails=[];const ok=(c,m)=>{if(!c){fails.push(m);console.log('FAIL',m)}else console.log('ok',m)};
 // desktop
 let {p,f,errs}=await open(b,1440,900);
 ok(await f.isVisible('#body'),'body visible');
 ok((await f.textContent('#rail')).includes('Waiting for approval1'),'approve count 1');
 await p.screenshot({path:'s-overview-1440.png'});
 await f.click('[data-view=programs]');await p.waitForTimeout(100);await p.screenshot({path:'s-programs-1440.png'});
 await f.click('[data-open="program:p1"]');await p.waitForTimeout(100);await p.screenshot({path:'s-p1-1440.png'});
 // edit + save
 await f.click('[data-tab=plan]');await f.click('#rt-Problem_Statement__c');await p.keyboard.type('Career changers lack project experience.');await p.keyboard.press('Enter');await f.click('[data-rt=ul][data-for=Problem_Statement__c]');await p.keyboard.type('No portfolio');await p.keyboard.press('Enter');await p.keyboard.type('No references');
 ok(await f.isEnabled('[data-save=p1]'),'save enabled after edit');
 await f.click('[data-save=p1]');await p.waitForTimeout(400);
 let last=await p.evaluate(()=>LOG.filter(m=>m.type==='action').pop());
 ok(last.name==='saveProgramDraft'&&last.payload.programId==='p1'&&last.payload.editVersion==='v1'&&/<ul><li>No portfolio<\/li><li>No references<\/li><\/ul>/.test(last.payload.fields.Problem_Statement__c)&&Object.keys(last.payload).length===3,'saveProgramDraft payload '+JSON.stringify(last.payload));
 ok((await f.textContent('#panel')).includes('Approval · 1'),'changes count shown');
 // submit
 await f.click('[data-tab=approval]');await p.screenshot({path:'s-p1-approval.png'});
 await f.click('[data-submit=p1]');await p.waitForTimeout(400);
 last=await p.evaluate(()=>LOG.filter(m=>m.type==='action').pop());ok(last.name==='submitForApproval'&&last.payload.editVersion==='v2','submit payload');
 // stale
 await p.evaluate(()=>{window.FAIL={saveProgramDraft:{code:'stale',message:'Someone else saved this first. Reload to see their changes.'}}});
 await f.click('[data-open="program:p3"]');await f.fill('[data-fld=pmdm__ShortSummary__c]','Changed');await f.click('[data-save=p3]');await p.waitForTimeout(400);
 ok((await f.textContent('#panel')).includes('Someone else saved this first'),'stale message inline');
 ok(await f.isHidden('#failbox').catch(()=>true),'no failbox');
 await p.evaluate(()=>{window.FAIL=null});
 await p.screenshot({path:'s-p3-1440.png'});
 // guidance retry
 await f.click('[data-gd=retry_delivery]');await p.waitForTimeout(300);last=await p.evaluate(()=>LOG.filter(m=>m.type==='action').pop());ok(last.name==='retryDelivery'&&last.payload.id==='p3'&&last.payload.recordType==='program','guidance retry');
 // approve p2
 await f.click('[data-open="program:p2"]');await f.click('[data-gd=compare]');ok(await f.isVisible('[data-approve=p2]'),'approve button on p2');
 await f.click('[data-return=p2]');await p.waitForTimeout(100);ok((await f.textContent('#panel')).includes('10 characters'),'return needs note');
 await f.fill('[data-ap=note]','Please add the funding source first.');await f.click('[data-return=p2]');await p.waitForTimeout(300);
 last=await p.evaluate(()=>LOG.filter(m=>m.type==='action').pop());ok(last.name==='returnChange'&&last.payload.draftId==='d2'&&last.payload.note.length>=10,'returnChange payload');
 // status change cancel
 await f.click('[data-open="program:p1"]');ok(await f.locator('[data-st=to]').count()===0,'no status select while locked');
 // p1 is awaiting approval now -> locked; check
 ok((await f.textContent('#panel')).includes('waiting for approval'),'p1 locked after submit');
 await f.click('[data-view=cohorts]');await f.click('[data-open="cohort:c1"]');await f.selectOption('[data-st=to]','Canceled');await f.click('[data-stgo=c1]');await p.waitForTimeout(100);
 ok((await f.textContent('#panel')).includes('at least 10 characters'),'cancel needs reason');
 await f.fill('[data-st=reason]','Not enough applicants this round.');await f.click('[data-stgo=c1]');await p.waitForTimeout(300);
 last=await p.evaluate(()=>LOG.filter(m=>m.type==='action').pop());ok(last.name==='requestStatusChange'&&last.payload.recordType==='cohort'&&last.payload.toStatus==='Canceled'&&last.payload.reason,'status payload');
 // new cohort (copy)
 await f.click('[data-open="program:p2"]');await f.click('[data-tab=cohorts]');await f.selectOption('[data-nc=copy]','c3');await f.fill('[data-nc=Name]','FT 2027 01');await f.click('[data-newc=p2]');await p.waitForTimeout(400);
 last=await p.evaluate(()=>LOG.filter(m=>m.type==='action').pop());ok(last.name==='createCohort'&&last.payload.copyFromCohortId==='c3'&&!('pmdm__StartDate__c' in last.payload.fields)&&/^[0-9a-f-]{36}$/.test(last.payload.requestId),'createCohort payload '+JSON.stringify(last.payload));
 ok((await f.textContent('#panel')).includes('FT 2027 01'),'opened new cohort');
 // propose
 await f.click('#newprog');await f.fill('#np-name','Volunteer Admins');await f.fill('#np-sum','Train volunteers.');await f.click('#np-go');await p.waitForTimeout(400);
 last=await p.evaluate(()=>LOG.filter(m=>m.type==='action').pop());ok(last.name==='proposeProgram'&&Object.keys(last.payload).sort().join()==='name,requestId,shortSummary','propose payload');
 ok((await f.textContent('#panel')).includes('Volunteer Admins'),'opened new program on plan');
 // approve now
 await f.click('[data-tab=approval]');await f.click('[data-annow]');await f.fill('[data-an=note]','Urgent board-approved launch.');await f.check('[data-an=ok]');await f.click('[data-anconfirm]');await p.waitForTimeout(300);
 last=await p.evaluate(()=>LOG.filter(m=>m.type==='action').pop());ok(last.name==='approveNow'&&last.payload.confirmed===true,'approveNow payload');
 // calendar, focus
 await f.click('[data-view=calendar]');await p.waitForTimeout(100);await p.screenshot({path:'s-cal-1440.png'});
 await f.click('[data-open="cohort:c2"]');await f.click('[data-tab=roster]');await p.screenshot({path:'s-c2-roster.png'});
 await f.click('#focusbtn');await p.waitForTimeout(100);await p.screenshot({path:'s-focus-1440.png'});
 await p.keyboard?null:null;await f.press('#focusbtn','Escape');await p.waitForTimeout(100);ok(!(await f.evaluate(()=>document.getElementById('panel').classList.contains('focus'))),'esc exits focus');
 ok(errs.length===0,'no js errors '+errs.join('|'));await p.close();
 // preview
 ({p,f,errs}=await open(b,1440,900,{preview:true}));await f.click('[data-view=programs]');await f.click('[data-open="program:p1"]');await f.fill('[data-fld=pmdm__ShortSummary__c]','x');await f.click('[data-save=p1]');await p.waitForTimeout(300);
 ok((await f.textContent('#panel')).includes('Preview only'),'preview_only inline');await f.click('[data-tab=sync]');await f.click('[data-check=p1]');await p.waitForTimeout(300);ok((await f.textContent('#toast')).includes('Nothing was changed'),'check works in preview');await p.close();
 // sizes
 for(const [w,h] of [[390,844],[768,1024]]){({p,f,errs}=await open(b,w,h));await p.screenshot({path:`s-overview-${w}.png`});
  const ov=await f.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);ok(ov<=0,`no h-scroll ${w}: ${ov}`);
  await f.click('[data-view=cohorts]');await p.screenshot({path:`s-cohorts-${w}.png`});
  await f.locator('[data-open="program:p1"]').first().click();await p.waitForTimeout(150);await p.screenshot({path:`s-p1-${w}.png`});
  await f.click('#focusbtn');await p.waitForTimeout(100);await p.screenshot({path:`s-focus-${w}.png`});
  ok(errs.length===0,'no errors '+w);await p.close()}
 await b.close();console.log(fails.length?fails.length+' FAILURES':'ALL PASS');})();
