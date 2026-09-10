
const KEY="AETHERIUM";
let STORY=null;

let soundOn=false;
function toggleSound(){
 const a=document.getElementById("ambienceAudio");
 soundOn=!soundOn;
 if(soundOn){a.volume=.32;a.play().catch(()=>{});document.getElementById("soundBtn").textContent="🔇 Sfeer uit"}
 else{a.pause();document.getElementById("soundBtn").textContent="🔊 Sfeer"}
}
function chime(){
 if(!soundOn)return;
 const x=document.getElementById("transitionAudio"); x.currentTime=0;x.volume=.28;x.play().catch(()=>{});
}
function lightning(){
 const v=document.getElementById("vignette");v.classList.remove("flash-now");void v.offsetWidth;v.classList.add("flash-now");
}
function toggleClueDrawer(){
 const d=document.getElementById("clueDrawer");
 if(d.classList.contains("hidden")){renderDrawer();d.classList.remove("hidden")} else d.classList.add("hidden");
}
function renderDrawer(){
 const labels={
  cup:"Onaangeroerde beker",floor:"Stervormig brandspoor",lens:"Verschoven lens",note:"Gescheurde notitie",
  "loc-archive":"Archiefbevinding","loc-greenhouse":"Serrebevinding","loc-alchemy":"Alchemiebevinding","loc-hall":"Getuigen uit de Grote Hal",
  timeline:"Klokkenanalyse",materials:"Materiaalanalyse",sigil:"Onderhoudssigil",statement:"Onmogelijke verklaring"
 };
 const box=document.getElementById("drawerEvidence"); if(!box)return;
 if(!state.clues.length){box.innerHTML="<div class='ev'>Nog geen bewijs geregistreerd.</div>";return}
 box.innerHTML=state.clues.map(c=>"<div class='ev'>✦ "+(labels[c]||"Nieuwe bevinding")+"</div>").join("");
}

let state={
 act:0,clues:[],visited:[],talked:[],phone1:false,phone2:false,phone3:false,
 affinity:{florine:{rowan:0,kestrel:0,maeve:0,elias:0},margot:{rowan:0,kestrel:0,maeve:0,elias:0},selena:{rowan:0,kestrel:0,maeve:0,elias:0}},
 privateChoices:{}, puzzle:{p1:false,p2:false,p3:false,p4:false}, paused:false, interviews:[], interviewClues:[], splitEvidence:[]
};
let dialogueTimer=null, dialogueQueue=[], dialogueIndex=0, nextScene=null;

async function loadStory(){
 const b64=await fetch("assets/story.dat").then(r=>r.text());
 const bin=atob(b64.trim()); let out="";
 for(let i=0;i<bin.length;i++) out+=String.fromCharCode(bin.charCodeAt(i)^KEY.charCodeAt(i%KEY.length));
 STORY=JSON.parse(out);
 document.getElementById("startBtn").disabled=false;
}
function save(){localStorage.setItem("aetherium_main",JSON.stringify(state))}
function load(){try{let x=JSON.parse(localStorage.getItem("aetherium_main")); if(x) state=x}catch(e){}}
function resetGame(){if(confirm("Hele spel opnieuw starten?")){localStorage.removeItem("aetherium_main");location.reload()}}
function show(id){ if(id==="social")setTimeout(refreshInterviewStatus,30);
 document.querySelectorAll(".scene").forEach(s=>s.classList.add("hidden"));
 document.getElementById(id).classList.remove("hidden");
 window.scrollTo({top:0,behavior:"smooth"}); chime(); updateHud(); save();
}
function updateHud(){
 const done=state.clues.length+Object.values(state.puzzle).filter(Boolean).length*2+state.visited.length;
 document.getElementById("progressFill").style.width=Math.min(100,4+done*5)+"%";
 document.getElementById("clueCount").textContent=state.clues.length;
}
function lineDuration(text){
 return Math.max(3200,Math.min(7200,2300+text.length*28));
}
function speak(text,speaker){
 if(!document.getElementById("voiceToggle").checked || !("speechSynthesis" in window)) return;
 speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.rate=.92;u.pitch=speaker==="Narrator"?.88:1; speechSynthesis.speak(u);
}
function runDialogue(key,after){
 dialogueQueue=STORY.act_lines[key]; dialogueIndex=0; nextScene=after; show("dialogue");
 const stage=document.getElementById("dialogueStage"); stage.innerHTML="";
 nextDialogueLine();
}
function nextDialogueLine(){
 clearTimeout(dialogueTimer);
 if(dialogueIndex>=dialogueQueue.length){dialogueTimer=setTimeout(()=>show(nextScene),1200);return}
 const [speaker,text]=dialogueQueue[dialogueIndex++];
 const d=document.createElement("div");
 d.className="bubble "+(speaker==="Narrator"?"narrator":(dialogueIndex%2===0?"alt":""));
 d.innerHTML='<span class="speaker">'+speaker+'</span>'+text;
 document.getElementById("dialogueStage").appendChild(d);
 speak(text,speaker);
 const dur=lineDuration(text);
 const t=document.getElementById("dialogueTimer"); t.innerHTML='<div style="--dur:'+dur+'ms"></div>';
 dialogueTimer=setTimeout(nextDialogueLine,dur);
}
function pauseDialogue(){
 state.paused=!state.paused;
 const b=document.getElementById("pauseBtn");
 if(state.paused){
   clearTimeout(dialogueTimer);
   if("speechSynthesis" in window)speechSynthesis.pause();
   b.textContent="▶ Verder";
 }else{
   if("speechSynthesis" in window)speechSynthesis.resume();
   b.textContent="⏸ Pauze";
   dialogueTimer=setTimeout(nextDialogueLine,1100);
 }
}
function skipLine(){speechSynthesis?.cancel();nextDialogueLine()}
function startGame(){runDialogue("prologue","deathBeat")}
function goDeath(){lightning();runDialogue("death","observatory")}
function inspect(item){
 if(!state.clues.includes(item)) state.clues.push(item);
 document.querySelector('[data-inspect="'+item+'"]').classList.add("used");
 const texts={
  cup:"De beker is onaangeroerd. Geen opvallende verkleuring of bezinksel.",
  floor:"Onder het lectern zit een stervormige verkleuring in het messing en de steen.",
  lens:"De grote lens staat enkele graden buiten de gemarkeerde rustpositie.",
  note:"Veynes laatste notitie is gescheurd. Drie namen zijn nog leesbaar: Florine, Margot en Selena."
 };
 document.getElementById("inspectResult").innerHTML="<strong>Gevonden:</strong> "+texts[item];
 updateHud();renderDrawer();save();
 if(state.clues.length>=3) document.getElementById("leaveObs").disabled=false;
}
function leaveObservatory(){runDialogue("body","explore1")}
function visit(loc){
 if(state.visited.includes(loc)) return;
 state.visited.push(loc); document.querySelector('[data-loc="'+loc+'"]').classList.add("used");
 const info={
 archive:"In het archief vinden jullie onderhoudsregisters en een ontbrekende bladzijde uit Veynes dossier.",
 greenhouse:"In de maanserre blijken een paar vreemde geuren veel minder sinister dan ze eerst lijken.",
 alchemy:"Het practicum bevat materialen die zowel voor alchemie als voor astronomische apparatuur gebruikt worden.",
 hall:"In de Grote Hal geven meerdere getuigen elkaar net genoeg tegenstrijdige informatie om interessant te worden."
 };
 document.getElementById("exploreResult").innerHTML="<div class='notice'>"+info[loc]+"</div>";
 if(!state.clues.includes("loc-"+loc)) state.clues.push("loc-"+loc);
 updateHud();renderDrawer();save();
 if(state.visited.length>=2) setTimeout(()=>show("phone1"),900);
}
function qrUrl(player,phase){
 const base=location.href.replace(/index\.html.*$/,"").replace(/\?.*$/,"");
 return base+"players/"+player+".html?phase="+phase;
}
function makeQR(id,url){
 const img=document.getElementById(id);
 img.src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data="+encodeURIComponent(url);
}
function setupQR(phase){
 ["florine","margot","selena"].forEach(p=>{
   makeQR("qr-"+phase+"-"+p,qrUrl(p,phase));
   let a=document.getElementById("link-"+phase+"-"+p); if(a)a.href=qrUrl(p,phase);
 });
}
const CODEMAP={
 // phase 1: evidence handling choice, plus slight affinity seed
 "F1-A":{p:"florine",aff:["kestrel",1]},"F1-B":{p:"florine",aff:["maeve",1]},"F1-C":{p:"florine",aff:["rowan",1]},
 "M1-A":{p:"margot",aff:["kestrel",1]},"M1-B":{p:"margot",aff:["rowan",1]},"M1-C":{p:"margot",aff:["elias",1]},
 "S1-A":{p:"selena",aff:["elias",1]},"S1-B":{p:"selena",aff:["maeve",1]},"S1-C":{p:"selena",aff:["rowan",1]},
 // phase 2: trust companion
 "F2-R":{p:"florine",aff:["rowan",2]},"F2-K":{p:"florine",aff:["kestrel",2]},"F2-M":{p:"florine",aff:["maeve",2]},"F2-E":{p:"florine",aff:["elias",2]},
 "M2-R":{p:"margot",aff:["rowan",2]},"M2-K":{p:"margot",aff:["kestrel",2]},"M2-M":{p:"margot",aff:["maeve",2]},"M2-E":{p:"margot",aff:["elias",2]},
 "S2-R":{p:"selena",aff:["rowan",2]},"S2-K":{p:"selena",aff:["kestrel",2]},"S2-M":{p:"selena",aff:["maeve",2]},"S2-E":{p:"selena",aff:["elias",2]},
 // phase 3: split route
 "F3-A":{p:"florine"},"F3-B":{p:"florine"},"F3-C":{p:"florine"},
 "M3-A":{p:"margot"},"M3-B":{p:"margot"},"M3-C":{p:"margot"},
 "S3-A":{p:"selena"},"S3-B":{p:"selena"},"S3-C":{p:"selena"}
};
function applyCode(code,phase){
 code=code.trim().toUpperCase();
 let m=CODEMAP[code]; if(!m) return false;
 state.privateChoices[code]=true;
 if(m.aff){state.affinity[m.p][m.aff[0]]+=m.aff[1]}
 if(code.includes("3-"))registerSplitEvidence(code);
 return true;
}
function submitPhone(phase){
 let ids=["f","m","s"]; let ok=true;
 ids.forEach(x=>{let el=document.getElementById(phase+"-"+x); if(!applyCode(el.value,phase)){el.style.borderColor="var(--red)";ok=false}else el.style.borderColor="var(--green)"});
 if(!ok){document.getElementById(phase+"-error").textContent="Minstens één code klopt niet. Kijk nog eens op de telefoons.";return}
 state["phone"+phase]=true;save();
 if(phase===1){runDialogue("after_phone1","puzzle1")}
 if(phase===2){show("puzzle3")}
 if(phase===3){show("puzzle4")}
}
function checkPuzzle1(){
 const offset=document.getElementById("p1offset").value;
 const window=document.getElementById("p1window").value;
 const route=document.getElementById("p1route").value;
 if(offset==="7"&&window==="2308-2312"&&route==="prefect"){
   state.puzzle.p1=true;
   if(!state.clues.includes("timeline"))state.clues.push("timeline");
   document.getElementById("p1feedback").innerHTML="<span style='color:var(--green)'>Jullie tijdlijn sluit. De foutieve klok creëert een kort, bruikbaar venster - maar alleen voor iemand die niet bij elke ward wordt tegengehouden.</span>";
   document.getElementById("p1next").disabled=false;
 }else{
   document.getElementById("p1feedback").innerHTML="<span style='color:var(--red)'>Nog niet volledig. Corrigeer eerst de klok, tel daarna de looptijden op en controleer wie zonder extra ward-check door de route kan.</span>";
 }
 updateHud();renderDrawer();save();
}
function checkPuzzle2(){
 const a=document.getElementById("p2a").value,b=document.getElementById("p2b").value,c=document.getElementById("p2c").value;
 if(a==="paper"&&b==="alignment"&&c==="protection"){
   state.puzzle.p2=true;
   if(!state.clues.includes("materials"))state.clues.push("materials");
   document.getElementById("p2feedback").innerHTML="<span style='color:var(--green)'>Alle drie functies passen. Belangrijker: geen ervan bewijst op zichzelf dat iemand vergif heeft gebruikt.</span>";
   document.getElementById("p2next").disabled=false;
 }else{
   document.getElementById("p2feedback").innerHTML="<span style='color:var(--red)'>Minstens één materiaal is verkeerd gekoppeld. Gebruik geur, textuur én toepassing - niet alleen de naam.</span>";
 }
 updateHud();renderDrawer();save();
}
function checkPuzzle3(){
 const v=document.getElementById("p3answer").value.trim().toUpperCase().replace(/\s/g,"");
 if(v==="ASTERION"){state.puzzle.p3=true;if(!state.clues.includes("sigil"))state.clues.push("sigil");document.getElementById("p3feedback").innerHTML="<span style='color:var(--green)'>Het verborgen woord verschijnt: ASTERION.</span>";document.getElementById("p3next").disabled=false}
 else document.getElementById("p3feedback").innerHTML="<span style='color:var(--red)'>Leg de transparante/uitgeknipte delen nog eens over elkaar volgens de maansymbolen.</span>";
 updateHud();renderDrawer();save();
}
function beginTwist(){lightning();runDialogue("twist","splitChoice")}
function chooseSplit(v){state.split=v;show("phone3");setupQR(3);save()}
function checkPuzzle4(){
 const impossible=document.getElementById("p4impossible").value;
 const conflict=document.getElementById("p4conflict").value;
 const conclusion=document.getElementById("p4conclusion").value;
 if(impossible==="fenlight"&&conflict==="rowanlog"&&conclusion==="secrets"){
   state.puzzle.p4=true;
   if(!state.clues.includes("statement"))state.clues.push("statement");
   document.getElementById("p4feedback").innerHTML="<span style='color:var(--green)'>Juist. Meer dan één persoon liegt. Dat is precies waarom een leugen alleen geen moordbewijs is.</span>";
   document.getElementById("p4next").disabled=false;
 }else{
   document.getElementById("p4feedback").innerHTML="<span style='color:var(--red)'>Bekijk architectuur, toegangslijst en neveninformatie apart. Er is meer dan één onwaar detail, maar ze hebben niet dezelfde betekenis.</span>";
 }
 updateHud();renderDrawer();save();
}

let currentInterview=null;
function openInterview(name){
  currentInterview=name;
  show("interviewScene");
  document.getElementById("interviewName").textContent=name;
  document.getElementById("interviewResponses").innerHTML="";
}
function askInterview(topic){
  if(!currentInterview)return;
  const lines=STORY.social_dialogue[currentInterview][topic];
  const box=document.getElementById("interviewResponses");
  box.innerHTML="";
  let i=0;
  function add(){
    if(i>=lines.length){
      const tag=currentInterview+"-"+topic;
      if(!state.interviewClues.includes(tag))state.interviewClues.push(tag);
      if(!state.interviews.includes(currentInterview))state.interviews.push(currentInterview);
      document.getElementById("interviewDone").classList.remove("hidden");
      save(); return;
    }
    const [speaker,text]=lines[i++];
    const d=document.createElement("div");d.className="bubble";
    d.innerHTML='<span class="speaker">'+speaker+'</span>'+text;box.appendChild(d);
    setTimeout(add,lineDuration(text));
  }
  add();
}
function leaveInterview(){
  if(state.interviews.length>=3)show("phone2"); else show("social");
}
function refreshInterviewStatus(){
  document.querySelectorAll("[data-person]").forEach(el=>{
    if(state.interviews.includes(el.dataset.person))el.classList.add("used");
  });
  const n=document.getElementById("interviewCount"); if(n)n.textContent=state.interviews.length;
}
function registerSplitEvidence(code){
  const map={
    "F3-A":"echo-motion","F3-B":"echo-sound","F3-C":"echo-object",
    "M3-A":"sigil-copy","M3-B":"sigil-age","M3-C":"sigil-placement",
    "S3-A":"residue-safe","S3-B":"resin-match","S3-C":"residue-source"
  };
  if(map[code]&&!state.splitEvidence.includes(map[code]))state.splitEvidence.push(map[code]);
}

function companionFor(player){
 let o=state.affinity[player], best=Object.keys(o).sort((a,b)=>o[b]-o[a])[0]; return best;
}
function romanceSummary(){
 const names={rowan:"Rowan",kestrel:"Kestrel",maeve:"Maeve",elias:"Elias"};
 return ["florine","margot","selena"].map(p=>({p,best:companionFor(p),name:names[companionFor(p)]}));
}
function finalSetup(){
 runDialogue("finale_intro","accuse");
}
function accuse(){
 const culprit=document.getElementById("accCulprit").value;
 const method=document.getElementById("accMethod").value;
 const motive=document.getElementById("accMotive").value;
 let s=STORY.solution;
 let ok=culprit===s.culprit && method==="ward" && motive==="coverup";
 document.getElementById("accFeedback").innerHTML=ok?
 "<span style='color:var(--green)'>De zaal wordt stil. Jullie reconstructie houdt stand.</span>":
 "<span style='color:var(--red)'>Er blijft een gat in jullie reconstructie. Bekijk de vijf kernbevindingen opnieuw.</span>";
 if(ok){document.getElementById("revealBtn").classList.remove("hidden");state.correct=true;save()}
}
function reveal(){
 let s=STORY.solution;
 document.getElementById("revealText").innerHTML=
 "<h2>De waarheid</h2><p><strong>Dader:</strong> "+s.culprit+"</p><p><strong>Methode:</strong> "+s.method+"</p><p><strong>Motief:</strong> "+s.motive+"</p>"+
 "<hr><h3>Waarom de aanwijzingen kloppen</h3><ol>"+s.key_clues.map(x=>"<li>"+x+"</li>").join("")+"</ol>";
 let rs=romanceSummary();
 document.getElementById("epilogues").innerHTML=rs.map(x=>{
  let lines={
   rowan:"zoekt je na de ceremonie op met een halfgrijns en een verrassend serieus voorstel om samen nog één verboden gang te verkennen.",
   kestrel:"wacht bij de bibliotheekdeur. Geen groot gebaar — alleen een sleutel die hij normaal aan niemand uitleent.",
   maeve:"duwt je een warme beker in de hand en vraagt of je morgen mee ontbijt. Haar toon maakt duidelijk dat dit niet alleen uit bezorgdheid is.",
   elias:"laat een klein gevouwen briefje achter tussen jullie bewijsstukken: één droge grap, één uitnodiging, en een tijdstip."
  };
  return "<div class='card'><strong>"+x.p[0].toUpperCase()+x.p.slice(1)+"</strong><p>"+x.name+" "+lines[x.best]+"</p></div>";
 }).join("");
 show("revealScene");
}
window.addEventListener("load",()=>{load();loadStory();setupQR(1);setupQR(2);});
