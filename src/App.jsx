import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db, storage } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const EMOJI_LIST = ["😀","😂","🤣","😍","🥰","😘","😎","🤩","🥳","😤","🔥","💀","👀","💯","❤️","💔","👍","👎","✌️","🤙","💪","🎮","🏆","⚡","🎯","🎪","🎨","🎵","🍕","🌮","🍿","🍩","🐶","🐱","🦄","🌈","☀️","🌙","⭐","🚀","💎","🎁","🃏","🎲","🧩","🏅","🥊","🔥"];
const AVATARS = ["🦊","🐺","🦁","🐲","🦅","🐻","🦈","🦉","🐯","🦖","⚡","🔥","💎","🎮"];
const GAMES_LIST = [
  {key:"tictactoe",icon:"❌⭕",label:"Tic Tac Toe",desc:"Classic strategy"},
  {key:"battleship",icon:"🚢",label:"Battleship",desc:"Naval warfare"},
  {key:"hangman",icon:"📝",label:"Hangman",desc:"Pick or guess"},
  {key:"pool",icon:"🎱",label:"8 Ball Pool",desc:"Billiards"},
  {key:"duel",icon:"🤠",label:"Duel Draw",desc:"Quick draw showdown"},
  {key:"assassin",icon:"🗡️",label:"Assassin Grid",desc:"Hunt & kill"},
  {key:"bombtag",icon:"💣",label:"Bomb Tag",desc:"Hot potato"},
];
const S = {
  app:{width:"100%",maxWidth:430,height:"100dvh",margin:"0 auto",background:"#0a0a0f",color:"#e2e8f0",fontFamily:"'Outfit',sans-serif",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column"},
  btn:{border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif"},
  inp:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 16px",color:"#e2e8f0",fontSize:15,fontFamily:"'Outfit',sans-serif",outline:"none",width:"100%",boxSizing:"border-box"},
};
const MEME_GIFS = {
  "Trash Talk 🗣️":["https://media.giphy.com/media/l0HlvtIPdYi01J3SE/giphy.gif","https://media.giphy.com/media/l4FGGafcOHBRoWvnY/giphy.gif","https://media.giphy.com/media/D4QLJVmdHB44g/giphy.gif","https://media.giphy.com/media/26gsspfbt1HfVQ9va/giphy.gif","https://media.giphy.com/media/xT9IgMw9fhuEGUaJqg/giphy.gif","https://media.giphy.com/media/3o7TKUZfJKUKuSWagw/giphy.gif"],
  "You're Done 💀":["https://media.giphy.com/media/WrNfErHio7ZAc/giphy.gif","https://media.giphy.com/media/xT0xeMA62E1XIlqPK0/giphy.gif","https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif","https://media.giphy.com/media/3ohhwoWSCtJzznXbuo/giphy.gif","https://media.giphy.com/media/TL2Yr3ioe78tO/giphy.gif"],
  "Victory Lap 🏆":["https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif","https://media.giphy.com/media/g9582DNuQppxC/giphy.gif","https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif","https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif","https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif"],
  "Salty 🧂":["https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif","https://media.giphy.com/media/3oEjHI8WJv4x6UPDB6/giphy.gif","https://media.giphy.com/media/26ybwvTX4DTkwst6U/giphy.gif","https://media.giphy.com/media/IfyjWLQMeF6kbG2r0z/giphy.gif","https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif"],
  "Disrespect 😤":["https://media.giphy.com/media/xUySTVQyBQfC5ZjdC0/giphy.gif","https://media.giphy.com/media/cF7QqO5DYA26jhSOtZ/giphy.gif","https://media.giphy.com/media/QU4ewgcmdcsObx9CG7/giphy.gif","https://media.giphy.com/media/8qDzzyxbcfimY/giphy.gif","https://media.giphy.com/media/3o85xnoIXebk3xYx4Q/giphy.gif"],
};
function genCode(){return Math.random().toString(36).substring(2,8).toUpperCase();}
function vibrate(){try{if(navigator.vibrate)navigator.vibrate([100,50,100]);}catch(e){}}

// ═══════ GAME 1: MULTIPLAYER TIC TAC TOE ═══════
function MultiTicTacToe({gameId,userId,opponentName,onClose}){
  const[game,setGame]=useState(null);const[loading,setLoading]=useState(true);
  useEffect(()=>{if(!gameId)return;const u=onSnapshot(doc(db,"games",gameId),s=>{if(s.exists()){setGame({id:s.id,...s.data()});vibrate();}setLoading(false);});return()=>u();},[gameId]);
  const move=async(i)=>{if(!game||game.winner||game.board[i]||game.turn!==userId)return;const nb=[...game.board];const mk=game.players[0]===userId?"X":"O";nb[i]=mk;
    const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];let w=null,wl=null;
    for(const[a,b,c]of lines)if(nb[a]&&nb[a]===nb[b]&&nb[a]===nb[c]){w=userId;wl=[a,b,c];break;}
    if(!w&&nb.every(Boolean))w="draw";const nt=game.players[0]===userId?game.players[1]:game.players[0];
    await updateDoc(doc(db,"games",gameId),{board:nb,turn:nt,winner:w||null,winLine:wl||null,lastMove:serverTimestamp()});};
  const rematch=async()=>{await updateDoc(doc(db,"games",gameId),{board:Array(9).fill(null),turn:game.players[0],winner:null,winLine:null});};
  if(loading)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{color:"#FF1744",fontFamily:"'Orbitron',sans-serif"}}>Loading...</div></div>;
  if(!game)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{color:"#ef4444"}}>Game not found</div><button onClick={onClose} style={{...S.btn,marginTop:16,background:"#333",color:"#fff",padding:"10px 20px",borderRadius:10}}>Back</button></div>;
  const mk=game.players[0]===userId?"X":"O";const my=game.turn===userId;const iw=game.winner===userId;const dr=game.winner==="draw";const ov=!!game.winner;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#0f172a,#1a0a0a)",color:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,letterSpacing:2}}>TIC TAC TOE</span><div style={{width:28}}/></div>
    <div style={{padding:"12px",textAlign:"center"}}><div style={{fontSize:13,color:my?"#FF1744":"#FF5722",fontFamily:"'Orbitron',sans-serif"}}>{ov?(dr?"DRAW!":(iw?"YOU WIN! 🎉":`${opponentName} WINS!`)):(my?`YOUR TURN (${mk})`:`WAITING FOR ${opponentName?.toUpperCase()}...`)}</div></div>
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,width:240,height:240}}>
      {game.board.map((cell,i)=>(<button key={i} onClick={()=>move(i)} style={{width:76,height:76,borderRadius:12,background:game.winLine?.includes(i)?"rgba(255,23,68,0.15)":"rgba(255,255,255,0.04)",border:game.winLine?.includes(i)?"2px solid #FF1744":"1px solid rgba(255,255,255,0.08)",color:cell==="X"?"#FF1744":"#FF5722",fontSize:32,fontWeight:800,cursor:my&&!cell&&!ov?"pointer":"default",fontFamily:"'Orbitron',sans-serif"}}>{cell}</button>))}
    </div></div>
    {ov&&<div style={{padding:16,textAlign:"center"}}><button onClick={rematch} style={{...S.btn,background:"linear-gradient(135deg,#FF1744,#D50000)",color:"#fff",padding:"10px 28px",borderRadius:20,fontSize:14,fontFamily:"'Orbitron',sans-serif"}}>REMATCH</button></div>}
  </div>);
}

// ═══════ GAME 2: MULTIPLAYER BATTLESHIP ═══════
function MultiBattleship({gameId,userId,opponentName,onClose}){
  const G=10,CS=28,SHIPS=[{n:"Carrier",s:5},{n:"Battleship",s:4},{n:"Cruiser",s:3},{n:"Submarine",s:3},{n:"Destroyer",s:2}];
  const e0=()=>Array(G).fill(null).map(()=>Array(G).fill(0));
  const[game,setGame]=useState(null);const[ld,setLd]=useState(true);const[phase,setPhase]=useState("place");
  const[lb,setLb]=useState(e0);const[cs,setCs]=useState(0);const[hz,setHz]=useState(true);const[hv,setHv]=useState([]);const[vb,setVb]=useState("enemy");
  useEffect(()=>{if(!gameId)return;const u=onSnapshot(doc(db,"games",gameId),s=>{if(s.exists()){const d={id:s.id,...s.data()};setGame(d);const mk=d.players[0]===userId?"p1":"p2";if(d[mk+"Board"]?.length>0){if(d.p1Board?.length>0&&d.p2Board?.length>0)setPhase("battle");else setPhase("waiting");}vibrate();}setLd(false);});return()=>u();},[gameId,userId]);
  const cp=(r,c,sz,h,b)=>{for(let i=0;i<sz;i++){const rr=h?r:r+i;const cc=h?c+i:c;if(rr>=G||cc>=G||b[rr][cc]!==0)return false;}return true;};
  const ph2=(r,c)=>{if(cs>=SHIPS.length)return;const sh=SHIPS[cs];const cells=[];const v=cp(r,c,sh.s,hz,lb);for(let i=0;i<sh.s;i++){const rr=hz?r:r+i;const cc=hz?c+i:c;if(rr<G&&cc<G)cells.push({r:rr,c:cc,valid:v});}setHv(cells);};
  const pc=async(r,c)=>{if(cs>=SHIPS.length)return;const sh=SHIPS[cs];if(!cp(r,c,sh.s,hz,lb))return;const nb=lb.map(r=>[...r]);for(let i=0;i<sh.s;i++){const rr=hz?r:r+i;const cc=hz?c+i:c;nb[rr][cc]=1;}setLb(nb);const ns=cs+1;setCs(ns);setHv([]);
    if(ns>=SHIPS.length){const mk=game.players[0]===userId?"p1":"p2";const tot=SHIPS.reduce((a,s)=>a+s.s,0);await updateDoc(doc(db,"games",gameId),{[mk+"Board"]:nb.flat(),[mk+"Cells"]:tot});setPhase("waiting");}};
  const atk=async(r,c)=>{if(!game||game.turn!==userId||game.winner)return;const ok=game.players[0]===userId?"p2":"p1";const mk=game.players[0]===userId?"p1":"p2";
    const ob=[];for(let i=0;i<G;i++)ob.push(game[ok+"Board"].slice(i*G,(i+1)*G));const sk=mk+"Shots";const shots=game[sk]?[...game[sk]]:Array(100).fill(0);const idx=r*G+c;if(shots[idx]!==0)return;
    const hit=ob[r][c]===1;shots[idx]=hit?2:1;const nc=hit?(game[ok+"Cells"]-1):game[ok+"Cells"];const nt=game.players[0]===userId?game.players[1]:game.players[0];
    const up={[sk]:shots,[ok+"Cells"]:nc,turn:nt,lastMove:serverTimestamp()};if(nc<=0)up.winner=userId;await updateDoc(doc(db,"games",gameId),up);};
  if(ld)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{color:"#4FC3F7",fontFamily:"'Orbitron',sans-serif"}}>Loading...</div></div>;
  const mk=game?.players[0]===userId?"p1":"p2";const ok=game?.players[0]===userId?"p2":"p1";
  const ms=game?.[mk+"Shots"]||Array(100).fill(0);const os=game?.[ok+"Shots"]||Array(100).fill(0);const my=game?.turn===userId;const ov=!!game?.winner;const iw=game?.winner===userId;
  const rg=(b2,s1,onClick,isE,hOn)=>(<div style={{display:"inline-block"}}>
    <div style={{display:"flex",paddingLeft:CS}}>{Array.from({length:G},(_,i)=>(<div key={i} style={{width:CS,textAlign:"center",fontSize:9,color:"#64748b",fontFamily:"'Orbitron',sans-serif"}}>{String.fromCharCode(65+i)}</div>))}</div>
    {Array.from({length:G},(_,r)=>(<div key={r} style={{display:"flex"}}><div style={{width:CS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#64748b",fontFamily:"'Orbitron',sans-serif"}}>{r+1}</div>
      {Array.from({length:G},(_,c)=>{const idx=r*G+c;const sh=s1[idx];const hs=b2[r]?.[c]===1;const h=hv.find(h=>h.r===r&&h.c===c);let bg="rgba(255,255,255,0.03)",ct="";if(sh===2){bg="#DC2626";ct="💥";}else if(sh===1){bg="#1e293b";ct="•";}else if(!isE&&hs)bg="rgba(99,102,241,0.25)";if(h)bg=h.valid?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)";
        return(<div key={c} onClick={()=>onClick?.(r,c)} onMouseEnter={()=>hOn&&ph2(r,c)} style={{width:CS,height:CS,background:bg,border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:sh===2?12:10,color:sh===1?"#475569":"#fff",cursor:onClick?"crosshair":"default"}}>{ct}</div>);})}</div>))}
  </div>);
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#0a1628,#0f172a)",color:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:"1px solid #1e293b"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:13,letterSpacing:2,color:"#4FC3F7"}}>🚢 BATTLESHIP</span><div style={{width:28}}/></div>
    {phase==="place"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
      <div style={{fontSize:11,color:"#94a3b8",fontFamily:"'Orbitron',sans-serif"}}>{cs<SHIPS.length?`Place ${SHIPS[cs].n} (${SHIPS[cs].s})`:"Submitting..."}</div>
      <button onClick={()=>setHz(!hz)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 14px",color:"#4FC3F7",fontSize:11,cursor:"pointer",fontFamily:"'Orbitron',sans-serif"}}>{hz?"⟷ HORIZ":"⟳ VERT"}</button>
      {rg(lb,Array(100).fill(0),pc,false,true)}</div>}
    {phase==="waiting"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}><div style={{fontSize:40}}>⏳</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"#4FC3F7"}}>SHIPS PLACED!</div><div style={{fontSize:13,color:"#94a3b8"}}>Waiting for {opponentName}...</div></div>}
    {phase==="battle"&&<><div style={{display:"flex",justifyContent:"space-around",padding:"6px 12px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#4FC3F7",fontFamily:"'Orbitron',sans-serif"}}>YOURS</div><div style={{fontSize:16,fontWeight:700}}>{game?.[mk+"Cells"]||0}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#FF8A65",fontFamily:"'Orbitron',sans-serif"}}>ENEMY</div><div style={{fontSize:16,fontWeight:700}}>{game?.[ok+"Cells"]||0}</div></div></div>
      <div style={{display:"flex",padding:"8px 16px 0"}}>{["enemy","mine"].map(v=>(<button key={v} onClick={()=>setVb(v)} style={{flex:1,padding:"6px",fontSize:11,fontWeight:600,color:vb===v?"#4FC3F7":"#475569",background:"none",border:"none",cursor:"pointer",borderBottom:vb===v?"2px solid #4FC3F7":"2px solid transparent",fontFamily:"'Orbitron',sans-serif"}}>{v==="enemy"?"ATTACK":"FLEET"}</button>))}</div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>{vb==="enemy"?rg(e0(),ms,my&&!ov?atk:null,true,false):rg(lb,os,null,false,false)}</div>
      <div style={{padding:"8px 16px",textAlign:"center"}}><div style={{fontSize:12,color:my?"#4FC3F7":"#FF8A65",fontFamily:"'Orbitron',sans-serif"}}>{ov?(iw?"VICTORY! 🏆":`${opponentName} wins!`):(my?"Tap to fire":opponentName+" aiming...")}</div></div></>}
    {ov&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.85)",zIndex:10}}><div style={{fontSize:48}}>🚢</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:22,color:iw?"#4FC3F7":"#FF8A65",marginTop:8}}>{iw?"VICTORY!":"DEFEATED!"}</div><button onClick={onClose} style={{marginTop:16,...S.btn,background:"linear-gradient(135deg,#4FC3F7,#0288D1)",color:"#fff",padding:"12px 28px",borderRadius:24,fontSize:14,fontFamily:"'Orbitron',sans-serif"}}>BACK</button></div>}
  </div>);
}

// ═══════ GAME 3: MULTIPLAYER HANGMAN ═══════
function MultiHangman({gameId,userId,opponentName,onClose}){
  const[game,setGame]=useState(null);const[ld,setLd]=useState(true);const[wordInput,setWordInput]=useState("");
  const WORDS=["RIVAL","GAMING","DOMINATE","WARRIOR","BEAST","SAVAGE","CHAMPION","LEGENDARY","FEARLESS","UNSTOPPABLE"];
  useEffect(()=>{if(!gameId)return;const u=onSnapshot(doc(db,"games",gameId),s=>{if(s.exists()){setGame({id:s.id,...s.data()});vibrate();}setLd(false);});return()=>u();},[gameId]);
  const submitWord=async()=>{const w=(wordInput||WORDS[Math.floor(Math.random()*WORDS.length)]).toUpperCase().replace(/[^A-Z]/g,"");if(w.length<3)return;await updateDoc(doc(db,"games",gameId),{word:w,phase:"guessing"});setWordInput("");};
  const guess=async(l)=>{if(!game||game.phase!=="guessing"||game.turn!==userId)return;const gl=[...(game.guessedLetters||[]),l];const m=game.word.includes(l)?game.mistakes:(game.mistakes||0)+1;
    const won=game.word.split("").every(c=>gl.includes(c));const lost=m>=6;
    await updateDoc(doc(db,"games",gameId),{guessedLetters:gl,mistakes:m,winner:won?userId:(lost?game.players.find(p=>p!==userId):null),lastMove:serverTimestamp()});};
  const rematch=async()=>{const picker=game.players.find(p=>p!==game.players.find(pp=>pp===game.picker));
    await updateDoc(doc(db,"games",gameId),{word:"",phase:"picking",picker:game.guesser,guesser:game.picker,turn:game.guesser,guessedLetters:[],mistakes:0,winner:null});};
  if(ld)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{color:"#FF1744",fontFamily:"'Orbitron',sans-serif"}}>Loading...</div></div>;
  if(!game)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{color:"#ef4444"}}>Not found</div><button onClick={onClose} style={{...S.btn,marginTop:16,background:"#333",color:"#fff",padding:"10px 20px",borderRadius:10}}>Back</button></div>;
  const isPicker=game.picker===userId;const isGuesser=game.guesser===userId;const ov=!!game.winner;const iw=game.winner===userId;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#0c0a09,#1c1917)",color:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,letterSpacing:2}}>📝 HANGMAN</span><div style={{width:28}}/></div>
    <div style={{padding:"8px 16px",display:"flex",justifyContent:"center",gap:4}}>{Array.from({length:6},(_,i)=>(<div key={i} style={{width:8,height:8,borderRadius:4,background:i<(game.mistakes||0)?"#FF1744":"#334155"}}/>))}</div>
    {game.phase==="picking"&&isPicker&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:20}}>
      <div style={{fontSize:32}}>🤫</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:16,color:"#FF1744"}}>PICK A WORD</div><div style={{fontSize:13,color:"#94a3b8",textAlign:"center"}}>{opponentName} will try to guess it</div>
      <input style={{...S.inp,textAlign:"center",fontSize:18,textTransform:"uppercase",maxWidth:280}} placeholder="Type a word..." value={wordInput} onChange={e=>setWordInput(e.target.value.replace(/[^a-zA-Z]/g,""))} maxLength={15}/>
      <button onClick={submitWord} style={{...S.btn,background:"linear-gradient(135deg,#FF1744,#D50000)",color:"#fff",padding:"12px 32px",borderRadius:20,fontSize:14,fontFamily:"'Orbitron',sans-serif"}}>{wordInput?"SUBMIT WORD":"RANDOM WORD"}</button>
    </div>}
    {game.phase==="picking"&&!isPicker&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}><div style={{fontSize:40}}>⏳</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"#FF5722"}}>WAITING...</div><div style={{fontSize:13,color:"#94a3b8"}}>{opponentName} is picking a word</div></div>}
    {game.phase==="guessing"&&<>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
        {isPicker&&<div style={{fontSize:11,color:"#22c55e",fontFamily:"'Orbitron',sans-serif"}}>YOUR WORD: {game.word}</div>}
        <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",padding:"0 16px"}}>{(game.word||"").split("").map((l,i)=>(<div key={i} style={{width:28,height:36,borderBottom:`2px solid ${(game.guessedLetters||[]).includes(l)?"#22c55e":"#475569"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,fontFamily:"'Orbitron',sans-serif",color:ov&&!(game.guessedLetters||[]).includes(l)?"#FF1744":"#e2e8f0"}}>{(game.guessedLetters||[]).includes(l)||ov?l:""}</div>))}</div>
        {isPicker&&!ov&&<div style={{fontSize:13,color:"#94a3b8"}}>{opponentName} is guessing...</div>}
        {ov&&<div style={{textAlign:"center",marginTop:8}}><div style={{fontSize:20,fontFamily:"'Orbitron',sans-serif",color:iw?"#22c55e":"#FF1744",marginBottom:12}}>{iw?"YOU WIN! 🎉":"YOU LOSE 💀"}</div><button onClick={rematch} style={{...S.btn,background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",padding:"10px 28px",borderRadius:20,fontSize:14,fontFamily:"'Orbitron',sans-serif"}}>SWAP & PLAY AGAIN</button></div>}
      </div>
      {isGuesser&&!ov&&<div style={{padding:"8px 8px 16px",display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4}}>{"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l=>{const used=(game.guessedLetters||[]).includes(l);const correct=used&&(game.word||"").includes(l);const wrong=used&&!(game.word||"").includes(l);return(<button key={l} onClick={()=>guess(l)} disabled={used||ov} style={{width:32,height:36,borderRadius:6,background:correct?"#22c55e":wrong?"#7f1d1d":"rgba(255,255,255,0.06)",border:"none",color:used?"rgba(255,255,255,0.3)":"#e2e8f0",fontSize:13,fontWeight:700,cursor:used?"default":"pointer",fontFamily:"'Orbitron',sans-serif",opacity:used?0.5:1}}>{l}</button>);})}</div>}
    </>}
  </div>);
}

// ═══════ GAME 4: MULTIPLAYER 8 BALL POOL ═══════
function MultiPool({gameId,userId,opponentName,onClose}){
  const cr=useRef(null);const gr=useRef(null);const[game,setGame]=useState(null);const[ld,setLd]=useState(true);
  const[shooting,setShooting]=useState(false);const[power,setPower]=useState(0);const[dragging,setDragging]=useState(false);const[angle,setAngle]=useState(0);const ds=useRef(null);
  const TW=340,TH=190,CW=380,CH=280,TX=(CW-TW)/2,TY=50,BR=8,PR=14,FR=.985;
  const PKS=[{x:TX+2,y:TY+2},{x:TX+TW/2,y:TY-2},{x:TX+TW-2,y:TY+2},{x:TX+2,y:TY+TH-2},{x:TX+TW/2,y:TY+TH+2},{x:TX+TW-2,y:TY+TH-2}];

  useEffect(()=>{if(!gameId)return;const u=onSnapshot(doc(db,"games",gameId),s=>{if(s.exists()){const d={id:s.id,...s.data()};setGame(d);
    if(d.balls&&!shooting){gr.current={balls:d.balls.map(b=>({...b,vx:0,vy:0}))};}vibrate();}setLd(false);});return()=>u();},[gameId,shooting]);

  const initBalls=()=>{const b=[{x:TX+80,y:TY+TH/2,color:"#FFF",id:0,sunk:false,type:"cue"}];const c=[{c:"#FFD700",t:"solid"},{c:"#0066CC",t:"solid"},{c:"#CC0000",t:"solid"},{c:"#6B2FA0",t:"solid"},{c:"#FF6600",t:"solid"},{c:"#006633",t:"solid"},{c:"#8B0000",t:"solid"},{c:"#000",t:"eight"},{c:"#FFD700",t:"stripe"},{c:"#0066CC",t:"stripe"},{c:"#CC0000",t:"stripe"},{c:"#6B2FA0",t:"stripe"},{c:"#FF6600",t:"stripe"},{c:"#006633",t:"stripe"},{c:"#8B0000",t:"stripe"}];
    for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}const ei=c.findIndex(x=>x.t==="eight");[c[4],c[ei]]=[c[ei],c[4]];const sx=TX+TW*.7,sy=TY+TH/2;let idx=0;
    for(let row=0;row<5;row++)for(let col=0;col<=row;col++){b.push({x:sx+row*(BR*1.8),y:sy+(col-row/2)*(BR*2.05),color:c[idx].c,id:idx+1,sunk:false,type:c[idx].t,stripe:c[idx].t==="stripe"});idx++;}return b;};

  const shoot=async()=>{if(!gr.current||power<5)return;const cue=gr.current.balls[0];if(cue.sunk)return;
    cue.vx=Math.cos(angle)*power*.1;cue.vy=Math.sin(angle)*power*.1;setShooting(true);setPower(0);setDragging(false);
    const phys=()=>{const balls=gr.current.balls;let any=false;for(const b of balls){if(b.sunk)continue;b.x+=(b.vx||0);b.y+=(b.vy||0);b.vx=(b.vx||0)*FR;b.vy=(b.vy||0)*FR;if(Math.abs(b.vx)<.08)b.vx=0;if(Math.abs(b.vy)<.08)b.vy=0;if(b.vx||b.vy)any=true;
      if(b.x-BR<TX){b.x=TX+BR;b.vx=Math.abs(b.vx)*.9;}if(b.x+BR>TX+TW){b.x=TX+TW-BR;b.vx=-Math.abs(b.vx)*.9;}if(b.y-BR<TY){b.y=TY+BR;b.vy=Math.abs(b.vy)*.9;}if(b.y+BR>TY+TH){b.y=TY+TH-BR;b.vy=-Math.abs(b.vy)*.9;}
      for(const p of PKS)if(Math.hypot(b.x-p.x,b.y-p.y)<PR){b.sunk=true;b.vx=0;b.vy=0;break;}}
      for(let i=0;i<balls.length;i++){if(balls[i].sunk)continue;for(let j=i+1;j<balls.length;j++){if(balls[j].sunk)continue;const dx=balls[j].x-balls[i].x,dy=balls[j].y-balls[i].y,dist=Math.hypot(dx,dy);if(dist<BR*2&&dist>0){const nx=dx/dist,ny=dy/dist,ov2=BR*2-dist;balls[i].x-=nx*ov2/2;balls[i].y-=ny*ov2/2;balls[j].x+=nx*ov2/2;balls[j].y+=ny*ov2/2;const dvx=balls[i].vx-balls[j].vx,dvy=balls[i].vy-balls[j].vy,dot=dvx*nx+dvy*ny;if(dot>0){balls[i].vx-=dot*nx*.95;balls[i].vy-=dot*ny*.95;balls[j].vx+=dot*nx*.95;balls[j].vy+=dot*ny*.95;}}}}return any;};
    const run=()=>{if(phys())requestAnimationFrame(run);else{
      const sunk=gr.current.balls.filter(b=>b.sunk&&!b.counted);let scored=0,cued=false,eighted=false;for(const b of sunk){b.counted=true;if(b.type==="cue")cued=true;else if(b.type==="eight")eighted=true;else scored++;}
      if(cued){const c2=gr.current.balls[0];c2.sunk=false;c2.counted=false;c2.x=TX+80;c2.y=TY+TH/2;}
      const saveBalls=gr.current.balls.map(b=>({x:Math.round(b.x*10)/10,y:Math.round(b.y*10)/10,color:b.color,id:b.id,sunk:b.sunk,type:b.type,stripe:!!b.stripe,counted:!!b.counted}));
      const nt=scored>0?userId:(game.players[0]===userId?game.players[1]:game.players[0]);
      const up={balls:saveBalls,turn:nt,lastMove:serverTimestamp()};
      const mk=game.players[0]===userId?"p1Score":"p2Score";up[mk]=(game[mk]||0)+scored;
      if(eighted)up.winner=userId;
      updateDoc(doc(db,"games",gameId),up).then(()=>setShooting(false));}};
    requestAnimationFrame(run);};

  // Render
  useEffect(()=>{const c=cr.current;if(!c)return;const x=c.getContext("2d");let raf;
    const draw=()=>{const g=gr.current;if(!g){raf=requestAnimationFrame(draw);return;}
      x.clearRect(0,0,CW,CH);x.fillStyle="#5D3A1A";x.beginPath();x.roundRect(TX-18,TY-18,TW+36,TH+36,10);x.fill();x.fillStyle="#4A2E15";x.beginPath();x.roundRect(TX-12,TY-12,TW+24,TH+24,6);x.fill();
      const fg=x.createRadialGradient(TX+TW/2,TY+TH/2,20,TX+TW/2,TY+TH/2,TW/1.5);fg.addColorStop(0,"#1B7A3D");fg.addColorStop(1,"#145C2E");x.fillStyle=fg;x.fillRect(TX,TY,TW,TH);
      for(const p of PKS){x.beginPath();x.arc(p.x,p.y,PR,0,Math.PI*2);x.fillStyle="#0a0a0a";x.fill();}
      for(const b of g.balls){if(b.sunk)continue;x.beginPath();x.arc(b.x+2,b.y+2,BR,0,Math.PI*2);x.fillStyle="rgba(0,0,0,0.3)";x.fill();x.beginPath();x.arc(b.x,b.y,BR,0,Math.PI*2);x.fillStyle=b.color;x.fill();
        if(b.stripe){x.save();x.beginPath();x.arc(b.x,b.y,BR,0,Math.PI*2);x.clip();x.fillStyle="#FFF";x.fillRect(b.x-BR,b.y-3,BR*2,6);x.restore();}
        if(b.id>0){x.beginPath();x.arc(b.x,b.y,4.5,0,Math.PI*2);x.fillStyle="#FFF";x.fill();x.fillStyle="#000";x.font="bold 6px sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText(b.id,b.x,b.y+.5);}}
      const my=game?.turn===userId&&!shooting;if(my&&!g.balls[0].sunk){const c2=g.balls[0];x.strokeStyle="rgba(255,255,255,0.3)";x.lineWidth=1;x.setLineDash([4,6]);x.beginPath();x.moveTo(c2.x,c2.y);x.lineTo(c2.x+Math.cos(angle)*150,c2.y+Math.sin(angle)*150);x.stroke();x.setLineDash([]);}
      x.fillStyle="#e2e8f0";x.font="bold 11px 'Orbitron',sans-serif";x.textAlign="left";x.fillText("YOU: "+(game?.players?.[0]===userId?game?.p1Score||0:game?.p2Score||0),TX,TY+TH+40);x.textAlign="right";x.fillText((opponentName?.split(" ")[0]?.toUpperCase()||"OPP")+": "+(game?.players?.[0]===userId?game?.p2Score||0:game?.p1Score||0),TX+TW,TY+TH+40);
      raf=requestAnimationFrame(draw);};raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);},[game,shooting,angle,power,dragging]);

  const ptr=(e,type)=>{if(!game||game.turn!==userId||shooting||game.winner)return;const rect=cr.current.getBoundingClientRect(),scX=CW/rect.width,scY=CH/rect.height;const mx=(e.clientX-rect.left)*scX,my=(e.clientY-rect.top)*scY;const cue=gr.current?.balls?.[0];if(!cue||cue.sunk)return;
    if(type==="down"&&Math.hypot(mx-cue.x,my-cue.y)<50){setDragging(true);ds.current={x:mx,y:my};}else if(type==="move"&&dragging){const dx=ds.current.x-mx,dy=ds.current.y-my;setAngle(Math.atan2(dy,dx));setPower(Math.min(Math.hypot(dx,dy),100));}else if(type==="up"&&dragging){setDragging(false);if(power>5)shoot();else setPower(0);}};
  const resetGame=async()=>{const balls=initBalls().map(b=>({x:b.x,y:b.y,color:b.color,id:b.id,sunk:false,type:b.type,stripe:!!b.stripe,counted:false}));await updateDoc(doc(db,"games",gameId),{balls,turn:game.players[0],p1Score:0,p2Score:0,winner:null});};

  if(ld)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{color:"#FFD700",fontFamily:"'Orbitron',sans-serif"}}>Loading...</div></div>;
  const my=game?.turn===userId&&!shooting;const ov=!!game?.winner;const iw=game?.winner===userId;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"#0a1628",color:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:"1px solid #1e293b"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:13,letterSpacing:2,color:"#FFD700"}}>🎱 8 BALL POOL</span><div style={{width:28}}/></div>
    {dragging&&<div style={{padding:"4px 16px"}}><div style={{height:6,background:"#1e293b",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${power}%`,background:power>70?"#FF1744":power>40?"#FFD700":"#22c55e",borderRadius:3}}/></div></div>}
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><canvas ref={cr} width={CW} height={CH} style={{maxWidth:"100%",touchAction:"none",cursor:my?"crosshair":"default"}} onPointerDown={e=>ptr(e,"down")} onPointerMove={e=>ptr(e,"move")} onPointerUp={e=>ptr(e,"up")} onPointerLeave={()=>{if(dragging){setDragging(false);setPower(0);}}}/></div>
    <div style={{padding:"8px 16px",textAlign:"center"}}><div style={{fontSize:12,color:my?"#00E5FF":"#FFD700",fontFamily:"'Orbitron',sans-serif"}}>{ov?(iw?"YOU WIN! 🎱":"💀 "+opponentName+" wins"):(shooting?"Rolling...":(my?"Drag behind cue ball to shoot":"Waiting for "+opponentName+"..."))}</div></div>
    {ov&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.8)",zIndex:10}}><div style={{fontSize:40}}>🎱</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:22,color:"#FFD700",marginTop:8}}>{iw?"YOU WIN!":opponentName+" wins!"}</div><button onClick={resetGame} style={{marginTop:16,...S.btn,background:"linear-gradient(135deg,#FFD700,#FF8F00)",color:"#000",padding:"12px 28px",borderRadius:24,fontSize:14,fontFamily:"'Orbitron',sans-serif",fontWeight:700}}>RACK 'EM UP</button></div>}
  </div>);
}

// ═══════ GAME 5: DUEL DRAW (Western Showdown) ═══════
function DuelDraw({gameId,userId,opponentName,onClose}){
  const[game,setGame]=useState(null);const[ld,setLd]=useState(true);const[localPhase,setLocalPhase]=useState("waiting");const[myTime,setMyTime]=useState(null);const drawTime=useRef(null);
  useEffect(()=>{if(!gameId)return;const u=onSnapshot(doc(db,"games",gameId),s=>{if(s.exists()){const d={id:s.id,...s.data()};setGame(d);
    if(d.phase==="countdown"&&localPhase==="waiting"){setLocalPhase("countdown");const delay=3000+Math.random()*4000;drawTime.current=Date.now()+delay;setTimeout(()=>setLocalPhase("draw"),delay);}
    if(d.phase==="result")setLocalPhase("result");vibrate();}setLd(false);});return()=>u();},[gameId]);

  const startDuel=async()=>{await updateDoc(doc(db,"games",gameId),{phase:"countdown",p1Time:null,p2Time:null,winner:null,drawSignal:Date.now()+3000+Math.random()*4000});};
  const draw=async()=>{if(localPhase!=="draw"||myTime)return;const t=Date.now()-(drawTime.current||Date.now());setMyTime(t);const mk=game.players[0]===userId?"p1Time":"p2Time";await updateDoc(doc(db,"games",gameId),{[mk]:t});
    // Check if both drew
    const fresh=await getDoc(doc(db,"games",gameId));const d=fresh.data();const p1=d.p1Time;const p2=d.p2Time;
    if(p1!==null&&p2!==null){const w=p1<p2?d.players[0]:d.players[1];await updateDoc(doc(db,"games",gameId),{phase:"result",winner:w});}};
  const tooEarly=async()=>{if(localPhase==="countdown"){const mk=game.players[0]===userId?"p1Time":"p2Time";const other=game.players[0]===userId?game.players[1]:game.players[0];
    await updateDoc(doc(db,"games",gameId),{[mk]:99999,phase:"result",winner:other});}};
  const rematch=async()=>{await updateDoc(doc(db,"games",gameId),{phase:"ready",p1Time:null,p2Time:null,winner:null});setLocalPhase("waiting");setMyTime(null);drawTime.current=null;};

  if(ld)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{color:"#FF1744"}}>Loading...</div></div>;
  const ov=game?.phase==="result";const iw=game?.winner===userId;const myT=game?.players[0]===userId?game?.p1Time:game?.p2Time;const oppT=game?.players[0]===userId?game?.p2Time:game?.p1Time;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#1a0f00,#0a0a0f)",color:"#fff"}} onClick={()=>{if(localPhase==="countdown")tooEarly();if(localPhase==="draw")draw();}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={e=>{e.stopPropagation();onClose();}} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,letterSpacing:2,color:"#FFD700"}}>🤠 DUEL DRAW</span><div style={{width:28}}/></div>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      {(game?.phase==="ready"||!game?.phase||game?.phase===undefined)&&<><div style={{fontSize:64}}>🤠</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,color:"#FFD700"}}>WESTERN SHOWDOWN</div><div style={{fontSize:14,color:"#94a3b8",textAlign:"center",padding:"0 32px"}}>When you see "DRAW!" tap as fast as you can. Tap too early = you lose.</div><div style={{fontSize:13,color:"#FF5722",marginTop:8}}>vs {opponentName}</div><button onClick={e=>{e.stopPropagation();startDuel();}} style={{...S.btn,background:"linear-gradient(135deg,#FFD700,#FF8F00)",color:"#000",padding:"14px 40px",borderRadius:24,fontSize:16,fontFamily:"'Orbitron',sans-serif",fontWeight:700,marginTop:16}}>START DUEL</button></>}
      {localPhase==="countdown"&&<><div style={{fontSize:80}}>🤠</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:32,color:"#FF1744",animation:"pulse 0.5s ease-in-out infinite"}}>WAIT...</div><div style={{fontSize:14,color:"#94a3b8"}}>Don't tap yet!</div></>}
      {localPhase==="draw"&&!myTime&&<><div style={{fontSize:80}}>💥</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:40,color:"#22c55e",animation:"pulse 0.3s ease-in-out infinite"}}>DRAW!</div><div style={{fontSize:16,color:"#FFD700"}}>TAP NOW!</div></>}
      {localPhase==="draw"&&myTime&&<><div style={{fontSize:48}}>⏳</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:16,color:"#FFD700"}}>Your draw: {myTime}ms</div><div style={{fontSize:13,color:"#94a3b8"}}>Waiting for {opponentName}...</div></>}
      {ov&&<><div style={{fontSize:64}}>{iw?"🏆":"💀"}</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,color:iw?"#FFD700":"#FF1744"}}>{iw?"FASTEST DRAW!":"TOO SLOW!"}</div>
        <div style={{display:"flex",gap:24,marginTop:8}}><div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#94a3b8"}}>You</div><div style={{fontSize:20,fontWeight:700,color:"#FFD700"}}>{myT===99999?"TOO EARLY":(myT||"--")+"ms"}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#94a3b8"}}>{opponentName}</div><div style={{fontSize:20,fontWeight:700,color:"#FF5722"}}>{oppT===99999?"TOO EARLY":(oppT||"--")+"ms"}</div></div></div>
        <button onClick={e=>{e.stopPropagation();rematch();}} style={{...S.btn,background:"linear-gradient(135deg,#FFD700,#FF8F00)",color:"#000",padding:"12px 32px",borderRadius:20,fontSize:14,fontFamily:"'Orbitron',sans-serif",fontWeight:700,marginTop:16}}>REMATCH</button></>}
    </div>
    <style>{`@keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.1);}}`}</style>
  </div>);
}

// ═══════ GAME 6: ASSASSIN GRID (Hunt & Kill 5x5) ═══════
function AssassinGrid({gameId,userId,opponentName,onClose}){
  const[game,setGame]=useState(null);const[ld,setLd]=useState(true);const[placing,setPlacing]=useState(false);const G=5;
  useEffect(()=>{if(!gameId)return;const u=onSnapshot(doc(db,"games",gameId),s=>{if(s.exists()){setGame({id:s.id,...s.data()});vibrate();}setLd(false);});return()=>u();},[gameId]);
  const placeAssassin=async(r,c)=>{const mk=game.players[0]===userId?"p1Pos":"p2Pos";await updateDoc(doc(db,"games",gameId),{[mk]:{r,c}});};
  const attack=async(r,c)=>{if(!game||game.turn!==userId||game.winner)return;const mk=game.players[0]===userId?"p1":"p2";const ok=game.players[0]===userId?"p2":"p1";
    const attacks=[...(game[mk+"Attacks"]||[]),{r,c}];const hit=game[ok+"Pos"]&&game[ok+"Pos"].r===r&&game[ok+"Pos"].c===c;
    const nt=game.players[0]===userId?game.players[1]:game.players[0];
    const up={[mk+"Attacks"]:attacks,turn:nt,lastMove:serverTimestamp()};if(hit)up.winner=userId;
    await updateDoc(doc(db,"games",gameId),up);};
  const rematch=async()=>{await updateDoc(doc(db,"games",gameId),{p1Pos:null,p2Pos:null,p1Attacks:[],p2Attacks:[],turn:game.players[0],winner:null,phase:"placing"});};

  if(ld)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{color:"#FF1744"}}>Loading...</div></div>;
  const mk=game?.players[0]===userId?"p1":"p2";const ok=game?.players[0]===userId?"p2":"p1";
  const myPos=game?.[mk+"Pos"];const oppPos=game?.[ok+"Pos"];const myAtks=game?.[mk+"Attacks"]||[];const oppAtks=game?.[ok+"Attacks"]||[];
  const bothPlaced=game?.p1Pos&&game?.p2Pos;const my=game?.turn===userId;const ov=!!game?.winner;const iw=game?.winner===userId;
  const CS=52;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#0a0f1a,#0a0a0f)",color:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,letterSpacing:2,color:"#FF1744"}}>🗡️ ASSASSIN GRID</span><div style={{width:28}}/></div>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
      {!myPos&&<><div style={{fontSize:32}}>🗡️</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"#FF1744"}}>HIDE YOUR ASSASSIN</div><div style={{fontSize:12,color:"#94a3b8"}}>Tap a cell to place. {opponentName} will hunt you.</div></>}
      {myPos&&!bothPlaced&&<><div style={{fontSize:32}}>⏳</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"#FF5722"}}>ASSASSIN PLACED!</div><div style={{fontSize:12,color:"#94a3b8"}}>Waiting for {opponentName}...</div></>}
      {bothPlaced&&!ov&&<div style={{fontFamily:"'Orbitron',sans-serif",fontSize:13,color:my?"#FF1744":"#94a3b8"}}>{my?"YOUR TURN - Pick a cell to strike":opponentName+" is hunting..."}</div>}
      {ov&&<div style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,color:iw?"#22c55e":"#FF1744",marginBottom:8}}>{iw?"KILL CONFIRMED! 🗡️":"YOU GOT HUNTED 💀"}</div>}
      <div style={{display:"grid",gridTemplateColumns:`repeat(${G},${CS}px)`,gap:3}}>
        {Array.from({length:G*G},(_,i)=>{const r=Math.floor(i/G),c=i%G;
          const isMyPos=myPos&&myPos.r===r&&myPos.c===c;const isOppPos=ov&&oppPos&&oppPos.r===r&&oppPos.c===c;
          const myHit=myAtks.find(a=>a.r===r&&a.c===c);const oppHit=oppAtks.find(a=>a.r===r&&a.c===c);
          let bg="rgba(255,255,255,0.04)";let ct="";
          if(isMyPos){bg="rgba(255,23,68,0.2)";ct="🗡️";}
          if(isOppPos){bg="rgba(34,197,94,0.3)";ct=ct||"💀";}
          if(myHit){bg=isOppPos?"#22c55e":"#1e293b";ct=isOppPos?"💀":"•";}
          if(oppHit&&isMyPos){bg="#DC2626";ct="💥";}else if(oppHit&&!isMyPos){bg="rgba(255,255,255,0.02)";ct=ct||"○";}
          const canClick=(!myPos&&!bothPlaced)||(bothPlaced&&my&&!ov&&!myHit);
          return(<div key={i} onClick={()=>{if(!myPos)placeAssassin(r,c);else if(bothPlaced&&my&&!ov&&!myHit)attack(r,c);}} style={{width:CS,height:CS,background:bg,border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:myHit||oppHit?14:20,cursor:canClick?"crosshair":"default",transition:"background 0.15s"}}>{ct}</div>);})}
      </div>
      {ov&&<button onClick={rematch} style={{...S.btn,background:"linear-gradient(135deg,#FF1744,#D50000)",color:"#fff",padding:"10px 28px",borderRadius:20,fontSize:14,fontFamily:"'Orbitron',sans-serif",marginTop:8}}>REMATCH</button>}
    </div>
  </div>);
}

// ═══════ GAME 7: BOMB TAG (Hot Potato on Grid) ═══════
function BombTag({gameId,userId,opponentName,onClose}){
  const[game,setGame]=useState(null);const[ld,setLd]=useState(true);const G=6;
  useEffect(()=>{if(!gameId)return;const u=onSnapshot(doc(db,"games",gameId),s=>{if(s.exists()){setGame({id:s.id,...s.data()});vibrate();}setLd(false);});return()=>u();},[gameId]);
  const move=async(dr,dc)=>{if(!game||game.turn!==userId||game.winner)return;const mk=game.players[0]===userId?"p1Pos":"p2Pos";const pos=game[mk];
    const nr=pos.r+dr,nc=pos.c+dc;if(nr<0||nr>=G||nc<0||nc>=G)return;
    const ok=game.players[0]===userId?"p2Pos":"p1Pos";const opos=game[ok];
    // Check if we move onto opponent -> pass the bomb
    const onOpp=nr===opos.r&&nc===opos.c;const bombHolder=game.bombHolder;let newBomb=bombHolder;
    if(onOpp&&bombHolder===userId)newBomb=game.players.find(p=>p!==userId);
    else if(onOpp&&bombHolder!==userId)newBomb=userId;
    const newTimer=game.bombTimer-1;const nt=game.players[0]===userId?game.players[1]:game.players[0];
    const up={[mk]:{r:nr,c:nc},bombHolder:newBomb,bombTimer:newTimer,turn:nt,lastMove:serverTimestamp()};
    if(newTimer<=0)up.winner=game.players.find(p=>p!==newBomb); // whoever DOESN'T have bomb wins
    await updateDoc(doc(db,"games",gameId),up);};
  const rematch=async()=>{await updateDoc(doc(db,"games",gameId),{p1Pos:{r:0,c:0},p2Pos:{r:G-1,c:G-1},bombHolder:game.players[Math.floor(Math.random()*2)],bombTimer:15+Math.floor(Math.random()*10),turn:game.players[0],winner:null});};

  if(ld)return<div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{color:"#FF1744"}}>Loading...</div></div>;
  const mk=game?.players[0]===userId?"p1Pos":"p2Pos";const ok=game?.players[0]===userId?"p2Pos":"p1Pos";
  const myPos=game?.[mk];const oppPos=game?.[ok];const my=game?.turn===userId;const ov=!!game?.winner;const iw=game?.winner===userId;const iBomb=game?.bombHolder===userId;
  const CS=48;
  return(<div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#1a0a00,#0a0a0f)",color:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,letterSpacing:2,color:"#FF5722"}}>💣 BOMB TAG</span><div style={{width:28}}/></div>
    <div style={{padding:"8px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontSize:12,color:iBomb?"#FF1744":"#22c55e",fontFamily:"'Orbitron',sans-serif"}}>{iBomb?"💣 YOU HAVE THE BOMB":"✅ BOMB FREE"}</div>
      <div style={{fontSize:14,fontWeight:700,color:game?.bombTimer<=5?"#FF1744":"#FFD700",fontFamily:"'Orbitron',sans-serif"}}>⏱ {game?.bombTimer||0}</div>
    </div>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
      {!ov&&<div style={{fontSize:12,color:my?"#FF1744":"#94a3b8",fontFamily:"'Orbitron',sans-serif"}}>{my?"YOUR MOVE":"Waiting for "+opponentName+"..."}</div>}
      {ov&&<div style={{fontFamily:"'Orbitron',sans-serif",fontSize:20,color:iw?"#22c55e":"#FF1744",marginBottom:8}}>{iw?"SURVIVED! 🎉":"💥 BOOM! YOU LOSE"}</div>}
      <div style={{display:"grid",gridTemplateColumns:`repeat(${G},${CS}px)`,gap:2}}>
        {Array.from({length:G*G},(_,i)=>{const r=Math.floor(i/G),c=i%G;const isMe=myPos?.r===r&&myPos?.c===c;const isOpp=oppPos?.r===r&&oppPos?.c===c;
          let bg="rgba(255,255,255,0.03)";let ct="";
          if(isMe&&isOpp){bg="rgba(255,87,34,0.3)";ct=iBomb?"💣😰":"😤💣";}
          else if(isMe){bg=iBomb?"rgba(255,23,68,0.2)":"rgba(34,197,94,0.15)";ct=iBomb?"💣":"😎";}
          else if(isOpp){bg="rgba(255,87,34,0.1)";ct=game?.bombHolder!==userId?"💣":"🎯";}
          return(<div key={i} style={{width:CS,height:CS,background:bg,border:"1px solid rgba(255,255,255,0.06)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMe||isOpp?20:10}}>{ct}</div>);})}
      </div>
      {my&&!ov&&<div style={{display:"flex",gap:8,marginTop:8}}>
        <button onClick={()=>move(-1,0)} style={{...S.btn,width:48,height:48,borderRadius:12,background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:20}}>⬆️</button>
        <div style={{display:"flex",flexDirection:"column",gap:8}}><div style={{display:"flex",gap:8}}>
          <button onClick={()=>move(0,-1)} style={{...S.btn,width:48,height:48,borderRadius:12,background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:20}}>⬅️</button>
          <button onClick={()=>move(0,1)} style={{...S.btn,width:48,height:48,borderRadius:12,background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:20}}>➡️</button>
        </div></div>
        <button onClick={()=>move(1,0)} style={{...S.btn,width:48,height:48,borderRadius:12,background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:20}}>⬇️</button>
      </div>}
      {ov&&<button onClick={rematch} style={{...S.btn,background:"linear-gradient(135deg,#FF5722,#FF9100)",color:"#fff",padding:"10px 28px",borderRadius:20,fontSize:14,fontFamily:"'Orbitron',sans-serif",marginTop:8}}>REMATCH</button>}
    </div>
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
  const[showGifs,setShowGifs]=useState(false);const[showAttach,setShowAttach]=useState(false);const[activeGameInChat,setActiveGameInChat]=useState(null);const[uploading,setUploading]=useState(false);
  const chatEndRef=useRef(null);const prevNotif=useRef(0);const fileRef=useRef(null);

  useEffect(()=>{const l=document.createElement("link");l.href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700&display=swap";l.rel="stylesheet";document.head.appendChild(l);
    const p=new URLSearchParams(window.location.search);const inv=p.get("invite");if(inv){setInviteCode(inv);setScreen("signup");}
    if("Notification"in window&&Notification.permission==="default")Notification.requestPermission();},[]);

  useEffect(()=>{const u=onAuthStateChanged(auth,async(user)=>{setAuthUser(user);if(user){try{const r=doc(db,"users",user.uid);const d=await getDoc(r);if(d.exists()){setUserProfile({uid:user.uid,...d.data()});try{await updateDoc(r,{status:"online",lastSeen:serverTimestamp()});}catch(e){}}else{const fp={name:user.email?.split("@")[0]||"Player",username:user.email?.split("@")[0]||"p"+Date.now(),usernameLower:(user.email?.split("@")[0]||"p").toLowerCase(),email:user.email||"",phone:"",avatar:"⚡",status:"online",friends:[],createdAt:serverTimestamp(),inviteCode:genCode()};await setDoc(r,fp);setUserProfile({uid:user.uid,...fp});}setScreen("home");}catch(e){setScreen("home");}}else{setUserProfile(null);setScreen("login");}setAuthLoading(false);});return()=>u();},[]);
  useEffect(()=>{if(!authUser)return;const u=onSnapshot(doc(db,"users",authUser.uid),s=>{if(s.exists())setUserProfile({uid:authUser.uid,...s.data()});},()=>{});return()=>u();},[authUser]);
  useEffect(()=>{if(!authUser)return;const q=query(collection(db,"conversations"),where("participants","array-contains",authUser.uid));const u=onSnapshot(q,s=>{const c=s.docs.map(d=>({id:d.id,...d.data()}));c.sort((a,b)=>(b.lastMessageTime?.seconds||0)-(a.lastMessageTime?.seconds||0));setConversations(c);},()=>{});return()=>u();},[authUser]);
  useEffect(()=>{if(!activeConvoId)return;const q=query(collection(db,"conversations",activeConvoId,"messages"),orderBy("timestamp","asc"),limit(200));const u=onSnapshot(q,s=>{setMessages(s.docs.map(d=>({id:d.id,...d.data()})));},e=>{const q2=query(collection(db,"conversations",activeConvoId,"messages"),limit(200));onSnapshot(q2,s=>setMessages(s.docs.map(d=>({id:d.id,...d.data()}))));});return()=>u();},[activeConvoId]);
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  // Track active game in current chat
  useEffect(()=>{if(!activeConvoId||!authUser)return;const convo=conversations.find(c=>c.id===activeConvoId);if(!convo)return;const ouid=convo.participants.find(p=>p!==authUser.uid);if(!ouid)return;
    const q=query(collection(db,"games"),where("players","array-contains",authUser.uid));
    const u=onSnapshot(q,s=>{const active=s.docs.find(d=>{const g=d.data();return g.players.includes(ouid)&&!g.winner;});
      if(active)setActiveGameInChat({id:active.id,...active.data()});else setActiveGameInChat(null);},()=>{});return()=>u();},[activeConvoId,authUser,conversations]);

  // Upload photo/video
  const uploadFile=async(file)=>{if(!file||!activeConvoId)return;setUploading(true);try{const ext=file.name.split(".").pop();const path=`chat/${activeConvoId}/${Date.now()}.${ext}`;const sRef=ref(storage,path);await uploadBytes(sRef,file);const url=await getDownloadURL(sRef);const type=file.type.startsWith("video")?"video":"photo";await sendMsg(url,type);}catch(e){console.error("Upload error:",e);alert("Upload failed. Make sure Firebase Storage is enabled.");}setUploading(false);};
  useEffect(()=>{if(!userProfile?.friends?.length){setFriends([]);return;}const load=async()=>{const fl=[];for(const f of userProfile.friends){try{const d=await getDoc(doc(db,"users",f));if(d.exists())fl.push({uid:f,...d.data()});}catch(e){}}setFriends(fl);};load();},[userProfile?.friends?.length]);
  useEffect(()=>{if(!authUser)return;const q=query(collection(db,"notifications"),where("to","==",authUser.uid));const u=onSnapshot(q,s=>{const n=s.docs.map(d=>({id:d.id,...d.data()}));n.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));setNotifications(n);
    const ur=n.filter(x=>!x.read).length;if(ur>prevNotif.current){vibrate();if("Notification"in window&&Notification.permission==="granted"){const nw=n.find(x=>!x.read);if(nw)new Notification("RIVAL",{body:nw.text,icon:"/icons/icon-192.png"});}}prevNotif.current=ur;},()=>{});return()=>u();},[authUser]);

  const handleSignup=async()=>{setAuthError("");if(!signupForm.username.trim()){setAuthError("Username required");return;}if(!signupForm.email.trim()){setAuthError("Email required");return;}if(signupForm.password.length<6){setAuthError("Password min 6 chars");return;}
    try{const cred=await createUserWithEmailAndPassword(auth,signupForm.email,signupForm.password);const uq=query(collection(db,"users"),where("usernameLower","==",signupForm.username.toLowerCase().trim()));const us=await getDocs(uq);if(!us.empty){await cred.user.delete();setAuthError("Username taken");return;}
      const mic=genCode();await setDoc(doc(db,"users",cred.user.uid),{name:signupForm.name||signupForm.username,username:signupForm.username.trim(),usernameLower:signupForm.username.toLowerCase().trim(),email:signupForm.email.toLowerCase(),phone:signupForm.phone.replace(/\D/g,""),avatar:signupForm.avatar,status:"online",friends:[],createdAt:serverTimestamp(),inviteCode:mic});
      if(inviteCode){const iq=query(collection(db,"users"),where("inviteCode","==",inviteCode));const is2=await getDocs(iq);if(!is2.empty){const iu=is2.docs[0].id;await updateDoc(doc(db,"users",cred.user.uid),{friends:arrayUnion(iu)});await updateDoc(doc(db,"users",iu),{friends:arrayUnion(cred.user.uid)});await addDoc(collection(db,"notifications"),{to:iu,from:cred.user.uid,fromName:signupForm.name||signupForm.username,type:"friend_added",text:`${signupForm.name||signupForm.username} joined from your invite!`,read:false,createdAt:serverTimestamp()});}window.history.replaceState({},"",window.location.pathname);}
    }catch(e){setAuthError(e.message.replace("Firebase: ",""));}};
  const handleLogin=async()=>{setAuthError("");try{await signInWithEmailAndPassword(auth,loginForm.email,loginForm.password);}catch(e){setAuthError(e.message.replace("Firebase: ",""));}};
  const handleLogout=async()=>{if(authUser)try{await updateDoc(doc(db,"users",authUser.uid),{status:"offline"});}catch(e){}await signOut(auth);};
  const searchForFriend=async()=>{setSearchResults([]);setSearchError("");const q2=searchQuery.trim();if(!q2)return;const results=[];const seen=new Set();try{
    if(q2.includes("@")){const s=await getDocs(query(collection(db,"users"),where("email","==",q2.toLowerCase())));s.docs.forEach(d=>{if(!seen.has(d.id)){seen.add(d.id);results.push({uid:d.id,...d.data()});}});}
    const pd=q2.replace(/\D/g,"");if(pd.length>=7){const s=await getDocs(query(collection(db,"users"),where("phone","==",pd)));s.docs.forEach(d=>{if(!seen.has(d.id)){seen.add(d.id);results.push({uid:d.id,...d.data()});}});}
    const lw=q2.toLowerCase();const s2=await getDocs(query(collection(db,"users"),where("usernameLower","==",lw)));s2.docs.forEach(d=>{if(!seen.has(d.id)){seen.add(d.id);results.push({uid:d.id,...d.data()});}});
    const ub=lw.slice(0,-1)+String.fromCharCode(lw.charCodeAt(lw.length-1)+1);const s3=await getDocs(query(collection(db,"users"),where("usernameLower",">=",lw),where("usernameLower","<",ub),limit(10)));s3.docs.forEach(d=>{if(!seen.has(d.id)){seen.add(d.id);results.push({uid:d.id,...d.data()});}});
    const filtered=results.filter(r=>r.uid!==authUser.uid);if(!filtered.length)setSearchError("No users found");setSearchResults(filtered);}catch(e){setSearchError("Search error");}};
  const addFriend=async(fid)=>{await updateDoc(doc(db,"users",authUser.uid),{friends:arrayUnion(fid)});await updateDoc(doc(db,"users",fid),{friends:arrayUnion(authUser.uid)});await addDoc(collection(db,"notifications"),{to:fid,from:authUser.uid,fromName:userProfile.name,type:"friend_added",text:`${userProfile.name} added you!`,read:false,createdAt:serverTimestamp()});setSearchResults([]);setSearchQuery("");};
  const startConvo=async(fid)=>{const ex=conversations.find(c=>c.participants.includes(fid)&&c.participants.length===2);if(ex){setActiveConvoId(ex.id);setScreen("chat");return;}const r=await addDoc(collection(db,"conversations"),{participants:[authUser.uid,fid],lastMessage:"",lastMessageTime:serverTimestamp()});setActiveConvoId(r.id);setScreen("chat");};
  const sendMsg=async(text,type="text")=>{if(!text.trim()||!activeConvoId)return;await addDoc(collection(db,"conversations",activeConvoId,"messages"),{from:authUser.uid,text,type,timestamp:serverTimestamp()});await updateDoc(doc(db,"conversations",activeConvoId),{lastMessage:type==="text"?text:"🎮 Game challenge",lastMessageTime:serverTimestamp()});setMsgText("");setShowEmoji(false);};
  const delConvo=async(cid)=>{try{await deleteDoc(doc(db,"conversations",cid));setConvoMenu(null);}catch(e){}};
  const shareInvite=async()=>{const code=userProfile?.inviteCode||"RIVAL";const url=window.location.origin+"?invite="+code;if(navigator.share)try{await navigator.share({title:"RIVAL",text:"Think you can beat me?",url});}catch(e){}else{navigator.clipboard?.writeText(url);alert("Copied!");}};

  const challengeGame=async(gameType)=>{const convo=conversations.find(c=>c.id===activeConvoId);if(!convo)return;const ouid=convo.participants.find(p=>p!==authUser.uid);const od=await getDoc(doc(db,"users",ouid));const on2=od.exists()?od.data().name:"Opponent";
    let gameData={type:gameType,players:[authUser.uid,ouid],createdAt:serverTimestamp(),winner:null};
    if(gameType==="tictactoe")Object.assign(gameData,{board:Array(9).fill(null),turn:authUser.uid,winLine:null});
    else if(gameType==="battleship")Object.assign(gameData,{p1Board:[],p2Board:[],p1Shots:Array(100).fill(0),p2Shots:Array(100).fill(0),p1Cells:0,p2Cells:0,turn:authUser.uid});
    else if(gameType==="hangman")Object.assign(gameData,{word:"",phase:"picking",picker:authUser.uid,guesser:ouid,turn:ouid,guessedLetters:[],mistakes:0});
    else if(gameType==="pool"){const ib=()=>{const b=[{x:100,y:145,color:"#FFF",id:0,sunk:false,type:"cue",stripe:false,counted:false}];const c=[{c:"#FFD700",t:"solid"},{c:"#0066CC",t:"solid"},{c:"#CC0000",t:"solid"},{c:"#6B2FA0",t:"solid"},{c:"#FF6600",t:"solid"},{c:"#006633",t:"solid"},{c:"#8B0000",t:"solid"},{c:"#000",t:"eight"},{c:"#FFD700",t:"stripe"},{c:"#0066CC",t:"stripe"},{c:"#CC0000",t:"stripe"},{c:"#6B2FA0",t:"stripe"},{c:"#FF6600",t:"stripe"},{c:"#006633",t:"stripe"},{c:"#8B0000",t:"stripe"}];for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}const ei=c.findIndex(x=>x.t==="eight");[c[4],c[ei]]=[c[ei],c[4]];const sx=258,sy=145;let idx=0;for(let row=0;row<5;row++)for(let col=0;col<=row;col++){b.push({x:sx+row*14.4,y:sy+(col-row/2)*16.4,color:c[idx].c,id:idx+1,sunk:false,type:c[idx].t,stripe:c[idx].t==="stripe",counted:false});idx++;}return b;};Object.assign(gameData,{balls:ib(),turn:authUser.uid,p1Score:0,p2Score:0});}
    else if(gameType==="duel")Object.assign(gameData,{phase:"ready",p1Time:null,p2Time:null});
    else if(gameType==="assassin")Object.assign(gameData,{p1Pos:null,p2Pos:null,p1Attacks:[],p2Attacks:[],turn:authUser.uid,phase:"placing"});
    else if(gameType==="bombtag")Object.assign(gameData,{p1Pos:{r:0,c:0},p2Pos:{r:5,c:5},bombHolder:authUser.uid,bombTimer:15+Math.floor(Math.random()*10),turn:authUser.uid});
    const r=await addDoc(collection(db,"games"),gameData);const gl=GAMES_LIST.find(g=>g.key===gameType);
    await sendMsg(`Challenged you to ${gl?.label}! ${gl?.icon}`);
    await addDoc(collection(db,"notifications"),{to:ouid,from:authUser.uid,fromName:userProfile.name,type:"game_challenge",gameType,gameId:r.id,text:`${userProfile.name} challenged you to ${gl?.label}!`,read:false,createdAt:serverTimestamp()});
    setActiveGame({type:gameType,gameId:r.id,opponentName:on2});setShowGames(false);};

  const acceptGame=(n)=>{setActiveGame({type:n.gameType,gameId:n.gameId,opponentName:n.fromName});updateDoc(doc(db,"notifications",n.id),{read:true});};
  const getPartner=(convo)=>{const oid=convo.participants.find(p=>p!==authUser?.uid);const ff=friends.find(f=>f.uid===oid);if(ff)return ff;if(userCache[oid])return userCache[oid];if(oid)getDoc(doc(db,"users",oid)).then(s=>{if(s.exists())setUserCache(p=>({...p,[oid]:{uid:oid,...s.data()}}));}).catch(()=>{});return{name:"...",avatar:"👤",status:"offline"};};
  const unread=notifications.filter(n=>!n.read).length;

  if(authLoading)return(<div style={S.app}><div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"radial-gradient(circle at 50% 40%,#1a0a0a,#0a0a0f 70%)"}}><div style={{fontSize:64,animation:"pulse 1s ease-in-out infinite"}}>🔥</div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:36,fontWeight:900,letterSpacing:6,background:"linear-gradient(135deg,#FF1744,#FF5722,#FF9100)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:16}}>RIVAL</div></div><style>{`@keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.1);}}`}</style></div>);

  if(activeGame){const cl=()=>setActiveGame(null);return(<div style={S.app}>
    {activeGame.type==="tictactoe"&&<MultiTicTacToe gameId={activeGame.gameId} userId={authUser.uid} opponentName={activeGame.opponentName} onClose={cl}/>}
    {activeGame.type==="battleship"&&<MultiBattleship gameId={activeGame.gameId} userId={authUser.uid} opponentName={activeGame.opponentName} onClose={cl}/>}
    {activeGame.type==="hangman"&&<MultiHangman gameId={activeGame.gameId} userId={authUser.uid} opponentName={activeGame.opponentName} onClose={cl}/>}
    {activeGame.type==="pool"&&<MultiPool gameId={activeGame.gameId} userId={authUser.uid} opponentName={activeGame.opponentName} onClose={cl}/>}
    {activeGame.type==="duel"&&<DuelDraw gameId={activeGame.gameId} userId={authUser.uid} opponentName={activeGame.opponentName} onClose={cl}/>}
    {activeGame.type==="assassin"&&<AssassinGrid gameId={activeGame.gameId} userId={authUser.uid} opponentName={activeGame.opponentName} onClose={cl}/>}
    {activeGame.type==="bombtag"&&<BombTag gameId={activeGame.gameId} userId={authUser.uid} opponentName={activeGame.opponentName} onClose={cl}/>}
  </div>);}

  if(screen==="login")return(<div style={S.app}><div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 28px",justifyContent:"center"}}><div style={{fontSize:40}}>🔥</div><h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:28,fontWeight:800,margin:"0 0 4px",background:"linear-gradient(135deg,#FF1744,#FF5722)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RIVAL</h1><p style={{color:"#64748b",fontSize:14,margin:"0 0 32px"}}>Sign in. Talk trash. Settle it.</p>
    {authError&&<div style={{background:"rgba(239,68,68,0.1)",borderRadius:8,padding:"8px 12px",marginBottom:12,color:"#ef4444",fontSize:13}}>{authError}</div>}
    <input style={{...S.inp,marginBottom:12}} placeholder="Email" type="email" value={loginForm.email} onChange={e=>setLoginForm(f=>({...f,email:e.target.value}))}/><input style={{...S.inp,marginBottom:20}} placeholder="Password" type="password" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")handleLogin();}}/>
    <button onClick={handleLogin} style={{...S.btn,width:"100%",padding:"14px",borderRadius:14,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",fontSize:16,fontWeight:600}}>Sign In</button>
    <div style={{textAlign:"center",marginTop:20}}><span style={{color:"#64748b",fontSize:14}}>New? </span><button onClick={()=>{setScreen("signup");setAuthError("");}} style={{...S.btn,background:"none",color:"#FF1744",fontSize:14,fontWeight:600,padding:0}}>Create Account</button></div></div></div>);

  if(screen==="signup")return(<div style={S.app}><div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 28px",justifyContent:"center",overflowY:"auto"}}>
    <button onClick={()=>{setScreen("login");setAuthError("");}} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:14,padding:0,textAlign:"left",marginBottom:20}}>← Back</button>
    <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,fontWeight:800,margin:"0 0 4px",color:"#FF5722"}}>STEP UP</h1><p style={{color:"#64748b",fontSize:14,margin:"0 0 20px"}}>Lock in your account</p>
    {authError&&<div style={{background:"rgba(239,68,68,0.1)",borderRadius:8,padding:"8px 12px",marginBottom:12,color:"#ef4444",fontSize:13}}>{authError}</div>}
    <div style={{marginBottom:12}}><div style={{fontSize:11,color:"#94a3b8",marginBottom:6}}>AVATAR</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{AVATARS.map(a=>(<button key={a} onClick={()=>setSignupForm(f=>({...f,avatar:a}))} style={{...S.btn,width:40,height:40,borderRadius:10,fontSize:20,background:signupForm.avatar===a?"rgba(255,23,68,0.2)":"rgba(255,255,255,0.04)",border:signupForm.avatar===a?"2px solid #FF1744":"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>{a}</button>))}</div></div>
    <input style={{...S.inp,marginBottom:10}} placeholder="Username" value={signupForm.username} onChange={e=>setSignupForm(f=>({...f,username:e.target.value.replace(/\s/g,"")}))}/>
    <input style={{...S.inp,marginBottom:10}} placeholder="Display Name" value={signupForm.name} onChange={e=>setSignupForm(f=>({...f,name:e.target.value}))}/>
    <input style={{...S.inp,marginBottom:10}} placeholder="Phone" type="tel" value={signupForm.phone} onChange={e=>setSignupForm(f=>({...f,phone:e.target.value}))}/>
    <input style={{...S.inp,marginBottom:10}} placeholder="Email" type="email" value={signupForm.email} onChange={e=>setSignupForm(f=>({...f,email:e.target.value}))}/>
    <input style={{...S.inp,marginBottom:16}} placeholder="Password (min 6)" type="password" value={signupForm.password} onChange={e=>setSignupForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")handleSignup();}}/>
    <button onClick={handleSignup} style={{...S.btn,width:"100%",padding:"14px",borderRadius:14,background:"linear-gradient(135deg,#FF5722,#FF9100)",color:"#fff",fontSize:16,fontWeight:600,marginBottom:12}}>Create Account</button>
    {inviteCode&&<div style={{textAlign:"center",fontSize:12,color:"#22c55e"}}>🔗 Invite: {inviteCode}</div>}
  </div></div>);

  if(screen==="chat"&&activeConvoId){const convo=conversations.find(c=>c.id===activeConvoId);const partner=convo?getPartner(convo):{name:"?",avatar:"👤"};
    const resumeGame=()=>{if(!activeGameInChat)return;const ouid=convo.participants.find(p=>p!==authUser.uid);setActiveGame({type:activeGameInChat.type,gameId:activeGameInChat.id||Object.keys(activeGameInChat).find(k=>k==="id"),opponentName:partner.name});};
    return(<div style={S.app}>
      <input ref={fileRef} type="file" accept="image/*,video/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])uploadFile(e.target.files[0]);e.target.value="";}}/>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(10,10,15,0.95)"}}><button onClick={()=>{setScreen("home");setActiveConvoId(null);setShowGifs(false);setShowAttach(false);}} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button><div style={{width:38,height:38,borderRadius:19,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{partner.avatar}</div><div style={{flex:1}}><div style={{fontSize:15,fontWeight:600}}>{partner.name}</div><div style={{fontSize:11,color:partner.status==="online"?"#22c55e":"#64748b"}}>{partner.status||"offline"}</div></div><button onClick={()=>setShowGames(!showGames)} style={{...S.btn,background:"rgba(255,255,255,0.06)",borderRadius:20,padding:"6px 12px",color:"#FF1744",fontSize:13,fontWeight:600}}>🎮</button></div>
      {activeGameInChat&&<button onClick={()=>{const ouid=convo?.participants.find(p=>p!==authUser.uid);setActiveGame({type:activeGameInChat.type,gameId:activeGameInChat.id,opponentName:partner.name});}} style={{...S.btn,width:"100%",padding:"10px 16px",background:"linear-gradient(135deg,rgba(213,0,0,0.15),rgba(255,87,34,0.1))",borderBottom:"1px solid rgba(255,255,255,0.06)",color:"#FF1744",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"'Orbitron',sans-serif"}}>{GAMES_LIST.find(g=>g.key===activeGameInChat.type)?.icon} RESUME {GAMES_LIST.find(g=>g.key===activeGameInChat.type)?.label?.toUpperCase()} →</button>}
      {showGames&&<div style={{background:"rgba(26,10,10,0.95)",borderBottom:"1px solid rgba(255,255,255,0.08)",padding:"10px 6px",display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap"}}>{GAMES_LIST.map(g=>(<button key={g.key} onClick={()=>challengeGame(g.key)} style={{...S.btn,display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"6px 8px",color:"#e2e8f0",fontSize:9,minWidth:48}}><span style={{fontSize:18}}>{g.icon}</span><span style={{fontWeight:600}}>{g.label}</span></button>))}</div>}
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>{messages.map(m=>{const me=m.from===authUser.uid;return(<div key={m.id} style={{display:"flex",justifyContent:me?"flex-end":"flex-start"}}><div style={{maxWidth:"78%",padding:m.type==="photo"||m.type==="video"||m.type==="gif"?4:"10px 14px",borderRadius:me?"18px 18px 4px 18px":"18px 18px 18px 4px",background:me?"linear-gradient(135deg,#D50000,#7c3aed)":"rgba(255,255,255,0.06)"}}>
        {m.type==="photo"?<img src={m.text} alt="" style={{maxWidth:240,borderRadius:14,display:"block"}} onClick={()=>window.open(m.text,"_blank")}/>
        :m.type==="video"?<video src={m.text} controls style={{maxWidth:240,borderRadius:14,display:"block"}}/>
        :m.type==="gif"?<img src={m.text} alt="GIF" style={{maxWidth:200,borderRadius:14,display:"block"}}/>
        :<div style={{fontSize:15,lineHeight:1.4,wordBreak:"break-word"}}>{m.text}</div>}
        <div style={{fontSize:10,color:me?"rgba(255,255,255,0.5)":"#64748b",marginTop:4,textAlign:"right",padding:m.type!=="text"?"4px 8px 2px":0}}>{m.timestamp?.toDate?.()?.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})||""}</div></div></div>);})}<div ref={chatEndRef}/></div>
      {showEmoji&&<div style={{maxHeight:140,overflowY:"auto",padding:6,display:"flex",flexWrap:"wrap",gap:2,background:"rgba(15,15,25,0.98)",borderTop:"1px solid rgba(255,255,255,0.06)"}}>{EMOJI_LIST.map(e=>(<button key={e} onClick={()=>setMsgText(m=>m+e)} style={{...S.btn,fontSize:22,width:36,height:36,background:"transparent",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>{e}</button>))}</div>}
      {showGifs&&<div style={{maxHeight:220,overflowY:"auto",padding:8,background:"rgba(15,15,25,0.98)",borderTop:"1px solid rgba(255,255,255,0.06)"}}>{Object.entries(MEME_GIFS).map(([cat,gifs])=>(<div key={cat}><div style={{fontSize:11,color:"#FF1744",fontWeight:700,padding:"6px 4px",letterSpacing:1}}>{cat}</div><div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8}}>{gifs.map((g,i)=>(<img key={i} src={g} alt="" onClick={()=>{sendMsg(g,"gif");setShowGifs(false);}} style={{height:80,borderRadius:8,cursor:"pointer",flexShrink:0}} loading="lazy"/>))}</div></div>))}</div>}
      {showAttach&&<div style={{padding:12,display:"flex",gap:12,justifyContent:"center",background:"rgba(15,15,25,0.98)",borderTop:"1px solid rgba(255,255,255,0.06)"}}>{[{i:"📷",l:"Photo",a:"image/*"},{i:"🎥",l:"Video",a:"video/*"}].map(a=>(<button key={a.l} onClick={()=>{fileRef.current.accept=a.a;fileRef.current.click();setShowAttach(false);}} style={{...S.btn,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 24px",color:"#e2e8f0",fontSize:11}}><span style={{fontSize:24}}>{a.i}</span><span>{a.l}</span></button>))}</div>}
      {uploading&&<div style={{padding:"8px 16px",textAlign:"center",color:"#FFD700",fontSize:12,fontFamily:"'Orbitron',sans-serif"}}>Uploading...</div>}
      <div style={{display:"flex",alignItems:"center",gap:5,padding:"8px 10px 16px",borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(10,10,15,0.95)"}}>
        <button onClick={()=>{setShowAttach(!showAttach);setShowEmoji(false);setShowGifs(false);}} style={{...S.btn,background:"none",fontSize:18,color:"#64748b",padding:4}}>+</button>
        <button onClick={()=>{setShowEmoji(!showEmoji);setShowGifs(false);setShowAttach(false);}} style={{...S.btn,background:"none",fontSize:18,color:"#64748b",padding:4}}>😊</button>
        <button onClick={()=>{setShowGifs(!showGifs);setShowEmoji(false);setShowAttach(false);}} style={{...S.btn,background:"none",fontSize:10,color:"#64748b",padding:"4px 5px",fontWeight:800,border:"1.5px solid #475569",borderRadius:4,lineHeight:1}}>GIF</button>
        <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMsg(msgText);}} placeholder="Message..." style={{...S.inp,flex:1,borderRadius:20,padding:"10px 14px",fontSize:14}}/>
        <button onClick={()=>sendMsg(msgText)} style={{...S.btn,width:36,height:36,borderRadius:18,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
      </div>
    </div>);}

  if(screen==="findFriends")return(<div style={S.app}><div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={()=>setScreen("home")} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button><h2 style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,margin:0}}>Add Friends</h2></div>
    <div style={{padding:20,flex:1,overflowY:"auto"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:11,color:"#94a3b8",marginBottom:6,fontWeight:600,fontFamily:"'Orbitron',sans-serif"}}>FIND PLAYERS</div><div style={{display:"flex",gap:8}}><input style={{...S.inp,flex:1}} placeholder="Username, email, or phone" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")searchForFriend();}}/><button onClick={searchForFriend} style={{...S.btn,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",padding:"0 16px",borderRadius:12,fontSize:14,fontWeight:600}}>Go</button></div>
        {searchError&&<div style={{color:"#ef4444",fontSize:13,marginTop:6}}>{searchError}</div>}
        {searchResults.map(r=>(<div key={r.uid} style={{marginTop:10,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:14,display:"flex",alignItems:"center",gap:12}}><div style={{width:44,height:44,borderRadius:22,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{r.avatar}</div><div style={{flex:1}}><div style={{fontWeight:600}}>{r.name}</div><div style={{fontSize:12,color:"#FF1744"}}>@{r.username}</div></div>{userProfile?.friends?.includes(r.uid)?<div style={{color:"#22c55e",fontSize:12,fontWeight:600}}>✓</div>:<button onClick={()=>addFriend(r.uid)} style={{...S.btn,background:"#22c55e",color:"#fff",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600}}>Add</button>}</div>))}</div>
      <div style={{marginBottom:20}}><button onClick={shareInvite} style={{...S.btn,width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#FF5722,#FF9100)",color:"#fff",fontSize:15,fontWeight:600}}>📤 Share Invite Link</button><div style={{textAlign:"center",marginTop:6,fontSize:11,color:"#64748b"}}>Code: <span style={{color:"#FF1744",fontFamily:"'Orbitron',sans-serif"}}>{userProfile?.inviteCode}</span></div></div>
      <div><div style={{fontSize:11,color:"#94a3b8",marginBottom:6,fontWeight:600,fontFamily:"'Orbitron',sans-serif"}}>FRIENDS ({friends.length})</div>{friends.map(f=>(<div key={f.uid} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div style={{width:40,height:40,borderRadius:20,background:"#1f2937",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{f.avatar}</div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{f.name}</div></div><button onClick={()=>startConvo(f.uid)} style={{...S.btn,background:"rgba(213,0,0,0.1)",color:"#FF1744",padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600}}>Chat</button></div>))}{!friends.length&&<div style={{textAlign:"center",padding:20,color:"#475569",fontSize:13}}>No friends yet</div>}</div>
    </div></div>);

  if(screen==="notifications")return(<div style={S.app}><div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={()=>setScreen("home")} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button><h2 style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,margin:0}}>Notifications</h2>{unread>0&&<span style={{background:"#D50000",color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700}}>{unread}</span>}</div>
    <div style={{flex:1,overflowY:"auto"}}>{notifications.map(n=>(<div key={n.id} onClick={()=>{if(n.type==="game_challenge"&&n.gameId)acceptGame(n);else updateDoc(doc(db,"notifications",n.id),{read:true});}} style={{padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,0.04)",background:n.read?"transparent":"rgba(213,0,0,0.05)",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>{!n.read&&<div style={{width:8,height:8,borderRadius:4,background:"#D50000",flexShrink:0}}/>}<div style={{flex:1}}><div style={{fontSize:14}}>{n.text}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{n.createdAt?.toDate?.()?.toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})||""}</div>{n.type==="game_challenge"&&!n.read&&<div style={{marginTop:4}}><span style={{background:"#22c55e",color:"#fff",padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600}}>TAP TO PLAY</span></div>}</div></div>))}{!notifications.length&&<div style={{textAlign:"center",padding:48,color:"#475569"}}><div style={{fontSize:36}}>🔔</div><div style={{marginTop:8}}>No notifications</div></div>}</div></div>);

  if(screen==="profile")return(<div style={S.app}><div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={()=>setScreen("home")} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button><h2 style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,margin:0}}>Profile</h2></div>
    <div style={{flex:1,overflowY:"auto",padding:24}}><div style={{textAlign:"center",marginBottom:24}}><div style={{width:72,height:72,borderRadius:36,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 10px"}}>{userProfile?.avatar}</div><h3 style={{margin:0,fontSize:20,fontWeight:700}}>{userProfile?.name}</h3><p style={{margin:"2px 0",color:"#FF1744",fontSize:14,fontWeight:600}}>@{userProfile?.username}</p><p style={{margin:0,color:"#64748b",fontSize:13}}>{authUser?.email}</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>{[{l:"Friends",v:userProfile?.friends?.length||0},{l:"Convos",v:conversations.length},{l:"Games",v:"7"}].map(st=>(<div key={st.l} style={{textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"12px 8px"}}><div style={{fontSize:20,fontWeight:700,color:"#FF1744"}}>{st.v}</div><div style={{fontSize:10,color:"#64748b"}}>{st.l}</div></div>))}</div>
      <button onClick={shareInvite} style={{...S.btn,width:"100%",padding:12,borderRadius:14,background:"linear-gradient(135deg,#FF5722,#FF9100)",color:"#fff",fontSize:15,fontWeight:600,marginBottom:10}}>📤 Invite</button>
      <button onClick={handleLogout} style={{...S.btn,width:"100%",padding:12,borderRadius:14,background:"rgba(239,68,68,0.1)",color:"#ef4444",fontSize:15,fontWeight:600}}>Sign Out</button>
    </div></div>);

  return(<div style={S.app}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px 12px"}}><h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,fontWeight:800,margin:0,background:"linear-gradient(135deg,#FF1744,#FF5722)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RIVAL</h1><div style={{display:"flex",gap:8}}><button onClick={()=>setScreen("findFriends")} style={{...S.btn,width:40,height:40,borderRadius:20,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",fontSize:18,color:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center"}}>👥</button><button onClick={()=>setScreen("notifications")} style={{...S.btn,width:40,height:40,borderRadius:20,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",fontSize:18,color:"#e2e8f0",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>🔔{unread>0&&<div style={{position:"absolute",top:-2,right:-2,width:18,height:18,borderRadius:9,background:"#ef4444",fontSize:10,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</div>}</button><button onClick={()=>setScreen("profile")} style={{...S.btn,width:40,height:40,borderRadius:20,background:"linear-gradient(135deg,#D50000,#FF1744)",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{userProfile?.avatar}</button></div></div>
    <div style={{display:"flex",padding:"0 20px 12px"}}>{["chats","games"].map(t=>(<button key={t} onClick={()=>setTab(t)} style={{...S.btn,flex:1,padding:"8px 0",fontSize:13,fontWeight:600,color:tab===t?"#FF1744":"#64748b",background:"none",borderBottom:tab===t?"2px solid #FF1744":"2px solid transparent",textTransform:"uppercase",letterSpacing:1}}>{t==="games"?"🎮 Games":"💬 Chats"}</button>))}</div>
    {tab==="games"&&<div style={{flex:1,overflowY:"auto",padding:"8px 20px"}}><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>{GAMES_LIST.map(g=>(<button key={g.key} onClick={()=>{if(!friends.length){setScreen("findFriends");return;}startConvo(friends[0].uid).then(()=>setShowGames(true));}} style={{...S.btn,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"16px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:"#e2e8f0"}}><div style={{fontSize:32}}>{g.icon}</div><div style={{fontWeight:700,fontSize:13}}>{g.label}</div><div style={{fontSize:10,color:"#64748b"}}>{g.desc}</div><div style={{fontSize:9,color:"#22c55e",fontWeight:700,fontFamily:"'Orbitron',sans-serif"}}>MULTIPLAYER</div></button>))}</div>{!friends.length&&<div style={{textAlign:"center",padding:20}}><button onClick={()=>setScreen("findFriends")} style={{...S.btn,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",padding:"10px 24px",borderRadius:12,fontSize:14}}>👥 Add Friends First</button></div>}</div>}
    {tab==="chats"&&<>{friends.filter(f=>f.status==="online").length>0&&<div style={{padding:"0 20px 10px"}}><div style={{display:"flex",gap:12,overflowX:"auto"}}>{friends.filter(f=>f.status==="online").map(f=>(<button key={f.uid} onClick={()=>startConvo(f.uid)} style={{...S.btn,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",padding:0,minWidth:52}}><div style={{width:44,height:44,borderRadius:22,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,position:"relative"}}>{f.avatar}<div style={{position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:5,background:"#22c55e",border:"2px solid #0a0a0f"}}/></div><span style={{fontSize:10,color:"#94a3b8"}}>{f.name.split(" ")[0]}</span></button>))}</div></div>}
      <div style={{flex:1,overflowY:"auto"}}>{conversations.map(c=>{const p=getPartner(c);return(<div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,0.03)",position:"relative"}}>
        <button onClick={()=>{setActiveConvoId(c.id);setScreen("chat");}} style={{...S.btn,flex:1,display:"flex",alignItems:"center",gap:12,background:"none",textAlign:"left",padding:0}}>
          <div style={{width:48,height:48,borderRadius:24,background:"#1f2937",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,position:"relative"}}>{p.avatar}{p.status==="online"&&<div style={{position:"absolute",bottom:1,right:1,width:10,height:10,borderRadius:5,background:"#22c55e",border:"2px solid #0a0a0f"}}/>}</div>
          <div style={{flex:1,overflow:"hidden"}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:15,fontWeight:600}}>{p.name}</span><span style={{fontSize:11,color:"#64748b"}}>{c.lastMessageTime?.toDate?.()?.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})||""}</span></div><div style={{fontSize:13,color:"#64748b",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.lastMessage||"Start chatting!"}</div></div></button>
        <button onClick={e=>{e.stopPropagation();setConvoMenu(convoMenu===c.id?null:c.id);}} style={{...S.btn,background:"none",color:"#64748b",fontSize:16,padding:4}}>⋮</button>
        {convoMenu===c.id&&<div style={{position:"absolute",right:20,top:48,background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:4,zIndex:10}}><button onClick={()=>delConvo(c.id)} style={{...S.btn,background:"none",color:"#ef4444",fontSize:13,padding:"8px 16px"}}>🗑 Delete</button></div>}
      </div>);})}{!conversations.length&&<div style={{textAlign:"center",padding:48}}><div style={{fontSize:48}}>💬</div><div style={{fontSize:15,color:"#94a3b8",marginTop:12}}>No chats yet</div><button onClick={()=>setScreen("findFriends")} style={{...S.btn,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",padding:"12px 28px",borderRadius:14,fontSize:15,fontWeight:600,marginTop:12}}>👥 Add Friends</button></div>}</div></>}
  </div>);
}
