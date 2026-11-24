const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ls={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const Q={q1:["Do first","Urgent and important"],q2:["Schedule","Important, not urgent"],q3:["Delegate","Urgent, not important"],q4:["Drop or defer","Neither"]};
const qk=t=>t.imp?(t.urg?"q1":"q2"):(t.urg?"q3":"q4");
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const left=t=>t.due?Math.round((new Date(t.due+"T00:00")-new Date(today()+"T00:00"))/864e5):null;
const fmt=d=>new Date(d+"T00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
let user=null,tasks=[],hist=[],view="matrix",anim=true,authMode="in";
let toastT;const toast=(m,fn)=>{const t=$("#toast");t.innerHTML=esc(m)+(fn?'<button class="und" type="button">Undo</button>':"");if(fn)t.querySelector(".und").onclick=()=>{fn();t.classList.remove("on")};t.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("on"),fn?5000:2200)};

/* hero letters that swell near the cursor */
const hero=$("#hero");let ci=0;
"Do what matters first.".split(" ").forEach(w=>{const s=document.createElement("span");s.className="w";[...w].forEach(ch=>{const c=document.createElement("span");c.className="c";c.style.setProperty("--i",ci++);c.textContent=ch;s.appendChild(c)});hero.appendChild(s);hero.appendChild(document.createTextNode(" "));ci+=2});
const chars=$$(".hero .c");
$("#mq").innerHTML=("<span>Do first</span><span>Schedule</span><span>Delegate</span><span>Drop</span>").repeat(8);

/* cursor, magnetic buttons, hero weight, quadrant glow */
const cur=$("#cur");let cx=0,cy=0,tx=0,ty=0;
addEventListener("pointermove",e=>{tx=e.clientX;ty=e.clientY;cur.style.opacity=1;
 if(!document.body.classList.contains("in"))chars.forEach(c=>{const r=c.getBoundingClientRect(),d=Math.hypot(e.clientX-(r.left+r.width/2),e.clientY-(r.top+r.height/2));c.style.fontWeight=Math.round(400+400*Math.max(0,1-d/170))});
 const m=e.target.closest&&e.target.closest(".mag");$$(".mag").forEach(b=>{if(b!==m)b.style.transform=""});
 if(m){const r=m.getBoundingClientRect();m.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.2}px,${(e.clientY-r.top-r.height/2)*.3}px)`}
 const q=e.target.closest&&e.target.closest(".quad");if(q){const r=q.getBoundingClientRect();q.style.setProperty("--mx",(e.clientX-r.left)+"px");q.style.setProperty("--my",(e.clientY-r.top)+"px")}
 cur.classList.toggle("big",!!(e.target.closest&&e.target.closest("button,a,.t")))});
(function loop(){cx+=(tx-cx)*.18;cy+=(ty-cy)*.18;cur.style.transform=`translate(${cx}px,${cy}px)`;requestAnimationFrame(loop)})();

/* generative particle field that flees the mouse */
const cv=$("#bg"),g=cv.getContext("2d");let W,H,P=[],mx=-999,my=-999;
function size(){const r=devicePixelRatio||1;W=cv.width=innerWidth*r;H=cv.height=innerHeight*r;g.setTransform(r,0,0,r,0,0);W=innerWidth;H=innerHeight;P=Array.from({length:Math.min(110,Math.floor(W*H/12000))},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4}))}
addEventListener("resize",size);size();
addEventListener("pointermove",e=>{mx=e.clientX;my=e.clientY});
const still=matchMedia("(prefers-reduced-motion:reduce)").matches;
function draw(){g.clearRect(0,0,W,H);const col=getComputedStyle(document.documentElement).getPropertyValue("--p");g.fillStyle=col;g.strokeStyle=col;
 for(const p of P){const dx=p.x-mx,dy=p.y-my,d=Math.hypot(dx,dy);if(d<140&&!still){p.vx+=dx/d*.12;p.vy+=dy/d*.12}
  p.vx*=.985;p.vy*=.985;p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
  g.beginPath();g.arc(p.x,p.y,1.8,0,6.3);g.fill();
  if(d<190){g.globalAlpha=1-d/190;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(mx,my);g.stroke();g.globalAlpha=1}}
 requestAnimationFrame(draw)}
draw();

/* auth */
async function hsh(s){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){return btoa(unescape(encodeURIComponent(s)))}}
$$(".tabs button").forEach(b=>b.onclick=()=>{authMode=b.dataset.m;$$(".tabs button").forEach(x=>x.classList.toggle("on",x===b));$("#fname").hidden=authMode==="in";$("#aGo").textContent=authMode==="in"?"Sign in":"Create account";$$(".err").forEach(e=>e.textContent="")});
$("#aGo").onclick=async()=>{
 const n=$("#aName").value.trim(),m=$("#aMail").value.trim().toLowerCase(),p=$("#aPass").value;let bad=0;
 $$("#auth .err").forEach(e=>e.textContent="");
 if(authMode==="up"&&n.length<2){$("#eName").textContent="Enter your name (at least 2 characters).";bad=1}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)){$("#eMail").textContent="Enter a valid email, like name@example.com.";bad=1}
 if(authMode==="up"&&!(p.length>=8&&/\d/.test(p)&&/[a-zA-Z]/.test(p))){$("#ePass").textContent="Use 8+ characters with letters and a number.";bad=1}
 if(authMode==="in"&&!p){$("#ePass").textContent="Enter your password.";bad=1}
 if(bad)return;
 const users=ls.get("tpm_users",{}),h=await hsh(m+":"+p);
 if(authMode==="up"){if(users[m]){$("#eMail").textContent="An account with this email exists. Sign in instead.";return}users[m]={name:n,h};ls.set("tpm_users",users)}
 else if(!users[m]||users[m].h!==h){$("#ePass").textContent="Email or password is incorrect.";return}
 ls.set("tpm_sess",m);start(m,users[m].name)};
["aName","aMail","aPass"].forEach(i=>$("#"+i).addEventListener("keydown",e=>{if(e.key==="Enter")$("#aGo").click()}));
function start(m,n){user=m;$("#hi").textContent=n;tasks=ls.get("tpm_t_"+m,[]);hist=ls.get("tpm_h_"+m,[]);document.body.classList.add("in");anim=true;scrollTo(0,0);render();checkRem(true)}
$("#out").onclick=()=>{ls.set("tpm_sess",null);user=null;document.body.classList.remove("in");$("#aPass").value="";toast("Signed out")};
const save=()=>{ls.set("tpm_t_"+user,tasks);ls.set("tpm_h_"+user,hist.slice(0,200))};
const log=m=>hist.unshift({t:Date.now(),m});

/* filtering and rendering */
function filtered(){const q=$("#fq").value.trim().toLowerCase(),s=$("#fs").value,c=$("#fc").value;
 let a=tasks.filter(t=>(!q||(t.title+" "+t.notes+" "+t.cat).toLowerCase().includes(q))&&(!s||t.st===s)&&(!c||t.cat===c));
 const so=$("#so").value;a.sort((x,y)=>so==="new"?y.id-x.id:so==="prog"?y.pr-x.pr:so==="az"?x.title.localeCompare(y.title):(x.due||"9999").localeCompare(y.due||"9999"));return a}
function cats(){const cs=[...new Set(tasks.map(t=>t.cat))],sel=$("#fc"),v=sel.value;sel.innerHTML='<option value="">All</option>'+cs.map(c=>`<option>${esc(c)}</option>`).join("");sel.value=cs.includes(v)?v:""}
function card(t,i){const d=left(t),late=d!==null&&d<0&&t.st!=="done",k=qk(t);
 return `<div class="t ${t.st==="done"?"done":""} ${k}" draggable="true" data-id="${t.id}" style="--i:${i};--c:var(--${k})">
 <div class="tt">${esc(t.title)}</div>${t.notes?`<div class="meta">${esc(t.notes)}</div>`:""}
 <div class="meta"><span class="chip">${esc(t.cat)}</span><span class="chip">${{todo:"To do",doing:"In progress",done:"Done"}[t.st]}</span>${t.due?`<span class="chip ${late?"late":""}">${late?"Overdue · ":""}${fmt(t.due)}</span>`:""}</div>
 <div class="bar"><i style="width:${t.pr}%"></i></div>
 <div class="acts"><button class="btn ghost" data-a="cy">Next status</button><button class="btn ghost" data-a="ed">Edit</button><button class="btn ghost" data-a="dl">Delete</button></div></div>`}
function render(){
 const n=tasks.length,dn=tasks.filter(t=>t.st==="done").length,od=tasks.filter(t=>t.st!=="done"&&left(t)!==null&&left(t)<0).length,av=n?Math.round(tasks.reduce((a,t)=>a+t.pr,0)/n):0;
 $("#stats").innerHTML=`<div class="card stat"><b>${n}</b><span>Total tasks</span></div><div class="card stat"><b>${dn}</b><span>Completed</span></div><div class="card stat"><b style="color:${od?"var(--q1)":"inherit"}">${od}</b><span>Overdue</span></div><div class="card stat"><b>${av}%</b><span>Average progress</span><div class="bar"><i style="width:${av}%"></i></div></div>`;
 charts();countUp();cats();const m=$("#main"),a=filtered();m.className=anim?"":"noanim";
 if(view==="matrix"){m.innerHTML=`<div class="axis"><span>Important</span><span>Urgent on top, not urgent below</span></div><div class="mat">`+["q1","q2","q3","q4"].map(k=>{const L=a.filter(t=>qk(t)===k);return `<div class="quad ${k}" data-q="${k}"><h3>${Q[k][0]}<small>${Q[k][1]} · ${L.length}</small></h3>${L.length?L.map((t,i)=>card(t,i)).join(""):`<div class="empty">Nothing here. Drag a task in or add one.</div>`}</div>`}).join("")+`</div>`}
 else if(view==="list"){m.innerHTML=`<div class="list">${a.length?a.map((t,i)=>card(t,i)).join(""):'<div class="empty">No tasks match. Clear the filters or add a new task.</div>'}</div>`}
 else m.innerHTML=`<ul class="hist">${hist.length?hist.map((h,i)=>`<li style="animation-delay:${Math.min(i,20)*30}ms"><time>${new Date(h.t).toLocaleString(undefined,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</time><span>${esc(h.m)}</span></li>`).join(""):'<li class="empty">No activity yet. Create your first task to start the log.</li>'}</ul>`;
 anim=false}
["fq","fs","fc","so"].forEach(i=>$("#"+i).addEventListener("input",render));
$$("#views button").forEach(b=>b.onclick=()=>{view=b.dataset.v;anim=true;$$("#views button").forEach(x=>x.classList.toggle("on",x===b));render()});

/* actions */
const M=$("#main");
M.addEventListener("click",e=>{const b=e.target.closest("[data-a]");if(!b)return;const t=tasks.find(x=>x.id==b.closest(".t").dataset.id);if(!t)return;
 if(b.dataset.a==="ed")openForm(t);
 if(b.dataset.a==="cy"){t.st={todo:"doing",doing:"done",done:"todo"}[t.st];t.pr=t.st==="done"?100:t.st==="todo"?0:Math.max(t.pr,10);log(`Moved “${t.title}” to ${t.st==="doing"?"in progress":t.st==="done"?"done":"to do"}`);save();render();if(t.st==="done"){toast("Nice. Task completed.");confetti()}}
 if(b.dataset.a==="dl"){if(!b.dataset.s){b.dataset.s=1;b.textContent="Confirm delete";setTimeout(()=>{if(b.isConnected){delete b.dataset.s;b.textContent="Delete"}},2500);return}
  const ix=tasks.indexOf(t);tasks.splice(ix,1);log(`Deleted “${t.title}”`);save();render();toast("Task deleted",()=>{tasks.splice(ix,0,t);log(`Restored “${t.title}”`);save();render()})}});
let drag=null;
M.addEventListener("dragstart",e=>{const t=e.target.closest(".t");if(t){drag=t.dataset.id;t.classList.add("dragging");e.dataTransfer.setData("text/plain",drag)}});
M.addEventListener("dragend",()=>{$$(".dragging,.over").forEach(x=>x.classList.remove("dragging","over"))});
M.addEventListener("dragover",e=>{const q=e.target.closest(".quad");if(q){e.preventDefault();$$(".over").forEach(x=>x!==q&&x.classList.remove("over"));q.classList.add("over")}});
M.addEventListener("drop",e=>{const q=e.target.closest(".quad");if(!q||!drag)return;e.preventDefault();const t=tasks.find(x=>x.id==drag),k=q.dataset.q;if(!t||qk(t)===k)return;
 t.imp=k==="q1"||k==="q2";t.urg=k==="q1"||k==="q3";log(`Moved “${t.title}” to ${Q[k][0]}`);save();render();toast("Moved to "+Q[k][0])});

/* form */
const dlg=$("#dlg");
function openForm(t){$$("#f .err").forEach(e=>e.textContent="");$("#dt").textContent=t?"Edit task":"New task";$("#fid").value=t?t.id:"";
 $("#ti").value=t?t.title:"";$("#no").value=t?t.notes:"";$("#ur").checked=t?t.urg:false;$("#im").checked=t?t.imp:true;$("#ca").value=t?t.cat:"Work";$("#du").value=t?t.due:"";$("#st").value=t?t.st:"todo";$("#rm").value=t?t.rm:"none";$("#pr").value=t?t.pr:0;$("#pv").textContent=$("#pr").value;
 dlg.showModal();$("#ti").focus()}
$("#add").onclick=()=>openForm();$("#cx").onclick=()=>dlg.close();
$("#pr").oninput=()=>{$("#pv").textContent=$("#pr").value;const v=+$("#pr").value;$("#st").value=v>=100?"done":v>0?"doing":"todo"};
$("#st").onchange=()=>{const s=$("#st").value;if(s==="done")$("#pr").value=100;if(s==="todo")$("#pr").value=0;if(s==="doing"&&+$("#pr").value===0)$("#pr").value=10;$("#pv").textContent=$("#pr").value};
$("#f").addEventListener("submit",e=>{e.preventDefault();$$("#f .err").forEach(x=>x.textContent="");
 const ti=$("#ti").value.trim(),du=$("#du").value,id=$("#fid").value;let bad=0;
 if(ti.length<3){$("#e_ti").textContent="Give the task a title of 3 to 80 characters.";bad=1}
 if(du&&!id&&du<today()){$("#e_du").textContent="Pick today or a later date.";bad=1}
 if($("#rm").value!=="none"&&!du){$("#e_du").textContent="Set a due date to use a reminder.";bad=1}
 if(bad)return;
 const o={title:ti,notes:$("#no").value.trim(),urg:$("#ur").checked,imp:$("#im").checked,cat:$("#ca").value,due:du,st:$("#st").value,rm:$("#rm").value,pr:+$("#pr").value};
 if(id){const t=tasks.find(x=>x.id==id);Object.assign(t,o);log(`Edited “${ti}”`);toast("Changes saved")}
 else{tasks.push({id:Date.now(),...o});log(`Created “${ti}” in ${Q[qk(o)][0]}`);toast("Task created")}
 save();dlg.close();anim=true;render();checkRem(true)});

/* reminders */
function checkRem(ask){const r=tasks.filter(t=>t.st!=="done"&&t.rm!=="none"&&t.due&&left(t)<=+t.rm);const el=$("#rem");
 el.classList.toggle("on",r.length>0);
 if(r.length){el.innerHTML="<b>Reminders</b><br>"+r.map(t=>`${esc(t.title)}: ${left(t)<0?"overdue since "+fmt(t.due):left(t)===0?"due today":"due "+fmt(t.due)}`).join("<br>");
  if(ask&&"Notification"in window){try{if(Notification.permission==="default")Notification.requestPermission();else if(Notification.permission==="granted"&&!checkRem.s){checkRem.s=1;new Notification("Quadrant: "+r.length+" task reminder"+(r.length>1?"s":""))}}catch(e){}}}}
setInterval(()=>{if(user){checkRem(false);render()}},60000);

/* extras: charts, count-up, confetti, tilt, export, sample data, shortcuts */
function charts(){const n=tasks.length,el=$("#charts");if(!n){el.style.display="none";return}el.style.display="";
 const cn=k=>tasks.filter(t=>qk(t)===k).length,mx=Math.max(1,...Object.keys(Q).map(cn));
 const qb=Object.keys(Q).map(k=>`<div class="qb" style="--c:var(--${k})"><span>${Q[k][0]}</span><div><i style="width:${cn(k)/mx*100}%"></i></div><b>${cn(k)}</b></div>`).join("");
 const cs=[...new Set(tasks.map(t=>t.cat))],pal=["#6c8cff","#ff5d6c","#ffc14d","#4fd8a0","#c084fc","#8a8fa8"];let a=0;
 const seg=cs.map((c,i)=>{const p=tasks.filter(t=>t.cat===c).length/n*100,s=`${pal[i%6]} ${a}% ${a+p}%`;a+=p;return s}).join(",");
 el.innerHTML=`<div class="card ch"><h3>Where your tasks sit</h3>${qb}</div><div class="card ch"><h3>By category</h3><div class="don"><div class="ring" style="background:conic-gradient(${seg})"></div><div class="leg">${cs.map((c,i)=>`<span><b style="background:${pal[i%6]}"></b>${esc(c)}</span>`).join("")}</div></div></div>`}
function countUp(){if(!anim||still)return;$$(".stat b").forEach(b=>{const m=b.textContent.match(/^(\d+)(.*)$/);if(!m)return;const v=+m[1],t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/800);b.textContent=Math.round(v*(1-Math.pow(1-k,3)))+m[2];if(k<1)requestAnimationFrame(f)})(t0)})}
function confetti(){if(still)return;const c=$("#cf"),x=c.getContext("2d"),cols=["#ff5d6c","#6c8cff","#ffc14d","#4fd8a0","#c084fc"];c.width=innerWidth;c.height=innerHeight;
 const ps=Array.from({length:130},()=>({x:innerWidth/2,y:innerHeight*.6,vx:(Math.random()-.5)*18,vy:-Math.random()*17-4,r:Math.random()*6.3,c:cols[Math.random()*5|0],w:5+Math.random()*6}));let f=0;
 (function a(){x.clearRect(0,0,c.width,c.height);ps.forEach(p=>{p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.r+=.2;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.w/2,-p.w/4,p.w,p.w/2);x.restore()});if(++f<110)requestAnimationFrame(a);else x.clearRect(0,0,c.width,c.height)})()}
let tl=null;addEventListener("pointermove",e=>{const el=e.target.closest&&e.target.closest(".stat,.ch");if(tl&&tl!==el)tl.style.transform="";tl=el;if(!el||still)return;const r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(700px) rotateX(${-py*8}deg) rotateY(${px*8}deg)`});
addEventListener("scroll",()=>{$("#sp").style.transform=`scaleX(${scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)})`},{passive:true});
$("#th").onclick=()=>{const r=document.documentElement;r.dataset.theme=getComputedStyle(r).getPropertyValue("--bg").trim()==="#f6f4ff"?"dark":"light"};
$("#ex").onclick=()=>{const q=s=>'"'+String(s).replace(/"/g,'""')+'"';$("#xt").value=["Title,Quadrant,Category,Status,Progress,Due,Notes",...tasks.map(t=>[t.title,Q[qk(t)][0],t.cat,t.st,t.pr+"%",t.due,t.notes].map(q).join(","))].join("\n");$("#xd").showModal()};
$("#xc").onclick=()=>$("#xd").close();
$("#xp").onclick=()=>{const x=$("#xt");x.select();const ok=()=>toast("CSV copied");try{navigator.clipboard.writeText(x.value).then(ok,()=>{document.execCommand("copy");ok()})}catch(e){document.execCommand("copy");ok()}};
$("#sm").onclick=()=>{const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
 [["Submit project report",1,1,"Study",1,"doing",60,"1"],["Fix login bug",1,1,"Work",0,"todo",0,"0"],["Plan semester revision",0,1,"Study",5,"doing",30,"3"],["Gym routine",0,1,"Health",3,"todo",0,"none"],["Reply to club emails",1,0,"Personal",1,"todo",0,"none"],["Pay phone bill",1,0,"Finance",-1,"todo",0,"0"],["Tidy desktop icons",0,0,"Other",9,"done",100,"none"]].forEach((s,i)=>tasks.push({id:Date.now()+i,title:s[0],notes:"",urg:!!s[1],imp:!!s[2],cat:s[3],due:d(s[4]),st:s[5],pr:s[6],rm:s[7]}));
 log("Loaded sample tasks");save();anim=true;render();checkRem(true);toast("Sample tasks added")};
addEventListener("keydown",e=>{if(!user||e.metaKey||e.ctrlKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||document.querySelector("dialog[open]"))return;if(e.key==="n"){e.preventDefault();openForm()}if(e.key==="/"){e.preventDefault();$("#fq").focus()}const v={1:"matrix",2:"list",3:"hist"}[e.key];if(v)$(`#views [data-v=${v}]`).click()});

/* restore session */
const s=ls.get("tpm_sess",null);if(s){const u=ls.get("tpm_users",{})[s];if(u)start(s,u.name)}
