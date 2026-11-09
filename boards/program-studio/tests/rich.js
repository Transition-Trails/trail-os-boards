const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../program-studio-board.html'),'utf8');const sample=require('./sample.js');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const d=sample();const P=d.programs[0].fields;
 P.Program_Structure__c='<p>Three 30-day capstones:</p><table><thead><tr><th>Days</th><th>Capstone</th></tr></thead><tbody><tr><td>1–30</td><td>Inherit &amp; stabilize</td></tr></tbody></table><img src="x" onerror="parent.HACK=1"><script>parent.HACK=2</script>';
 P.Program_Goals__c='<p>By the end:</p><ul><li>Apply R.E.S.O.L.V.E.</li><li>Build flows</li></ul>';
 P.Success_Metrics_Evaluation_Plan__c='Plain text line one\nline two';
 await p.goto('file://'+path.join(__dirname,'host.html'));await p.evaluate(([d,h])=>{window.D=d;document.getElementById('f').srcdoc=h},[d,html]);await p.waitForTimeout(500);const f=p.frames()[1];
 const ok=(c,m)=>console.log(c?'ok':'FAIL',m);const last=()=>p.evaluate(()=>LOG.filter(m=>m.type==='action').pop());
 await f.click('[data-view=programs]');await f.click('[data-open="program:p1"]');await f.click('[data-tab=plan]');
 ok(await f.locator('#rt-Program_Structure__c table td').count()===2,'table renders');ok(await f.locator('#rt-Program_Structure__c img[onerror]').count()===0,'unsafe attrs removed');
 ok(await f.locator('#rt-Program_Goals__c li').count()===2,'list renders');ok(await f.locator('.jump .chipb').count()===7,'jump chips');
 ok(await f.isDisabled('[data-save=p1]'),'save disabled when untouched');
 await f.click('#focusbtn');await p.waitForTimeout(150);await p.screenshot({path:'s-rich-focus.png'});
 // edit goals: add item
 await f.click('#rt-Program_Goals__c li:last-child');await p.keyboard.press('End');await p.keyboard.press('Enter');await p.keyboard.type('Drive adoption');
 ok((await f.textContent('#savebar')).includes('1 unsaved change'),'savebar updates live');ok(await f.locator('#sec-Program_Goals__c .vbadge').count()===1,'Edited badge');
 // bold
 await p.keyboard.down('Shift');for(let i=0;i<5;i++)await p.keyboard.press('ArrowLeft');await p.keyboard.up('Shift');await f.click('[data-rt=bold][data-for=Program_Goals__c]');
 // link on structure
 await f.click('#rt-Program_Structure__c p');await p.keyboard.press('End');await p.keyboard.type(' See ');await f.click('[data-rt=link][data-for=Program_Structure__c]');await f.fill('#rtlinkurl','https://example.org/plan');await f.press('#rtlinkurl','Enter');await p.waitForTimeout(100);
 ok(await f.locator('#rt-Program_Structure__c a[href="https://example.org/plan"]').count()===1,'link inserted');
 await p.screenshot({path:'s-rich-edit.png'});
 await p.keyboard.press('Control+s');await p.waitForTimeout(400);const l=await last();
 const fl=l.payload.fields;ok(l.name==='saveProgramDraft'&&Object.keys(fl).sort().join()==='Program_Goals__c,Program_Structure__c','only changed fields: '+Object.keys(fl));
 ok(/<li>Build flows<\/li><li>Drive ado<b>ption<\/b><\/li>/.test(fl.Program_Goals__c),'goals html '+fl.Program_Goals__c);
 ok(/<table>[\s\S]*<td>Inherit &amp; stabilize<\/td>/.test(fl.Program_Structure__c)&&!/script|onerror/.test(fl.Program_Structure__c),'table preserved, unsafe dropped '+fl.Program_Structure__c);
 ok(!(await p.evaluate(()=>window.HACK)),'no script ran');
 // plain text field shown as paragraphs
 ok(await f.locator('#rt-Success_Metrics_Evaluation_Plan__c p').count()===2,'plain text becomes paragraphs');
 // paste
 await f.click('#rt-Implementation_Plan__c');await f.evaluate(()=>{const dt=new DataTransfer();dt.setData('text/html','<p style="color:red" onclick="x()">Week <span>one</span></p><script>1</script>');document.getElementById('rt-Implementation_Plan__c').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))});
 ok((await f.innerHTML('#rt-Implementation_Plan__c'))==='<p>Week one</p>','paste cleaned: '+await f.innerHTML('#rt-Implementation_Plan__c'));
 // undo restores
 await f.click('[data-undo=p1]');ok(await f.isDisabled('[data-save=p1]'),'undo clears');
 for(const w of [390,768]){await p.setViewportSize({width:w,height:900});await p.waitForTimeout(150);await p.screenshot({path:`s-rich-${w}.png`});const ov=await f.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);ok(ov<=0,'no h-scroll '+w)}
 console.log(errs.length?'ERR '+errs:'no errors');await b.close()})();
