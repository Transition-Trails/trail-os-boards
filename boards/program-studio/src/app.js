/* Program Studio board v1 */
var BOARD="program-studio",BOARD_VERSION=1,CONTRACT=1;
var D=null,pending={},seq=0,busy={};
var V={view:"overview",sel:null,tab:null,q:"",focus:false,forms:{},errs:{},flt:{status:"",mgr:""},showClosed:false,fresh:{}};
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function lc(s){return String(s||"").trim().toLowerCase()}
function send(m){parent.postMessage(m,"*")}
function uuid(){try{if(crypto.randomUUID)return crypto.randomUUID()}catch(e){}var b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;var h=Array.prototype.map.call(b,function(x){return (x+256).toString(16).slice(1)}).join("");return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20)}
function act(name,payload,key){
  key=key||name;var id=uuid();busy[key]=true;delete V.errs[key];render();
  return new Promise(function(res){
    var t=null;function arm(){clearTimeout(t);t=setTimeout(function(){delete pending[id];delete busy[key];V.errs[key]={code:"timeout",message:"Trail OS didn’t answer in time. The request may still have completed; check the record before trying again."};render();res({ok:false,code:"timeout"})},26000)}
    arm();
    pending[id]=function(m){clearTimeout(t);delete busy[key];if(!m.ok)V.errs[key]={code:m.code||"",message:m.message||"This request could not be completed."};render();res(m)};
    pending[id].keepAlive=arm;
    send({type:"action",id:id,name:name,payload:payload});
  });
}
window.addEventListener("message",function(e){
  if(e.source!==parent)return;var m=e.data;if(!m||typeof m!=="object")return;
  if(m.type==="data"&&m.data){if(m.data.contractVersion!==CONTRACT){wait("This board expects data contract "+CONTRACT+". Ask an administrator to activate a matching board version.");return}D=index(m.data);V.refreshing=false;if(V.pendingOpen&&rec(V.pendingOpen.kind,V.pendingOpen.id)){V.sel=V.pendingOpen;V.tab=V.pendingOpen.tab||null;V.pendingOpen=null}if(V.sel&&V.sel.kind!=="new"&&!rec(V.sel.kind,V.sel.id))V.sel=null;render()}
  else if(m.type==="actionPending"&&pending[m.id]&&pending[m.id].keepAlive)pending[m.id].keepAlive();
  else if(m.type==="result"&&pending[m.id]){var r=pending[m.id];delete pending[m.id];r(m)}
});
function hello(){send({type:"ready",board:BOARD,boardVersion:BOARD_VERSION,contractVersion:CONTRACT})}
hello();
setTimeout(function(){if(!D)wait("Trail OS hasn’t sent program data yet. Reload the page; if this stays, tell an administrator.")},6000);
function wait(msg){$("waitmsg").textContent=msg;$("waiting").hidden=false;$("body").hidden=true}
var tt=null;function toast(msg){var t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(tt);tt=setTimeout(function(){t.hidden=true},4500)}

/* ---------- data ---------- */
var PF={
  Name:{l:"Program name",k:"text",max:255},
  pmdm__ShortSummary__c:{l:"Short summary",k:"area"},
  pmdm__Description__c:{l:"Description and mission fit",k:"area"},
  pmdm__StartDate__c:{l:"Start date",k:"date"},
  pmdm__EndDate__c:{l:"End date",k:"date"},
  pmdm__ProgramIssueArea__c:{l:"Issue area",k:"pick",list:"issueAreas"},
  Program_Manager__c:{l:"Program manager",k:"look",list:"managers"},
  OwnerId:{l:"Owner",k:"look",list:"owners"},
  pmdm__TargetPopulation__c:{l:"Target population",k:"area"},
  Program_Target_Audience__c:{l:"Target audience",k:"rich"},
  Problem_Statement__c:{l:"Problem statement",k:"rich"},
  Program_Goals__c:{l:"Goals",k:"rich"},
  Program_Expected_Outcomes__c:{l:"Expected outcomes",k:"rich"},
  Program_Structure__c:{l:"Structure",k:"rich"},
  Implementation_Plan__c:{l:"Implementation plan",k:"rich"},
  Success_Metrics_Evaluation_Plan__c:{l:"Success metrics and evaluation",k:"rich"},
  Risks_Assumptions__c:{l:"Risks and assumptions",k:"rich"},
  Budget_Resouces__c:{l:"Budget and resources",k:"rich"},
  Funding_Strategy__c:{l:"Funding strategy",k:"rich"},
  Partnership_Opportunities__c:{l:"Partnership opportunities",k:"rich"},
  Requires_Payment__c:{l:"Requires payment",k:"bool"},
  Product__c:{l:"Product",k:"look",list:"products"},
  Google_Drive_Folder__c:{l:"Google Drive folder",k:"url"},
  Canva_Folder__c:{l:"Canva folder",k:"url"},
  Program_Reference_Link__c:{l:"Reference link",k:"url"},
  pmdm__Status__c:{l:"Status",k:"status"}
};
var CF={
  Name:{l:"Cohort name",k:"text",max:255},
  pmdm__StartDate__c:{l:"Start date",k:"date"},
  pmdm__EndDate__c:{l:"End date",k:"date"},
  Cohort_Capacity__c:{l:"Capacity",k:"int"},
  Coach__c:{l:"Coach",k:"look",list:"coaches"},
  RecordTypeId:{l:"Record type",k:"look",list:"recordTypes"},
  pmdm__Description__c:{l:"Description",k:"area"},
  pmdm__Program__c:{l:"Program",k:"prog"},
  pmdm__Status__c:{l:"Status",k:"status"}
};
var P_TABS={overview:["Name","pmdm__ShortSummary__c","pmdm__Description__c","pmdm__StartDate__c","pmdm__EndDate__c","pmdm__ProgramIssueArea__c","Program_Manager__c","OwnerId","pmdm__TargetPopulation__c","Program_Target_Audience__c"],
  plan:["Problem_Statement__c","Program_Goals__c","Program_Expected_Outcomes__c","Program_Structure__c","Implementation_Plan__c","Success_Metrics_Evaluation_Plan__c","Risks_Assumptions__c"],
  resources:["Budget_Resouces__c","Funding_Strategy__c","Partnership_Opportunities__c","Requires_Payment__c","Product__c","Google_Drive_Folder__c","Canva_Folder__c","Program_Reference_Link__c"]};
var C_FIELDS=["Name","pmdm__StartDate__c","pmdm__EndDate__c","Cohort_Capacity__c","Coach__c","RecordTypeId","pmdm__Description__c"];
function index(d){
  d.lists=d.lists||{};["programStatus","cohortStatus","issueAreas","engagementStages","managers","coaches","products","owners","recordTypes"].forEach(function(k){if(!Array.isArray(d.lists[k]))d.lists[k]=[]});
  d.programs=Array.isArray(d.programs)?d.programs:[];d.cohorts=Array.isArray(d.cohorts)?d.cohorts:[];
  d.viewer=d.viewer||{};d.byP={};d.byC={};
  d.programs.forEach(function(p){p.fields=p.fields||{};p.perms=p.perms||{};p.changes=p.changes||[];p.issues=p.issues||[];p.workflow=p.workflow||{};d.byP[p.id]=p});
  d.cohorts.forEach(function(c){c.fields=c.fields||{};c.perms=c.perms||{};c.changes=c.changes||[];c.issues=c.issues||[];c.workflow=c.workflow||{};c.roster=c.roster||[];d.byC[c.id]=c});
  var me=lc(d.viewer.email);d.myMgr={};d.lists.managers.forEach(function(m){if(lc(m.email)===me)d.myMgr[m.id]=1});
  return d;
}
function rec(kind,id){return kind==="program"?D.byP[id]:kind==="cohort"?D.byC[id]:null}
function val(r,f){var df=r.draft&&r.draft.fields;if(df&&Object.prototype.hasOwnProperty.call(df,f))return df[f];return r.fields[f]}
function live(r,f){return r.fields[f]}
function inDraft(r,f){var df=r.draft&&r.draft.fields;return !!(df&&Object.prototype.hasOwnProperty.call(df,f))}
function nm(r){var n=val(r,"Name");return n?String(n):"Untitled"}
function progOf(c){var pid=val(c,"pmdm__Program__c")||c.programId;return D.byP[c.programId]||D.programs.filter(function(p){return p.salesforceId&&p.salesforceId===pid})[0]||null}
function cohortsOf(p){var ids=p.cohortIds||[];var out=ids.map(function(i){return D.byC[i]}).filter(Boolean);D.cohorts.forEach(function(c){if(out.indexOf(c)<0&&(c.programId===p.id||(p.salesforceId&&c.programId===p.salesforceId)))out.push(c)});return out}
function lookName(list,id){if(id==null||id==="")return "";var x=(D.lists[list]||[]).filter(function(o){return o.id===id})[0];return x?x.name:"Unknown ("+id+")"}
function txt(html){if(html==null)return "";var s=String(html);if(!/[<&]/.test(s))return s;try{var doc=new DOMParser().parseFromString("<div>"+s.replace(/<\/(p|div|li|h\d)>/gi,"</$1>\n").replace(/<br\s*\/?>/gi,"\n").replace(/<li>/gi,"<li>• ")+"</div>","text/html");return doc.body.textContent.replace(/\n{3,}/g,"\n\n").trim()}catch(e){return s}}
function toRich(t){var lines=String(t||"").replace(/\r/g,"").split("\n"),out="",ul=false;lines.forEach(function(l){var m=/^\s*[-•*]\s+(.*)$/.exec(l);if(m){if(!ul){out+="<ul>";ul=true}out+="<li>"+esc(m[1])+"</li>";return}if(ul){out+="</ul>";ul=false}if(l.trim())out+="<p>"+esc(l.trim())+"</p>"});if(ul)out+="</ul>";return out}
function show(def,v){if(v==null||v==="")return "";if(def.k==="look")return lookName(def.list,v);if(def.k==="bool")return v?"Yes":"No";if(def.k==="date")return fmtDate(v);if(def.k==="rich")return txt(v);if(def.k==="prog"){var p=D.programs.filter(function(x){return x.salesforceId===v||x.id===v})[0];return p?nm(p):String(v)}return String(v)}
var MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d||"");if(!m)return d?String(d):"";return MON[+m[2]-1]+" "+(+m[3])+", "+m[1]}
function fmtWhen(iso){var t=Date.parse(iso||"");if(!isFinite(t))return "";try{return new Date(t).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"})}catch(e){return new Date(t).toLocaleString()}}
function dnum(d){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d||"");return m?Date.UTC(+m[1],+m[2]-1,+m[3])/864e5:null}
function today(){var n=new Date();return Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())/864e5}
function draftSt(r){return r.draft?r.draft.status:null}
function locked(r){var s=draftSt(r);return s==="awaiting_approval"||s==="approved"}
function canEditRec(r){return !!r.perms.edit&&!locked(r)}
function enrolled(c){var n=0,known=false;c.roster.forEach(function(x){if(x.stage==="Enrolled"||x.stage==="Active"){n+=x.count||0;known=true}});return c.roster.length?n:null}
function me(){return lc(D.viewer.email)}
function isMine(r){return r.draft&&lc(r.draft.author)===me()}
function statusPill(s){if(!s)return '<span class="pill p-none">No status</span>';var t={Active:"p-done","In Discovery":"p-review",Planned:"p-review",Completed:"p-write",Canceled:"p-write"}[s]||"p-write";return '<span class="pill '+t+'">'+esc(s)+"</span>"}
function draftBadge(r){var s=draftSt(r),h="";if(!r.salesforceId)h+='<span class="vbadge pub">Not in Salesforce yet</span>';
  if(s==="draft")h+='<span class="vbadge">Draft · not sent</span>';else if(s==="awaiting_approval")h+='<span class="vbadge">Waiting for approval</span>';else if(s==="returned")h+='<span class="vbadge pub">Returned for changes</span>';else if(s==="approved")h+='<span class="vbadge">Approved · delivering</span>';return h}

/* ---------- views ---------- */
function hasProblem(r){var dl=r.workflow.delivery||{};return r.issues.length>0||dl.status==="needs_attention"}
/* archived and canceled records are hidden unless the viewer turns them on; work queues always show them */
function closedSt(s){return /cancel|archiv/i.test(String(s||""))}
function hiddenRec(r){if(V.showClosed)return false;if(closedSt(r.fields.pmdm__Status__c))return true;if(D.byC[r.id]===r){var p=progOf(r);if(p&&closedSt(p.fields.pmdm__Status__c))return true}return false}
function vis(rows){return rows.filter(function(r){return !hiddenRec(r)})}
var BASE={
  programs:function(){return D.programs},
  cohorts:function(){return D.cohorts},
  proposals:function(){return D.programs.filter(function(p){return val(p,"pmdm__Status__c")==="In Discovery"||!p.salesforceId})},
  mine:function(){return D.programs.concat(D.cohorts).filter(function(r){return (r.fields.Program_Manager__c&&D.myMgr[r.fields.Program_Manager__c])||isMine(r)||(draftSt(r)==="awaiting_approval"&&r.perms.approve)})}
};
BASE.calendar=BASE.cohorts;BASE.overview=function(){return D.programs.concat(D.cohorts)};
function closedToggle(){var b=BASE[V.view];if(!b)return "";var o=V.showClosed;V.showClosed=false;var n=b().filter(hiddenRec).length;V.showClosed=o;if(!n)return "";
  return '<span class="checks closedtg"><label><input type="checkbox" id="showclosed"'+(V.showClosed?" checked":"")+">Show archived and canceled ("+n+")</label></span>"}
var VIEWS={
  programs:function(){return vis(BASE.programs())},
  cohorts:function(){return vis(BASE.cohorts())},
  proposals:function(){return vis(BASE.proposals())},
  approve:function(){return D.programs.concat(D.cohorts).filter(function(r){return draftSt(r)==="awaiting_approval"})},
  mine:function(){return vis(BASE.mine())},
  problems:function(){return D.programs.concat(D.cohorts).filter(hasProblem)}
};
function kindOf(r){return D.byP[r.id]===r?"program":"cohort"}
function matchQ(r){if(!V.q)return true;var q=lc(V.q),s=lc(nm(r));if(s.indexOf(q)>=0)return true;if(kindOf(r)==="cohort"){var p=progOf(r);return !!(p&&lc(nm(p)).indexOf(q)>=0)}return false}
function railHtml(){
  var items=[["overview","Overview",null],["programs","Programs",VIEWS.programs().length],["cohorts","Cohorts",VIEWS.cohorts().length],["calendar","Calendar",null],["proposals","Proposals",VIEWS.proposals().length],["approve","Waiting for approval",VIEWS.approve().length],["mine","My work",VIEWS.mine().length],["problems","Needs attention",VIEWS.problems().length]];
  return items.map(function(x){return '<button type="button" data-view="'+x[0]+'" aria-current="'+(V.view===x[0])+'"><span>'+esc(x[1])+"</span>"+(x[2]!=null?'<span class="n">'+x[2]+"</span>":"")+"</button>"}).join("");
}
function render(){
  if(!D)return;$("waiting").hidden=true;$("body").hidden=false;
  $("newprog").hidden=!D.viewer.canPropose;
  var t=Date.parse(D.asOf||"");$("asof").textContent=isFinite(t)?"Salesforce as of "+new Date(t).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}):"";
  $("rail").innerHTML=railHtml();
  renderMain();renderPanel();
}
function renderMain(){
  var m=$("main"),y=m.scrollTop,h="";
  var titles={overview:"Programs at a glance",programs:"Programs",cohorts:"Cohorts",calendar:"Cohort calendar",proposals:"Proposals",approve:"Waiting for approval",mine:"My work",problems:"Needs attention"};
  h+='<div class="mhead"><h2>'+esc(titles[V.view]||"Programs")+"</h2>"+closedToggle()+"</div>";
  if(V.view==="overview")h+=overview();
  else if(V.view==="programs")h+=programFilters()+programTable((V.flt.status?D.programs:VIEWS.programs()).filter(matchQ).filter(function(p){return (!V.flt.status||val(p,"pmdm__Status__c")===V.flt.status)&&(!V.flt.mgr||val(p,"Program_Manager__c")===V.flt.mgr)}));
  else if(V.view==="cohorts")h+=cohortFilters()+cohortTable((V.flt.cstatus?D.cohorts:VIEWS.cohorts()).filter(matchQ).filter(function(c){return !V.flt.cstatus||val(c,"pmdm__Status__c")===V.flt.cstatus}));
  else if(V.view==="calendar")h+=calendar();
  else if(V.view==="proposals")h+=programTable(VIEWS.proposals().filter(matchQ),true);
  else h+=mixedTable(VIEWS[V.view]().filter(matchQ));
  m.innerHTML=h;m.scrollTop=y;
}
function opt(list,sel,blank,labelOf,valOf){return (blank!=null?'<option value="">'+esc(blank)+"</option>":"")+list.map(function(o){var v=valOf?valOf(o):o,l=labelOf?labelOf(o):o;return '<option value="'+esc(v)+'"'+(v===sel?" selected":"")+">"+esc(l)+"</option>"}).join("")}
function programFilters(){return '<div class="btnrow"><label class="f inline">Status<select data-flt="status">'+opt(D.lists.programStatus,V.flt.status,"All statuses")+'</select></label><label class="f inline">Manager<select data-flt="mgr">'+opt(D.lists.managers,V.flt.mgr,"Any manager",function(o){return o.name},function(o){return o.id})+"</select></label></div>"}
function cohortFilters(){return '<div class="btnrow"><label class="f inline">Status<select data-flt="cstatus">'+opt(D.lists.cohortStatus,V.flt.cstatus,"All statuses")+"</select></label></div>"}
function isSel(kind,r){return V.sel&&V.sel.kind===kind&&V.sel.id===r.id}
function programTable(rows,prop){
  if(!rows.length)return '<div class="card empty">Nothing here'+(V.q?" for this search":"")+".</div>";
  return '<div class="card tablewrap"><table><thead><tr><th>Program</th><th>Status</th><th>Manager</th><th>Dates</th><th>'+(prop?"Proposal":"Cohorts")+"</th><th>Approval and delivery</th></tr></thead><tbody>"+rows.map(function(p){
    var pc=p.proposalCompleteness||{},mgr=lookName("managers",val(p,"Program_Manager__c"));
    return '<tr class="'+(isSel("program",p)?"sel":"")+'"><td><button type="button" class="art" data-open="program:'+esc(p.id)+'">'+esc(nm(p))+"</button>"+draftBadge(p)+(val(p,"pmdm__ShortSummary__c")?'<span class="sub">'+esc(String(val(p,"pmdm__ShortSummary__c")).slice(0,110))+"</span>":"")+"</td><td>"+statusPill(val(p,"pmdm__Status__c"))+"</td><td>"+esc(mgr||"Not set")+"</td><td>"+dates(p)+"</td><td>"+(prop?(pc.total?esc(pc.done+" of "+pc.total+" sections"):"Not confirmed"):vis(cohortsOf(p)).length)+"</td><td>"+wfCell(p)+"</td></tr>"}).join("")+"</tbody></table></div>";
}
function dates(r){var s=val(r,"pmdm__StartDate__c"),e=val(r,"pmdm__EndDate__c");if(!s&&!e)return '<span class="note">No dates</span>';return esc((s?fmtDate(s):"No start")+" – "+(e?fmtDate(e):"no end"))}
function seatsCell(c){var cap=val(c,"Cohort_Capacity__c"),en=enrolled(c),so=c.seatsOpen;var h=(cap==null||cap===""?"No capacity":esc(cap)+" seats")+'<span class="sub">'+(en==null?"Enrolled not confirmed":en+" enrolled or active")+"</span>";if(so!=null&&so<0)h+='<span class="sub warnt">Over capacity by '+(-so)+"</span>";else if(so!=null)h+='<span class="sub">'+so+" open</span>";return h}
function cohortTable(rows){
  if(!rows.length)return '<div class="card empty">Nothing here'+(V.q?" for this search":"")+".</div>";
  return '<div class="card tablewrap"><table><thead><tr><th>Cohort</th><th>Program</th><th>Status</th><th>Dates</th><th>Seats</th><th>Coach</th><th>Approval and delivery</th></tr></thead><tbody>'+rows.map(function(c){var p=progOf(c);
    return '<tr class="'+(isSel("cohort",c)?"sel":"")+'"><td><button type="button" class="art" data-open="cohort:'+esc(c.id)+'">'+esc(nm(c))+"</button>"+draftBadge(c)+"</td><td>"+(p?'<button type="button" class="linkbtn" data-open="program:'+esc(p.id)+'">'+esc(nm(p))+"</button>":"Not confirmed")+"</td><td>"+statusPill(val(c,"pmdm__Status__c"))+"</td><td>"+dates(c)+"</td><td>"+seatsCell(c)+"</td><td>"+esc(lookName("coaches",val(c,"Coach__c"))||"Not set")+"</td><td>"+wfCell(c)+"</td></tr>"}).join("")+"</tbody></table></div>";
}
function mixedTable(rows){
  if(!rows.length)return '<div class="card empty">Nothing here.</div>';
  return '<div class="card tablewrap"><table><thead><tr><th>Record</th><th>Type</th><th>Status</th><th>Draft</th><th>Approval and delivery</th></tr></thead><tbody>'+rows.map(function(r){var k=kindOf(r);
    return '<tr class="'+(isSel(k,r)?"sel":"")+'"><td><button type="button" class="art" data-open="'+k+":"+esc(r.id)+'">'+esc(nm(r))+"</button>"+(k==="cohort"&&progOf(r)?'<span class="sub">'+esc(nm(progOf(r)))+"</span>":"")+"</td><td>"+(k==="program"?"Program":"Cohort")+"</td><td>"+statusPill(val(r,"pmdm__Status__c"))+"</td><td>"+(r.draft?esc((r.draft.author||"")+(r.draft.updatedAt?" · "+fmtWhen(r.draft.updatedAt):"")):'<span class="note">None</span>')+"</td><td>"+wfCell(r)+(r.issues.length?'<span class="sub warnt">'+r.issues.length+" issue"+(r.issues.length===1?"":"s")+"</span>":"")+"</td></tr>"}).join("")+"</tbody></table></div>";
}
function wfCell(r){var a=r.workflow.approval,d=r.workflow.delivery;return '<span class="sub" style="color:var(--ink)">'+esc(a&&a.label||"Approval not confirmed")+'</span><span class="sub">'+esc(d&&d.label||"Delivery not confirmed")+"</span>"}
function overview(){
  var h='<div class="tiles">';
  var st={};VIEWS.programs().forEach(function(p){var s=val(p,"pmdm__Status__c")||"No status";st[s]=(st[s]||0)+1});
  h+='<div class="tile"><span class="tl">Programs by status</span><span class="stl">'+Object.keys(st).map(function(s){return '<button type="button" class="linkbtn" data-pstatus="'+esc(s)+'">'+esc(s)+" "+st[s]+"</button>"}).join("")+"</span></div>";
  var t0=today(),soon=VIEWS.cohorts().filter(function(c){var s=dnum(val(c,"pmdm__StartDate__c"));return s!=null&&s>=t0&&s<=t0+90});
  h+='<button type="button" class="tile" data-view="calendar"><span class="tl">Cohorts starting in 90 days</span><span class="tv">'+soon.length+"</span></button>";
  var open=0,unk=0;VIEWS.cohorts().forEach(function(c){var s=val(c,"pmdm__Status__c");if(s!=="Planned"&&s!=="Active")return;if(c.seatsOpen==null)unk++;else if(c.seatsOpen>0)open+=c.seatsOpen});
  h+='<button type="button" class="tile" data-view="cohorts"><span class="tl">Open seats in planned and active cohorts</span><span class="tv">'+open+'</span><span class="ts">'+(unk?unk+" cohort"+(unk===1?"":"s")+" with capacity not confirmed":"")+"</span></button>";
  h+='<button type="button" class="tile" data-view="approve"><span class="tl">Waiting for approval</span><span class="tv">'+VIEWS.approve().length+"</span></button>";
  h+='<button type="button" class="tile'+(VIEWS.problems().length?" bad":"")+'" data-view="problems"><span class="tl">Needs attention</span><span class="tv">'+VIEWS.problems().length+'</span><span class="ts">issues or delivery problems</span></button>';
  h+="</div>";
  h+='<section class="card ovc"><div class="ovh"><h3>Cohorts starting soon</h3></div>'+(soon.length?'<div class="list">'+soon.sort(function(a,b){return dnum(val(a,"pmdm__StartDate__c"))-dnum(val(b,"pmdm__StartDate__c"))}).map(function(c){var p=progOf(c);return '<button type="button" class="item" data-open="cohort:'+esc(c.id)+'"><span><span class="t">'+esc(nm(c))+'</span><span class="k">'+esc(p?nm(p):"")+"</span></span><span class=\"note\">"+esc(fmtDate(val(c,"pmdm__StartDate__c")))+"</span></button>"}).join("")+"</div>":'<p class="note">No cohort starts in the next 90 days.</p>')+"</section>";
  var miss=D.programs.filter(function(p){var s=val(p,"pmdm__Status__c");return s!=="Canceled"&&s!=="Completed"&&(!val(p,"Program_Manager__c")||!val(p,"pmdm__StartDate__c"))});
  if(miss.length)h+='<section class="card ovc"><div class="ovh"><h3>Programs missing a manager or start date</h3></div><div class="list">'+miss.map(function(p){return '<button type="button" class="item" data-open="program:'+esc(p.id)+'"><span class="t">'+esc(nm(p))+'</span><span class="note">'+esc([!val(p,"Program_Manager__c")?"No manager":"",!val(p,"pmdm__StartDate__c")?"No start date":""].filter(Boolean).join(" · "))+"</span></button>"}).join("")+"</div></section>";
  return h;
}
function calendar(){
  var rows=VIEWS.cohorts().filter(function(c){return dnum(val(c,"pmdm__StartDate__c"))!=null});
  var h="";
  var none=VIEWS.cohorts().filter(function(c){return dnum(val(c,"pmdm__StartDate__c"))==null});
  if(!rows.length)return h+'<div class="card empty">No cohorts with a start date.</div>';
  rows.sort(function(a,b){return dnum(val(a,"pmdm__StartDate__c"))-dnum(val(b,"pmdm__StartDate__c"))});
  var lo=Infinity,hi=-Infinity;rows.forEach(function(c){var s=dnum(val(c,"pmdm__StartDate__c")),e=dnum(val(c,"pmdm__EndDate__c"));lo=Math.min(lo,s);hi=Math.max(hi,e!=null?e:s+30)});
  var d0=new Date(lo*864e5),start=Date.UTC(d0.getUTCFullYear(),d0.getUTCMonth(),1)/864e5,d1=new Date(hi*864e5),end=Date.UTC(d1.getUTCFullYear(),d1.getUTCMonth()+1,1)/864e5,span=end-start,months=[];
  for(var y=d0.getUTCFullYear(),mo=d0.getUTCMonth();Date.UTC(y,mo,1)/864e5<end;mo++){if(mo>11){mo=0;y++}months.push({y:y,m:mo,at:(Date.UTC(y,mo,1)/864e5-start)/span*100})}
  var pct=function(x){return ((x-start)/span*100).toFixed(2)+"%"},t0=today();
  h+='<div class="card cal"><div class="calhead"><span></span><div class="calaxis">'+months.map(function(m,i){return '<span style="left:'+m.at.toFixed(2)+'%">'+(i===0||m.m===0?MON[m.m]+" "+m.y:MON[m.m])+"</span>"}).join("")+"</div></div>";
  h+=rows.map(function(c){var s=dnum(val(c,"pmdm__StartDate__c")),e=dnum(val(c,"pmdm__EndDate__c")),st=val(c,"pmdm__Status__c"),p=progOf(c);
    return '<div class="calrow"><button type="button" class="art callabel" data-open="cohort:'+esc(c.id)+'">'+esc(nm(c))+'<span class="sub">'+esc(p?nm(p):"")+'</span></button><div class="caltrack">'+(t0>=start&&t0<=end?'<i class="caltoday" style="left:'+pct(t0)+'"></i>':"")+'<span class="calbar st-'+esc(String(st||"").replace(/\s+/g,""))+(e==null?" open":"")+'" style="left:'+pct(s)+";width:max(6px,"+(((e!=null?e:s+30)-s)/span*100).toFixed(2)+'%)" title="'+esc(fmtDate(val(c,"pmdm__StartDate__c"))+" – "+(e!=null?fmtDate(val(c,"pmdm__EndDate__c")):"no end date")+" · "+(st||""))+'"></span></div></div>'}).join("");
  h+='<p class="note" style="margin:8px 12px 12px">Bars run from start to end date; a faded end means no end date is set. The thin line is today.'+(none.length?" "+none.length+" cohort"+(none.length===1?" has":"s have")+" no start date and "+(none.length===1?"isn’t":"aren’t")+" shown.":"")+"</p></div>";
  return h;
}

/* ---------- panel ---------- */
function renderPanel(){
  var p=$("panel"),y=p.scrollTop,s=V.sel,h="";
  if(!s){p.hidden=true;p.classList.remove("focus");return}
  if(s.kind==="new")h=newPanel();
  else{var r=rec(s.kind,s.id);if(!r){V.sel=null;p.hidden=true;return}h=s.kind==="program"?programPanel(r):cohortPanel(r)}
  p.hidden=false;p.classList.toggle("focus",!!V.focus);p.innerHTML=h;p.scrollTop=y;
}
function head(kick,title,sub,badges){
  return '<div class="ph"><div class="row"><div><div class="kick">'+esc(kick)+"</div><h3>"+esc(title)+"</h3>"+(badges?'<div class="vtools">'+badges+"</div>":"")+(sub?'<div class="note">'+sub+"</div>":"")+'</div><div class="phbtns">'+(V.sel&&V.sel.kind!=="new"?'<button type="button" class="x" id="focusbtn" aria-label="'+(V.focus?"Exit focus mode":"Open in focus mode")+'" title="'+(V.focus?"Exit focus mode (Esc)":"Focus mode")+'">'+(V.focus?"⤡":"⤢")+"</button>":"")+'<button type="button" class="x" id="close" aria-label="Close panel">×</button></div></div>';
}
function errBox(key){var e=V.errs[key];if(!e)return "";return '<div class="box warn errbox" role="alert"><b>'+esc(e.code==="preview_only"?"Preview only":"Not done")+"</b> "+esc(e.message)+"</div>"}
function guidance(r){
  var g=r.workflow.guidance;if(!g||typeof g.message!=="string")return "";
  var tone=g.tone||"info",alert=tone==="warning"||tone==="error",a=g.action||{kind:"none"},k=a.kind,btn="";
  var ok={open_article:1,compare:1,check_status:1,retry_delivery:D.viewer.isStaff,open_salesforce:!!r.salesforceId,refresh_data:1};
  if(k&&k!=="none"&&a.label&&ok[k])btn='<button type="button" class="btn '+(alert?"solid":"ghost")+' sm" data-gd="'+esc(k)+'"'+(!a.enabled||busy["gd:"+r.id]?" disabled":"")+">"+esc(busy["gd:"+r.id]?"Working…":a.label)+"</button>";
  else if(k==="retry_delivery"&&!D.viewer.isStaff)btn='<span class="note">Staff handle this step.</span>';
  var h='<section class="gd gd-'+esc(tone)+'" role="'+(alert?"alert":"status")+'"><div class="gdrow"><div class="gdtxt"><p class="gdmsg">'+esc(g.message)+"</p>"+(g.nextStep?'<p class="gdnext">'+esc(g.nextStep)+"</p>":"")+(g.nextAttemptAt&&fmtWhen(g.nextAttemptAt)?'<p class="gdnext">Next scheduled check: <time datetime="'+esc(g.nextAttemptAt)+'">'+esc(fmtWhen(g.nextAttemptAt))+"</time></p>":"")+"</div>"+btn+"</div>";
  var s=g.support;if(s&&s.error)h+='<details class="wfd"><summary>Details for support</summary><div class="wf-error">'+esc(s.error)+'</div><div class="kv"><span>Attempt</span><b>'+esc(s.attemptedAt?fmtWhen(s.attemptedAt):"Not recorded")+'</b></div><div class="kv"><span>Salesforce version</span><b class="mono">'+esc(s.receiptVersionId||"Not recorded")+"</b></div></details>";
  return h+errBox("gd:"+r.id)+"</section>";
}
function issuesHtml(r){if(!r.issues.length)return "";return '<div class="issues">'+r.issues.map(function(x){return '<div class="issue '+(x.severity==="block"?"block":"")+'"><span class="meta">'+(x.severity==="block"?"Blocks delivery":"Check")+"</span><div>"+esc(x.text)+"</div></div>"}).join("")+"</div>"}
function tabsHtml(tabs,tab){return '<div class="tabs" role="tablist">'+tabs.map(function(t){return '<button type="button" role="tab" data-tab="'+t[0]+'" aria-selected="'+(tab===t[0])+'">'+esc(t[1])+"</button>"}).join("")+"</div>"}
function programPanel(p){
  var tab=V.tab||"overview";V.tab=tab;
  var sub=esc(val(p,"pmdm__Status__c")||"No status")+" · "+dates(p)+(val(p,"Program_Manager__c")?" · Manager: "+esc(lookName("managers",val(p,"Program_Manager__c"))):"");
  var h=head("Program",nm(p),sub,statusPill(val(p,"pmdm__Status__c"))+draftBadge(p))+guidance(p)+issuesHtml(p)+"</div>";
  var tabs=[["overview","Overview"],["plan","Plan"],["resources","Resources"],["cohorts","Cohorts · "+vis(cohortsOf(p)).length],["courses","Courses"],["approval","Approval"+(p.changes.length?" · "+p.changes.length:"")],["sync","Sync"]];
  var th=tabsHtml(tabs,tab);
  if(V.focus)h='<div class="fside">'+h+th+"</div>";else h+=th;
  var body={overview:pOverview,plan:function(x){return fieldsTab(x,"program",P_TABS.plan,"Plan")},resources:pResources,cohorts:pCohorts,courses:pCourses,approval:approvalTab,sync:syncTab}[tab](p);
  return h+'<div class="pb">'+body+"</div>";
}
function cohortPanel(c){
  var tab=V.tab||"details";V.tab=tab;var p=progOf(c);
  var sub=(p?'Program: <button type="button" class="linkbtn" data-open="program:'+esc(p.id)+'">'+esc(nm(p))+"</button> · ":"")+dates(c);
  var h=head("Cohort",nm(c),sub,statusPill(val(c,"pmdm__Status__c"))+draftBadge(c))+guidance(c)+issuesHtml(c)+"</div>";
  var tabs=[["details","Details"],["roster","Roster"],["approval","Approval"+(c.changes.length?" · "+c.changes.length:"")],["sync","Sync"]];
  var th=tabsHtml(tabs,tab);
  if(V.focus)h='<div class="fside">'+h+th+"</div>";else h+=th;
  var body={details:function(x){return statusBlock(x,"cohort")+fieldsTab(x,"cohort",C_FIELDS,"Details")},roster:cRoster,approval:approvalTab,sync:syncTab}[tab](c);
  return h+'<div class="pb">'+body+"</div>";
}
function form(id){return V.forms[id]=V.forms[id]||{}}
function fieldInput(r,kind,f){
  var def=(kind==="program"?PF:CF)[f],fm=form(r.id),cur=Object.prototype.hasOwnProperty.call(fm,f)?fm[f]:val(r,f),ed=canEditRec(r),dis=ed?"":" disabled",key=' data-fld="'+esc(f)+'"',h='<div class="fld"><label class="f">'+esc(def.l);
  if(def.k==="rich")return richField(r,f,def,cur,ed);
  if(def.k==="area"){var tv=cur==null?"":cur;h+='<textarea'+key+dis+' rows="3">'+esc(tv)+"</textarea>"}
  else if(def.k==="date")h+='<input type="date"'+key+' value="'+esc(cur||"")+'"'+dis+">";
  else if(def.k==="int")h+='<input type="number" min="0" step="1"'+key+' value="'+esc(cur==null?"":cur)+'"'+dis+">";
  else if(def.k==="bool")h+='<span class="checks"><label><input type="checkbox"'+key+(cur?" checked":"")+dis+">Yes</label></span>";
  else if(def.k==="pick"){var L=D.lists[def.list]||[];h+=L.length?'<select'+key+dis+">"+opt(L,cur||"","Not set")+(cur&&L.indexOf(cur)<0?'<option value="'+esc(cur)+'" selected>'+esc(cur)+"</option>":"")+"</select>":'<span class="note">Choices not available from Salesforce. '+esc(cur||"")+"</span>"}
  else if(def.k==="look"){var LL=D.lists[def.list]||[];h+='<select'+key+dis+">"+opt(LL,cur||"","Not set",function(o){return o.name},function(o){return o.id})+(cur&&!LL.some(function(o){return o.id===cur})?'<option value="'+esc(cur)+'" selected>Unknown ('+esc(cur)+")</option>":"")+"</select>"}
  else h+='<input type="'+(def.k==="url"?"url":"text")+'"'+key+' value="'+esc(cur==null?"":cur)+'"'+(def.max?' maxlength="'+def.max+'"':"")+dis+">";
  h+="</label>";
  if(r.salesforceId&&(inDraft(r,f)||Object.prototype.hasOwnProperty.call(fm,f))){var lv=show(def,live(r,f));h+='<span class="note was">In Salesforce: '+esc(lv?(lv.length>140?lv.slice(0,140)+"…":lv):"blank")+"</span>"}
  return h+"</div>";
}
function saveBar(r){var fm=form(r.id),dirty=Object.keys(fm).length,key="save:"+r.id;
  return '<div class="btnrow savebar" id="savebar"><button type="button" class="btn solid" data-save="'+esc(r.id)+'"'+(!dirty||busy[key]?" disabled":"")+">"+(busy[key]?"Saving\u2026":"Save draft")+"</button>"+(dirty?'<button type="button" class="btn ghost" data-undo="'+esc(r.id)+'">Undo changes</button><span class="note">'+dirty+" unsaved change"+(dirty===1?"":"s")+"</span>":'<span class="note">No unsaved changes</span>')+"</div>"}
function refreshSaveBar(r){var el=$("savebar");if(el)el.outerHTML=saveBar(r);Array.prototype.forEach.call(document.querySelectorAll("[data-jump]"),function(b){b.classList.toggle("ed",Object.prototype.hasOwnProperty.call(form(r.id),b.dataset.jump))})}
/* ---------- rich text sections ---------- */
var RT_OK={P:1,BR:1,B:1,STRONG:1,I:1,EM:1,U:1,UL:1,OL:1,LI:1,H2:1,H3:1,H4:1,A:1,TABLE:1,THEAD:1,TBODY:1,TR:1,TH:1,TD:1,BLOCKQUOTE:1,DIV:1,IMG:1};
var RT_DROP=/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|META|LINK|SVG|MATH|FORM|INPUT|BUTTON|TEXTAREA|SELECT|TEMPLATE|NOSCRIPT)$/;
function rtWalk(n){Array.prototype.slice.call(n.childNodes).forEach(function(c){
  if(c.nodeType===3)return;if(c.nodeType!==1){c.parentNode.removeChild(c);return}
  var t=c.tagName;if(RT_DROP.test(t)){c.parentNode.removeChild(c);return}
  rtWalk(c);
  if(!RT_OK[t]){while(c.firstChild)c.parentNode.insertBefore(c.firstChild,c);c.parentNode.removeChild(c);return}
  Array.prototype.slice.call(c.attributes).forEach(function(a){var nm=a.name.toLowerCase(),keep=(t==="A"&&nm==="href"&&/^(https?:|mailto:)/i.test(a.value))||(t==="IMG"&&(nm==="src"&&/^https:/i.test(a.value)||nm==="alt"))||((t==="TD"||t==="TH")&&(nm==="colspan"||nm==="rowspan"));if(!keep)c.removeAttribute(a.name)});
  if(t==="IMG"&&!c.getAttribute("src"))c.parentNode.removeChild(c);
})}
function rtClean(html){if(html==null||html==="")return "";var s=String(html);if(!/[<&]/.test(s))s=toRich(s);try{var doc=new DOMParser().parseFromString("<body>"+s+"</body>","text/html");rtWalk(doc.body);return doc.body.innerHTML.trim()}catch(e){return esc(s)}}
function rtEmpty(html){return !txt(html).replace(/\s+/g,"")&&!/<(img|table)/i.test(html||"")}
var RT_TOOLS=[["bold","B","Bold"],["italic","I","Italic"],["h3","H","Heading"],["ul","\u2022 List","Bulleted list"],["ol","1. List","Numbered list"],["link","Link","Add link"],["clear","Clear","Clear formatting"]];
function richField(r,f,def,cur,ed){
  var fm=form(r.id),changed=Object.prototype.hasOwnProperty.call(fm,f),html=rtClean(cur),id="rt-"+f;
  var h='<section class="fld rtf'+(changed?" ed":"")+'" id="sec-'+esc(f)+'"><div class="rth"><span class="rtl" id="'+id+'-l">'+esc(def.l)+"</span>"+(changed?'<span class="vbadge">Edited</span>':inDraft(r,f)&&r.salesforceId?'<span class="vbadge pub">In draft</span>':"")+"</div>";
  if(ed){h+='<div class="tool" role="toolbar" aria-label="'+esc(def.l)+' formatting">'+RT_TOOLS.map(function(x){return '<button type="button" data-rt="'+x[0]+'" data-for="'+esc(f)+'" title="'+x[2]+'" aria-label="'+x[2]+'">'+(x[0]==="bold"?"<b>B</b>":x[0]==="italic"?"<i>I</i>":esc(x[1]))+"</button>"}).join("");
    h+="</div>"}
  h+='<div class="rte'+(ed?"":" ro")+'" id="'+id+'" data-rich="'+esc(f)+'" role="textbox" aria-multiline="true" aria-labelledby="'+id+'-l" contenteditable="'+(ed?"true":"false")+'">'+html+"</div>";
  if(!ed&&rtEmpty(html))h+='<p class="note">Not filled in.</p>';
  return h+"</section>";
}
function rtInput(el){var r=rec(V.sel.kind,V.sel.id);if(!r)return;var f=el.dataset.rich,fm=form(r.id),cur=rtClean(el.innerHTML),orig=rtClean(val(r,f));
  var same=cur===orig||(rtEmpty(cur)&&rtEmpty(orig));if(same)delete fm[f];else fm[f]=el.innerHTML;
  var sec=$("sec-"+f);if(sec){sec.classList.toggle("ed",!same);var b=sec.querySelector(".rth .vbadge");if(!same&&!b){var n=document.createElement("span");n.className="vbadge";n.textContent="Edited";sec.querySelector(".rth").appendChild(n)}else if(same&&b&&b.textContent==="Edited")b.parentNode.removeChild(b)}
  refreshSaveBar(r)}
var rtRange=null;
function rtSave(){var s=window.getSelection();if(s&&s.rangeCount){var n=s.anchorNode,el=n&&(n.nodeType===1?n:n.parentNode);if(el&&el.closest&&el.closest("[data-rich]"))rtRange=s.getRangeAt(0).cloneRange()}}
function rtRestore(el){el.focus();if(rtRange&&el.contains(rtRange.startContainer)){var s=window.getSelection();s.removeAllRanges();try{s.addRange(rtRange)}catch(e){}}}
function rtLinkBar(){V.linkFor=null;var x=document.querySelector(".rtlink");if(x)x.parentNode.removeChild(x)}
function rtCmd(k,f){var el=$("rt-"+f);if(!el)return;
  if(k==="link"){rtLinkBar(null);V.linkFor=f;var tb=el.parentNode.querySelector(".tool");if(tb){var sp=document.createElement("span");sp.className="rtlink";sp.innerHTML='<input type="url" id="rtlinkurl" placeholder="https://" aria-label="Link address"><button type="button" data-rt="linkok" data-for="'+esc(f)+'">Add</button><button type="button" data-rt="linkcancel" data-for="'+esc(f)+'">Cancel</button>';tb.appendChild(sp);$("rtlinkurl").focus()}return}
  if(k==="linkcancel"){rtLinkBar(null);rtRestore(el);return}
  if(k==="linkok"){var u=(($("rtlinkurl")||{}).value||"").trim();if(!/^https:\/\/\S+$/.test(u)){toast("Use a full link that starts with https://");return}rtLinkBar(null);rtRestore(el);var s=window.getSelection();if(s&&s.isCollapsed)document.execCommand("insertHTML",false,'<a href="'+esc(u)+'">'+esc(u)+"</a>");else document.execCommand("createLink",false,u);rtInput(el);return}
  rtRestore(el);
  if(k==="bold")document.execCommand("bold");else if(k==="italic")document.execCommand("italic");
  else if(k==="h3"){var blk=document.queryCommandValue("formatBlock");document.execCommand("formatBlock",false,/h3/i.test(blk)?"p":"h3")}
  else if(k==="ul")document.execCommand("insertUnorderedList");else if(k==="ol")document.execCommand("insertOrderedList");
  else if(k==="clear"){document.execCommand("removeFormat");document.execCommand("formatBlock",false,"p")}
  rtInput(el);
}
document.addEventListener("paste",function(e){var el=e.target.closest&&e.target.closest("[data-rich]");if(!el||el.getAttribute("contenteditable")!=="true")return;e.preventDefault();var cd=e.clipboardData,h=cd.getData("text/html"),t=cd.getData("text/plain");document.execCommand("insertHTML",false,h?rtClean(h):toRich(t));rtInput(el)});
document.addEventListener("mousedown",function(e){var b=e.target.closest&&e.target.closest("[data-rt]");if(b&&b.dataset.rt!=="linkok"&&b.dataset.rt!=="linkcancel"){rtSave();e.preventDefault()}});
document.addEventListener("selectionchange",rtSave);
function fieldsTab(r,kind,fields,label){
  var ed=canEditRec(r),fm=form(r.id),dirty=Object.keys(fm).length,key="save:"+r.id;
  var h="";
  if(!r.perms.edit)h+='<p class="note">You can view this '+kind+". Changes need program edit access.</p>";
  else if(locked(r))h+='<p class="note">This '+kind+"’s draft is "+(draftSt(r)==="approved"?"approved and being delivered":"waiting for approval")+", so it can’t be edited now.</p>";
  var rich=fields.filter(function(f){return ((kind==="program"?PF:CF)[f]||{}).k==="rich"});
  if(rich.length>=3)h+='<nav class="jump" aria-label="Sections"><span class="note">Jump to</span>'+rich.map(function(f){return '<button type="button" class="chipb'+(Object.prototype.hasOwnProperty.call(fm,f)?" ed":"")+'" data-jump="'+esc(f)+'">'+esc((kind==="program"?PF:CF)[f].l)+"</button>"}).join("")+"</nav>";
  h+=fields.map(function(f){return fieldInput(r,kind,f)}).join("");
  if(ed)h+=saveBar(r)+errBox(key)+'<p class="note">Saving keeps a draft in Trail OS. Salesforce changes only after someone else approves it.</p>';
  return h;
}
function linkRow(p){var b="";if(p.salesforceId)b+='<button type="button" class="btn ghost sm" data-rec="salesforce" data-id="'+esc(p.id)+'">Open in Salesforce ↗</button>';if(val(p,"Google_Drive_Folder__c"))b+='<button type="button" class="btn ghost sm" data-rec="drive" data-id="'+esc(p.id)+'">Drive folder ↗</button>';if(val(p,"Canva_Folder__c"))b+='<button type="button" class="btn ghost sm" data-rec="canva" data-id="'+esc(p.id)+'">Canva folder ↗</button>';return b?'<div class="btnrow">'+b+"</div>"+errBox("rec:"+p.id):""}
function pOverview(p){
  var pc=p.proposalCompleteness,h=linkRow(p);
  if(pc&&pc.total){h+='<div class="box"><div class="sfh"><b>Proposal</b><span class="note">'+pc.done+" of "+pc.total+' sections</span></div><div class="pbar"><i style="width:'+Math.round(100*pc.done/pc.total)+'%"></i></div>'+(pc.missing&&pc.missing.length?'<p class="note" style="margin:6px 0 0">Still missing: '+esc(pc.missing.join(", "))+"</p>":'<p class="ok" style="margin:6px 0 0">Every proposal section is filled in.</p>')+"</div>"}
  h+=statusBlock(p,"program");
  return h+fieldsTab(p,"program",P_TABS.overview,"Overview");
}
function pResources(p){return linkRow(p)+fieldsTab(p,"program",P_TABS.resources,"Resources")}
function pCourses(p){var c=p.courses||[];return '<p class="note">Courses come from Salesforce Program Courses and are read-only here.</p>'+(c.length?'<ul class="plain">'+c.map(function(x){return "<li>"+esc(x.name)+"</li>"}).join("")+"</ul>":'<p class="note">No courses linked to this program.</p>')}
function statusBlock(r,kind){
  var cur=val(r,"pmdm__Status__c"),moves=locked(r)?[]:(r.perms.changeStatus||[]).filter(function(s){return s!==cur}),f=form("st:"+r.id),key="status:"+r.id;
  var h='<div class="box stbox"><div class="sfh"><b>Status</b>'+statusPill(cur)+"</div>";
  if(!moves.length){h+='<p class="note" style="margin:4px 0 0">'+(locked(r)?"Status can’t change while a draft is waiting for approval or being delivered.":"No status change is available to you right now.")+"</p></div>";return h}
  h+='<label class="f">Change to<select data-st="to">'+opt(moves,f.to||"","Choose a status")+"</select></label>";
  if(f.to==="Canceled"||f.to)h+='<label class="f">Reason'+(f.to==="Canceled"?" (required, 10 characters or more)":" (optional)")+'<textarea data-st="reason" rows="2">'+esc(f.reason||"")+"</textarea></label>";
  if(kind==="cohort"&&f.to==="Active"){var p=progOf(r);if(p&&val(p,"pmdm__Status__c")!=="Active")h+='<p class="note warnt">The program isn’t Active yet, so Trail OS will refuse this.</p>'}
  h+='<div class="btnrow"><button type="button" class="btn ghost sm" data-stgo="'+esc(r.id)+'"'+(!f.to||busy[key]?" disabled":"")+">"+(busy[key]?"Requesting…":"Request status change")+'</button></div><p class="note" style="margin:0">A status change is a draft too: it reaches Salesforce only after approval.</p>'+errBox(key)+"</div>";
  return h;
}
function pCohorts(p){
  var cs=cohortsOf(p),shown=vis(cs),nh=cs.length-shown.length,h=(shown.length?'<div class="list card">'+shown.map(function(c){return '<button type="button" class="item" data-open="cohort:'+esc(c.id)+'"><span><span class="t">'+esc(nm(c))+'</span><span class="k">'+dates(c)+"</span></span><span>"+statusPill(val(c,"pmdm__Status__c"))+"</span></button>"}).join("")+"</div>":'<p class="note">'+(cs.length?"No open cohorts.":"No cohorts yet.")+"</p>")+(nh?'<p class="note">'+nh+" archived or canceled cohort"+(nh===1?" is":"s are")+' hidden. <button type="button" class="linkbtn" data-showclosed="1">Show them</button></p>':"");
  if(!p.perms.edit)return h;
  if(!p.salesforceId)return h+'<p class="note">Cohorts can be added once this program has been approved and delivered to Salesforce.</p>';
  var f=form("nc:"+p.id),key="newc:"+p.id;
  h+='<div class="box newc"><b>Add a cohort</b><label class="f">Copy from an earlier cohort (optional)<select data-nc="copy">'+opt(cs,f.copy||"","Start blank",function(c){return nm(c)},function(c){return c.id})+"</select></label>";
  h+='<label class="f">Cohort name<input type="text" maxlength="255" data-nc="Name" value="'+esc(f.Name||"")+'"></label>';
  if(f.copy)h+='<p class="note" style="margin:0">A copy starts Planned with blank dates and no learners. Add the dates after it’s created.</p>';
  else h+='<div class="grid2"><label class="f">Start date<input type="date" data-nc="pmdm__StartDate__c" value="'+esc(f.pmdm__StartDate__c||"")+'"></label><label class="f">End date<input type="date" data-nc="pmdm__EndDate__c" value="'+esc(f.pmdm__EndDate__c||"")+'"></label></div>';
  h+='<div class="grid2"><label class="f">Capacity<input type="number" min="0" step="1" data-nc="Cohort_Capacity__c" value="'+esc(f.Cohort_Capacity__c||"")+'"></label><label class="f">Coach<select data-nc="Coach__c">'+opt(D.lists.coaches,f.Coach__c||"","Not set",function(o){return o.name},function(o){return o.id})+"</select></label></div>";
  if(D.lists.recordTypes.length)h+='<label class="f">Record type<select data-nc="RecordTypeId">'+opt(D.lists.recordTypes,f.RecordTypeId||"","Default",function(o){return o.name},function(o){return o.id})+"</select></label>";
  h+='<div class="btnrow"><button type="button" class="btn solid sm" data-newc="'+esc(p.id)+'"'+(!(f.Name||"").trim()||busy[key]?" disabled":"")+">"+(busy[key]?"Creating…":"Create cohort draft")+'</button></div><p class="note" style="margin:0">The new cohort is a draft. It reaches Salesforce after approval.</p>'+errBox(key)+"</div>";
  return h;
}
function cRoster(c){
  var cap=val(c,"Cohort_Capacity__c"),en=enrolled(c),so=c.seatsOpen;
  var h='<div class="kv"><span>Capacity</span><b>'+(cap==null||cap===""?"Not set":esc(cap))+'</b></div><div class="kv"><span>Enrolled or active</span><b>'+(en==null?"Not confirmed":en)+'</b></div><div class="kv"><span>Open seats</span><b>'+(so==null?"Not confirmed":so<0?"Over capacity by "+(-so):so)+"</b></div>";
  if(so!=null&&so<0)h+='<div class="box warn">This cohort has more enrolled and active learners than its capacity. That’s a warning only; nothing is blocked.</div>';
  h+='<div class="sec">Learners by stage</div>'+(c.roster.length?'<table class="cmp"><tbody>'+c.roster.map(function(x){return "<tr><td>"+esc(x.stage)+'</td><td style="text-align:right">'+esc(x.count)+"</td></tr>"}).join("")+"</tbody></table>":'<p class="note">No learners recorded for this cohort.</p>');
  return h+'<p class="note">Counts are read-only and come from Salesforce program engagements. Applied doesn’t count as enrolled.</p>';
}
function chgVal(kind,f,v){var def=(kind==="program"?PF:CF)[f]||{l:f,k:"text"};var s=show(def,v);return s?(s.length>300?s.slice(0,300)+"…":s):"Blank"}
function approvalTab(r){
  var kind=kindOf(r),a=r.workflow.approval||{},d=r.draft,h="";
  h+='<div class="kv"><span>Approval</span><b>'+esc(a.label||"Not confirmed")+"</b></div>";
  if(!d)h+='<p class="note">No draft. '+(r.salesforceId?"The values shown are what Salesforce holds.":"")+"</p>";
  else{
    h+='<div class="kv"><span>Draft by</span><b>'+esc(d.author||"Unknown")+(d.updatedAt?" · "+esc(fmtWhen(d.updatedAt)):"")+"</b></div>";
    if(d.note)h+='<blockquote>'+esc(d.note)+"</blockquote>";
  }
  var ch=r.changes;
  h+='<div class="sec">What changes in Salesforce</div>'+(ch.length?'<table class="cmp"><thead><tr><th>Field</th><th>Salesforce now</th><th>Draft</th></tr></thead><tbody>'+ch.map(function(c){var lab=((kind==="program"?PF:CF)[c.field]||{l:c.field}).l;return "<tr><td>"+esc(lab)+'</td><td class="o">'+esc(r.salesforceId?chgVal(kind,c.field,c.from):"New")+'</td><td class="n">'+esc(chgVal(kind,c.field,c.to))+"</td></tr>"}).join("")+"</tbody></table>":'<p class="note">No changes to send.</p>');
  if(!d)return h;
  var st=d.status,b="";
  if(r.perms.submit&&(st==="draft"||st==="returned"))b+='<button type="button" class="btn solid sm" data-submit="'+esc(r.id)+'"'+(busy["sub:"+r.id]?" disabled":"")+">"+(busy["sub:"+r.id]?"Sending…":"Send for approval")+"</button>";
  if(st!=="approved"&&(isMine(r)||D.viewer.isStaff))b+='<button type="button" class="btn ghost sm" data-discard="'+esc(r.id)+'"'+(busy["dis:"+r.id]?" disabled":"")+">"+(!r.salesforceId?"Discard edits":"Discard draft")+"</button>";
  if(b)h+='<div class="btnrow">'+b+"</div>"+errBox("sub:"+r.id)+errBox("dis:"+r.id);
  if(st!=="approved"&&!r.salesforceId)h+='<p class="note" style="margin:0">Discarding edits to an unsent '+kind+' restores its original intake draft. To drop the proposal, request the Canceled status with a reason.</p>';
  if(st==="awaiting_approval"){
    if(r.perms.approve){var f=form("ap:"+r.id);
      h+='<div class="box apbox"><b>Review this change</b><label class="f">Note<textarea data-ap="note" rows="2" placeholder="Optional to approve; at least 10 characters to return it">'+esc(f.note||"")+'</textarea></label><div class="btnrow"><button type="button" class="btn solid sm" data-approve="'+esc(r.id)+'"'+(busy["ap:"+r.id]?" disabled":"")+'>Approve</button><button type="button" class="btn ghost sm" data-return="'+esc(r.id)+'"'+(busy["ap:"+r.id]?" disabled":"")+">Return for changes</button></div>"+errBox("ap:"+r.id)+'<p class="note" style="margin:0">Approving queues delivery to Salesforce; it doesn’t write immediately.</p></div>'}
    else h+='<p class="note">'+(isMine(r)?"You edited this draft, so another staff member approves it.":"Another staff member approves this change.")+"</p>";
  }
  if(D.viewer.canSkipReview&&(st==="draft"||st==="returned"||st==="awaiting_approval")){var g=form("an:"+r.id);
    if(!g.open)h+='<div class="btnrow"><button type="button" class="btn ghost sm" data-annow="'+esc(r.id)+'">Approve now (superadmin)</button></div>';
    else h+='<div class="box warn anbox"><b>Approve without the independent review?</b><p class="note" style="margin:0">This records your approval and the reason, then queues delivery. Structural checks still apply.</p><label class="f">Reason (10 characters or more)<textarea data-an="note" rows="2">'+esc(g.note||"")+'</textarea></label><div class="checks"><label><input type="checkbox" data-an="ok"'+(g.ok?" checked":"")+'>I approve this draft without an independent review</label></div><div class="btnrow"><button type="button" class="btn solid sm" data-anconfirm="'+esc(r.id)+'"'+(busy["an:"+r.id]?" disabled":"")+'>Approve now</button><button type="button" class="btn ghost sm" data-ancancel="'+esc(r.id)+'">Cancel</button></div>'+errBox("an:"+r.id)+"</div>";
  }
  return h;
}
function syncTab(r){
  var d=r.workflow.delivery,h='<section class="box sfc"><div class="sfh"><b>Salesforce delivery</b><span class="pill '+(d&&d.status==="live_current"?"p-done":d&&d.status==="needs_attention"?"p-open":"p-review")+'">'+esc(d&&d.label||"Not confirmed")+"</span></div>";
  if(!d)return h+'<p class="note" style="margin:0">Trail OS hasn’t sent a delivery status for this record.</p></section>'+checkRow(r);
  if(d.message)h+='<p class="note" style="margin:0">'+esc(d.message)+"</p>";
  if(d.verifiedAt)h+='<div class="kv"><span>Verified</span><b>'+esc(fmtWhen(d.verifiedAt))+"</b></div>";
  if(d.attemptedAt)h+='<div class="kv"><span>Last attempt</span><b>'+esc(fmtWhen(d.attemptedAt))+"</b></div>";
  if(d.nextAttemptAt)h+='<div class="kv"><span>Next scheduled check</span><b>'+esc(fmtWhen(d.nextAttemptAt))+"</b></div>";
  if(d.error)h+='<details class="wfd"><summary>Details for support</summary><div class="wf-error">'+esc(d.error)+"</div></details>";
  var g=r.workflow.guidance;
  if(d.canRetry&&D.viewer.isStaff&&!(g&&g.wait))h+='<div class="btnrow"><button type="button" class="btn solid sm" data-retry="'+esc(r.id)+'"'+(busy["retry:"+r.id]?" disabled":"")+">"+(busy["retry:"+r.id]?"Queuing…":"Retry delivery")+"</button></div>"+errBox("retry:"+r.id);
  h+='<p class="note" style="margin:0">Delivery writes only the approved changes and reads them back. If Salesforce changed in the meantime, it stops and shows both versions; nothing is overwritten.</p></section>';
  var sch=D.scheduler;if(sch)h+='<p class="note">Delivery worker '+(sch.running?"running":"not running")+(sch.lastRunAt?" · last run "+esc(fmtWhen(sch.lastRunAt)):"")+"</p>";
  return h+checkRow(r);
}
function checkRow(r){return '<div class="btnrow"><button type="button" class="btn ghost sm" data-check="'+esc(r.id)+'"'+(busy["chk:"+r.id]?" disabled":"")+">"+(busy["chk:"+r.id]?"Checking…":"Check Salesforce")+"</button>"+(r.salesforceId?'<button type="button" class="btn ghost sm" data-rec="salesforce" data-id="'+esc(r.id)+'">Open in Salesforce ↗</button>':"")+'</div><p class="note" style="margin:0">Check Salesforce is read-only: it refreshes what Trail OS knows and never sends changes.</p>'+errBox("chk:"+r.id)+errBox("rec:"+r.id)}
function newPanel(){
  var f=form("newp");if(!f.rid)f.rid=uuid();
  var h=head("New program","Propose a program","It starts as an In Discovery draft in Trail OS. Nothing reaches Salesforce until it’s approved.")+'</div><div class="pb">';
  if(!D.viewer.canPropose)return h+'<p class="note">Your access doesn’t include proposing programs.</p></div>';
  h+='<label class="f">Program name<input type="text" maxlength="255" id="np-name" value="'+esc(f.name||"")+'"></label>';
  h+='<label class="f">Short summary<textarea id="np-sum" rows="3" placeholder="Who it serves and what they gain, in a sentence or two">'+esc(f.sum||"")+"</textarea></label>";
  h+='<label class="f">Issue area (optional)'+(D.lists.issueAreas.length?'<select id="np-area">'+opt(D.lists.issueAreas,f.area||"","Not set")+"</select>":'<span class="note">Choices not available from Salesforce.</span>')+"</label>";
  h+='<label class="f">Program manager (optional)<select id="np-mgr">'+opt(D.lists.managers,f.mgr||"","Not set",function(o){return o.name},function(o){return o.id})+"</select></label>";
  h+='<div class="btnrow"><button type="button" class="btn solid" id="np-go"'+(!(f.name||"").trim()||!(f.sum||"").trim()||busy.newp?" disabled":"")+">"+(busy.newp?"Creating…":"Create proposal")+'</button><button type="button" class="btn ghost" id="np-cancel">Cancel</button></div>'+errBox("newp");
  return h+'<p class="note">Next you’ll fill in the plan: problem, goals, outcomes, structure, implementation, evaluation, risks, budget, funding and partnerships. Then send it for approval.</p></div>';
}

/* ---------- actions ---------- */
function editVer(r){return String(r.editVersion||"")}
function cleanFields(r,kind){
  var fm=V.forms[r.id]||{},out={},defs=kind==="program"?PF:CF;
  Object.keys(fm).forEach(function(f){var d=defs[f],v=fm[f];if(!d)return;
    if(d.k==="rich"){v=rtClean(v);if(rtEmpty(v))v=null}
    else if(d.k==="bool")v=!!v;
    else if(d.k==="int")v=v===""||v==null?null:Math.max(0,Math.floor(Number(v)));
    else if(typeof v==="string"){v=v.trim();if(v==="")v=null}
    out[f]=v});
  return out;
}
function doSave(id){
  var kind=V.sel.kind,r=rec(kind,id);if(!r)return;var fields=cleanFields(r,kind);
  if(!Object.keys(fields).length)return;
  if(fields.Name===null){V.errs["save:"+id]={code:"invalid",message:"A name is required."};renderPanel();return}
  var name=kind==="program"?"saveProgramDraft":"saveCohortDraft",p={editVersion:editVer(r),fields:fields};p[kind==="program"?"programId":"cohortId"]=id;
  act(name,p,"save:"+id).then(function(m){if(m.ok){delete V.forms[id];toast(m.message||"Draft saved. Send it for approval when it’s ready.")}});
}
function doStatus(id){
  var kind=V.sel.kind,r=rec(kind,id),f=form("st:"+id),reason=(f.reason||"").trim();
  if(f.to==="Canceled"&&reason.length<10){V.errs["status:"+id]={code:"invalid",message:"Give a reason of at least 10 characters to cancel."};renderPanel();return}
  var p={recordType:kind,id:id,editVersion:editVer(r),toStatus:f.to};if(reason)p.reason=reason;
  act("requestStatusChange",p,"status:"+id).then(function(m){if(m.ok){delete V.forms["st:"+id];toast(m.message||"Status change saved as a draft.")}});
}
function doNewCohort(pid){
  var f=form("nc:"+pid);if(!f.rid)f.rid=uuid();var fields={};
  ["Name","pmdm__StartDate__c","pmdm__EndDate__c","Cohort_Capacity__c","Coach__c","RecordTypeId"].forEach(function(k){if(f.copy&&/Date__c$/.test(k))return;var v=f[k];if(v==null||v==="")return;if(k==="Cohort_Capacity__c")v=Math.max(0,Math.floor(Number(v)));else v=String(v).trim();fields[k]=v});
  var p={requestId:f.rid,programId:pid,fields:fields};if(f.copy)p.copyFromCohortId=f.copy;
  act("createCohort",p,"newc:"+pid).then(function(m){if(m.ok){delete V.forms["nc:"+pid];var id=m.data&&m.data.id;toast(m.message||"Cohort draft created.");if(id){V.pendingOpen={kind:"cohort",id:id};if(D.byC[id]){V.sel=V.pendingOpen;V.tab=null;V.pendingOpen=null;render()}}}});
}
function doPropose(){
  var f=form("newp"),name=(f.name||"").trim(),sum=(f.sum||"").trim();if(!name||!sum)return;
  var p={requestId:f.rid,name:name,shortSummary:sum};if(f.area)p.issueArea=f.area;if(f.mgr)p.managerId=f.mgr;
  act("proposeProgram",p,"newp").then(function(m){if(m.ok){delete V.forms.newp;var id=m.data&&m.data.id;toast(m.message||"Proposal created.");if(id){V.pendingOpen={kind:"program",id:id,tab:"plan"};if(D.byP[id]){V.sel={kind:"program",id:id};V.tab="plan";V.pendingOpen=null;render()}}}});
}
function rtype(){return V.sel.kind}
function doSubmit(id){var r=rec(rtype(),id);act("submitForApproval",{recordType:rtype(),id:id,editVersion:editVer(r)},"sub:"+id).then(function(m){if(m.ok)toast(m.message||"Sent for approval.")})}
function doDiscard(id){var r=rec(rtype(),id);if(!r.draft)return;act("discardDraft",{recordType:rtype(),id:id,draftId:r.draft.id},"dis:"+id).then(function(m){if(m.ok){delete V.forms[id];toast(m.message||"Draft discarded.")}})}
function doApprove(id,ret){
  var r=rec(rtype(),id),f=form("ap:"+id),note=(f.note||"").trim();
  if(ret&&note.length<10){V.errs["ap:"+id]={code:"invalid",message:"Explain what needs to change, in 10 characters or more."};renderPanel();return}
  var p={recordType:rtype(),id:id,draftId:r.draft.id};if(note)p.note=note;
  act(ret?"returnChange":"approveChange",p,"ap:"+id).then(function(m){if(m.ok){delete V.forms["ap:"+id];toast(m.message||(ret?"Returned for changes.":"Approved. Delivery to Salesforce is queued."))}});
}
function doApproveNow(id){
  var r=rec(rtype(),id),g=form("an:"+id),note=(g.note||"").trim();
  if(note.length<10){V.errs["an:"+id]={code:"invalid",message:"Give a reason of at least 10 characters."};renderPanel();return}
  if(!g.ok){V.errs["an:"+id]={code:"invalid",message:"Tick the box to confirm."};renderPanel();return}
  act("approveNow",{recordType:rtype(),id:id,draftId:r.draft.id,note:note,confirmed:true},"an:"+id).then(function(m){if(m.ok){delete V.forms["an:"+id];toast(m.message||"Approved. Delivery is queued.")}});
}
function doCheck(id,key){act("checkSalesforce",{recordType:rtype(),id:id},key||"chk:"+id).then(function(m){if(m.ok)toast(m.message||"Salesforce checked. Nothing was changed.")})}
function doRetry(id,key){act("retryDelivery",{recordType:rtype(),id:id},key||"retry:"+id).then(function(m){if(m.ok)toast(m.message||"Delivery queued.")})}
function doOpen(type,id){act("openRecord",{type:type,id:id,recordType:rtype()},"rec:"+id)}
function doGuide(k){var id=V.sel.id,r=rec(rtype(),id),key="gd:"+id;
  if(k==="open_article"){V.tab=V.sel.kind==="program"?"overview":"details";renderPanel();return}
  if(k==="compare"){V.tab="approval";renderPanel();return}
  if(k==="check_status"){doCheck(id,key);return}
  if(k==="retry_delivery"){if(D.viewer.isStaff)doRetry(id,key);return}
  if(k==="open_salesforce"){act("openRecord",{type:"salesforce",id:id,recordType:rtype()},key);return}
  if(k==="refresh_data"){hello();toast("Asked Trail OS for the latest data.")}
}

/* ---------- events ---------- */
document.addEventListener("click",function(e){
  var t=e.target.closest("button,input[type=checkbox]");if(!t||!D)return;var ds=t.dataset;
  if(ds.view){V.view=ds.view;V.flt.status="";V.flt.mgr="";V.flt.cstatus="";render();$("main").scrollTop=0;return}
  if(ds.pstatus){V.view="programs";V.flt.status=ds.pstatus==="No status"?"":ds.pstatus;render();return}
  if(ds.open){var i=ds.open.indexOf(":"),k=ds.open.slice(0,i),id=ds.open.slice(i+1);if(V.sel&&V.sel.kind===k&&V.sel.id===id)return;V.sel={kind:k,id:id};V.tab=null;render();var pb=$("panel");if(pb)pb.scrollTop=0;if(window.innerWidth<1000&&pb)pb.scrollIntoView({block:"start"});return}
  if(ds.tab){V.tab=ds.tab;renderPanel();$("panel").scrollTop=0;return}
  if(t.id==="close"){V.sel=null;V.focus=false;render();return}
  if(t.id==="focusbtn"){V.focus=!V.focus;renderPanel();return}
  if(t.id==="newprog"){V.sel={kind:"new"};V.focus=false;render();var n=$("np-name");if(n)n.focus();return}
  if(t.id==="np-go"){doPropose();return}
  if(t.id==="np-cancel"){delete V.forms.newp;V.sel=null;render();return}
  if(t.id==="showclosed"){V.showClosed=t.checked;render();return}
  if(ds.showclosed){V.showClosed=true;render();return}
  if(ds.rt){rtCmd(ds.rt,ds["for"]);return}
  if(ds.jump){var sec=$("sec-"+ds.jump),ed=$("rt-"+ds.jump);if(sec)sec.scrollIntoView({block:"start",behavior:"smooth"});if(ed&&ed.getAttribute("contenteditable")==="true")ed.focus({preventScroll:true});return}
  if(ds.save){doSave(ds.save);return}
  if(ds.undo){delete V.forms[ds.undo];V.linkFor=null;keepScroll(renderPanel);return}
  if(ds.stgo){doStatus(ds.stgo);return}
  if(ds.newc){doNewCohort(ds.newc);return}
  if(ds.submit){doSubmit(ds.submit);return}
  if(ds.discard){doDiscard(ds.discard);return}
  if(ds.approve){doApprove(ds.approve,false);return}
  if(ds["return"]){doApprove(ds["return"],true);return}
  if(ds.annow){form("an:"+ds.annow).open=true;renderPanel();return}
  if(ds.ancancel){delete V.forms["an:"+ds.ancancel];renderPanel();return}
  if(ds.anconfirm){doApproveNow(ds.anconfirm);return}
  if(ds.check){doCheck(ds.check);return}
  if(ds.retry){doRetry(ds.retry);return}
  if(ds.rec){doOpen(ds.rec,ds.id);return}
  if(ds.gd){doGuide(ds.gd);return}
  if(t.type==="checkbox"&&ds.fld){setFld(t);return}
  if(t.type==="checkbox"&&ds.an){form("an:"+V.sel.id).ok=t.checked;return}
});
function setFld(t){var r=rec(V.sel.kind,V.sel.id);if(!r)return;var f=t.dataset.fld,def=(V.sel.kind==="program"?PF:CF)[f],fm=form(r.id),v=t.type==="checkbox"?t.checked:t.value;
  var orig=val(r,f),same=def.k==="rich"?String(v).trim()===txt(orig).trim():def.k==="bool"?!!v===!!orig:def.k==="int"?String(v)===String(orig==null?"":orig):String(v).trim()===String(orig==null?"":orig).trim();
  var had=Object.keys(fm).length;if(same)delete fm[f];else fm[f]=v;
  if(Object.keys(fm).length!==had||t.tagName==="SELECT"||t.type==="checkbox"||t.type==="date")keepFocus(t,renderPanel);
}
function keepFocus(el,fn){var sel=el.dataset.fld?'[data-fld="'+el.dataset.fld+'"]':el.id?"#"+el.id:null,pos=null;try{pos=el.selectionStart}catch(e){}fn();if(!sel)return;var n=document.querySelector(sel);if(n&&n!==document.activeElement&&(el.tagName==="TEXTAREA"||el.type==="text"||el.type==="url"||el.type==="number")){n.focus();try{if(pos!=null)n.setSelectionRange(pos,pos)}catch(e){}}}
document.addEventListener("input",function(e){var t=e.target;if(!D)return;
  var rt=t.closest&&t.closest("[data-rich]");if(rt){rtInput(rt);return}
  if(t.id==="q"){V.q=t.value.trim();renderMain();return}
  if(t.dataset.fld&&t.type!=="checkbox"&&t.tagName!=="SELECT"&&t.type!=="date"){setFld(t);return}
  if(t.dataset.st){form("st:"+V.sel.id)[t.dataset.st]=t.value;return}
  if(t.dataset.ap){form("ap:"+V.sel.id).note=t.value;return}
  if(t.dataset.an==="note"){form("an:"+V.sel.id).note=t.value;return}
  if(t.dataset.nc&&t.tagName!=="SELECT"){form("nc:"+V.sel.id)[t.dataset.nc]=t.value;var b=document.querySelector("[data-newc]");if(b)b.disabled=!(form("nc:"+V.sel.id).Name||"").trim()||!!busy["newc:"+V.sel.id];return}
  if(t.id==="np-name"||t.id==="np-sum"){var f=form("newp");f[t.id==="np-name"?"name":"sum"]=t.value;var g=$("np-go");if(g)g.disabled=!(f.name||"").trim()||!(f.sum||"").trim()||!!busy.newp;return}
});
document.addEventListener("change",function(e){var t=e.target;if(!D)return;
  if(t.dataset.flt){V.flt[t.dataset.flt]=t.value;renderMain();return}
  if(t.dataset.fld&&(t.tagName==="SELECT"||t.type==="date")){setFld(t);return}
  if(t.dataset.st==="to"){form("st:"+V.sel.id).to=t.value;keepScroll(renderPanel);return}
  if(t.dataset.nc&&(t.tagName==="SELECT"||t.type==="date")){form("nc:"+V.sel.id)[t.dataset.nc]=t.value;keepScroll(renderPanel);return}
  if(t.id==="np-area"){form("newp").area=t.value;return}
  if(t.id==="np-mgr"){form("newp").mgr=t.value;return}
});
function keepScroll(fn){var p=$("panel"),y=p?p.scrollTop:0;fn();if(p)p.scrollTop=y}
document.addEventListener("keydown",function(e){
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==="s"||e.key==="S")&&V.sel&&V.sel.kind!=="new"){var b=document.querySelector("[data-save]");e.preventDefault();if(b&&!b.disabled)b.click();return}
  if(e.target.id==="rtlinkurl"&&e.key==="Enter"){e.preventDefault();var ok=document.querySelector('[data-rt="linkok"]');if(ok)ok.click();return}
  if(e.key==="Escape"&&V.linkFor){var lf=V.linkFor;rtCmd("linkcancel",lf);return}
  if(e.key==="Escape"&&V.focus){V.focus=false;renderPanel()}});
