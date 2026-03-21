import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "firebase/auth";
import {
  doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit, onSnapshot,
  addDoc, serverTimestamp, arrayUnion, arrayRemove, deleteField
} from "firebase/firestore";

const EMOJI_LIST = ["😀","😂","🤣","😍","🥰","😘","😎","🤩","🥳","😤","🔥","💀","👀","💯","❤️","💔","👍","👎","✌️","🤙","💪","🎮","🏆","⚡","🎯","🎪","🎨","🎵","🍕","🌮","🍿","🍩","🐶","🐱","🦄","🌈","☀️","🌙","⭐","🚀","💎","🎁","🃏","🎲","🧩","🏅","🥊","🔥"];
const AVATARS = ["🦊","🐺","🦁","🐲","🦅","🐻","🦈","🦉","🐯","🦖","⚡","🔥","💎","🎮"];
const HANGMAN_WORDS = ["JAVASCRIPT","GAMING","MOBILE","CHALLENGE","VICTORY","PLAYER","CHAMPION","WARRIOR","LEGEND","ARCADE"];
const HANGMAN_STAGES = [()=>{},
  (c,w,h)=>{c.beginPath();c.arc(w/2,h*.25,15,0,Math.PI*2);c.stroke();},
  (c,w,h)=>{c.beginPath();c.moveTo(w/2,h*.25+15);c.lineTo(w/2,h*.55);c.stroke();},
  (c,w,h)=>{c.beginPath();c.moveTo(w/2,h*.35);c.lineTo(w/2-25,h*.45);c.stroke();},
  (c,w,h)=>{c.beginPath();c.moveTo(w/2,h*.35);c.lineTo(w/2+25,h*.45);c.stroke();},
  (c,w,h)=>{c.beginPath();c.moveTo(w/2,h*.55);c.lineTo(w/2-20,h*.72);c.stroke();},
  (c,w,h)=>{c.beginPath();c.moveTo(w/2,h*.55);c.lineTo(w/2+20,h*.72);c.stroke();}];

const GAMES_LIST = [
  {key:"tictactoe",icon:"❌⭕",label:"Tic Tac Toe",multi:true,desc:"Classic strategy"},
  {key:"battleship",icon:"🚢",label:"Battleship",multi:true,desc:"Naval warfare"},
  {key:"hangman",icon:"📝",label:"Hangman",multi:false,desc:"Word guessing"},
  {key:"stickfight",icon:"🥊",label:"Stick Fight",multi:false,desc:"Real-time brawl"},
  {key:"pool",icon:"🎱",label:"8 Ball Pool",multi:false,desc:"Billiards physics"},
];

const S = {
  app:{width:"100%",maxWidth:430,height:"100dvh",margin:"0 auto",background:"#0a0a0f",color:"#e2e8f0",fontFamily:"'Outfit',sans-serif",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column"},
  btn:{border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif"},
  inp:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 16px",color:"#e2e8f0",fontSize:15,fontFamily:"'Outfit',sans-serif",outline:"none",width:"100%",boxSizing:"border-box"},
};

function generateInviteCode(){return Math.random().toString(36).substring(2,8).toUpperCase();}
function notify(){try{if(navigator.vibrate)navigator.vibrate([100,50,100]);}catch(e){}}

// ═══════ MULTIPLAYER TIC TAC TOE ═══════
function MultiTicTacToe({gameId,userId,opponentName,onClose}){
  const[game,setGame]=useState(null);const[loading,setLoading]=useState(true);
  useEffect(()=>{if(!gameId)return;const u=onSnapshot(doc(db,"games",gameId),s=>{if(s.exists())setGame({id:s.id,...s.data()});setLoading(false);});return()=>u();},[gameId]);
  const move=async(i)=>{if(!game||game.winner||game.board[i]||game.turn!==userId)return;const nb=[...game.board];const mk=game.players[0]===userId?"X":"O";nb[i]=mk;
    const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];let w=null,wl=null;
    for(const[a,b,c]of lines)if(nb[a]&&nb[a]===nb[b]&&nb[a]===nb[c]){w=userId;wl=[a,b,c];break;}
    if(!w&&nb.every(Boolean))w="draw";const nt=game.players[0]===userId?game.players[1]:game.players[0];
    await updateDoc(doc(db,"games",gameId),{board:nb,turn:nt,winner:w||null,winLine:wl||null,lastMove:serverTimestamp()});};
  const rematch=async()=>{await updateDoc(doc(db,"games",gameId),{board:Array(9).fill(null),turn:game.players[0],winner:null,winLine:null});};
  if(loading)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{fontFamily:"'Orbitron',sans-serif",color:"#FF1744"}}>Loading...</div></div>;
  if(!game)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{color:"#ef4444"}}>Game not found</div></div>;
  const mk=game.players[0]===userId?"X":"O";const my=game.turn===userId;const iw=game.winner===userId;const dr=game.winner==="draw";const ov=!!game.winner;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#0f172a,#1a0a0a)",color:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,letterSpacing:2}}>TIC TAC TOE</span><div style={{width:28}}/></div>
    <div style={{padding:"12px 16px",textAlign:"center"}}><div style={{fontSize:12,color:my?"#FF1744":"#FF5722",fontFamily:"'Orbitron',sans-serif"}}>{ov?(dr?"DRAW!":(iw?"YOU WIN! 🎉":`${opponentName} WINS!`)):(my?`YOUR TURN (${mk})`:`${opponentName?.toUpperCase()}'S TURN...`)}</div></div>
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,width:240,height:240}}>
      {game.board.map((cell,i)=>(<button key={i} onClick={()=>move(i)} style={{width:76,height:76,borderRadius:12,background:game.winLine?.includes(i)?"rgba(255,23,68,0.2)":"rgba(255,255,255,0.04)",border:game.winLine?.includes(i)?"2px solid #FF1744":"1px solid rgba(255,255,255,0.08)",color:cell==="X"?"#FF1744":"#FF5722",fontSize:32,fontWeight:800,cursor:my&&!cell?"pointer":"default",fontFamily:"'Orbitron',sans-serif"}}>{cell}</button>))}
    </div></div>
    {ov&&<div style={{padding:16,textAlign:"center"}}><button onClick={rematch} style={{...S.btn,background:"linear-gradient(135deg,#FF1744,#D50000)",color:"#fff",padding:"10px 28px",borderRadius:20,fontSize:14,fontFamily:"'Orbitron',sans-serif"}}>REMATCH</button></div>}
  </div>);
}

// ═══════ MULTIPLAYER BATTLESHIP ═══════
function MultiBattleship({gameId,userId,opponentName,onClose}){
  const G=10,CS=28,SHIPS=[{n:"Carrier",s:5},{n:"Battleship",s:4},{n:"Cruiser",s:3},{n:"Submarine",s:3},{n:"Destroyer",s:2}];
  const e0=()=>Array(G).fill(null).map(()=>Array(G).fill(0));
  const[game,setGame]=useState(null);const[loading,setLoading]=useState(true);const[phase,setPhase]=useState("place");
  const[lb,setLb]=useState(e0);const[cs,setCs]=useState(0);const[hz,setHz]=useState(true);const[hv,setHv]=useState([]);const[vb,setVb]=useState("enemy");
  useEffect(()=>{if(!gameId)return;const u=onSnapshot(doc(db,"games",gameId),s=>{if(s.exists()){const d={id:s.id,...s.data()};setGame(d);const mk=d.players[0]===userId?"p1":"p2";if(d[mk+"Board"]?.length>0){if(d.p1Board?.length>0&&d.p2Board?.length>0)setPhase("battle");else setPhase("waiting");}}setLoading(false);});return()=>u();},[gameId,userId]);
  const cp=(r,c,sz,h,b)=>{for(let i=0;i<sz;i++){const rr=h?r:r+i;const cc=h?c+i:c;if(rr>=G||cc>=G||b[rr][cc]!==0)return false;}return true;};
  const ph=(r,c)=>{if(cs>=SHIPS.length)return;const sh=SHIPS[cs];const cells=[];const v=cp(r,c,sh.s,hz,lb);for(let i=0;i<sh.s;i++){const rr=hz?r:r+i;const cc=hz?c+i:c;if(rr<G&&cc<G)cells.push({r:rr,c:cc,valid:v});}setHv(cells);};
  const pc=async(r,c)=>{if(cs>=SHIPS.length)return;const sh=SHIPS[cs];if(!cp(r,c,sh.s,hz,lb))return;const nb=lb.map(r=>[...r]);for(let i=0;i<sh.s;i++){const rr=hz?r:r+i;const cc=hz?c+i:c;nb[rr][cc]=1;}setLb(nb);const ns=cs+1;setCs(ns);setHv([]);
    if(ns>=SHIPS.length){const mk=game.players[0]===userId?"p1":"p2";const tot=SHIPS.reduce((a,s)=>a+s.s,0);await updateDoc(doc(db,"games",gameId),{[mk+"Board"]:nb.flat(),[mk+"Cells"]:tot});setPhase("waiting");}};
  const atk=async(r,c)=>{if(!game||game.turn!==userId||game.winner)return;const ok=game.players[0]===userId?"p2":"p1";const mk=game.players[0]===userId?"p1":"p2";
    const ob=[];for(let i=0;i<G;i++)ob.push(game[ok+"Board"].slice(i*G,(i+1)*G));const sk=mk+"Shots";const shots=game[sk]?[...game[sk]]:Array(100).fill(0);const idx=r*G+c;if(shots[idx]!==0)return;
    const hit=ob[r][c]===1;shots[idx]=hit?2:1;const ock=ok+"Cells";const nc=hit?(game[ock]-1):game[ock];const nt=game.players[0]===userId?game.players[1]:game.players[0];
    const up={[sk]:shots,[ock]:nc,turn:nt,lastMove:serverTimestamp()};if(nc<=0)up.winner=userId;await updateDoc(doc(db,"games",gameId),up);};
  if(loading)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{fontFamily:"'Orbitron',sans-serif",color:"#4FC3F7"}}>Loading...</div></div>;
  const mk=game?.players[0]===userId?"p1":"p2";const ok=game?.players[0]===userId?"p2":"p1";
  const ms=game?.[mk+"Shots"]||Array(100).fill(0);const os=game?.[ok+"Shots"]||Array(100).fill(0);const my=game?.turn===userId;const ov=!!game?.winner;const iw=game?.winner===userId;
  const rg=(b2,s1,onClick,isE,hOn)=>(<div style={{display:"inline-block"}}>
    <div style={{display:"flex",paddingLeft:CS}}>{Array.from({length:G},(_,i)=>(<div key={i} style={{width:CS,textAlign:"center",fontSize:9,color:"#64748b",fontFamily:"'Orbitron',sans-serif"}}>{String.fromCharCode(65+i)}</div>))}</div>
    {Array.from({length:G},(_,r)=>(<div key={r} style={{display:"flex"}}><div style={{width:CS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#64748b",fontFamily:"'Orbitron',sans-serif"}}>{r+1}</div>
      {Array.from({length:G},(_,c)=>{const idx=r*G+c;const sh=s1[idx];const hs=b2[r]?.[c]===1;const h=hv.find(h=>h.r===r&&h.c===c);let bg="rgba(255,255,255,0.03)",ct="";if(sh===2){bg="#DC2626";ct="💥";}else if(sh===1){bg="#1e293b";ct="•";}else if(!isE&&hs)bg="rgba(99,102,241,0.25)";if(h)bg=h.valid?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)";
        return(<div key={c} onClick={()=>onClick?.(r,c)} onMouseEnter={()=>hOn&&ph(r,c)} style={{width:CS,height:CS,background:bg,border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:sh===2?12:10,color:sh===1?"#475569":"#fff",cursor:onClick?"crosshair":"default"}}>{ct}</div>);})}</div>))}
  </div>);
  const e2=e0();
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#0a1628,#0f172a)",color:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:"1px solid #1e293b"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:13,letterSpacing:2,color:"#4FC3F7"}}>🚢 BATTLESHIP</span><div style={{width:28}}/></div>
    {phase==="place"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
      <div style={{fontSize:11,color:"#94a3b8",fontFamily:"'Orbitron',sans-serif"}}>{cs<SHIPS.length?`Place ${SHIPS[cs].n} (${SHIPS[cs].s})`:"Submitting..."}</div>
      <button onClick={()=>setHz(!hz)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 14px",color:"#4FC3F7",fontSize:11,cursor:"pointer",fontFamily:"'Orbitron',sans-serif"}}>{hz?"⟷ HORIZ":"⟳ VERT"}</button>
      {rg(lb,Array(100).fill(0),pc,false,true)}</div>}
    {phase==="waiting"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}><div style={{fontSize:32}}>⏳</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"#4FC3F7"}}>SHIPS PLACED!</div><div style={{fontSize:13,color:"#94a3b8"}}>Waiting for {opponentName}...</div></div>}
    {phase==="battle"&&<><div style={{display:"flex",justifyContent:"space-around",padding:"6px 12px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#4FC3F7",fontFamily:"'Orbitron',sans-serif"}}>YOUR SHIPS</div><div style={{fontSize:16,fontWeight:700}}>{game?.[mk+"Cells"]||0}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#FF8A65",fontFamily:"'Orbitron',sans-serif"}}>ENEMY</div><div style={{fontSize:16,fontWeight:700}}>{game?.[ok+"Cells"]||0}</div></div></div>
      <div style={{display:"flex",padding:"8px 16px 0"}}>{["enemy","mine"].map(v=>(<button key={v} onClick={()=>setVb(v)} style={{flex:1,padding:"6px",fontSize:11,fontWeight:600,color:vb===v?"#4FC3F7":"#475569",background:"none",border:"none",cursor:"pointer",borderBottom:vb===v?"2px solid #4FC3F7":"2px solid transparent",fontFamily:"'Orbitron',sans-serif"}}>{v==="enemy"?"ATTACK":"YOUR FLEET"}</button>))}</div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>{vb==="enemy"?rg(e2,ms,my&&!ov?atk:null,true,false):rg(lb,os,null,false,false)}</div>
      <div style={{padding:"8px 16px 16px",textAlign:"center"}}><div style={{fontSize:12,color:my?"#4FC3F7":"#FF8A65",fontFamily:"'Orbitron',sans-serif"}}>{ov?(iw?"VICTORY! 🏆":`${opponentName} wins!`):(my?"Tap to fire":`${opponentName} aiming...`)}</div></div></>}
    {ov&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.85)",zIndex:10}}><div style={{fontSize:48}}>🚢</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:22,color:iw?"#4FC3F7":"#FF8A65",marginTop:8}}>{iw?"VICTORY!":"DEFEATED!"}</div><button onClick={onClose} style={{marginTop:16,...S.btn,background:"linear-gradient(135deg,#4FC3F7,#0288D1)",color:"#fff",padding:"12px 28px",borderRadius:24,fontSize:14,fontFamily:"'Orbitron',sans-serif"}}>BACK</button></div>}
  </div>);
}

// ═══════ HANGMAN (Solo) ═══════
function Hangman({onClose}){
  const[word,setWord]=useState(()=>HANGMAN_WORDS[Math.floor(Math.random()*HANGMAN_WORDS.length)]);
  const[guessed,setGuessed]=useState(new Set());const[mistakes,setMistakes]=useState(0);const cr=useRef(null);const mx=6;const wl=word.split("");const isW=wl.every(l=>guessed.has(l));const isL=mistakes>=mx;
  useEffect(()=>{const c=cr.current;if(!c)return;const x=c.getContext("2d");const w=c.width,h=c.height;x.clearRect(0,0,w,h);x.strokeStyle="#475569";x.lineWidth=2;x.beginPath();x.moveTo(20,h-15);x.lineTo(w-20,h-15);x.stroke();x.beginPath();x.moveTo(50,h-15);x.lineTo(50,25);x.lineTo(w/2,25);x.lineTo(w/2,45);x.stroke();x.strokeStyle=isL?"#FF1744":"#e2e8f0";x.lineWidth=2.5;for(let i=1;i<=mistakes;i++)HANGMAN_STAGES[i](x,w,h);},[mistakes,isL]);
  const g=l=>{if(guessed.has(l)||isW||isL)return;const n=new Set(guessed);n.add(l);setGuessed(n);if(!word.includes(l))setMistakes(m=>m+1);};
  const nw=()=>{setWord(HANGMAN_WORDS[Math.floor(Math.random()*HANGMAN_WORDS.length)]);setGuessed(new Set());setMistakes(0);};
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#0c0a09,#1c1917)",color:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,letterSpacing:2}}>HANGMAN</span><div style={{width:28}}/></div>
    <div style={{padding:"8px 16px",display:"flex",justifyContent:"center",gap:4}}>{Array.from({length:mx},(_,i)=>(<div key={i} style={{width:8,height:8,borderRadius:4,background:i<mistakes?"#FF1744":"#334155"}}/>))}</div>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <canvas ref={cr} width={180} height={180} style={{borderRadius:12,background:"rgba(255,255,255,0.02)"}}/>
      <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",padding:"0 16px"}}>{wl.map((l,i)=>(<div key={i} style={{width:28,height:36,borderBottom:`2px solid ${guessed.has(l)?"#22c55e":"#475569"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,fontFamily:"'Orbitron',sans-serif",color:(isL&&!guessed.has(l))?"#FF1744":"#e2e8f0"}}>{guessed.has(l)||isL?l:""}</div>))}</div>
      {(isW||isL)&&<div style={{textAlign:"center"}}><div style={{fontSize:18,fontFamily:"'Orbitron',sans-serif",color:isW?"#22c55e":"#FF1744",marginBottom:12}}>{isW?"YOU GOT IT! 🎉":"GAME OVER 💀"}</div><button onClick={nw} style={{...S.btn,background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",padding:"10px 28px",borderRadius:20,fontSize:14,fontFamily:"'Orbitron',sans-serif"}}>NEW WORD</button></div>}
    </div>
    <div style={{padding:"8px 8px 16px",display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4}}>{"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l=>{const ig=guessed.has(l),ic=ig&&word.includes(l),iw2=ig&&!word.includes(l);return(<button key={l} onClick={()=>g(l)} disabled={ig||isW||isL} style={{width:32,height:36,borderRadius:6,background:ic?"#22c55e":iw2?"#7f1d1d":"rgba(255,255,255,0.06)",border:"none",color:ig?"rgba(255,255,255,0.3)":"#e2e8f0",fontSize:13,fontWeight:700,cursor:ig?"default":"pointer",fontFamily:"'Orbitron',sans-serif",opacity:ig?0.5:1}}>{l}</button>);})}</div>
  </div>);
}

// ═══════ STICK FIGHTER (Solo vs AI) ═══════
function StickFighter({onClose,opponentName}){
  const cr=useRef(null);const gl=useRef(null);const kr=useRef({});const[gs,setGs]=useState("ready");const[winner,setWinner]=useState(null);const sr=useRef(null);
  const GND=230,GRV=0.6,W=340,H=280;
  const ds=useCallback((x,p,col)=>{x.strokeStyle=col;x.lineWidth=2.5;x.lineCap="round";const{x:px,y:py,facing:f,action:a,actionTimer:at}=p;const hy=py-50;
    x.beginPath();x.arc(px,hy,10,0,Math.PI*2);x.stroke();x.fillStyle=col;x.fillRect(px+f*3-1,hy-2,2,2);x.fillRect(px+f*7-1,hy-2,2,2);x.beginPath();x.moveTo(px,hy+10);x.lineTo(px,py-10);x.stroke();
    if(a==="punch"&&at>0){const t=at/12;x.beginPath();x.moveTo(px,hy+18);x.lineTo(px+f*(20+20*(1-t)),hy+15);x.stroke();x.beginPath();x.moveTo(px,hy+18);x.lineTo(px-f*10,hy+28);x.stroke();}
    else if(a==="kick"&&at>0){const t=at/15;x.beginPath();x.moveTo(px,hy+18);x.lineTo(px+f*8,hy+12);x.stroke();x.beginPath();x.moveTo(px,hy+18);x.lineTo(px-f*8,hy+12);x.stroke();x.beginPath();x.moveTo(px,py-10);x.lineTo(px+f*(15+25*(1-t)),py-15-10*(1-t));x.stroke();x.beginPath();x.moveTo(px,py-10);x.lineTo(px-f*10,py);x.stroke();return;}
    else if(a==="block"&&at>0){x.beginPath();x.moveTo(px,hy+18);x.lineTo(px+f*6,hy+8);x.stroke();x.beginPath();x.moveTo(px,hy+18);x.lineTo(px+f*8,hy+24);x.stroke();}
    else{const b=Math.sin(Date.now()/300)*2;x.beginPath();x.moveTo(px,hy+18);x.lineTo(px+f*12,hy+30+b);x.stroke();x.beginPath();x.moveTo(px,hy+18);x.lineTo(px-f*8,hy+32-b);x.stroke();}
    x.beginPath();x.moveTo(px,py-10);x.lineTo(px-12,py);x.stroke();x.beginPath();x.moveTo(px,py-10);x.lineTo(px+12,py);x.stroke();},[]);
  useEffect(()=>{if(gs!=="playing")return;const c=cr.current;if(!c)return;const x=c.getContext("2d");
    const kd=e=>{kr.current[e.key.toLowerCase()]=true;};const ku=e=>{kr.current[e.key.toLowerCase()]=false;};window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
    const loop=()=>{const s=sr.current;const k=kr.current;const p1=s.p1,p2=s.p2;
      if(p1.actionTimer<=0){if(k.a)p1.x-=3;if(k.d)p1.x+=3;if(k.w&&p1.grounded){p1.vy=-10;p1.grounded=false;}if(k.f){p1.action="punch";p1.actionTimer=12;}if(k.g){p1.action="kick";p1.actionTimer=15;}if(k.s){p1.action="block";p1.actionTimer=10;}}
      s.aiTimer++;if(s.aiTimer%20===0&&p2.actionTimer<=0){const d=Math.abs(p2.x-p1.x);if(d<55){const r=Math.random();if(r<.35){p2.action="punch";p2.actionTimer=12;}else if(r<.6){p2.action="kick";p2.actionTimer=15;}else if(r<.8){p2.action="block";p2.actionTimer=10;}else p2.x+=p2.facing*-20;}else p2.x+=(p1.x>p2.x?2:-2);}
      p1.facing=p2.x>p1.x?1:-1;p2.facing=p1.x>p2.x?1:-1;
      [p1,p2].forEach(p=>{if(!p.grounded){p.vy+=GRV;p.y+=p.vy;if(p.y>=GND){p.y=GND;p.vy=0;p.grounded=true;}}p.x=Math.max(20,Math.min(W-20,p.x));if(p.actionTimer>0)p.actionTimer--;else p.action="idle";if(p.hitCooldown>0)p.hitCooldown--;});
      const hit=(a2,d)=>{if(d.hitCooldown>0)return;const dist=Math.abs(a2.x-d.x);const rng=a2.action==="kick"?50:42;if(dist<rng&&((a2.facing===1&&d.x>a2.x)||(a2.facing===-1&&d.x<a2.x))){if(d.action==="block"){d.hitCooldown=8;s.shake=3;}else{const dm=a2.action==="kick"?12:8;d.health=Math.max(0,d.health-dm);d.hitCooldown=15;d.x+=a2.facing*12;s.shake=6;for(let i=0;i<5;i++)s.particles.push({x:d.x,y:d.y-25,vx:(Math.random()-.5)*6,vy:-Math.random()*5,life:20,color:a2.action==="kick"?"#FF4444":"#FFD700"});};}};
      if(p1.action==="punch"&&p1.actionTimer===6)hit(p1,p2);if(p1.action==="kick"&&p1.actionTimer===8)hit(p1,p2);if(p2.action==="punch"&&p2.actionTimer===6)hit(p2,p1);if(p2.action==="kick"&&p2.actionTimer===8)hit(p2,p1);
      s.particles=s.particles.filter(pt=>{pt.x+=pt.vx;pt.y+=pt.vy;pt.life--;return pt.life>0;});if(s.shake>0)s.shake--;
      if(p1.health<=0){setGs("ko");setWinner(opponentName);}if(p2.health<=0){setGs("ko");setWinner("You");}
      x.save();if(s.shake>0)x.translate((Math.random()-.5)*6,(Math.random()-.5)*6);const gr=x.createLinearGradient(0,0,0,H);gr.addColorStop(0,"#1a0a2e");gr.addColorStop(1,"#0d1117");x.fillStyle=gr;x.fillRect(0,0,W,H);
      x.fillStyle="#1e293b";x.fillRect(0,GND,W,H-GND);s.particles.forEach(pt=>{x.fillStyle=pt.color;x.globalAlpha=pt.life/20;x.fillRect(pt.x-2,pt.y-2,4,4);x.globalAlpha=1;});
      ds(x,p1,"#00E5FF");ds(x,p2,"#FF1744");x.restore();gl.current=requestAnimationFrame(loop);};
    gl.current=requestAnimationFrame(loop);return()=>{cancelAnimationFrame(gl.current);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};},[gs,ds,opponentName]);
  const start=()=>{sr.current={p1:{x:80,y:GND,health:100,facing:1,action:"idle",actionTimer:0,hitCooldown:0,vy:0,grounded:true},p2:{x:260,y:GND,health:100,facing:-1,action:"idle",actionTimer:0,hitCooldown:0,vy:0,grounded:true},shake:0,particles:[],aiTimer:0};setWinner(null);setGs("playing");};
  const ta=a=>{if(!sr.current)return;const p=sr.current.p1;if(p.actionTimer>0&&!["left","right","jump"].includes(a))return;if(a==="left")p.x-=15;else if(a==="right")p.x+=15;else if(a==="jump"&&p.grounded){p.vy=-10;p.grounded=false;}else if(a==="punch"){p.action="punch";p.actionTimer=12;}else if(a==="kick"){p.action="kick";p.actionTimer=15;}else if(a==="block"){p.action="block";p.actionTimer=10;}};
  const h1=sr.current?.p1?.health??100,h2=sr.current?.p2?.health??100;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"#0d1117",color:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:"1px solid #1e293b"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,letterSpacing:2,color:"#FF1744"}}>⚔️ STICK CLASH</span><div style={{width:28}}/></div>
    <div style={{display:"flex",gap:8,padding:"8px 12px"}}><div style={{flex:1}}><div style={{fontSize:10,color:"#00E5FF",marginBottom:2,fontFamily:"'Orbitron',sans-serif"}}>YOU</div><div style={{height:10,background:"#1e293b",borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${h1}%`,background:"linear-gradient(90deg,#00E5FF,#00BCD4)",borderRadius:5}}/></div></div><div style={{fontSize:16}}>⚡</div><div style={{flex:1}}><div style={{fontSize:10,color:"#FF1744",marginBottom:2,fontFamily:"'Orbitron',sans-serif",textAlign:"right"}}>{opponentName?.split(" ")[0]?.toUpperCase()}</div><div style={{height:10,background:"#1e293b",borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${h2}%`,background:"linear-gradient(90deg,#FF1744,#D50000)",borderRadius:5,float:"right"}}/></div></div></div>
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}><canvas ref={cr} width={W} height={H} style={{borderRadius:8,maxWidth:"100%"}}/>
      {gs==="ready"&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)",borderRadius:8}}><div style={{fontSize:28}}>🥊</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,marginTop:8,marginBottom:16,color:"#FF1744"}}>READY?</div><button onClick={start} style={{background:"linear-gradient(135deg,#FF1744,#D50000)",color:"#fff",border:"none",padding:"12px 32px",borderRadius:24,fontSize:16,fontFamily:"'Orbitron',sans-serif",cursor:"pointer"}}>FIGHT!</button></div>}
      {gs==="ko"&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.8)",borderRadius:8}}><div style={{fontSize:32}}>🏆</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,color:winner==="You"?"#00E5FF":"#FF1744"}}>{winner==="You"?"VICTORY!":"DEFEATED!"}</div><button onClick={start} style={{marginTop:16,background:"linear-gradient(135deg,#FF1744,#D50000)",color:"#fff",border:"none",padding:"10px 28px",borderRadius:24,fontSize:14,fontFamily:"'Orbitron',sans-serif",cursor:"pointer"}}>REMATCH</button></div>}
    </div>
    {gs==="playing"&&<div style={{padding:"8px 10px 16px",display:"flex",justifyContent:"space-between"}}><div style={{display:"flex",gap:6}}>{[["◀","left"],["▶","right"],["▲","jump"]].map(([i,a])=>(<button key={a} onTouchStart={()=>ta(a)} onMouseDown={()=>ta(a)} style={{width:44,height:44,borderRadius:22,background:"#1e293b",border:"1px solid #334155",color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{i}</button>))}</div><div style={{display:"flex",gap:6}}>{[["🛡","block","#1565C0"],["👊","punch","#FF8F00"],["🦵","kick","#FF1744"]].map(([i,a,bg])=>(<button key={a} onTouchStart={()=>ta(a)} onMouseDown={()=>ta(a)} style={{width:44,height:44,borderRadius:22,background:bg,border:"none",color:"#fff",fontSize:11,cursor:"pointer",fontWeight:700}}>{i}</button>))}</div></div>}
  </div>);
}

// ═══════ 8 BALL POOL (Solo vs AI) ═══════
function EightBallPool({onClose,opponentName}){
  const cr=useRef(null);const gr=useRef(null);const[phase,setPhase]=useState("aim");const[turn,setTurn]=useState("player");const[ps,setPs]=useState(0);const[as2,setAs]=useState(0);
  const[winner,setWinner]=useState(null);const[power,setPower]=useState(0);const[dragging,setDragging]=useState(false);const[angle,setAngle]=useState(0);const[msg,setMsg]=useState("Drag behind cue ball!");const ds=useRef(null);
  const TW=340,TH=190,CW=380,CH=280,TX=(CW-TW)/2,TY=50,BR=8,PR=14,FR=.985;
  const PKS=[{x:TX+2,y:TY+2},{x:TX+TW/2,y:TY-2},{x:TX+TW-2,y:TY+2},{x:TX+2,y:TY+TH-2},{x:TX+TW/2,y:TY+TH+2},{x:TX+TW-2,y:TY+TH-2}];
  const ib=useCallback(()=>{const b=[{x:TX+80,y:TY+TH/2,vx:0,vy:0,color:"#FFF",id:0,sunk:false,type:"cue"}];const c=[{c:"#FFD700",t:"solid"},{c:"#0066CC",t:"solid"},{c:"#CC0000",t:"solid"},{c:"#6B2FA0",t:"solid"},{c:"#FF6600",t:"solid"},{c:"#006633",t:"solid"},{c:"#8B0000",t:"solid"},{c:"#000",t:"eight"},{c:"#FFD700",t:"stripe"},{c:"#0066CC",t:"stripe"},{c:"#CC0000",t:"stripe"},{c:"#6B2FA0",t:"stripe"},{c:"#FF6600",t:"stripe"},{c:"#006633",t:"stripe"},{c:"#8B0000",t:"stripe"}];
    for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}const ei=c.findIndex(x=>x.t==="eight");[c[4],c[ei]]=[c[ei],c[4]];const sx=TX+TW*.7,sy=TY+TH/2;let idx=0;
    for(let row=0;row<5;row++)for(let col=0;col<=row;col++){b.push({x:sx+row*(BR*1.8),y:sy+(col-row/2)*(BR*2.05),vx:0,vy:0,color:c[idx].c,id:idx+1,sunk:false,type:c[idx].t,stripe:c[idx].t==="stripe"});idx++;}return b;},[]);
  useEffect(()=>{gr.current={balls:ib()};},[ib]);
  const phys=useCallback(()=>{const g=gr.current;if(!g)return false;const{balls}=g;let any=false;for(const b of balls){if(b.sunk)continue;b.x+=b.vx;b.y+=b.vy;b.vx*=FR;b.vy*=FR;if(Math.abs(b.vx)<.08)b.vx=0;if(Math.abs(b.vy)<.08)b.vy=0;if(b.vx||b.vy)any=true;
    if(b.x-BR<TX){b.x=TX+BR;b.vx=Math.abs(b.vx)*.9;}if(b.x+BR>TX+TW){b.x=TX+TW-BR;b.vx=-Math.abs(b.vx)*.9;}if(b.y-BR<TY){b.y=TY+BR;b.vy=Math.abs(b.vy)*.9;}if(b.y+BR>TY+TH){b.y=TY+TH-BR;b.vy=-Math.abs(b.vy)*.9;}
    for(const p of PKS)if(Math.hypot(b.x-p.x,b.y-p.y)<PR){b.sunk=true;b.vx=0;b.vy=0;break;}}
    for(let i=0;i<balls.length;i++){if(balls[i].sunk)continue;for(let j=i+1;j<balls.length;j++){if(balls[j].sunk)continue;const dx=balls[j].x-balls[i].x,dy=balls[j].y-balls[i].y,dist=Math.hypot(dx,dy);if(dist<BR*2&&dist>0){const nx=dx/dist,ny=dy/dist,ov=BR*2-dist;balls[i].x-=nx*ov/2;balls[i].y-=ny*ov/2;balls[j].x+=nx*ov/2;balls[j].y+=ny*ov/2;const dvx=balls[i].vx-balls[j].vx,dvy=balls[i].vy-balls[j].vy,dot=dvx*nx+dvy*ny;if(dot>0){balls[i].vx-=dot*nx*.95;balls[i].vy-=dot*ny*.95;balls[j].vx+=dot*nx*.95;balls[j].vy+=dot*ny*.95;}}}}return any;},[]);
  useEffect(()=>{const c=cr.current;if(!c)return;const x=c.getContext("2d");let raf;const draw=()=>{const g=gr.current;if(!g){raf=requestAnimationFrame(draw);return;}
    if(phase==="moving"){const still=!phys();if(still){const sunk=g.balls.filter(b=>b.sunk&&!b.counted);let scored=0,cued=false,eighted=false;for(const b of sunk){b.counted=true;if(b.type==="cue")cued=true;else if(b.type==="eight")eighted=true;else scored++;}
      if(eighted){const w=turn==="player"?"You":opponentName;setWinner(w);setPhase("gameover");setMsg(w+" wins!");}else if(cued){const c2=g.balls[0];c2.sunk=false;c2.counted=false;c2.x=TX+80;c2.y=TY+TH/2;c2.vx=0;c2.vy=0;setMsg("Scratch!");setTurn(t=>t==="player"?"ai":"player");setPhase("aim");}
      else{if(turn==="player")setPs(s=>s+scored);else setAs(s=>s+scored);if(scored>0){setMsg(turn==="player"?`Nice! ${scored} sunk!`:`${opponentName} sunk ${scored}!`);setPhase("aim");}else{setTurn(t=>{const nt=t==="player"?"ai":"player";setMsg(nt==="player"?"Your turn!":opponentName+"'s turn...");return nt;});setPhase("aim");}}}}
    x.clearRect(0,0,CW,CH);x.fillStyle="#5D3A1A";x.beginPath();x.roundRect(TX-18,TY-18,TW+36,TH+36,10);x.fill();x.fillStyle="#4A2E15";x.beginPath();x.roundRect(TX-12,TY-12,TW+24,TH+24,6);x.fill();
    const fg=x.createRadialGradient(TX+TW/2,TY+TH/2,20,TX+TW/2,TY+TH/2,TW/1.5);fg.addColorStop(0,"#1B7A3D");fg.addColorStop(1,"#145C2E");x.fillStyle=fg;x.fillRect(TX,TY,TW,TH);
    for(const p of PKS){x.beginPath();x.arc(p.x,p.y,PR,0,Math.PI*2);x.fillStyle="#0a0a0a";x.fill();}
    for(const b of g.balls){if(b.sunk)continue;x.beginPath();x.arc(b.x+2,b.y+2,BR,0,Math.PI*2);x.fillStyle="rgba(0,0,0,0.3)";x.fill();x.beginPath();x.arc(b.x,b.y,BR,0,Math.PI*2);x.fillStyle=b.color;x.fill();
      if(b.stripe){x.save();x.beginPath();x.arc(b.x,b.y,BR,0,Math.PI*2);x.clip();x.fillStyle="#FFF";x.fillRect(b.x-BR,b.y-3,BR*2,6);x.restore();}
      const sg=x.createRadialGradient(b.x-2,b.y-3,1,b.x,b.y,BR);sg.addColorStop(0,"rgba(255,255,255,0.45)");sg.addColorStop(1,"rgba(0,0,0,0.15)");x.beginPath();x.arc(b.x,b.y,BR,0,Math.PI*2);x.fillStyle=sg;x.fill();
      if(b.id>0){x.beginPath();x.arc(b.x,b.y,4.5,0,Math.PI*2);x.fillStyle="#FFF";x.fill();x.fillStyle="#000";x.font="bold 6px sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText(b.id,b.x,b.y+.5);}}
    if(phase==="aim"&&turn==="player"&&!g.balls[0].sunk){const c2=g.balls[0];x.strokeStyle="rgba(255,255,255,0.3)";x.lineWidth=1;x.setLineDash([4,6]);x.beginPath();x.moveTo(c2.x,c2.y);x.lineTo(c2.x+Math.cos(angle)*150,c2.y+Math.sin(angle)*150);x.stroke();x.setLineDash([]);}
    x.fillStyle="#e2e8f0";x.font="bold 11px 'Orbitron',sans-serif";x.textAlign="left";x.fillText("YOU: "+ps,TX,TY+TH+40);x.textAlign="right";x.fillText((opponentName?.split(" ")[0]?.toUpperCase()||"OPP")+": "+as2,TX+TW,TY+TH+40);
    raf=requestAnimationFrame(draw);};raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);},[phase,turn,phys,angle,dragging,power,ps,as2,opponentName]);
  useEffect(()=>{if(phase==="aim"&&turn==="ai"&&!winner){const t=setTimeout(()=>{const g=gr.current;if(!g)return;const cue=g.balls[0];const tgts=g.balls.filter(b=>!b.sunk&&b.id!==0);if(!tgts.length)return;const near=tgts.reduce((a,b)=>Math.hypot(a.x-cue.x,a.y-cue.y)<Math.hypot(b.x-cue.x,b.y-cue.y)?a:b);const a=Math.atan2(near.y-cue.y,near.x-cue.x),pw=4+Math.random()*5;cue.vx=Math.cos(a)*pw;cue.vy=Math.sin(a)*pw;setPhase("moving");setMsg(opponentName+" shoots...");},1200);return()=>clearTimeout(t);}},[phase,turn,winner,opponentName]);
  const ptr=(e,type)=>{if(phase!=="aim"||turn!=="player"||winner)return;const rect=cr.current.getBoundingClientRect(),scX=CW/rect.width,scY=CH/rect.height;const mx=(e.clientX-rect.left)*scX,my=(e.clientY-rect.top)*scY;const cue=gr.current?.balls[0];if(!cue||cue.sunk)return;
    if(type==="down"&&Math.hypot(mx-cue.x,my-cue.y)<50){setDragging(true);ds.current={x:mx,y:my};}else if(type==="move"&&dragging){const dx=ds.current.x-mx,dy=ds.current.y-my;setAngle(Math.atan2(dy,dx));setPower(Math.min(Math.hypot(dx,dy),100));}else if(type==="up"&&dragging){setDragging(false);if(power>5){cue.vx=Math.cos(angle)*power*.1;cue.vy=Math.sin(angle)*power*.1;setPhase("moving");setMsg("Rolling...");}setPower(0);}};
  const reset=()=>{gr.current={balls:ib()};setPhase("aim");setTurn("player");setPs(0);setAs(0);setWinner(null);setMsg("Your turn!");};
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"#0a1628",color:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:"1px solid #1e293b"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:13,letterSpacing:2,color:"#FFD700"}}>🎱 8 BALL POOL</span><div style={{width:28}}/></div>
    {dragging&&<div style={{padding:"4px 16px"}}><div style={{height:6,background:"#1e293b",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${power}%`,background:power>70?"#FF1744":power>40?"#FFD700":"#22c55e",borderRadius:3}}/></div></div>}
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><canvas ref={cr} width={CW} height={CH} style={{maxWidth:"100%",touchAction:"none",cursor:phase==="aim"&&turn==="player"?"crosshair":"default"}} onPointerDown={e=>ptr(e,"down")} onPointerMove={e=>ptr(e,"move")} onPointerUp={e=>ptr(e,"up")} onPointerLeave={()=>{if(dragging){setDragging(false);setPower(0);}}}/></div>
    <div style={{padding:"8px 16px 16px",textAlign:"center"}}><div style={{fontSize:12,color:turn==="player"?"#00E5FF":"#FFD700",fontFamily:"'Orbitron',sans-serif"}}>{msg}</div></div>
    {winner&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.8)",zIndex:10}}><div style={{fontSize:40}}>🎱</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:22,color:"#FFD700",marginTop:8}}>{winner} wins!</div><button onClick={reset} style={{marginTop:16,background:"linear-gradient(135deg,#FFD700,#FF8F00)",color:"#000",border:"none",padding:"12px 28px",borderRadius:24,fontSize:14,fontFamily:"'Orbitron',sans-serif",cursor:"pointer",fontWeight:700}}>RACK 'EM UP</button></div>}
  </div>);
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function RivalApp(){
  const[authUser,setAuthUser]=useState(null);const[authLoading,setAuthLoading]=useState(true);const[userProfile,setUserProfile]=useState(null);
  const[screen,setScreen]=useState("login");const[tab,setTab]=useState("chats");
  const[conversations,setConversations]=useState([]);const[activeConvoId,setActiveConvoId]=useState(null);const[messages,setMessages]=useState([]);const[msgText,setMsgText]=useState("");const[showEmoji,setShowEmoji]=useState(false);const[showGames,setShowGames]=useState(false);
  const[activeGame,setActiveGame]=useState(null);const[friends,setFriends]=useState([]);const[searchQuery,setSearchQuery]=useState("");const[searchResults,setSearchResults]=useState([]);const[searchError,setSearchError]=useState("");
  const[notifications,setNotifications]=useState([]);const[loginForm,setLoginForm]=useState({email:"",password:""});const[signupForm,setSignupForm]=useState({name:"",username:"",email:"",phone:"",password:"",avatar:"🦊"});const[authError,setAuthError]=useState("");const[inviteCode,setInviteCode]=useState("");
  const[userCache,setUserCache]=useState({});const[convoMenu,setConvoMenu]=useState(null);
  const chatEndRef=useRef(null);const prevMsgCount=useRef(0);const prevNotifCount=useRef(0);

  useEffect(()=>{const l=document.createElement("link");l.href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700&display=swap";l.rel="stylesheet";document.head.appendChild(l);
    const p=new URLSearchParams(window.location.search);const inv=p.get("invite");if(inv){setInviteCode(inv);setScreen("signup");}
    if("Notification"in window&&Notification.permission==="default")Notification.requestPermission();},[]);

  // Auth listener
  useEffect(()=>{const u=onAuthStateChanged(auth,async(user)=>{setAuthUser(user);if(user){try{const r=doc(db,"users",user.uid);const d=await getDoc(r);if(d.exists()){setUserProfile({uid:user.uid,...d.data()});try{await updateDoc(r,{status:"online",lastSeen:serverTimestamp()});}catch(e){}}else{const fp={name:user.email?.split("@")[0]||"Player",username:user.email?.split("@")[0]||"player"+Date.now(),usernameLower:(user.email?.split("@")[0]||"player").toLowerCase(),email:user.email||"",phone:"",avatar:"⚡",status:"online",friends:[],createdAt:serverTimestamp(),inviteCode:generateInviteCode()};await setDoc(r,fp);setUserProfile({uid:user.uid,...fp});}setScreen("home");}catch(e){console.error(e);setScreen("home");}}else{setUserProfile(null);setScreen("login");}setAuthLoading(false);});return()=>u();},[]);

  // Real-time profile
  useEffect(()=>{if(!authUser)return;const u=onSnapshot(doc(db,"users",authUser.uid),s=>{if(s.exists())setUserProfile(p=>({uid:authUser.uid,...s.data()}));},e=>console.log(e));return()=>u();},[authUser]);

  // Conversations
  useEffect(()=>{if(!authUser)return;const q=query(collection(db,"conversations"),where("participants","array-contains",authUser.uid));
    const u=onSnapshot(q,s=>{const c=s.docs.map(d=>({id:d.id,...d.data()}));c.sort((a,b)=>(b.lastMessageTime?.seconds||0)-(a.lastMessageTime?.seconds||0));setConversations(c);},e=>console.error(e));return()=>u();},[authUser]);

  // Messages
  useEffect(()=>{if(!activeConvoId)return;const q=query(collection(db,"conversations",activeConvoId,"messages"),orderBy("timestamp","asc"),limit(200));
    const u=onSnapshot(q,s=>{const m=s.docs.map(d=>({id:d.id,...d.data()}));setMessages(m);if(m.length>prevMsgCount.current&&prevMsgCount.current>0){const last=m[m.length-1];if(last.from!==authUser?.uid)notify();}prevMsgCount.current=m.length;},e=>{console.error(e);const q2=query(collection(db,"conversations",activeConvoId,"messages"),limit(200));onSnapshot(q2,s=>setMessages(s.docs.map(d=>({id:d.id,...d.data()}))));});return()=>u();},[activeConvoId,authUser]);
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  // Friends
  useEffect(()=>{if(!userProfile?.friends?.length){setFriends([]);return;}const load=async()=>{const fl=[];for(const f of userProfile.friends){try{const d=await getDoc(doc(db,"users",f));if(d.exists())fl.push({uid:f,...d.data()});}catch(e){}}setFriends(fl);};load();},[userProfile?.friends?.length]);

  // Notifications
  useEffect(()=>{if(!authUser)return;const q=query(collection(db,"notifications"),where("to","==",authUser.uid));
    const u=onSnapshot(q,s=>{const n=s.docs.map(d=>({id:d.id,...d.data()}));n.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));setNotifications(n);
      if(n.filter(x=>!x.read).length>prevNotifCount.current){notify();if("Notification"in window&&Notification.permission==="granted"){const newest=n.find(x=>!x.read);if(newest)new Notification("RIVAL",{body:newest.text,icon:"/icons/icon-192.png"});}}
      prevNotifCount.current=n.filter(x=>!x.read).length;},e=>console.error(e));return()=>u();},[authUser]);

  // Auth
  const handleSignup=async()=>{setAuthError("");if(!signupForm.username.trim()){setAuthError("Username is required");return;}if(!signupForm.email.trim()){setAuthError("Email is required");return;}if(signupForm.password.length<6){setAuthError("Password must be at least 6 characters");return;}
    try{const cred=await createUserWithEmailAndPassword(auth,signupForm.email,signupForm.password);const uq=query(collection(db,"users"),where("usernameLower","==",signupForm.username.toLowerCase().trim()));const us=await getDocs(uq);if(!us.empty){await cred.user.delete();setAuthError("Username taken.");return;}
      const mic=generateInviteCode();await setDoc(doc(db,"users",cred.user.uid),{name:signupForm.name||signupForm.username,username:signupForm.username.trim(),usernameLower:signupForm.username.toLowerCase().trim(),email:signupForm.email.toLowerCase(),phone:signupForm.phone.replace(/\D/g,""),avatar:signupForm.avatar,status:"online",friends:[],createdAt:serverTimestamp(),inviteCode:mic});
      if(inviteCode){const iq=query(collection(db,"users"),where("inviteCode","==",inviteCode));const is2=await getDocs(iq);if(!is2.empty){const iu=is2.docs[0].id;await updateDoc(doc(db,"users",cred.user.uid),{friends:arrayUnion(iu)});await updateDoc(doc(db,"users",iu),{friends:arrayUnion(cred.user.uid)});await addDoc(collection(db,"notifications"),{to:iu,from:cred.user.uid,fromName:signupForm.name||signupForm.username,type:"friend_added",text:`${signupForm.name||signupForm.username} joined from your invite!`,read:false,createdAt:serverTimestamp()});}window.history.replaceState({},"",window.location.pathname);}
    }catch(e){setAuthError(e.message.replace("Firebase: ",""));}};
  const handleLogin=async()=>{setAuthError("");try{await signInWithEmailAndPassword(auth,loginForm.email,loginForm.password);}catch(e){setAuthError(e.message.replace("Firebase: ",""));}};
  const handleLogout=async()=>{if(authUser)try{await updateDoc(doc(db,"users",authUser.uid),{status:"offline",lastSeen:serverTimestamp()});}catch(e){}await signOut(auth);};

  // Search
  const searchForFriend=async()=>{setSearchResults([]);setSearchError("");const q2=searchQuery.trim();if(!q2)return;const results=[];const seen=new Set();try{
    if(q2.includes("@")){const s=await getDocs(query(collection(db,"users"),where("email","==",q2.toLowerCase())));s.docs.forEach(d=>{if(!seen.has(d.id)){seen.add(d.id);results.push({uid:d.id,...d.data()});}});}
    const pd=q2.replace(/\D/g,"");if(pd.length>=7){const s=await getDocs(query(collection(db,"users"),where("phone","==",pd)));s.docs.forEach(d=>{if(!seen.has(d.id)){seen.add(d.id);results.push({uid:d.id,...d.data()});}});}
    const s2=await getDocs(query(collection(db,"users"),where("usernameLower","==",q2.toLowerCase())));s2.docs.forEach(d=>{if(!seen.has(d.id)){seen.add(d.id);results.push({uid:d.id,...d.data()});}});
    const lw=q2.toLowerCase();const ub=lw.slice(0,-1)+String.fromCharCode(lw.charCodeAt(lw.length-1)+1);const s3=await getDocs(query(collection(db,"users"),where("usernameLower",">=",lw),where("usernameLower","<",ub),limit(10)));s3.docs.forEach(d=>{if(!seen.has(d.id)){seen.add(d.id);results.push({uid:d.id,...d.data()});}});
    const filtered=results.filter(r=>r.uid!==authUser.uid);if(!filtered.length)setSearchError("No users found.");setSearchResults(filtered);}catch(e){console.error(e);setSearchError("Search error.");}};

  const addFriend=async(fid)=>{await updateDoc(doc(db,"users",authUser.uid),{friends:arrayUnion(fid)});await updateDoc(doc(db,"users",fid),{friends:arrayUnion(authUser.uid)});await addDoc(collection(db,"notifications"),{to:fid,from:authUser.uid,fromName:userProfile.name,fromAvatar:userProfile.avatar,type:"friend_added",text:`${userProfile.name} added you!`,read:false,createdAt:serverTimestamp()});setSearchResults([]);setSearchQuery("");};
  const startConversation=async(fid)=>{const ex=conversations.find(c=>c.participants.includes(fid)&&c.participants.length===2);if(ex){setActiveConvoId(ex.id);setScreen("chat");return;}const r=await addDoc(collection(db,"conversations"),{participants:[authUser.uid,fid],lastMessage:"",lastMessageTime:serverTimestamp(),createdAt:serverTimestamp()});setActiveConvoId(r.id);setScreen("chat");};
  const sendMessage=async(text,type="text")=>{if(!text.trim()||!activeConvoId)return;await addDoc(collection(db,"conversations",activeConvoId,"messages"),{from:authUser.uid,text,type,timestamp:serverTimestamp()});await updateDoc(doc(db,"conversations",activeConvoId),{lastMessage:type==="text"?text:"🎮 Game challenge",lastMessageTime:serverTimestamp()});setMsgText("");setShowEmoji(false);};
  const deleteConversation=async(cid)=>{try{await deleteDoc(doc(db,"conversations",cid));setConvoMenu(null);}catch(e){console.error(e);}};

  const challengeToGame=async(gameType)=>{const convo=conversations.find(c=>c.id===activeConvoId);if(!convo)return;const ouid=convo.participants.find(p=>p!==authUser.uid);const od=await getDoc(doc(db,"users",ouid));const on2=od.exists()?od.data().name:"Opponent";
    if(gameType==="tictactoe"){const r=await addDoc(collection(db,"games"),{type:"tictactoe",players:[authUser.uid,ouid],board:Array(9).fill(null),turn:authUser.uid,winner:null,winLine:null,createdAt:serverTimestamp()});await sendMessage("Challenged you to Tic Tac Toe! ❌⭕");await addDoc(collection(db,"notifications"),{to:ouid,from:authUser.uid,fromName:userProfile.name,type:"game_challenge",gameType:"tictactoe",gameId:r.id,text:`${userProfile.name} challenged you to Tic Tac Toe!`,read:false,createdAt:serverTimestamp()});setActiveGame({type:"tictactoe",gameId:r.id,opponentName:on2});}
    else if(gameType==="battleship"){const r=await addDoc(collection(db,"games"),{type:"battleship",players:[authUser.uid,ouid],p1Board:[],p2Board:[],p1Shots:Array(100).fill(0),p2Shots:Array(100).fill(0),p1Cells:0,p2Cells:0,turn:authUser.uid,winner:null,createdAt:serverTimestamp()});await sendMessage("Challenged you to Battleship! 🚢");await addDoc(collection(db,"notifications"),{to:ouid,from:authUser.uid,fromName:userProfile.name,type:"game_challenge",gameType:"battleship",gameId:r.id,text:`${userProfile.name} challenged you to Battleship!`,read:false,createdAt:serverTimestamp()});setActiveGame({type:"battleship",gameId:r.id,opponentName:on2});}
    else{setActiveGame({type:gameType,gameId:null,opponentName:on2});await sendMessage(`Started ${GAMES_LIST.find(g=>g.key===gameType)?.label}! 🎮`);}setShowGames(false);};

  const shareInvite=async()=>{const code=userProfile?.inviteCode||"RIVAL";const url=window.location.origin+"?invite="+code;if(navigator.share)try{await navigator.share({title:"Join me on RIVAL!",text:"Think you can beat me? Get on RIVAL:",url});}catch(e){}else{navigator.clipboard.writeText(url);alert("Invite link copied!");}};
  const acceptGame=(n)=>{setActiveGame({type:n.gameType,gameId:n.gameId,opponentName:n.fromName});updateDoc(doc(db,"notifications",n.id),{read:true});};
  const getConvoPartner=(convo)=>{const oid=convo.participants.find(p=>p!==authUser?.uid);const ff=friends.find(f=>f.uid===oid);if(ff)return ff;if(userCache[oid])return userCache[oid];if(oid&&!userCache[oid])getDoc(doc(db,"users",oid)).then(s=>{if(s.exists())setUserCache(p=>({...p,[oid]:{uid:oid,...s.data()}}));}).catch(()=>{});return{name:"Loading...",avatar:"👤",status:"offline",uid:oid};};
  const unreadCount=notifications.filter(n=>!n.read).length;

  if(authLoading)return(<div style={S.app}><div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"radial-gradient(circle at 50% 40%,#1a0a0a,#0a0a0f 70%)"}}><div style={{fontSize:64,animation:"pulse 1s ease-in-out infinite"}}>🔥</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:36,fontWeight:900,letterSpacing:6,background:"linear-gradient(135deg,#FF1744,#FF5722,#FF9100)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:16}}>RIVAL</div></div><style>{`@keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.1);}}`}</style></div>);

  // Active Game
  if(activeGame){const cl=()=>setActiveGame(null);return(<div style={S.app}>
    {activeGame.type==="tictactoe"&&<MultiTicTacToe gameId={activeGame.gameId} userId={authUser.uid} opponentName={activeGame.opponentName} onClose={cl}/>}
    {activeGame.type==="battleship"&&<MultiBattleship gameId={activeGame.gameId} userId={authUser.uid} opponentName={activeGame.opponentName} onClose={cl}/>}
    {activeGame.type==="hangman"&&<Hangman onClose={cl}/>}
    {activeGame.type==="stickfight"&&<StickFighter onClose={cl} opponentName={activeGame.opponentName||"AI"}/>}
    {activeGame.type==="pool"&&<EightBallPool onClose={cl} opponentName={activeGame.opponentName||"AI"}/>}
  </div>);}

  // Login
  if(screen==="login")return(<div style={S.app}><div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 28px",justifyContent:"center",background:"radial-gradient(ellipse at 30% 20%,rgba(213,0,0,0.08),transparent 60%)"}}>
    <div style={{fontSize:40,marginBottom:4}}>🔥</div><h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:28,fontWeight:800,margin:"0 0 4px",background:"linear-gradient(135deg,#FF1744,#FF5722)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RIVAL</h1><p style={{color:"#64748b",fontSize:14,margin:"0 0 32px"}}>Sign in. Talk trash. Settle it.</p>
    {authError&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:12,color:"#ef4444",fontSize:13}}>{authError}</div>}
    <input style={{...S.inp,marginBottom:12}} placeholder="Email" type="email" value={loginForm.email} onChange={e=>setLoginForm(f=>({...f,email:e.target.value}))}/>
    <input style={{...S.inp,marginBottom:20}} placeholder="Password" type="password" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")handleLogin();}}/>
    <button onClick={handleLogin} style={{...S.btn,width:"100%",padding:"14px",borderRadius:14,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",fontSize:16,fontWeight:600}}>Sign In</button>
    <div style={{textAlign:"center",marginTop:20}}><span style={{color:"#64748b",fontSize:14}}>New? </span><button onClick={()=>{setScreen("signup");setAuthError("");}} style={{...S.btn,background:"none",color:"#FF1744",fontSize:14,fontWeight:600,padding:0}}>Create Account</button></div>
  </div></div>);

  // Signup
  if(screen==="signup")return(<div style={S.app}><div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 28px",justifyContent:"center",overflowY:"auto",background:"radial-gradient(ellipse at 70% 80%,rgba(255,87,34,0.06),transparent 60%)"}}>
    <button onClick={()=>{setScreen("login");setAuthError("");}} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:14,padding:0,textAlign:"left",marginBottom:20}}>← Back</button>
    <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,fontWeight:800,margin:"0 0 4px",color:"#FF5722"}}>STEP UP</h1><p style={{color:"#64748b",fontSize:14,margin:"0 0 24px"}}>Lock in your account</p>
    {authError&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:12,color:"#ef4444",fontSize:13}}>{authError}</div>}
    <div style={{marginBottom:16}}><div style={{fontSize:12,color:"#94a3b8",marginBottom:8,fontWeight:500}}>CHOOSE YOUR AVATAR</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{AVATARS.map(a=>(<button key={a} onClick={()=>setSignupForm(f=>({...f,avatar:a}))} style={{...S.btn,width:44,height:44,borderRadius:12,fontSize:22,background:signupForm.avatar===a?"rgba(255,23,68,0.2)":"rgba(255,255,255,0.04)",border:signupForm.avatar===a?"2px solid #FF1744":"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>{a}</button>))}</div></div>
    <input style={{...S.inp,marginBottom:12}} placeholder="Username (unique handle)" value={signupForm.username} onChange={e=>setSignupForm(f=>({...f,username:e.target.value.replace(/\s/g,"")}))}/>
    <input style={{...S.inp,marginBottom:12}} placeholder="Display Name" value={signupForm.name} onChange={e=>setSignupForm(f=>({...f,name:e.target.value}))}/>
    <input style={{...S.inp,marginBottom:12}} placeholder="Phone Number" type="tel" value={signupForm.phone} onChange={e=>setSignupForm(f=>({...f,phone:e.target.value}))}/>
    <input style={{...S.inp,marginBottom:12}} placeholder="Email" type="email" value={signupForm.email} onChange={e=>setSignupForm(f=>({...f,email:e.target.value}))}/>
    <input style={{...S.inp,marginBottom:20}} placeholder="Password (min 6 chars)" type="password" value={signupForm.password} onChange={e=>setSignupForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")handleSignup();}}/>
    <button onClick={handleSignup} style={{...S.btn,width:"100%",padding:"14px",borderRadius:14,background:"linear-gradient(135deg,#FF5722,#FF9100)",color:"#fff",fontSize:16,fontWeight:600,marginBottom:12}}>Create Account</button>
    {inviteCode&&<div style={{textAlign:"center",fontSize:12,color:"#22c55e",marginBottom:16}}>🔗 Invite: <strong>{inviteCode}</strong></div>}
  </div></div>);

  // Chat
  if(screen==="chat"&&activeConvoId){const convo=conversations.find(c=>c.id===activeConvoId);const partner=convo?getConvoPartner(convo):{name:"Unknown",avatar:"👤"};
    return(<div style={S.app}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(10,10,15,0.95)"}}><button onClick={()=>{setScreen("home");setActiveConvoId(null);setShowEmoji(false);}} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button><div style={{width:38,height:38,borderRadius:19,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{partner.avatar}</div><div style={{flex:1}}><div style={{fontSize:15,fontWeight:600}}>{partner.name}</div><div style={{fontSize:11,color:partner.status==="online"?"#22c55e":"#64748b"}}>{partner.status||"offline"}</div></div><button onClick={()=>setShowGames(!showGames)} style={{...S.btn,background:"rgba(255,255,255,0.06)",borderRadius:20,padding:"6px 12px",color:"#FF1744",fontSize:13,fontWeight:600}}>🎮 Challenge</button></div>
      {showGames&&<div style={{background:"rgba(26,10,10,0.95)",borderBottom:"1px solid rgba(255,255,255,0.08)",padding:"10px 8px",display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>{GAMES_LIST.map(g=>(<button key={g.key} onClick={()=>challengeToGame(g.key)} style={{...S.btn,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"8px 12px",color:"#e2e8f0",fontSize:10,minWidth:60}}><span style={{fontSize:20}}>{g.icon}</span><span style={{fontWeight:600}}>{g.label}</span>{g.multi&&<span style={{fontSize:8,color:"#22c55e",fontWeight:700}}>LIVE</span>}</button>))}</div>}
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>{messages.map(m=>{const me=m.from===authUser.uid;return(<div key={m.id} style={{display:"flex",justifyContent:me?"flex-end":"flex-start"}}><div style={{maxWidth:"78%",padding:"10px 14px",borderRadius:me?"18px 18px 4px 18px":"18px 18px 18px 4px",background:me?"linear-gradient(135deg,#D50000,#7c3aed)":"rgba(255,255,255,0.06)"}}><div style={{fontSize:15,lineHeight:1.4,wordBreak:"break-word"}}>{m.text}</div><div style={{fontSize:10,color:me?"rgba(255,255,255,0.5)":"#64748b",marginTop:4,textAlign:"right"}}>{m.timestamp?.toDate?.()?.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})||""}</div></div></div>);})}<div ref={chatEndRef}/></div>
      {showEmoji&&<div style={{maxHeight:160,overflowY:"auto",padding:8,display:"flex",flexWrap:"wrap",gap:2,background:"rgba(15,15,25,0.98)",borderTop:"1px solid rgba(255,255,255,0.06)"}}>{EMOJI_LIST.map(e=>(<button key={e} onClick={()=>setMsgText(m=>m+e)} style={{...S.btn,fontSize:22,width:36,height:36,background:"transparent",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>{e}</button>))}</div>}
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px 16px",borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(10,10,15,0.95)"}}><button onClick={()=>setShowEmoji(!showEmoji)} style={{...S.btn,background:"none",fontSize:20,color:"#64748b",padding:4}}>😊</button><input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMessage(msgText);}} placeholder="Message..." style={{...S.inp,flex:1,borderRadius:20,padding:"10px 16px",fontSize:14}}/><button onClick={()=>sendMessage(msgText)} style={{...S.btn,width:36,height:36,borderRadius:18,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button></div>
    </div>);}

  // Find Friends
  if(screen==="findFriends")return(<div style={S.app}><div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={()=>setScreen("home")} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button><h2 style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,margin:0}}>Add Friends</h2></div>
    <div style={{padding:20,flex:1,overflowY:"auto"}}>
      <div style={{marginBottom:24}}><div style={{fontSize:12,color:"#94a3b8",marginBottom:8,fontWeight:600,letterSpacing:1,fontFamily:"'Orbitron',sans-serif"}}>FIND PLAYERS</div><div style={{display:"flex",gap:8}}><input style={{...S.inp,flex:1}} placeholder="Username, email, or phone..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")searchForFriend();}}/><button onClick={searchForFriend} style={{...S.btn,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",padding:"0 20px",borderRadius:12,fontSize:14,fontWeight:600}}>Search</button></div><div style={{fontSize:10,color:"#475569",marginTop:4}}>Search by username, email, or phone</div>
        {searchError&&<div style={{color:"#ef4444",fontSize:13,marginTop:8}}>{searchError}</div>}
        {searchResults.map(r=>(<div key={r.uid} style={{marginTop:12,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:16,display:"flex",alignItems:"center",gap:12}}><div style={{width:48,height:48,borderRadius:24,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{r.avatar}</div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:15}}>{r.name}</div><div style={{fontSize:12,color:"#FF1744"}}>@{r.username||"user"}</div></div>{userProfile.friends?.includes(r.uid)?<div style={{color:"#22c55e",fontSize:12,fontWeight:600}}>✓ Friends</div>:<button onClick={()=>addFriend(r.uid)} style={{...S.btn,background:"#22c55e",color:"#fff",padding:"8px 16px",borderRadius:10,fontSize:13,fontWeight:600}}>Add</button>}</div>))}</div>
      <div style={{marginBottom:24}}><div style={{fontSize:12,color:"#94a3b8",marginBottom:8,fontWeight:600,letterSpacing:1,fontFamily:"'Orbitron',sans-serif"}}>INVITE FRIENDS</div><p style={{fontSize:13,color:"#64748b",marginBottom:12}}>Share a link - they auto-add you on signup</p><button onClick={shareInvite} style={{...S.btn,width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#FF5722,#FF9100)",color:"#fff",fontSize:15,fontWeight:600}}>📤 Share Invite Link</button><div style={{textAlign:"center",marginTop:8,fontSize:12,color:"#64748b"}}>Code: <span style={{color:"#FF1744",fontFamily:"'Orbitron',sans-serif",fontWeight:700}}>{userProfile?.inviteCode}</span></div></div>
      <div><div style={{fontSize:12,color:"#94a3b8",marginBottom:8,fontWeight:600,letterSpacing:1,fontFamily:"'Orbitron',sans-serif"}}>YOUR FRIENDS ({friends.length})</div>{friends.map(f=>(<div key={f.uid} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div style={{width:42,height:42,borderRadius:21,background:"linear-gradient(135deg,#374151,#1f2937)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,position:"relative"}}>{f.avatar}{f.status==="online"&&<div style={{position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:5,background:"#22c55e",border:"2px solid #0a0a0f"}}/>}</div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{f.name}</div><div style={{fontSize:11,color:"#64748b"}}>{f.status||"offline"}</div></div><button onClick={()=>startConversation(f.uid)} style={{...S.btn,background:"rgba(213,0,0,0.1)",color:"#FF1744",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600}}>Chat</button></div>))}{friends.length===0&&<div style={{textAlign:"center",padding:24,color:"#475569",fontSize:13}}>No friends yet</div>}</div>
    </div></div>);

  // Notifications
  if(screen==="notifications")return(<div style={S.app}><div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={()=>setScreen("home")} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button><h2 style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,margin:0}}>Notifications</h2>{unreadCount>0&&<span style={{background:"#D50000",color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700}}>{unreadCount}</span>}</div>
    <div style={{flex:1,overflowY:"auto"}}>{notifications.map(n=>(<div key={n.id} onClick={()=>{if(n.type==="game_challenge"&&n.gameId)acceptGame(n);else updateDoc(doc(db,"notifications",n.id),{read:true});}} style={{padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,0.04)",background:n.read?"transparent":"rgba(213,0,0,0.05)",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>{!n.read&&<div style={{width:8,height:8,borderRadius:4,background:"#D50000",flexShrink:0}}/>}<div style={{flex:1}}><div style={{fontSize:14,lineHeight:1.4}}>{n.text}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{n.createdAt?.toDate?.()?.toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})||""}</div>{n.type==="game_challenge"&&!n.read&&<div style={{marginTop:6}}><span style={{background:"#22c55e",color:"#fff",padding:"4px 12px",borderRadius:8,fontSize:12,fontWeight:600}}>Tap to play!</span></div>}</div></div>))}{notifications.length===0&&<div style={{textAlign:"center",padding:48,color:"#475569"}}><div style={{fontSize:40}}>🔔</div><div style={{marginTop:8}}>No notifications</div></div>}</div></div>);

  // Profile
  if(screen==="profile")return(<div style={S.app}><div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={()=>setScreen("home")} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button><h2 style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,margin:0}}>Profile</h2></div>
    <div style={{flex:1,overflowY:"auto",padding:24}}><div style={{textAlign:"center",marginBottom:32}}><div style={{width:80,height:80,borderRadius:40,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,margin:"0 auto 12px"}}>{userProfile?.avatar}</div><h3 style={{margin:"0 0 4px",fontSize:20,fontWeight:700}}>{userProfile?.name}</h3><p style={{margin:0,color:"#FF1744",fontSize:14,fontWeight:600}}>@{userProfile?.username}</p><p style={{margin:"2px 0",color:"#64748b",fontSize:13}}>{authUser?.email}</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>{[{l:"Friends",v:userProfile?.friends?.length||0},{l:"Convos",v:conversations.length},{l:"Games",v:"♾️"}].map(st=>(<div key={st.l} style={{textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:16,padding:"14px 8px"}}><div style={{fontSize:22,fontWeight:700,color:"#FF1744"}}>{st.v}</div><div style={{fontSize:10,color:"#64748b",marginTop:2}}>{st.l}</div></div>))}</div>
      <button onClick={shareInvite} style={{...S.btn,width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#FF5722,#FF9100)",color:"#fff",fontSize:15,fontWeight:600,marginBottom:12}}>📤 Share Invite Link</button>
      <button onClick={handleLogout} style={{...S.btn,width:"100%",padding:14,borderRadius:14,background:"rgba(239,68,68,0.1)",color:"#ef4444",fontSize:15,fontWeight:600}}>Sign Out</button>
    </div></div>);

  // HOME
  return(<div style={S.app}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px 12px"}}><h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,fontWeight:800,margin:0,background:"linear-gradient(135deg,#FF1744,#FF5722)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RIVAL</h1><div style={{display:"flex",gap:8}}><button onClick={()=>setScreen("findFriends")} style={{...S.btn,width:40,height:40,borderRadius:20,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",fontSize:18,color:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center"}}>👥</button><button onClick={()=>setScreen("notifications")} style={{...S.btn,width:40,height:40,borderRadius:20,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",fontSize:18,color:"#e2e8f0",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>🔔{unreadCount>0&&<div style={{position:"absolute",top:-2,right:-2,width:18,height:18,borderRadius:9,background:"#ef4444",fontSize:10,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadCount}</div>}</button><button onClick={()=>setScreen("profile")} style={{...S.btn,width:40,height:40,borderRadius:20,background:"linear-gradient(135deg,#D50000,#FF1744)",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{userProfile?.avatar}</button></div></div>
    <div style={{display:"flex",padding:"0 20px 12px"}}>{["chats","games"].map(t=>(<button key={t} onClick={()=>setTab(t)} style={{...S.btn,flex:1,padding:"8px 0",fontSize:13,fontWeight:600,color:tab===t?"#FF1744":"#64748b",background:"none",borderBottom:tab===t?"2px solid #FF1744":"2px solid transparent",textTransform:"uppercase",letterSpacing:1}}>{t==="games"?"🎮 Games":"💬 Chats"}</button>))}</div>
    {tab==="games"&&<div style={{flex:1,overflowY:"auto",padding:"8px 20px"}}><div style={{fontSize:12,color:"#94a3b8",marginBottom:12,fontFamily:"'Orbitron',sans-serif",letterSpacing:1}}>CHALLENGE A FRIEND</div><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>{GAMES_LIST.map(g=>(<button key={g.key} onClick={()=>{if(!friends.length){setScreen("findFriends");return;}startConversation(friends[0].uid).then(()=>setShowGames(true));}} style={{...S.btn,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"20px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,color:"#e2e8f0"}}><div style={{fontSize:36}}>{g.icon}</div><div style={{fontWeight:700,fontSize:14}}>{g.label}</div><div style={{fontSize:11,color:"#64748b"}}>{g.desc}</div>{g.multi&&<div style={{fontSize:10,color:"#22c55e",fontWeight:700,fontFamily:"'Orbitron',sans-serif"}}>MULTIPLAYER</div>}</button>))}</div>{!friends.length&&<div style={{textAlign:"center",padding:"24px 0"}}><div style={{fontSize:13,color:"#64748b",marginBottom:12}}>Add friends first!</div><button onClick={()=>setScreen("findFriends")} style={{...S.btn,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",padding:"10px 24px",borderRadius:12,fontSize:14,fontWeight:600}}>👥 Find Friends</button></div>}</div>}
    {tab==="chats"&&<>{friends.filter(f=>f.status==="online").length>0&&<div style={{padding:"0 20px 12px"}}><div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:4}}>{friends.filter(f=>f.status==="online").map(f=>(<button key={f.uid} onClick={()=>startConversation(f.uid)} style={{...S.btn,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",padding:0,minWidth:56}}><div style={{width:48,height:48,borderRadius:24,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,position:"relative"}}>{f.avatar}<div style={{position:"absolute",bottom:0,right:0,width:12,height:12,borderRadius:6,background:"#22c55e",border:"2px solid #0a0a0f"}}/></div><span style={{fontSize:10,color:"#94a3b8",maxWidth:56,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name.split(" ")[0]}</span></button>))}</div></div>}
      <div style={{flex:1,overflowY:"auto"}}>{conversations.map(c=>{const partner=getConvoPartner(c);return(<div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,0.03)",position:"relative"}}>
        <button onClick={()=>{setActiveConvoId(c.id);setScreen("chat");}} style={{...S.btn,flex:1,display:"flex",alignItems:"center",gap:12,background:"none",textAlign:"left",padding:0}}>
          <div style={{width:50,height:50,borderRadius:25,background:"linear-gradient(135deg,#374151,#1f2937)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,position:"relative"}}>{partner.avatar}{partner.status==="online"&&<div style={{position:"absolute",bottom:1,right:1,width:12,height:12,borderRadius:6,background:"#22c55e",border:"2px solid #0a0a0f"}}/>}</div>
          <div style={{flex:1,overflow:"hidden"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontWeight:600,color:"#e2e8f0"}}>{partner.name}</span><span style={{fontSize:11,color:"#64748b"}}>{c.lastMessageTime?.toDate?.()?.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})||""}</span></div><div style={{fontSize:13,color:"#64748b",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.lastMessage||"Start chatting!"}</div></div>
        </button>
        <button onClick={(e)=>{e.stopPropagation();setConvoMenu(convoMenu===c.id?null:c.id);}} style={{...S.btn,background:"none",color:"#64748b",fontSize:16,padding:4}}>⋮</button>
        {convoMenu===c.id&&<div style={{position:"absolute",right:20,top:50,background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:4,zIndex:10}}><button onClick={()=>deleteConversation(c.id)} style={{...S.btn,background:"none",color:"#ef4444",fontSize:13,padding:"8px 16px",width:"100%",textAlign:"left"}}>🗑 Delete Chat</button></div>}
      </div>);})}{conversations.length===0&&<div style={{textAlign:"center",padding:48}}><div style={{fontSize:48,marginBottom:12}}>💬</div><div style={{fontSize:15,color:"#94a3b8",marginBottom:16}}>No conversations yet</div><button onClick={()=>setScreen("findFriends")} style={{...S.btn,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",padding:"12px 28px",borderRadius:14,fontSize:15,fontWeight:600}}>👥 Add Friends</button></div>}</div></>}
  </div>);
}
