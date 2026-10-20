const MASCOT=(sad)=>`<img src="images/MUVOKU.png" alt="MilkLove mascot" class="${sad?'sad':''}">`;

const $=s=>document.querySelector(s);
const CLUES={easy:40,medium:32,hard:27};
let diff='easy',sol,given,vals,notes,sel=-1,mist=0,nm=false,hist=[],base=0,t0=0,tmr=null,over=false,state='ready';
const row=i=>i/9|0,col=i=>i%9,bx=i=>(i/27|0)*3+((i%9)/3|0);
const peer=(a,b)=>row(a)==row(b)||col(a)==col(b)||bx(a)==bx(b);

function cands(g,i){
  const r=row(i),c=col(i);let m=0;
  for(let k=0;k<9;k++){m|=1<<g[r*9+k];m|=1<<g[k*9+c]}
  const br=r-r%3,bc=c-c%3;
  for(let a=0;a<3;a++)for(let b=0;b<3;b++)m|=1<<g[(br+a)*9+bc+b];
  return ~m&0x3fe;
}
function pick(g){
  let best=-1,bm=0,bn=10;
  for(let i=0;i<81;i++)if(!g[i]){
    const m=cands(g,i);let n=0;for(let x=m;x;x&=x-1)n++;
    if(n<bn){bn=n;best=i;bm=m;if(n<2)break}
  }
  return [best,bm];
}
function count(g,limit){
  const [i,m]=pick(g);if(i<0)return 1;
  let n=0;
  for(let d=1;d<=9;d++)if(m&(1<<d)){g[i]=d;n+=count(g,limit-n);g[i]=0;if(n>=limit)break}
  return n;
}
function fill(g){
  const [i,m]=pick(g);if(i<0)return true;
  const ds=[];for(let d=1;d<=9;d++)if(m&(1<<d))ds.push(d);
  shuffle(ds);
  for(const d of ds){g[i]=d;if(fill(g))return true;g[i]=0}
  return false;
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}

function newGame(d){
  diff=d;
  const full=new Array(81).fill(0);fill(full);
  sol=full.slice();
  const puz=full.slice();
  let clues=81;
  for(const i of shuffle([...Array(81).keys()])){
    if(clues<=CLUES[d])break;
    const keep=puz[i];puz[i]=0;
    if(count(puz.slice(),2)!==1)puz[i]=keep;else clues--;
  }
  given=puz.map(v=>v>0);vals=puz.slice();notes=Array.from({length:81},()=>[]);
  sel=-1;mist=0;hist=[];over=false;
  $('#ov').classList.remove('show');
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.d===d));
  clearInterval(tmr);base=0;state='ready';tick();
  render();showOv('start');
}
const el=()=>base+(state==='playing'?Date.now()-t0:0);
function tick(){const s=el()/1000|0;$('#tm').textContent=(s/60|0)+':'+String(s%60).padStart(2,'0')}

const board=$('#board');
for(let i=0;i<81;i++){
  const c=document.createElement('div');c.className='cell';c.dataset.i=i;
  c.innerHTML='<span class="v"></span><div class="n">'+[1,2,3,4,5,6,7,8,9].map(()=>'<span></span>').join('')+'</div>';
  c.onclick=()=>{if(state==='playing'){sel=i;render()}};
  board.appendChild(c);
}
const pad=$('#pad');
for(let d=1;d<=9;d++){
  const b=document.createElement('button');b.dataset.d=d;b.innerHTML=d+'<small></small>';
  b.onclick=()=>place(d);pad.appendChild(b);
}

function render(){
  const cells=board.children;
  for(let i=0;i<81;i++){
    const c=cells[i],v=vals[i];
    let cls='cell';
    if(given[i])cls+=' given';
    if(sel>=0&&peer(sel,i))cls+=' hl';
    if(sel>=0&&vals[sel]&&v===vals[sel])cls+=' same';
    if(i===sel)cls+=' sel';
    if(v&&v!==sol[i])cls+=' bad';
    c.className=cls;
    c.firstChild.textContent=v||'';
    const ns=c.lastChild.children;
    for(let k=0;k<9;k++)ns[k].textContent=(!v&&notes[i].includes(k+1))?k+1:'';
  }
  $('#mc').textContent=mist+'/3';
  $('#hearts').innerHTML=[0,1,2].map(k=>`<span class="${k<mist?'lost':''}">♥</span>`).join('');
  for(let d=1;d<=9;d++){
    let n=0;for(let i=0;i<81;i++)if(vals[i]===d&&sol[i]===d)n++;
    const b=pad.children[d-1];b.disabled=n>=9;b.lastChild.textContent=(9-n);
  }
  $('#notes').textContent='✎ Notes: '+(nm?'on':'off');
  $('#notes').classList.toggle('on',nm);
  board.classList.toggle('hide',state==='ready'||state==='paused');
  $('#pause').disabled=state!=='playing';
}

function place(d){
  if(state!=='playing'||sel<0||given[sel]||vals[sel]===sol[sel])return;
  if(vals[sel]===d)return;
  if(nm){
    if(vals[sel])return;
    hist.push({i:sel,v:vals[sel],n:notes[sel].slice()});
    const k=notes[sel].indexOf(d);k<0?notes[sel].push(d):notes[sel].splice(k,1);
    render();return;
  }
  hist.push({i:sel,v:vals[sel],n:notes[sel].slice()});
  vals[sel]=d;notes[sel]=[];
  if(d!==sol[sel]){
    mist++;render();
    if(mist>=3)finish(false);
    return;
  }
  for(let i=0;i<81;i++)if(peer(sel,i)){const k=notes[i].indexOf(d);if(k>=0)notes[i].splice(k,1)}
  render();
  if(vals.every((v,i)=>v===sol[i]))finish(true);
}
function erase(){
  if(state!=='playing'||sel<0||given[sel]||vals[sel]===sol[sel])return;
  hist.push({i:sel,v:vals[sel],n:notes[sel].slice()});
  vals[sel]=0;notes[sel]=[];render();
}
function undo(){
  if(state!=='playing'||!hist.length)return;
  const h=hist.pop();vals[h.i]=h.v;notes[h.i]=h.n;sel=h.i;render();
}
function startTimer(){
  state='playing';t0=Date.now();clearInterval(tmr);tmr=setInterval(tick,500);
  $('#ov').classList.remove('show');render();
}
function pauseGame(){
  if(state!=='playing')return;
  base+=Date.now()-t0;state='paused';clearInterval(tmr);tick();render();showOv('pause');
}
function showOv(kind){
  const start=kind==='start';
  $('#ovbox').innerHTML=MASCOT(false)+(start
    ?`<h2>Ready?</h2><p>${diff[0].toUpperCase()+diff.slice(1)} puzzle · timer starts when you press Play.</p><button id="go">▶ Play</button>`
    :`<h2>Paused</h2><p>Board hidden. Timer stopped at ${$('#tm').textContent}.</p><button id="go">▶ Resume</button>`);
  $('#ov').classList.add('show');
  $('#go').onclick=startTimer;
}
function finish(win){
  base+=Date.now()-t0;state='over';over=true;clearInterval(tmr);tick();render();
  $('#ovbox').innerHTML=MASCOT(!win)+(win
    ?`<h2>You did it! 💚🩷</h2><p>${diff[0].toUpperCase()+diff.slice(1)} solved in ${$('#tm').textContent} with ${mist} mistake${mist==1?'':'s'}.</p>`
    :`<h2>3 mistakes</h2><p>The puppy is sad… ready for another try?</p>`)
    +`<button id="again">Play ${diff}</button><button id="other">Change level</button>`;
  $('#ov').classList.add('show');
  $('#again').onclick=()=>newGame(diff);
  $('#other').onclick=()=>{$('#ov').classList.remove('show')};
  if(!win){const b=$('#other');b.textContent='View board'}
}

document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>newGame(b.dataset.d));
$('#undo').onclick=undo;$('#erase').onclick=erase;$('#newg').onclick=()=>newGame(diff);
$('#notes').onclick=()=>{nm=!nm;render()};
document.addEventListener('keydown',e=>{
  if(e.key>='1'&&e.key<='9')place(+e.key);
  else if(e.key==='Backspace'||e.key==='Delete')erase();
  else if(e.key==='n'||e.key==='N'){nm=!nm;render()}
  else if(e.key==='z'&&(e.ctrlKey||e.metaKey))undo();
  else if(e.key.startsWith('Arrow')&&state==='playing'){
    e.preventDefault();if(sel<0)sel=40;
    const r=row(sel),c=col(sel);
    if(e.key==='ArrowUp')sel=Math.max(0,r-1)*9+c;
    if(e.key==='ArrowDown')sel=Math.min(8,r+1)*9+c;
    if(e.key==='ArrowLeft')sel=r*9+Math.max(0,c-1);
    if(e.key==='ArrowRight')sel=r*9+Math.min(8,c+1);
    render();
  }
});
$('#pause').onclick=pauseGame;
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame()});
document.addEventListener('keydown',e=>{
  if(e.key==='p'||e.key==='P'){if(state==='playing')pauseGame();else if(state==='paused'||state==='ready')startTimer()}
});
newGame('easy');
