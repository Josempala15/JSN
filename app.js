// Report categories: [icon, label]. Edit freely.
// Drawn icons: save a drawing as icons/<name>.png and it replaces the emoji automatically (emoji shows until then).
const ICON=(k,e)=>`<img class="ico" src="icons/${k}.png" alt="" onerror="this.replaceWith('${e}')">`;
const CATS={litter:[ICON('cat-litter','🗑️'),'Litter'],bags:[ICON('cat-bags','🛍️'),'Bags of rubbish'],glass:[ICON('cat-glass','🍾'),'Broken glass'],hazard:[ICON('cat-hazard','⚠️'),'Hazardous – do not touch']};
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg',CS=.05;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const GB=[[-5.7,50.05],[-5.2,49.96],[-4.2,50.35],[-3.4,50.6],[-2.45,50.55],[-1.4,50.75],[-.1,50.8],[1.4,51.15],[.7,51.5],[1.3,51.95],[1.75,52.6],[.3,52.9],[.3,53.1],[.1,53.6],[-.1,54.1],[-.6,54.5],[-1.4,55],[-2,55.75],[-3,56],[-2.6,56.3],[-2.05,57.1],[-1.8,57.5],[-3.5,57.7],[-4.2,57.5],[-3.9,57.85],[-3.05,58.65],[-5,58.6],[-5.2,57.9],[-5.7,57.3],[-5.8,56.7],[-5.6,56],[-5.7,55.3],[-4.6,55.45],[-5.1,54.85],[-3.6,54.9],[-3.2,54.1],[-3.05,53.85],[-3,53.4],[-4.3,53.3],[-4.7,52.8],[-4.1,52.4],[-5.2,51.9],[-4,51.6],[-3.2,51.45],[-2.7,51.5],[-4.5,51],[-5,50.55]];
const NI=[[-8,54.4],[-7,55.2],[-6.2,55.2],[-5.6,54.7],[-5.5,54.4],[-6,54],[-6.4,54.05],[-7.3,54.1]];
// ---- Web-Mercator slippy map ----
const wrap=$('mapwrap'),tl=$('tiles'),ov=$('ov'),T={};
let sel=null,showClean=false,V={z:5,cx:0,cy:0},W=600,H=500,tilesOK=false,pinned=null,real=[],events=[],db=null,uid=null,useSample=null,assets=null,draft=[],photoBlob=null;
const S=z=>256*2**z,mx=(lo,z)=>(lo+180)/360*S(z);
const my=(la,z)=>{const r=la*Math.PI/180;return(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*S(z)};
const ilon=(x,z)=>x/S(z)*360-180,ila=(y,z)=>180/Math.PI*Math.atan(Math.sinh(Math.PI-2*Math.PI*y/S(z)));
const P=(lo,la)=>[mx(lo,V.z)-V.cx+W/2,my(la,V.z)-V.cy+H/2];
const poly=a=>a.map(([lo,la])=>P(lo,la).map(n=>n.toFixed(1)).join(',')).join(' ');
function setView(lo,la,z){V.z=z;V.cx=mx(lo,z);V.cy=my(la,z);render()}
function render(){
 W=wrap.clientWidth;H=wrap.clientHeight;const z=V.z,n=2**z,want={};
 {const a=mx(-8.7,z),b=mx(2,z),c=my(58.9,z),d=my(49.8,z);V.cx=b-a<W?(a+b)/2:Math.min(Math.max(V.cx,a+W/2),b-W/2);V.cy=d-c<H?(c+d)/2:Math.min(Math.max(V.cy,c+H/2),d-H/2)}
 $('attr').style.display=z>=9?'':'none';
 for(let x=Math.floor((V.cx-W/2)/256);x<=Math.floor((V.cx+W/2)/256);x++)for(let y=Math.floor((V.cy-H/2)/256);y<=Math.floor((V.cy+H/2)/256);y++){
  if(y<0||y>=n||z<9)continue;const tx=((x%n)+n)%n,k=z+'/'+tx+'/'+y+'@'+x;want[k]=1;let im=T[k];
  if(!im){im=T[k]=new Image();im.draggable=false;im.onload=()=>{tilesOK=true;render()};im.src=`https://tile.openstreetmap.org/${z}/${tx}/${y}.png`;tl.appendChild(im)}
  im.style.left=(x*256-V.cx+W/2)+'px';im.style.top=(y*256-V.cy+H/2)+'px'}
 for(const k in T)if(!want[k]){T[k].remove();delete T[k]}
 const cells='',ms=z<8?.6:1,pin=(r,x,y)=>{const c=r.cleaned?'#2e9e5b':(r.cat==='hazard'?'#d62828':'#f08a24');return `<g data-id="${esc(r.id)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(r.id===sel?1.3:1)*ms})" style="cursor:pointer"><path d="M0 0C-13-15-13-32 0-32S13-15 0 0z" fill="${c}" stroke="#fff" stroke-width="2"/><text y="-15" text-anchor="middle" font-size="13" fill="#fff" font-weight="700">${r.cleaned?'✓':'!'}</text></g>`};
 const vis=reports.filter(r=>showClean||!r.cleaned).map(r=>[r,...P(r.lon,r.lat)]).filter(q=>q[1]>-30&&q[2]>-40&&q[1]<W+30&&q[2]<H+30);let pins='';
 if(z<11){const B={};vis.forEach(q=>{const k=Math.floor(q[1]/44)+'_'+Math.floor(q[2]/44);(B[k]=B[k]||[]).push(q)});
  Object.values(B).forEach(g=>{if(g.length===1)pins+=pin(...g[0]);else{const m=f=>g.reduce((a,q)=>a+f(q),0)/g.length;pins+=`<g data-cl="${m(q=>q[0].lon)},${m(q=>q[0].lat)}" transform="translate(${m(q=>q[1]).toFixed(1)} ${m(q=>q[2]).toFixed(1)})" style="cursor:pointer"><circle r="${12+Math.min(10,Math.sqrt(g.length))}" fill="#f08a24" stroke="#fff" stroke-width="2"/><text y="4" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${g.length}</text></g>`}})}
 else pins=vis.map(q=>pin(...q)).join('');
 let cur='';if(pinned){const [x,y]=P(pinned.lon,pinned.lat);cur=`<circle cx="${x}" cy="${y}" r="7" fill="#3a86ff" stroke="#fff" stroke-width="2"/>`}
 ov.setAttribute('viewBox',`0 0 ${W} ${H}`);
 const land=`<polygon points="${poly(GB)}"/><polygon points="${poly(NI)}"/>`,k=Math.max(1,(z-4)*.8);
 if(z>=9&&tilesOK)ov.innerHTML=cells+pins+cur;
 else{const fx='';
 ov.innerHTML=`<defs><clipPath id="uk">${land}</clipPath></defs><rect width="${W}" height="${H}" fill="#1a6aa0"/>
 <g fill="none" stroke="#fff" stroke-linejoin="round"><g stroke-width="${44*k}" opacity=".07">${land}</g><g stroke-width="${28*k}" opacity=".1">${land}</g><g stroke-width="${14*k}" opacity=".16">${land}</g><g stroke-width="${3*k}" stroke-dasharray="${8*k} ${10*k}" opacity=".55" transform="translate(0 0)">${land}</g></g>
 ${fx}<g fill="#1f6b3f" stroke="#0d3b26" stroke-width="${1.5*Math.min(k,3)}" stroke-linejoin="round">${land}</g>
 <g clip-path="url(#uk)">${cells}</g>${pins}${cur}`}
 drawNews();placePop();
 const open=reports.filter(r=>!r.cleaned).sort((a,b)=>b.t-a.t);
 $('reps').innerHTML=open.length?open.slice(0,8).map(r=>{const c=CATS[r.cat]||CATS.litter;return `<div class="rep" data-go="${r.id}" style="cursor:pointer">${r.img?`<img src="${esc(r.img)}" alt="">`:`<div style="font-size:30px;width:52px;text-align:center">${c[0]}</div>`}<div><b>${c[1]}</b><br><span class="mute">${esc(r.note||'')}</span></div></div>`}).join(''):'Nothing waiting – nice!';
}
function zoomBy(d,ox=W/2,oy=H/2){const nz=Math.max(5,Math.min(19,V.z+d));if(nz===V.z)return;const f=2**(nz-V.z),dx=ox-W/2,dy=oy-H/2;V.cx=(V.cx+dx)*f-dx;V.cy=(V.cy+dy)*f-dy;V.z=nz;render()}
let last=0,drag=null;
wrap.addEventListener('wheel',e=>{e.preventDefault();if(Date.now()-last<140)return;last=Date.now();const r=wrap.getBoundingClientRect();zoomBy(e.deltaY<0?1:-1,e.clientX-r.left,e.clientY-r.top)},{passive:false});
wrap.addEventListener('dblclick',e=>{const r=wrap.getBoundingClientRect();zoomBy(1,e.clientX-r.left,e.clientY-r.top)});
wrap.addEventListener('pointerdown',e=>{if(e.target.closest('.ctl,#sb,#pop'))return;const mk=e.target.closest('[data-id],[data-cl]');drag={x:e.clientX,y:e.clientY,m:false,id:mk&&mk.dataset.id,cl:mk&&mk.dataset.cl};wrap.setPointerCapture(e.pointerId)});
wrap.addEventListener('pointermove',e=>{
 if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(drag.m||Math.abs(dx)+Math.abs(dy)>4){drag.m=true;V.cx-=dx;V.cy-=dy;drag.x=e.clientX;drag.y=e.clientY;render()}return}});
wrap.addEventListener('pointerup',e=>{if(drag&&!drag.m){if(drag.cl){const q=drag.cl.split(',').map(Number);setView(q[0],q[1],Math.min(19,V.z+2))}else if(drag.id){sel=drag.id;drawPop();render()}else if(sel){sel=null;drawPop();render()}else{const r=wrap.getBoundingClientRect();setPin(ilon(V.cx+e.clientX-r.left-W/2,V.z),ila(V.cy+e.clientY-r.top-H/2,V.z))}}drag=null});
const byId=id=>reports.find(r=>r.id===id);
function upd(id,patch){const r=byId(id);if(!r)return;if(db&&!r.demo)db.doc('reports/'+id).update(patch).then(()=>{Object.assign(r,patch);render();drawPop()}).catch(e=>{$('msg').textContent='Could not save – '+(e.message||'permission denied')});else{Object.assign(r,patch);render();drawPop()}}
function placePop(){const p=$('pop'),r=sel&&byId(sel);if(!r)return;const [x,y]=P(r.lon,r.lat);p.style.left=Math.min(Math.max(x,120),W-120)+'px';p.style.top=Math.max(y-40*(V.z<8?.6:1),p.offsetHeight+10)+'px'}
function drawPop(){const p=$('pop'),r=sel&&byId(sel);if(!r){p.classList.add('hide');return}
 const c=CATS[r.cat]||CATS.litter,st=stillOf(r).length,d=t=>new Date(t).toLocaleDateString('en-GB');
 p.innerHTML=`<button class="s" data-act="close" style="float:right;padding:0 8px">✕</button>${r.img?`<img src="${esc(r.img)}" alt="" style="width:100%;max-height:130px;object-fit:cover;border-radius:8px;margin-bottom:6px">`:''}<b>${c[0]} ${c[1]}</b>${r.note?`<div>${esc(r.note)}</div>`:''}<div class="mute">Reported ${d(r.t)}${st?` · ${st} say still there`:''}</div>${r.cleaned?`<div style="color:var(--acc);margin:6px 0">✓ Cleaned ${d(r.cleanedT)}</div><button class="s" data-act="reopen">Not actually cleaned</button>`:`<div style="display:flex;gap:6px;margin-top:8px"><button class="p" style="margin:0;flex:1" data-act="done">✓ Mark cleaned</button><button class="s" data-act="still">Still there</button></div>`}`;
 p.classList.remove('hide');placePop()}
$('pop').onclick=e=>{const a=e.target.dataset.act;if(!a)return;const me=myId(),r=byId(sel);
 if(a==='close'){sel=null;drawPop();render();return}
 if(a==='done')upd(sel,{cleaned:true,cleanedT:Date.now(),cleanedBy:me});
 if(a==='reopen')upd(sel,{cleaned:false,cleanedT:0});
 if(a==='still'&&!stillOf(r).includes(me)){if(db&&!r.demo)db.doc('report_stills/'+r.id+'_'+me).set({rep:r.id,by:me,t:Date.now()}).catch(()=>{});else{r.still=[...(r.still||[]),me];drawPop()}}
 setTimeout(drawPop,50)};
$('reps').onclick=e=>{const g=e.target.closest('[data-go]');if(!g)return;const r=byId(g.dataset.go);if(!r)return;sel=r.id;setView(r.lon,r.lat,Math.max(V.z,15));drawPop()};
$('cat').innerHTML=Object.entries(CATS).map(([k,v])=>`<option value="${k}">${v[1]}</option>`).join('');
$('zi').onclick=()=>zoomBy(1);$('zo').onclick=()=>zoomBy(-1);
function setPin(lo,la,fly){pinned={lat:la,lon:lo};$('pin').textContent=`Location: ${la.toFixed(5)}, ${lo.toFixed(5)}`;if(fly)setView(lo,la,17);else render()}
$('q').onkeydown=async e=>{if(e.key!=='Enter')return;try{const r=await(await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q='+encodeURIComponent(e.target.value))).json();
 if(r[0])setView(+r[0].lon,+r[0].lat,16);else $('msg').textContent='Address not found.'}catch(x){$('msg').textContent='Address search needs the self-hosted version (blocked inside claude.ai).'}};
$('loc').onclick=()=>navigator.geolocation&&navigator.geolocation.getCurrentPosition(p=>setView(p.coords.longitude,p.coords.latitude,16),()=>$('msg').textContent='Location not available here.');
// ---- EXIF GPS ----
async function exifGPS(f){try{const v=new DataView(await f.slice(0,262144).arrayBuffer());if(v.getUint16(0)!==0xFFD8)return null;let o=2;
 while(o<v.byteLength-4&&v.getUint16(o)!==0xFFE1)o+=2+v.getUint16(o+2);if(v.getUint32(o+4)!==0x45786966)return null;
 const t=o+10,le=v.getUint16(t)===0x4949,g16=a=>v.getUint16(a,le),g32=a=>v.getUint32(a,le);
 const ifd=(a,tag)=>{const c=g16(a);for(let i=0;i<c;i++){const e=a+2+i*12;if(g16(e)===tag)return e}return null};
 const ge=ifd(t+g32(t+4),0x8825);if(!ge)return null;const gp=t+g32(ge+8),c=g16(gp),G={};
 for(let i=0;i<c;i++){const e=gp+2+i*12,tg=g16(e);G[tg]=tg===1||tg===3?String.fromCharCode(v.getUint8(e+8)):[0,1,2].map(k=>{const a=t+g32(e+8)+k*8;return g32(a)/g32(a+4)})}
 const d=a=>a[0]+a[1]/60+a[2]/3600;if(!G[2]||!G[4])return null;return{lat:d(G[2])*(G[1]==='S'?-1:1),lon:d(G[4])*(G[3]==='W'?-1:1)}}catch(e){return null}}
function shrink(f){return new Promise(res=>{const im=new Image();im.onload=()=>{const s=Math.min(1,800/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);c.toBlob(b=>res(b),'image/jpeg',.8)};im.onerror=()=>res(f);im.src=URL.createObjectURL(f)})}
// ---- report flow: photo -> GPS -> submit (no AI) ----
$('photo').onchange=async()=>{const f=$('photo').files[0],msg=$('msg');photoBlob=null;if(!f)return;if(!/^image\//.test(f.type)||f.size>2e7){msg.textContent='Please choose an image under 20 MB.';$('photo').value='';return}msg.textContent='Reading photo…';const g=await exifGPS(f);
 if(g)setPin(g.lon,g.lat,true);else if(!pinned)$('pin').textContent='No location in this photo – click the map to place the pin.';
 photoBlob=await shrink(f);msg.textContent='Photo ready. Check the pin, then submit.'};
$('go').onclick=async()=>{const msg=$('msg');if(!acct)return msg.textContent='Create/sign in to your My stats account before submitting a report.';if(!pinned)return msg.textContent='Click the map to set a location first.';if(!photoBlob)return msg.textContent='Add a photo of the trash.';
 const la=pinned.lat,lo=pinned.lon;if(la<49.8||la>58.9||lo<-8.7||lo>2)return msg.textContent='JSN covers the UK – that pin is outside it.';
 const dup=reports.find(r=>!r.cleaned&&Math.abs(r.lat-la)<.0003&&Math.abs(r.lon-lo)<.0005);if(dup){sel=dup.id;drawPop();return msg.textContent='There is already an open report here – tap "Still there" on it instead.'}
 if(Date.now()-lastRep<20000)return msg.textContent='Please wait a few seconds between reports.';
 $('go').disabled=true;try{const t=Date.now(),rid=t+'_'+localId;let img='';if(assets){try{img=await assets.upload(photoBlob,rid)}catch(e){throw new Error('Photo upload failed: '+(e.message||e))}}
  const rep={id:rid,lat:pinned.lat,lon:pinned.lon,cat:$('cat').value,note:$('note').value.trim().slice(0,200),img,by:myId(),t,cleaned:false,still:[]};
  if(db)await db.doc('reports/'+rep.id).set(rep);else real.push(rep);
  lastRep=Date.now();msg.textContent='Reported – thanks! Others can now mark it cleaned.';$('photo').value='';$('note').value='';photoBlob=null;pinned=null;$('pin').textContent='No location yet.';sel=rep.id;drawPop();render()
 }catch(e){msg.textContent='Could not submit: '+(e.message||e.code||'error')}$('go').disabled=false};
const localId=(()=>{try{let g=localStorage.getItem('jsn_guest');if(!g){g=Math.random().toString(36).slice(2);localStorage.setItem('jsn_guest',g)}return g}catch(e){return Math.random().toString(36).slice(2)}})();
// ---- joint cleans ----
function drawEv(){const now=Date.now(),l=allEv().filter(e=>e.when>now-864e5).sort((a,b)=>a.when-b.when);
 $('evs').innerHTML=l.length?l.map(e=>{const d=new Date(e.when),going=rsvpOf(e).includes(myId());
  return `<div class="ev"><div class="date"><b>${d.getDate()}</b>${d.toLocaleString('en-GB',{month:'short'})}</div><div style="flex:1"><b>${esc(e.title)}</b><br><span class="mute">${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · ${esc(e.loc)} · ${rsvpOf(e).length} going</span></div><button class="p" style="margin:0" data-id="${esc(e.id)}">${going?'Cancel RSVP':'RSVP'}</button></div>`}).join(''):'No cleans planned yet – create one!';drawReq()}
$('evs').onclick=async e=>{const id=e.target.dataset.id;if(!id)return;const ev=allEv().find(x=>x.id===id),me=myId(),going=rsvpOf(ev).includes(me),key='rsvps/'+id+'_'+me;
 if(ev.demo||!db){ev.rsvp=going?rsvpOf(ev).filter(x=>x!==me):[...rsvpOf(ev),me];RS=RS.filter(x=>!(x.ev===id&&x.by===me));drawEv();return}
 try{going?await db.doc(key).delete():await db.doc(key).set({ev:id,by:me,t:Date.now()})}catch(x){$('emsg').textContent='Could not RSVP.'}};
$('eadd').onclick=async()=>{const t=$('et').value.trim().slice(0,80),d=$('ed').value,l=$('el').value.trim().slice(0,80);
 if(!t||!d||!l)return $('emsg').textContent='Fill in title, date and location.';if(new Date(d).getTime()<Date.now())return $('emsg').textContent='Pick a date in the future.';
 const ev={id:Date.now()+'_'+localId,title:t,loc:l,when:new Date(d).getTime(),rsvp:[myId()],by:myId()};
 try{if(db){await db.doc('events/'+ev.id).set({...ev,rsvp:[]});await db.doc('rsvps/'+ev.id+'_'+myId()).set({ev:ev.id,by:myId(),t:Date.now()})}else{events.push(ev);drawEv()}$('emsg').textContent='Event created!';$('et').value=$('el').value=''}catch(e){$('emsg').textContent='Could not create event.'}};
[1,2,3,4,5,6].forEach(n=>$('t'+n).onclick=()=>{[1,2,3,4,5,6].forEach(m=>{$('v'+m).classList.toggle('hide',m!==n);$('t'+m).classList.toggle('on',m===n)});render();drawAcct()});
// ---- demo data (delete this block and the checkbox to remove) ----
let showDemo=true;const rnd=(x=>()=>(x=x*16807%2147483647)/2147483647)(7),DEMO=[];
const NOTES={litter:['Crisp packets and cans by the path','Takeaway boxes near the bench'],bags:['Two black bags left by the bins','Bin bags split open'],glass:['Smashed bottles by the wall','Broken glass on the path'],hazard:['Needles spotted – tell the council','Unknown drums – keep away']};
[[-.12,51.5,6],[-2.24,53.48,5],[-1.9,52.48,5],[-4.25,55.86,5],[-3.19,55.95,4],[-3.18,51.48,4],[-5.93,54.6,4],[-1.55,53.8,4],[-2.6,51.45,3],[-1.61,54.97,3],[-2.98,53.41,4]].forEach(([lo,la,n])=>{for(let i=0;i<n;i++){const cat=Object.keys(CATS)[Math.floor(rnd()*Object.keys(CATS).length)],t=Date.now()-rnd()*6e8,cl=rnd()<.25;DEMO.push({id:'demo'+DEMO.length,demo:1,lat:la+(rnd()-.5)*.14,lon:lo+(rnd()-.5)*.22,cat,note:NOTES[cat][Math.floor(rnd()*2)],by:'demo',t,cleaned:cl,cleanedT:cl?t+864e5:0,still:[]})}});
Object.defineProperty(window,'reports',{get:()=>showDemo?DEMO.concat(real):real});
const DEMOEV=[['Riverside litter pick','London · Putney Bridge',3,10,14],['Beach clean','Edinburgh · Portobello Beach',6,11,9],['Canal towpath sweep','Manchester · Castlefield',9,10,18],['Park & playground blitz','Glasgow · Kelvingrove Park',12,13,7]].map(([title,loc,d,h,g],i)=>{const t=new Date(Date.now()+d*864e5);t.setHours(h,0,0,0);return{id:'demo'+i,demo:1,title,loc,when:t.getTime(),rsvp:Array.from({length:g},(_,j)=>'d'+j)}});
const allEv=()=>showDemo?DEMOEV.concat(events):events;
$('cleanw').onchange=e=>{showClean=e.target.checked;render()};
$('demo').onchange=e=>{showDemo=e.target.checked;render();drawEv();drawBank();drawReq();drawStories()};
// ---- donate: edit prices here ----
const GIVE=[{id:'bags',name:'Roll of 20 bin bags',one:'roll of 20 bin bags',many:'rolls of 20 bin bags',price:4,icon:ICON('kit-bags','🗑️')},{id:'gloves',name:'Pair of gloves',one:'pair of gloves',many:'pairs of gloves',price:2,icon:ICON('kit-gloves','🧤')},{id:'picker',name:'Litter picker',one:'litter picker',many:'litter pickers',price:10,icon:ICON('kit-picker','🥢')}];
// ---- kit bank: stock everyone can see. Edit BASE defaults here (in = donated, out = lent out); real changes are saved as ledger entries ----
const BASE={bags:{in:120,out:45},gloves:{in:200,out:80},picker:{in:30,out:12}};let LEDGER=[],RS=[],SL=[],isAdmin=false,lastRep=0;
const stock=()=>{const s={};GIVE.forEach(g=>{const b=showDemo?BASE[g.id]:{in:0,out:0};s[g.id]={in:b.in,out:b.out}});LEDGER.forEach(l=>{if(s[l.item]&&(l.type==='in'||l.type==='out'))s[l.item][l.type]+=Math.min(Math.max(0,+l.n||0),1e5)});return s};
const rsvpOf=e=>[...new Set([...(e.rsvp||[]),...RS.filter(x=>x.ev===e.id).map(x=>x.by)])],stillOf=r=>[...new Set([...(r.still||[]),...SL.filter(x=>x.rep===r.id).map(x=>x.by)])];
const validRep=r=>r&&typeof r.id==='string'&&/^[\w.-]+$/.test(r.id)&&Number.isFinite(+r.lat)&&Number.isFinite(+r.lon);
function drawBank(){$('bank').innerHTML=GIVE.map(g=>{const s=stock()[g.id]||{in:0,out:0},av=Math.max(0,s.in-s.out),pc=s.in?Math.round(av/s.in*100):0;
 return `<div class="pr"><div class="i">${g.icon}</div><b class="n">${av}</b>${g.name} available<div class="mute">${s.in} donated · ${s.out} lent out</div><div style="height:6px;border-radius:3px;background:var(--line);margin-top:6px"><div style="height:6px;border-radius:3px;width:${pc}%;background:linear-gradient(90deg,var(--acc),var(--blue))"></div></div></div>`}).join('');$('badm').classList.toggle('hide',!isAdmin)}
$('badm').innerHTML=`<label>Update stock (admins only)</label><div class="ir" style="grid-template-columns:1fr 1fr 80px"><select id="bk">${GIVE.map(g=>`<option value="${g.id}">${g.name}</option>`).join('')}</select><select id="bt"><option value="in">Received</option><option value="out">Lent out</option></select><input id="bn" type="number" min="1" value="1"></div><button class="p" id="bset">Apply</button>`;
$('bset').onclick=async()=>{const k=$('bk').value,t=$('bt').value,n=Math.min(1e4,Math.max(1,+$('bn').value||1)),l={id:Date.now()+'_'+localId,item:k,type:t,n,by:myId(),t:Date.now()};
 if(db){try{await db.doc('ledger/'+l.id).set(l);$('bnote').textContent='Stock updated.'}catch(e){$('bnote').textContent='Could not save stock.'}}else{LEDGER.push(l);drawBank()}};
drawBank();
const gbuy=()=>{const a=Math.min(1e4,Math.max(0,+$('gamt').value||0)),n=x=>Math.floor(a/x);
 $('gbuy').innerHTML=a<1?'<p class="mute">Enter an amount of £1 or more.</p>':`<p>£${a%1?a.toFixed(2):a} could buy <i>either</i>:</p>`+GIVE.map(g=>`<div class="buy"><span style="font-size:26px">${g.icon}</span><b>${n(g.price)}</b><span>${n(g.price)===1?g.one:g.many} <span class="mute">(£${g.price} each)</span></span></div>`).join('')};
$('gamt').oninput=gbuy;gbuy();
$('give').onclick=()=>{const a=+$('gamt').value;$('gmsg').textContent=!(a>=1&&a<=1e4)?'Please enter an amount between £1 and £10,000.':"Payments aren't connected yet – a provider like Stripe would go here."};
// ---- good news: anyone with an account can post; admins can remove posts ----
let POSTS=[],lastPost=0;
const NEWS=[{t:'Sample story: a riverside cleared in a morning',x:'[Sample – shown only with demo data.] Neighbours met at the bridge and filled bags in a single morning.'},{t:'Sample story: a school takes on its local park',x:'[Sample – shown only with demo data.] A class mapped litter on JSN, then organised a clean.'}];
function drawStories(){const all=[...(showDemo?NEWS.map((n,i)=>({id:'demo'+i,demo:1,title:n.t,body:n.x,name:'JSN',t:0})):[]),...POSTS.slice().sort((a,b)=>b.t-a.t)];
 $('stories').innerHTML=all.length?all.map(p=>`<div class="story"><b>${esc(p.title)}</b> <span class="mute">${p.t?new Date(p.t).toLocaleDateString('en-GB'):'sample'} · ${esc(p.name||'Volunteer')}</span><br>${esc(p.body)}${isAdmin&&!p.demo?` <button class="s" data-del="${esc(p.id)}">Remove</button>`:''}</div>`).join(''):'<p class="mute">No stories yet – be the first to share one!</p>'}
$('stories').onclick=async e=>{const id=e.target.dataset.del;if(!id||!confirm('Remove this post?'))return;try{if(db)await db.doc('news/'+id).delete();POSTS=POSTS.filter(p=>p.id!==id);drawStories()}catch(x){$('nmsg').textContent='Could not remove: '+(x.message||'not allowed')}};
$('nsend').onclick=async()=>{const m=$('nmsg'),t=$('ntitle').value.trim().slice(0,80),b=$('nbody').value.trim().slice(0,600);
 if(!acct)return m.textContent='Create or sign in to a My stats account to post.';
 if(t.length<3||b.length<10)return m.textContent='Add a headline and a short story (at least 10 characters).';
 if(Date.now()-lastPost<30000)return m.textContent='Please wait a moment before posting again.';
 const p={id:Date.now()+'_'+localId,title:t,body:b,name:acct.name,by:myId(),t:Date.now()};
 try{if(db)await db.doc('news/'+p.id).set(p);lastPost=Date.now();POSTS=POSTS.filter(x=>x.id!==p.id).concat(p);$('ntitle').value=$('nbody').value='';m.textContent='Posted – thank you!';drawStories()}catch(x){m.textContent='Could not post: '+(x.message||'error')}};
function drawWillow(){const g=['#2f6b34','#3c8a3f','#56a64a','#7dc24a'],f=n=>n.toFixed(1);let s='<ellipse cx="400" cy="264" rx="360" ry="7" fill="#0b2a17"/><path d="M372 264C380 210 368 160 384 96L416 96C432 160 420 210 430 264Z" fill="#5a4330"/>';
 const br='<path d="M400 51Q256 51 112 120M400 51Q544 51 688 120M400 110C400 80 400 62 400 46" stroke="#5a4330" stroke-width="9" fill="none" stroke-linecap="round"/>';
 for(let i=0;i<64;i++){const x=110+i*(580/63),u=(x-400)/290,y=50+70*u*u+Math.sin(i*1.7)*2,L=110+((i*37)%70)+(1-Math.abs(u))*20,sw=Math.sin(i*2.3)*14;
  s+=`<path d="M${f(x)} ${f(y)}C${f(x+sw)} ${f(y+L*.35)} ${f(x-sw)} ${f(y+L*.7)} ${f(x+sw*.6)} ${f(Math.min(262,y+L))}" stroke="${g[i%4]}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  for(let k=1;k<=5;k++){const q=k/5.5,lx=x+sw*Math.sin(q*3)*.9,ly=Math.min(260,y+L*q);s+=`<ellipse cx="${f(lx)}" cy="${f(ly)}" rx="3.2" ry="8" fill="${g[(i+k)%4]}" transform="rotate(${k%2?12:-12} ${f(lx)} ${f(ly)})"/>`}}
 $('wsvg').innerHTML=s+br}
function drawNews(){if(!$('stats'))return;const done=reports.filter(r=>r.cleaned).length,ev=allEv(),vol=ev.reduce((a,e)=>a+rsvpOf(e).length,0);
 $('stats').innerHTML=[[reports.length,'reports'],[done,'cleaned up'],[reports.length-done,'still to clean'],[ev.length,'cleans planned'],[vol,'volunteers signed up']].map(([n,l])=>`<div class="st"><b>${n}</b>${l}</div>`).join('')+(showDemo?'<p class="mute" style="flex-basis:100%;margin:6px 0 0">Includes demo data – untick "Show demo data" on the map.</p>':'')}
drawWillow();drawStories();
// ---- accounts: nickname + recovery code, backed by Supabase Auth ----
let acct=null,showCode=false;const myId=()=>acct?acct.id:(uid||localId);
const fmt=c=>(c.replace(/[^A-Z0-9]/gi,'').toUpperCase().match(/.{1,4}/g)||[]).join('-');
const hashCode=async c=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('jsn:'+fmt(c))))].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,20);
const authEmail=async c=>`${await hashCode(c)}@${window.JSN_AUTH_DOMAIN||'accounts.jsn.invalid'}`;
const AL='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',chk=x=>AL[[...x].reduce((a,c,i)=>a+(AL.indexOf(c)+1)*(i+1),0)%32];
const newCode=()=>{let c=[...crypto.getRandomValues(new Uint8Array(15))].map(x=>AL[x%32]).join('');c+=chk(c);return c.match(/.{4}/g).join('-')};
async function finishAcct(name,code,save){
 const session=sb.auth.getSession?await sb.auth.getSession():null;const user=session?.data?.session?.user||sbUser;
 if(!user)throw new Error('Supabase sign-in did not return a user session.');
 acct={name:name||'Volunteer',code:fmt(code),id:user.id};uid=user.id;$('who').textContent=acct.name;
 if(save){try{localStorage.setItem('jsn_acct',JSON.stringify({name:acct.name,code:acct.code}))}catch(e){}}
 await db.doc('profiles/'+acct.id).set({id:acct.id,name:acct.name});
 drawAcct();render();drawEv();drawBank();drawReq();
}
async function createAccount(name){const code=newCode(),email=await authEmail(code);const {data,error}=await sb.auth.signUp({email,password:code});if(error)throw new Error(/invalid|domain/i.test(error.message)?'Supabase rejected the placeholder email address – see README_SUPABASE.md, Troubleshooting.':error.message);if(!data.user||!data.session)throw new Error('Account creation needs "Confirm email" switched OFF in Supabase (Authentication > Providers > Email).');await finishAcct(name,code,true);showCode=true}
async function signInAccount(name,code){const clean=fmt(code),raw=clean.replace(/-/g,'');if(!(raw.length===16&&[...raw].every(x=>AL.includes(x))&&chk(raw.slice(0,15))===raw[15]))throw new Error('That code doesn\'t look right – check for typos.');const email=await authEmail(clean);const {error}=await sb.auth.signInWithPassword({email,password:clean});if(error)throw error;const {data:ss}=await sb.auth.getSession();const {data:pp}=await sb.from('profiles').select('name').eq('id',ss.session.user.id).maybeSingle();await finishAcct(name||pp?.name||'Volunteer',clean,true);showCode=false}
async function setAcct(name,code,save){try{const email=await authEmail(code);const {error}=await sb.auth.signInWithPassword({email,password:fmt(code)});if(error)throw error;await finishAcct(name,code,save)}catch(e){console.warn('Saved account could not be restored',e)}}
function drawAcct(){const el=$('acct');if(!el)return;
 if(!acct){el.innerHTML=`<div class="card"><h2>Create your account</h2><p>No email or password is required. Pick a nickname and you'll get a recovery code. The code is used as your account password behind the scenes.</p><label>Nickname</label><input id="anick" maxlength="20" placeholder="e.g. RiverRanger"><button class="p" data-a="create">Create account</button><div id="cmsg" class="mute" style="margin-top:6px"></div></div><div class="card"><h2>Already have a code?</h2><label>Recovery code</label><input id="acode" placeholder="XXXX-XXXX-XXXX-XXXX"><label>Nickname (optional)</label><input id="anick2" maxlength="20"><button class="p" data-a="signin">Sign in</button><div id="amsg" class="mute" style="margin-top:6px"></div></div>`;return}
 const id=acct.id,mine=reports.filter(r=>r.by===id).sort((a,b)=>b.t-a.t),done=reports.filter(r=>r.cleaned&&r.cleanedBy===id).length,still=reports.filter(r=>stillOf(r).includes(id)).length,joined=allEv().filter(e=>rsvpOf(e).includes(id)).length;
 el.innerHTML=`<div class="card"><h2>${esc(acct.name)}</h2><p class="mute">Your recovery code is the only way to get this account back on another device. Keep it private – anyone who has it can act as you.</p>${showCode?'<p style="color:#ffd27a"><b>Save this code now.</b> It is the only way to sign back in and we cannot show it again if you lose it.</p>':''}<div style="font:600 22px 'Times New Roman',serif;letter-spacing:2px;margin:8px 0">${showCode?acct.code:'••••-••••-••••-••••'}</div><button class="s" data-a="show">${showCode?'Hide':'Show'} code</button> <button class="s" data-a="copy">Copy</button> <button class="s" data-a="out">Sign out</button><div id="amsg" class="mute" style="margin-top:6px"></div></div>
<div class="card"><h2>Your stats</h2><div class="g">${[[mine.length,'reports made'],[done,'cleaned by you'],[still,'“still there” checks'],[joined,'cleans joined']].map(([n,l])=>`<div class="pr"><b class="n">${n}</b>${l}</div>`).join('')}</div></div>
<div class="card"><h2>Your reports</h2>${mine.length?mine.slice(0,10).map(r=>{const c=CATS[r.cat]||CATS.litter;return `<div class="rep" data-go="${r.id}" style="cursor:pointer"><div style="font-size:26px;width:40px;text-align:center">${c[0]}</div><div><b>${c[1]}</b> · ${r.cleaned?'✓ cleaned':'still open'}<br><span class="mute">${esc(r.note||'')}</span></div></div>`}).join(''):'<p class="mute">You haven\'t reported anything yet.</p>'}</div>`}
$('acct').onclick=async e=>{const a=e.target.dataset.a,g=e.target.closest('[data-go]');
 if(g){const r=byId(g.dataset.go);if(r){$('t1').click();sel=r.id;setView(r.lon,r.lat,Math.max(V.z,15));drawPop()}return}
 try{if(a==='create'){await createAccount($('anick').value.trim()||'Volunteer');drawAcct()}
 if(a==='signin'){await signInAccount($('anick2').value.trim(),$('acode').value);drawAcct()}
 if(a==='show'){showCode=!showCode;drawAcct()}
 if(a==='copy'){try{await navigator.clipboard.writeText(acct.code);$('amsg').textContent='Copied.'}catch(x){$('amsg').textContent='Could not copy – select the code and copy it.'}}
 if(a==='out'){await sb.auth.signOut();acct=null;uid=null;showCode=false;try{localStorage.removeItem('jsn_acct')}catch(x){}$('who').textContent='';drawAcct();render();drawEv()}}
 catch(x){const m=$(a==='create'?'cmsg':'amsg')||$('amsg');if(m)m.textContent=x.message||'Could not complete that account action.'}};
// ---- kit requests (shown publicly with the requester's nickname; admins mark them supplied, which updates the kit bank) ----
let realReq=[];const DEMOREQ=[{id:'dr1',demo:1,item:'bags',qty:20,evTitle:'Riverside litter pick',name:'Sam',t:Date.now()-864e5,status:'pending'},{id:'dr2',demo:1,item:'picker',qty:6,evTitle:'Beach clean',name:'Priya',t:Date.now()-3*864e5,status:'supplied'}];
const allReq=()=>showDemo?DEMOREQ.concat(realReq):realReq;
$('ri').innerHTML=GIVE.map(g=>`<option value="${g.id}">${g.icon} ${g.name}</option>`).join('');
function drawReq(){const cur=$('rev').value;$('rev').innerHTML=allEv().filter(e=>e.when>Date.now()-864e5).sort((a,b)=>a.when-b.when).map(e=>`<option value="${esc(e.id)}">${esc(e.title)} – ${new Date(e.when).toLocaleDateString('en-GB')}</option>`).join('')+'<option value="">Other / not listed</option>';if(cur)$('rev').value=cur;
 const L=allReq().slice().sort((a,b)=>b.t-a.t);
 $('reqs').innerHTML=L.length?L.map(r=>{const g=GIVE.find(x=>x.id===r.item)||GIVE[0];return `<div class="rep"><div style="font-size:26px;width:40px;text-align:center">${g.icon}</div><div style="flex:1"><b>${r.qty} × ${g.name}</b><br><span class="mute">${esc(r.evTitle||'Other')} · ${esc(r.name||'Guest')}${r.note?' · '+esc(r.note):''}</span></div><div>${r.status==='supplied'?'<span style="color:var(--acc)">✓ Supplied</span>':(isAdmin?`<button class="s" data-sup="${esc(r.id)}">Mark supplied</button>`:'<span class="mute">Pending</span>')}</div></div>`}).join(''):'No requests yet.'}
$('rgo').onclick=async()=>{const g=GIVE.find(x=>x.id===$('ri').value),q=Math.min(500,Math.max(1,+$('rq').value||1)),ev=allEv().find(e=>e.id===$('rev').value),m=$('rmsg'),st=stock()[g.id]||{in:0,out:0},av=Math.max(0,st.in-st.out);
 const rq={id:Date.now()+'_'+localId,item:g.id,qty:q,evId:ev?ev.id:'',evTitle:ev?ev.title:'Other',note:$('rn').value.trim().slice(0,120),by:myId(),name:acct?acct.name:'Guest',t:Date.now(),status:'pending'};
 try{if(db)await db.doc('requests/'+rq.id).set(rq);else{realReq.push(rq);drawReq()}m.textContent=q>av?`Requested. Only ${av} in stock right now, so this may take longer.`:'Requested – it shows as pending until supplied.';$('rn').value=''}catch(e){m.textContent='Could not send request.'}};
$('reqs').onclick=async e=>{const id=e.target.dataset.sup;if(!id)return;const r=allReq().find(x=>x.id===id);if(!r||r.status==='supplied')return;
 if(db&&!r.demo){try{await db.doc('ledger/req_'+id).set({id:'req_'+id,item:r.item,type:'out',n:r.qty,by:myId(),t:Date.now()});await db.doc('requests/'+id).update({status:'supplied'})}catch(x){$('rmsg').textContent='Could not update.';return}}else{r.status='supplied';LEDGER.push({item:r.item,type:'out',n:r.qty})}drawBank();drawReq()};
window.addEventListener('resize',render);
setView(-2.5,54.3,5);
drawEv();drawAcct();

// ---- Supabase bootstrap ----
let sb=null,sbUser=null;
function row(table,d){
 if(table==='reports')return{id:d.id,lat:d.lat,lon:d.lon,cat:d.cat,note:d.note||'',img:d.img||'',by:d.by_user,t:d.t,cleaned:!!d.cleaned,cleanedT:d.cleaned_t||0,cleanedBy:d.cleaned_by||null};
 if(table==='report_stills')return{id:d.id,rep:d.rep,by:d.by_user,t:d.t};
 if(table==='events')return{id:d.id,title:d.title,loc:d.loc,when:d.when,by:d.by_user};
 if(table==='rsvps')return{id:d.id,ev:d.ev,by:d.by_user,t:d.t};
 if(table==='kit_requests')return{id:d.id,item:d.item,qty:d.qty,evId:d.ev_id||'',evTitle:d.ev_title||'',note:d.note||'',by:d.by_user,name:d.name||'Guest',t:d.t,status:d.status};
 if(table==='kit_ledger')return{id:d.id,item:d.item,type:d.type,n:d.n,by:d.by_user,t:d.t};
 if(table==='profiles')return{id:d.id,name:d.name,isAdmin:!!d.is_admin};
 if(table==='good_news')return{id:d.id,title:d.title,body:d.body,name:d.name,by:d.by_user,t:d.t};
 return d;
}
function dbRow(table,d){
 const x={...d};delete x.demo;
 if(table==='reports'){return{id:x.id,lat:x.lat,lon:x.lon,cat:x.cat,note:x.note||'',img:x.img||'',by_user:x.by||null,t:x.t,cleaned:!!x.cleaned,cleaned_t:x.cleanedT||0,cleaned_by:x.cleanedBy||null};}
 if(table==='report_stills')return{id:x.id,rep:x.rep,by_user:x.by,t:x.t};
 if(table==='events')return{id:x.id,title:x.title,loc:x.loc,when:x.when,by_user:x.by||null};
 if(table==='rsvps')return{id:x.id,ev:x.ev,by_user:x.by,t:x.t};
 if(table==='kit_requests')return{id:x.id,item:x.item,qty:x.qty,ev_id:x.evId||'',ev_title:x.evTitle||'',note:x.note||'',by_user:x.by||null,name:x.name||'Guest',t:x.t,status:x.status||'pending'};
 if(table==='kit_ledger')return{id:x.id,item:x.item,type:x.type,n:x.n,by_user:x.by||null,t:x.t};
 if(table==='profiles')return{id:x.id||uid,name:x.name||'Volunteer'};
 if(table==='good_news')return{id:x.id,title:x.title,body:x.body,name:x.name||'Volunteer',by_user:x.by||null,t:x.t};
 return x;
}
function tableName(name){return ({requests:'kit_requests',ledger:'kit_ledger',stills:'report_stills',news:'good_news'})[name]||name}
function dbPatch(table,d){
 const x={...d};
 if(table==='reports'){const o={};if('lat'in x)o.lat=x.lat;if('lon'in x)o.lon=x.lon;if('cat'in x)o.cat=x.cat;if('note'in x)o.note=x.note;if('img'in x)o.img=x.img;if('by'in x)o.by_user=x.by;if('t'in x)o.t=x.t;if('cleaned'in x)o.cleaned=!!x.cleaned;if('cleanedT'in x)o.cleaned_t=x.cleanedT;if('cleanedBy'in x)o.cleaned_by=x.cleanedBy;return o;}
 if(table==='report_stills'){const o={};if('rep'in x)o.rep=x.rep;if('by'in x)o.by_user=x.by;if('t'in x)o.t=x.t;return o;}
 if(table==='events'){const o={};if('title'in x)o.title=x.title;if('loc'in x)o.loc=x.loc;if('when'in x)o.when=x.when;if('by'in x)o.by_user=x.by;return o;}
 if(table==='rsvps'){const o={};if('ev'in x)o.ev=x.ev;if('by'in x)o.by_user=x.by;if('t'in x)o.t=x.t;return o;}
 if(table==='kit_requests'){const o={};if('item'in x)o.item=x.item;if('qty'in x)o.qty=x.qty;if('evId'in x)o.ev_id=x.evId;if('evTitle'in x)o.ev_title=x.evTitle;if('note'in x)o.note=x.note;if('by'in x)o.by_user=x.by;if('name'in x)o.name=x.name;if('t'in x)o.t=x.t;if('status'in x)o.status=x.status;return o;}
 if(table==='kit_ledger'){const o={};if('item'in x)o.item=x.item;if('type'in x)o.type=x.type;if('n'in x)o.n=x.n;if('by'in x)o.by_user=x.by;if('t'in x)o.t=x.t;return o;}
 if(table==='profiles'){const o={};if('name'in x)o.name=x.name;if('isAdmin'in x)o.is_admin=!!x.isAdmin;return o;}
 return x;
}
function makeDb(client){
 return {
  doc(path){
   const [rawTable,id]=path.split('/'); const table=tableName(rawTable);
   return {
    async set(data){const {error}=await client.from(table).upsert(dbRow(table,{...data,id}),{onConflict:'id'});if(error)throw error},
    async update(data){const {data:r,error}=await client.from(table).update(dbPatch(table,data)).eq('id',id).select('id');if(error)throw error;if(!r||!r.length)throw new Error('Not allowed')},
    async delete(){const {data:r,error}=await client.from(table).delete().eq('id',id).select('id');if(error)throw error;if(!r||!r.length)throw new Error('Not allowed')}
   };
  },
  collection(rawTable){
   const table=tableName(rawTable);
   return {onSnapshot(cb){
    let dead=false;
    const load=async()=>{const {data,error}=await client.from(table).select('*');if(!dead&&!error)cb({docs:(data||[]).map(x=>({data:()=>row(table,x)}))})};
    load();
    const channel=client.channel('jsn-'+table+'-'+Math.random().toString(36).slice(2)).on('postgres_changes',{event:'*',schema:'public',table},()=>load()).subscribe();
    return()=>{dead=true;client.removeChannel(channel)};
   }};
  }
 };
}
function makeAssets(client){return{async upload(blob,reportId){const path=`${uid}/${reportId}.jpg`;const {error}=await client.storage.from('report-photos').upload(path,blob,{contentType:'image/jpeg',upsert:true});if(error)throw error;const {data}=client.storage.from('report-photos').getPublicUrl(path);return data.publicUrl}}}
(async()=>{try{
 if(!window.JSN_SUPABASE_URL||!window.JSN_SUPABASE_ANON_KEY||window.JSN_SUPABASE_URL.includes('YOUR-PROJECT')){console.warn('JSN Supabase config is missing. Copy config.example.js to config.js and add your project values.');return}
 sb=window.supabase.createClient(window.JSN_SUPABASE_URL,window.JSN_SUPABASE_ANON_KEY);db=makeDb(sb);assets=makeAssets(sb);
 const {data:{session}}=await sb.auth.getSession();sbUser=session?.user||null;uid=sbUser?.id||null;
 sb.auth.onAuthStateChange(async(_event,sess)=>{sbUser=sess?.user||null;uid=sbUser?.id||null;if(sbUser){const {data:p}=await sb.from('profiles').select('name,is_admin').eq('id',sbUser.id).maybeSingle();isAdmin=!!p?.is_admin;if(!acct){const saved=JSON.parse(localStorage.getItem('jsn_acct')||'null');if(saved?.code)await finishAcct(saved.name||p?.name||'Volunteer',saved.code,true)}else if(acct.id!==sbUser.id){acct=null}drawBank();drawReq();drawAcct();drawStories()}else{isAdmin=false;acct=null;drawAcct();drawBank();drawReq();drawStories()}});
 // Initial data listeners.
 db.collection('requests').onSnapshot(q=>{realReq=q.docs.map(d=>d.data());drawReq()});
 db.collection('ledger').onSnapshot(q=>{LEDGER=q.docs.map(d=>d.data());drawBank()});
 db.collection('rsvps').onSnapshot(q=>{RS=q.docs.map(d=>d.data());drawEv()});
 db.collection('report_stills').onSnapshot(q=>{SL=q.docs.map(d=>d.data());drawPop();render()});
 db.collection('reports').onSnapshot(q=>{real=q.docs.map(d=>d.data()).filter(validRep);render();drawPop()});
 db.collection('events').onSnapshot(q=>{events=q.docs.map(d=>d.data());drawEv()});
 db.collection('news').onSnapshot(q=>{POSTS=q.docs.map(d=>d.data());drawStories()});
 if(sbUser){const saved=JSON.parse(localStorage.getItem('jsn_acct')||'null');if(saved?.code)await setAcct(saved.name||'Volunteer',saved.code,false)}
}catch(e){console.error('Supabase startup error',e);$('msg').textContent='Backend connection error – check config.js and the Supabase setup.'}})();

