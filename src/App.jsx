import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "firebase/auth";
import {
  doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit, onSnapshot,
  addDoc, serverTimestamp, arrayUnion, arrayRemove, Timestamp
} from "firebase/firestore";

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const EMOJI_LIST = ["😀","😂","🤣","😍","🥰","😘","😎","🤩","🥳","😤","🔥","💀","👀","💯","❤️","💔","👍","👎","✌️","🤙","💪","🎮","🏆","⚡","🎯","🎪","🎨","🎵","🍕","🌮","🍿","🍩","🐶","🐱","🦄","🌈","☀️","🌙","⭐","🚀","💎","🎁","🃏","🎲","🧩","🏅","🥊","🔥"];
const AVATARS = ["🦊","🐺","🦁","🐲","🦅","🐻","🦈","🦉","🐯","🦖","⚡","🔥","💎","🎮"];
const HANGMAN_WORDS = ["JAVASCRIPT","GAMING","MOBILE","CHALLENGE","VICTORY","PLAYER","CHAMPION","WARRIOR","LEGEND","ARCADE"];
const HANGMAN_STAGES = [
  ()=>{},
  (ctx,w,h)=>{ctx.beginPath();ctx.arc(w/2,h*0.25,15,0,Math.PI*2);ctx.stroke();},
  (ctx,w,h)=>{ctx.beginPath();ctx.moveTo(w/2,h*0.25+15);ctx.lineTo(w/2,h*0.55);ctx.stroke();},
  (ctx,w,h)=>{ctx.beginPath();ctx.moveTo(w/2,h*0.35);ctx.lineTo(w/2-25,h*0.45);ctx.stroke();},
  (ctx,w,h)=>{ctx.beginPath();ctx.moveTo(w/2,h*0.35);ctx.lineTo(w/2+25,h*0.45);ctx.stroke();},
  (ctx,w,h)=>{ctx.beginPath();ctx.moveTo(w/2,h*0.55);ctx.lineTo(w/2-20,h*0.72);ctx.stroke();},
  (ctx,w,h)=>{ctx.beginPath();ctx.moveTo(w/2,h*0.55);ctx.lineTo(w/2+20,h*0.72);ctx.stroke();},
];

const GAMES_LIST = [
  { key:"tictactoe", icon:"❌⭕", label:"Tic Tac Toe", multi:true, desc:"Classic strategy" },
  { key:"battleship", icon:"🚢", label:"Battleship", multi:true, desc:"Naval warfare" },
  { key:"hangman", icon:"📝", label:"Hangman", multi:false, desc:"Word guessing" },
  { key:"stickfight", icon:"🥊", label:"Stick Fight", multi:false, desc:"Real-time brawl" },
  { key:"pool", icon:"🎱", label:"8 Ball Pool", multi:false, desc:"Billiards physics" },
];

const S = {
  app: { width:"100%",maxWidth:430,height:"100dvh",margin:"0 auto",background:"#0a0a0f",color:"#e2e8f0",fontFamily:"'Outfit',sans-serif",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column" },
  btn: { border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif" },
  inp: { background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 16px",color:"#e2e8f0",fontSize:15,fontFamily:"'Outfit',sans-serif",outline:"none",width:"100%",boxSizing:"border-box" },
};

// ═══════════════════════════════════════════
// UTILITY: Generate invite code
// ═══════════════════════════════════════════
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ═══════════════════════════════════════════
// MULTIPLAYER TIC TAC TOE (Firestore synced)
// ═══════════════════════════════════════════
function MultiTicTacToe({ gameId, userId, opponentName, onClose }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => {
      if (snap.exists()) { setGame({ id: snap.id, ...snap.data() }); }
      setLoading(false);
    });
    return () => unsub();
  }, [gameId]);

  const makeMove = async (index) => {
    if (!game || game.winner || game.board[index]) return;
    if (game.turn !== userId) return;
    const newBoard = [...game.board];
    const myMark = game.players[0] === userId ? "X" : "O";
    newBoard[index] = myMark;

    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    let winner = null, winLine = null;
    for (const [a,b,c] of lines) {
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        winner = userId; winLine = [a,b,c]; break;
      }
    }
    if (!winner && newBoard.every(Boolean)) winner = "draw";
    const nextTurn = game.players[0] === userId ? game.players[1] : game.players[0];

    await updateDoc(doc(db, "games", gameId), {
      board: newBoard, turn: nextTurn,
      winner: winner || null, winLine: winLine || null,
      lastMove: serverTimestamp()
    });
  };

  const rematch = async () => {
    await updateDoc(doc(db, "games", gameId), {
      board: Array(9).fill(null), turn: game.players[0],
      winner: null, winLine: null, lastMove: serverTimestamp()
    });
  };

  if (loading) return <div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{fontFamily:"'Orbitron',sans-serif",color:"#FF1744"}}>Loading game...</div></div>;
  if (!game) return <div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{color:"#ef4444"}}>Game not found</div></div>;

  const myMark = game.players[0] === userId ? "X" : "O";
  const isMyTurn = game.turn === userId;
  const iWon = game.winner === userId;
  const isDraw = game.winner === "draw";
  const isOver = !!game.winner;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#0f172a,#1a0a0a)",color:"#fff"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button>
        <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,letterSpacing:2}}>TIC TAC TOE</span>
        <div style={{width:28}} />
      </div>
      <div style={{padding:"12px 16px",textAlign:"center"}}>
        <div style={{fontSize:12,color:isMyTurn?"#FF1744":"#FF5722",fontFamily:"'Orbitron',sans-serif"}}>
          {isOver ? (isDraw ? "DRAW!" : (iWon ? "YOU WIN! 🎉" : `${opponentName} WINS!`)) : (isMyTurn ? `YOUR TURN (${myMark})` : `${opponentName?.toUpperCase()}'S TURN...`)}
        </div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,width:240,height:240}}>
          {game.board.map((cell, i) => (
            <button key={i} onClick={() => makeMove(i)} style={{
              width:76,height:76,borderRadius:12,
              background: game.winLine?.includes(i) ? (cell==="X"?"rgba(255,23,68,0.2)":"rgba(244,114,182,0.2)") : "rgba(255,255,255,0.04)",
              border: game.winLine?.includes(i) ? `2px solid ${cell==="X"?"#FF1744":"#FF5722"}` : "1px solid rgba(255,255,255,0.08)",
              color:cell==="X"?"#FF1744":"#FF5722",fontSize:32,fontWeight:800,cursor:isMyTurn&&!cell?"pointer":"default",fontFamily:"'Orbitron',sans-serif"
            }}>{cell}</button>
          ))}
        </div>
      </div>
      {isOver && (
        <div style={{padding:16,textAlign:"center"}}>
          <button onClick={rematch} style={{...S.btn,background:"linear-gradient(135deg,#FF1744,#D50000)",color:"#fff",padding:"10px 28px",borderRadius:20,fontSize:14,fontFamily:"'Orbitron',sans-serif"}}>REMATCH</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// MULTIPLAYER BATTLESHIP (Firestore synced)
// ═══════════════════════════════════════════
function MultiBattleship({ gameId, userId, opponentName, onClose }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("place"); // place, battle
  const [localBoard, setLocalBoard] = useState(Array(10).fill(null).map(() => Array(10).fill(0)));
  const [curShip, setCurShip] = useState(0);
  const [horiz, setHoriz] = useState(true);
  const [hover, setHover] = useState([]);
  const [viewBoard, setViewBoard] = useState("enemy");
  const SHIPS = [{name:"Carrier",size:5},{name:"Battleship",size:4},{name:"Cruiser",size:3},{name:"Submarine",size:3},{name:"Destroyer",size:2}];
  const GRID = 10, CS = 28;

  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setGame(data);
        const myKey = data.players[0] === userId ? "p1" : "p2";
        if (data[myKey + "Board"] && data[myKey + "Board"].length > 0) {
          // Already placed ships
          const bothPlaced = data.p1Board?.length > 0 && data.p2Board?.length > 0;
          if (bothPlaced) setPhase("battle");
          else setPhase("waiting");
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [gameId, userId]);

  const canPlace = (r, c, sz, hz, bd) => {
    for (let i = 0; i < sz; i++) { const rr = hz ? r : r + i; const cc = hz ? c + i : c; if (rr >= GRID || cc >= GRID || bd[rr][cc] !== 0) return false; }
    return true;
  };

  const placeHover = (r, c) => {
    if (curShip >= SHIPS.length) return;
    const sh = SHIPS[curShip]; const cells = []; const v = canPlace(r, c, sh.size, horiz, localBoard);
    for (let i = 0; i < sh.size; i++) { const rr = horiz ? r : r + i; const cc = horiz ? c + i : c; if (rr < GRID && cc < GRID) cells.push({ r: rr, c: cc, valid: v }); }
    setHover(cells);
  };

  const placeClick = async (r, c) => {
    if (curShip >= SHIPS.length) return;
    const sh = SHIPS[curShip]; if (!canPlace(r, c, sh.size, horiz, localBoard)) return;
    const nb = localBoard.map(r => [...r]);
    for (let i = 0; i < sh.size; i++) { const rr = horiz ? r : r + i; const cc = horiz ? c + i : c; nb[rr][cc] = 1; }
    setLocalBoard(nb);
    const ns = curShip + 1; setCurShip(ns); setHover([]);
    if (ns >= SHIPS.length) {
      const myKey = game.players[0] === userId ? "p1" : "p2";
      const totalCells = SHIPS.reduce((a, s) => a + s.size, 0);
      await updateDoc(doc(db, "games", gameId), {
        [myKey + "Board"]: nb.flat(),
        [myKey + "Cells"]: totalCells
      });
      setPhase("waiting");
    }
  };

  const attack = async (r, c) => {
    if (!game || game.turn !== userId || game.winner) return;
    const oppKey = game.players[0] === userId ? "p2" : "p1";
    const myKey = game.players[0] === userId ? "p1" : "p2";
    const oppBoard = [];
    for (let i = 0; i < GRID; i++) oppBoard.push(game[oppKey + "Board"].slice(i * GRID, (i + 1) * GRID));

    const shotsKey = myKey + "Shots";
    const shots = game[shotsKey] ? [...game[shotsKey]] : Array(100).fill(0);
    const idx = r * GRID + c;
    if (shots[idx] !== 0) return;

    const hit = oppBoard[r][c] === 1;
    shots[idx] = hit ? 2 : 1;

    const oppCellsKey = oppKey + "Cells";
    const newOppCells = hit ? (game[oppCellsKey] - 1) : game[oppCellsKey];
    const nextTurn = game.players[0] === userId ? game.players[1] : game.players[0];

    const update = {
      [shotsKey]: shots,
      [oppCellsKey]: newOppCells,
      turn: nextTurn,
      lastMove: serverTimestamp()
    };
    if (newOppCells <= 0) update.winner = userId;
    await updateDoc(doc(db, "games", gameId), update);
  };

  if (loading) return <div style={{...S.app,alignItems:"center",justifyContent:"center"}}><div style={{fontFamily:"'Orbitron',sans-serif",color:"#4FC3F7"}}>Loading...</div></div>;

  const myKey = game?.players[0] === userId ? "p1" : "p2";
  const oppKey = game?.players[0] === userId ? "p2" : "p1";
  const myShots = game?.[myKey + "Shots"] || Array(100).fill(0);
  const oppShots = game?.[oppKey + "Shots"] || Array(100).fill(0);
  const myBoard = localBoard;
  const isMyTurn = game?.turn === userId;
  const isOver = !!game?.winner;
  const iWon = game?.winner === userId;

  const renderGrid = (board2d, shots1d, onClick, isEnemy, hoverOn) => (
    <div style={{display:"inline-block"}}>
      <div style={{display:"flex",paddingLeft:CS}}>{Array.from({length:GRID},(_,i)=>(<div key={i} style={{width:CS,textAlign:"center",fontSize:9,color:"#64748b",fontFamily:"'Orbitron',sans-serif"}}>{String.fromCharCode(65+i)}</div>))}</div>
      {Array.from({length:GRID},(_,r)=>(
        <div key={r} style={{display:"flex"}}>
          <div style={{width:CS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#64748b",fontFamily:"'Orbitron',sans-serif"}}>{r+1}</div>
          {Array.from({length:GRID},(_,c)=>{
            const idx = r*GRID+c;
            const sh = shots1d[idx]; const hs = board2d[r]?.[c]===1;
            const hv = hover.find(h=>h.r===r&&h.c===c);
            let bg="rgba(255,255,255,0.03)",ct="";
            if(sh===2){bg="#DC2626";ct="💥";}else if(sh===1){bg="#1e293b";ct="•";}else if(!isEnemy&&hs)bg="rgba(99,102,241,0.25)";
            if(hv)bg=hv.valid?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)";
            return(<div key={c} onClick={()=>onClick?.(r,c)} onMouseEnter={()=>hoverOn&&placeHover(r,c)}
              style={{width:CS,height:CS,background:bg,border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:sh===2?12:10,color:sh===1?"#475569":"#fff",cursor:onClick?"crosshair":"default"}}>{ct}</div>);
          })}
        </div>
      ))}
    </div>
  );

  const empty2d = Array(GRID).fill(null).map(()=>Array(GRID).fill(0));

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#0a1628,#0f172a)",color:"#fff"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:"1px solid #1e293b"}}>
        <button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button>
        <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:13,letterSpacing:2,color:"#4FC3F7"}}>🚢 BATTLESHIP</span>
        <div style={{width:28}}/>
      </div>

      {phase==="place"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
        <div style={{fontSize:11,color:"#94a3b8",fontFamily:"'Orbitron',sans-serif"}}>{curShip<SHIPS.length?`Place ${SHIPS[curShip].name} (${SHIPS[curShip].size})`:"Submitting..."}</div>
        <button onClick={()=>setHoriz(!horiz)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 14px",color:"#4FC3F7",fontSize:11,cursor:"pointer",fontFamily:"'Orbitron',sans-serif"}}>{horiz?"⟷ HORIZONTAL":"⟳ VERTICAL"}</button>
        {renderGrid(myBoard, Array(100).fill(0), placeClick, false, true)}
      </div>}

      {phase==="waiting"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
        <div style={{fontSize:32}}>⏳</div>
        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"#4FC3F7"}}>SHIPS PLACED!</div>
        <div style={{fontSize:13,color:"#94a3b8"}}>Waiting for {opponentName} to place ships...</div>
      </div>}

      {phase==="battle"&&<>
        <div style={{display:"flex",justifyContent:"space-around",padding:"6px 12px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#4FC3F7",fontFamily:"'Orbitron',sans-serif"}}>YOUR SHIPS</div><div style={{fontSize:16,fontWeight:700}}>{game?.[myKey+"Cells"]||0}</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:9,color:"#FF8A65",fontFamily:"'Orbitron',sans-serif"}}>ENEMY SHIPS</div><div style={{fontSize:16,fontWeight:700}}>{game?.[oppKey+"Cells"]||0}</div></div>
        </div>
        <div style={{display:"flex",padding:"8px 16px 0"}}>
          {["enemy","mine"].map(v=>(<button key={v} onClick={()=>setViewBoard(v)} style={{flex:1,padding:"6px",fontSize:11,fontWeight:600,color:viewBoard===v?"#4FC3F7":"#475569",background:"none",border:"none",cursor:"pointer",borderBottom:viewBoard===v?"2px solid #4FC3F7":"2px solid transparent",fontFamily:"'Orbitron',sans-serif"}}>{v==="enemy"?"ATTACK":"YOUR FLEET"}</button>))}
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {viewBoard==="enemy" && renderGrid(empty2d, myShots, isMyTurn&&!isOver?attack:null, true, false)}
          {viewBoard==="mine" && renderGrid(myBoard, oppShots, null, false, false)}
        </div>
        <div style={{padding:"8px 16px 16px",textAlign:"center"}}>
          <div style={{fontSize:12,color:isMyTurn?"#4FC3F7":"#FF8A65",fontFamily:"'Orbitron',sans-serif"}}>
            {isOver ? (iWon?"VICTORY! 🏆":`${opponentName} wins! 💀`) : (isMyTurn?"Tap enemy grid to fire":`${opponentName} is aiming...`)}
          </div>
        </div>
      </>}

      {isOver&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.85)",zIndex:10}}>
        <div style={{fontSize:48,marginBottom:8}}>🚢</div>
        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:22,color:iWon?"#4FC3F7":"#FF8A65"}}>{iWon?"VICTORY!":"DEFEATED!"}</div>
        <button onClick={onClose} style={{marginTop:16,...S.btn,background:"linear-gradient(135deg,#4FC3F7,#0288D1)",color:"#fff",padding:"12px 28px",borderRadius:24,fontSize:14,fontFamily:"'Orbitron',sans-serif"}}>BACK TO CHAT</button>
      </div>}
    </div>
  );
}


// ═══════════════════════════════════════════
// SOLO GAMES (Hangman, Stick Fight, Pool)
// Keep these as single-player with AI
// ═══════════════════════════════════════════
function Hangman({ onClose }) {
  const [word, setWord] = useState(() => HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)]);
  const [guessed, setGuessed] = useState(new Set()); const [mistakes, setMistakes] = useState(0); const canvasRef = useRef(null);
  const mx = 6; const wl = word.split(""); const isWon = wl.every(l => guessed.has(l)); const isLost = mistakes >= mx;
  useEffect(() => {
    const c = canvasRef.current; if (!c) return; const ctx = c.getContext("2d"); const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h); ctx.strokeStyle = "#475569"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, h - 15); ctx.lineTo(w - 20, h - 15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(50, h - 15); ctx.lineTo(50, 25); ctx.lineTo(w / 2, 25); ctx.lineTo(w / 2, 45); ctx.stroke();
    ctx.strokeStyle = isLost ? "#FF1744" : "#e2e8f0"; ctx.lineWidth = 2.5;
    for (let i = 1; i <= mistakes; i++) HANGMAN_STAGES[i](ctx, w, h);
  }, [mistakes, isLost]);
  const guess = l => { if (guessed.has(l) || isWon || isLost) return; const ng = new Set(guessed); ng.add(l); setGuessed(ng); if (!word.includes(l)) setMistakes(m => m + 1); };
  const nw = () => { setWord(HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)]); setGuessed(new Set()); setMistakes(0); };
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"linear-gradient(180deg,#0c0a09,#1c1917)",color:"#fff"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><button onClick={onClose} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20}}>✕</button><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,letterSpacing:2}}>HANGMAN</span><div style={{width:28}}/></div>
      <div style={{padding:"8px 16px",display:"flex",justifyContent:"center",gap:4}}>{Array.from({length:mx},(_,i)=>(<div key={i} style={{width:8,height:8,borderRadius:4,background:i<mistakes?"#FF1744":"#334155"}}/>))}</div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
        <canvas ref={canvasRef} width={180} height={180} style={{borderRadius:12,background:"rgba(255,255,255,0.02)"}} />
        <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",padding:"0 16px"}}>{wl.map((l, i) => (<div key={i} style={{width:28,height:36,borderBottom:`2px solid ${guessed.has(l)?"#22c55e":"#475569"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,fontFamily:"'Orbitron',sans-serif",color:(isLost && !guessed.has(l))?"#FF1744":"#e2e8f0"}}>{guessed.has(l) || isLost ? l : ""}</div>))}</div>
        {(isWon || isLost) && <div style={{textAlign:"center"}}><div style={{fontSize:18,fontFamily:"'Orbitron',sans-serif",color:isWon?"#22c55e":"#FF1744",marginBottom:12}}>{isWon?"YOU GOT IT! 🎉":"GAME OVER 💀"}</div><button onClick={nw} style={{...S.btn,background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",padding:"10px 28px",borderRadius:20,fontSize:14,fontFamily:"'Orbitron',sans-serif"}}>NEW WORD</button></div>}
      </div>
      <div style={{padding:"8px 8px 16px",display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4}}>{"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => { const ig = guessed.has(l), ic = ig && word.includes(l), iw = ig && !word.includes(l); return (<button key={l} onClick={() => guess(l)} disabled={ig || isWon || isLost} style={{width:32,height:36,borderRadius:6,background:ic?"#22c55e":iw?"#7f1d1d":"rgba(255,255,255,0.06)",border:"none",color:ig?"rgba(255,255,255,0.3)":"#e2e8f0",fontSize:13,fontWeight:700,cursor:ig?"default":"pointer",fontFamily:"'Orbitron',sans-serif",opacity:ig?0.5:1}}>{l}</button>); })}</div>
    </div>
  );
}


// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function RivalApp() {
  // Auth state
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Navigation
  const [screen, setScreen] = useState("login"); // login, signup, home, chat, notifications, profile, findFriends
  const [tab, setTab] = useState("chats"); // chats, games, saved

  // Chat state
  const [conversations, setConversations] = useState([]);
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGames, setShowGames] = useState(false);

  // Game state
  const [activeGame, setActiveGame] = useState(null); // { type, gameId, opponentName }

  // Friends & search
  const [friends, setFriends] = useState([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Forms
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", avatar: "🦊" });
  const [authError, setAuthError] = useState("");

  // Invite
  const [inviteCode, setInviteCode] = useState("");

  const chatEndRef = useRef(null);

  // ─── Load fonts ───
  useEffect(() => {
    const l = document.createElement("link");
    l.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700&display=swap";
    l.rel = "stylesheet"; document.head.appendChild(l);
  }, []);

  // ─── Auth listener ───
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile({ uid: user.uid, ...userDoc.data() });
          // Set online
          await updateDoc(doc(db, "users", user.uid), { status: "online", lastSeen: serverTimestamp() });
        }
        setScreen("home");
      } else {
        setUserProfile(null);
        setScreen("login");
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Load conversations ───
  useEffect(() => {
    if (!authUser) return;
    const q = query(collection(db, "conversations"), where("participants", "array-contains", authUser.uid), orderBy("lastMessageTime", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const convos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConversations(convos);
    });
    return () => unsub();
  }, [authUser]);

  // ─── Load messages for active convo ───
  useEffect(() => {
    if (!activeConvoId) return;
    const q = query(collection(db, "conversations", activeConvoId, "messages"), orderBy("timestamp", "asc"), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [activeConvoId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ─── Load friends ───
  useEffect(() => {
    if (!userProfile?.friends?.length) { setFriends([]); return; }
    const loadFriends = async () => {
      const fList = [];
      for (const fid of userProfile.friends) {
        const fDoc = await getDoc(doc(db, "users", fid));
        if (fDoc.exists()) fList.push({ uid: fid, ...fDoc.data() });
      }
      setFriends(fList);
    };
    loadFriends();
  }, [userProfile?.friends]);

  // ─── Load notifications (game invites, friend requests) ───
  useEffect(() => {
    if (!authUser) return;
    const q = query(collection(db, "notifications"), where("to", "==", authUser.uid), orderBy("createdAt", "desc"), limit(30));
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [authUser]);

  // ─── Auth handlers ───
  const handleSignup = async () => {
    setAuthError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, signupForm.email, signupForm.password);
      await setDoc(doc(db, "users", cred.user.uid), {
        name: signupForm.name || "Player",
        email: signupForm.email.toLowerCase(),
        avatar: signupForm.avatar,
        status: "online",
        friends: [],
        createdAt: serverTimestamp(),
        inviteCode: generateInviteCode()
      });
    } catch (e) { setAuthError(e.message.replace("Firebase: ", "")); }
  };

  const handleLogin = async () => {
    setAuthError("");
    try { await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password); }
    catch (e) { setAuthError(e.message.replace("Firebase: ", "")); }
  };

  const handleLogout = async () => {
    if (authUser) await updateDoc(doc(db, "users", authUser.uid), { status: "offline", lastSeen: serverTimestamp() });
    await signOut(auth);
  };

  // ─── Friend search by email ───
  const searchForFriend = async () => {
    setSearchResult(null); setSearchError("");
    if (!searchEmail.trim()) return;
    const q = query(collection(db, "users"), where("email", "==", searchEmail.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) { setSearchError("No user found with that email"); return; }
    const found = { uid: snap.docs[0].id, ...snap.docs[0].data() };
    if (found.uid === authUser.uid) { setSearchError("That's you!"); return; }
    setSearchResult(found);
  };

  const addFriend = async (friendUid) => {
    await updateDoc(doc(db, "users", authUser.uid), { friends: arrayUnion(friendUid) });
    await updateDoc(doc(db, "users", friendUid), { friends: arrayUnion(authUser.uid) });
    // Send notification
    await addDoc(collection(db, "notifications"), {
      to: friendUid, from: authUser.uid, fromName: userProfile.name, fromAvatar: userProfile.avatar,
      type: "friend_added", text: `${userProfile.name} added you as a friend!`,
      read: false, createdAt: serverTimestamp()
    });
    setUserProfile(prev => ({ ...prev, friends: [...(prev.friends || []), friendUid] }));
    setSearchResult(null); setSearchEmail("");
  };

  // ─── Start conversation ───
  const startConversation = async (friendUid) => {
    // Check if convo already exists
    const existing = conversations.find(c => c.participants.includes(friendUid) && c.participants.length === 2);
    if (existing) { setActiveConvoId(existing.id); setScreen("chat"); return; }
    const convoRef = await addDoc(collection(db, "conversations"), {
      participants: [authUser.uid, friendUid],
      lastMessage: "", lastMessageTime: serverTimestamp(), createdAt: serverTimestamp()
    });
    setActiveConvoId(convoRef.id); setScreen("chat");
  };

  // ─── Send message ───
  const sendMessage = async (text, type = "text") => {
    if (!text.trim() || !activeConvoId) return;
    await addDoc(collection(db, "conversations", activeConvoId, "messages"), {
      from: authUser.uid, text, type, timestamp: serverTimestamp()
    });
    await updateDoc(doc(db, "conversations", activeConvoId), {
      lastMessage: type === "text" ? text : "🎮 Game challenge", lastMessageTime: serverTimestamp()
    });
    setMsgText(""); setShowEmoji(false);
  };

  // ─── Challenge to game ───
  const challengeToGame = async (gameType) => {
    const convo = conversations.find(c => c.id === activeConvoId);
    if (!convo) return;
    const opponentUid = convo.participants.find(p => p !== authUser.uid);
    const opponentDoc = await getDoc(doc(db, "users", opponentUid));
    const oppName = opponentDoc.exists() ? opponentDoc.data().name : "Opponent";

    if (gameType === "tictactoe") {
      const gameRef = await addDoc(collection(db, "games"), {
        type: "tictactoe", players: [authUser.uid, opponentUid],
        board: Array(9).fill(null), turn: authUser.uid,
        winner: null, winLine: null, createdAt: serverTimestamp()
      });
      await sendMessage(`Challenged you to Tic Tac Toe! ❌⭕`, "text");
      await addDoc(collection(db, "notifications"), {
        to: opponentUid, from: authUser.uid, fromName: userProfile.name,
        type: "game_challenge", gameType: "tictactoe", gameId: gameRef.id,
        text: `${userProfile.name} challenged you to Tic Tac Toe!`,
        read: false, createdAt: serverTimestamp()
      });
      setActiveGame({ type: "tictactoe", gameId: gameRef.id, opponentName: oppName });
    } else if (gameType === "battleship") {
      const gameRef = await addDoc(collection(db, "games"), {
        type: "battleship", players: [authUser.uid, opponentUid],
        p1Board: [], p2Board: [], p1Shots: Array(100).fill(0), p2Shots: Array(100).fill(0),
        p1Cells: 0, p2Cells: 0, turn: authUser.uid,
        winner: null, createdAt: serverTimestamp()
      });
      await sendMessage(`Challenged you to Battleship! 🚢`, "text");
      await addDoc(collection(db, "notifications"), {
        to: opponentUid, from: authUser.uid, fromName: userProfile.name,
        type: "game_challenge", gameType: "battleship", gameId: gameRef.id,
        text: `${userProfile.name} challenged you to Battleship!`,
        read: false, createdAt: serverTimestamp()
      });
      setActiveGame({ type: "battleship", gameId: gameRef.id, opponentName: oppName });
    } else {
      // Solo games
      setActiveGame({ type: gameType, gameId: null, opponentName: oppName });
      await sendMessage(`Started a ${GAMES_LIST.find(g=>g.key===gameType)?.label} game! 🎮`, "text");
    }
    setShowGames(false);
  };

  // ─── Share / Invite ───
  const shareInvite = async () => {
    const code = userProfile?.inviteCode || "RIVAL";
    const url = window.location.origin + "?invite=" + code;
    if (navigator.share) {
      try { await navigator.share({ title: "Join me on RIVAL!", text: `Yo, think you can beat me? Get on RIVAL and prove it:`, url }); }
      catch (e) { }
    } else {
      navigator.clipboard.writeText(url);
      alert("Invite link copied!");
    }
  };

  // ─── Accept game from notification ───
  const acceptGame = (notif) => {
    setActiveGame({ type: notif.gameType, gameId: notif.gameId, opponentName: notif.fromName });
    updateDoc(doc(db, "notifications", notif.id), { read: true });
  };

  // ─── Helper to get other user in convo ───
  const getConvoPartner = (convo) => {
    const otherId = convo.participants.find(p => p !== authUser?.uid);
    return friends.find(f => f.uid === otherId) || { name: "Unknown", avatar: "👤", status: "offline" };
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // ─── Loading ───
  if (authLoading) return (
    <div style={S.app}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"radial-gradient(circle at 50% 40%, #1a0a0a 0%, #0a0a0f 70%)"}}>
        <div style={{fontSize:64,marginBottom:16,animation:"pulse 1s ease-in-out infinite"}}>🔥</div>
        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:36,fontWeight:900,letterSpacing:6,background:"linear-gradient(135deg,#FF1744,#FF5722,#FF9100)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RIVAL</div>
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.1);}}`}</style>
    </div>
  );

  // ─── Active Game ───
  if (activeGame) {
    const closeGame = () => setActiveGame(null);
    return (
      <div style={S.app}>
        {activeGame.type === "tictactoe" && <MultiTicTacToe gameId={activeGame.gameId} userId={authUser.uid} opponentName={activeGame.opponentName} onClose={closeGame} />}
        {activeGame.type === "battleship" && <MultiBattleship gameId={activeGame.gameId} userId={authUser.uid} opponentName={activeGame.opponentName} onClose={closeGame} />}
        {activeGame.type === "hangman" && <Hangman onClose={closeGame} />}
        {(activeGame.type === "stickfight" || activeGame.type === "pool") && (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
            <div style={{fontSize:48}}>🎮</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:16,color:"#FF1744"}}>Coming Soon!</div>
            <div style={{fontSize:13,color:"#94a3b8"}}>Multiplayer {GAMES_LIST.find(g=>g.key===activeGame.type)?.label} is in development</div>
            <button onClick={closeGame} style={{...S.btn,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",padding:"10px 28px",borderRadius:20,marginTop:8,fontSize:14}}>Back</button>
          </div>
        )}
      </div>
    );
  }

  // ─── LOGIN ───
  if (screen === "login") return (
    <div style={S.app}>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 28px",justifyContent:"center",background:"radial-gradient(ellipse at 30% 20%, rgba(213,0,0,0.08) 0%, transparent 60%)"}}>
        <div style={{fontSize:40,marginBottom:4}}>🔥</div>
        <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:28,fontWeight:800,margin:"0 0 4px",background:"linear-gradient(135deg,#FF1744,#FF5722)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RIVAL</h1>
        <p style={{color:"#64748b",fontSize:14,margin:"0 0 32px"}}>Sign in. Talk trash. Settle it.</p>
        {authError && <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:12,color:"#ef4444",fontSize:13}}>{authError}</div>}
        <input style={{...S.inp,marginBottom:12}} placeholder="Email" type="email" value={loginForm.email} onChange={e => setLoginForm(f => ({...f, email: e.target.value }))} />
        <input style={{...S.inp,marginBottom:20}} placeholder="Password" type="password" value={loginForm.password} onChange={e => setLoginForm(f => ({...f, password: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleLogin(); }} />
        <button onClick={handleLogin} style={{...S.btn,width:"100%",padding:"14px",borderRadius:14,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",fontSize:16,fontWeight:600}}>Sign In</button>
        <div style={{textAlign:"center",marginTop:20}}><span style={{color:"#64748b",fontSize:14}}>New here? </span><button onClick={() => { setScreen("signup"); setAuthError(""); }} style={{...S.btn,background:"none",color:"#FF1744",fontSize:14,fontWeight:600,padding:0}}>Create Account</button></div>
      </div>
    </div>
  );

  // ─── SIGNUP ───
  if (screen === "signup") return (
    <div style={S.app}>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 28px",justifyContent:"center",overflowY:"auto",background:"radial-gradient(ellipse at 70% 80%, rgba(255,87,34,0.06) 0%, transparent 60%)"}}>
        <button onClick={() => { setScreen("login"); setAuthError(""); }} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:14,padding:0,textAlign:"left",marginBottom:20}}>← Back</button>
        <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,fontWeight:800,margin:"0 0 4px",color:"#FF5722"}}>STEP UP</h1>
        <p style={{color:"#64748b",fontSize:14,margin:"0 0 24px"}}>Lock in your account</p>
        {authError && <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:12,color:"#ef4444",fontSize:13}}>{authError}</div>}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:8,fontWeight:500}}>CHOOSE YOUR AVATAR</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{AVATARS.map(a => (
            <button key={a} onClick={() => setSignupForm(f => ({...f, avatar: a }))} style={{...S.btn,width:44,height:44,borderRadius:12,fontSize:22,background:signupForm.avatar === a ? "rgba(255,23,68,0.2)" : "rgba(255,255,255,0.04)",border:signupForm.avatar === a ? "2px solid #FF1744" : "1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>{a}</button>
          ))}</div>
        </div>
        <input style={{...S.inp,marginBottom:12}} placeholder="Display Name" value={signupForm.name} onChange={e => setSignupForm(f => ({...f, name: e.target.value }))} />
        <input style={{...S.inp,marginBottom:12}} placeholder="Email" type="email" value={signupForm.email} onChange={e => setSignupForm(f => ({...f, email: e.target.value }))} />
        <input style={{...S.inp,marginBottom:20}} placeholder="Password (min 6 chars)" type="password" value={signupForm.password} onChange={e => setSignupForm(f => ({...f, password: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleSignup(); }} />
        <button onClick={handleSignup} style={{...S.btn,width:"100%",padding:"14px",borderRadius:14,background:"linear-gradient(135deg,#FF5722,#FF9100)",color:"#fff",fontSize:16,fontWeight:600,marginBottom:24}}>Create Account</button>
      </div>
    </div>
  );

  // ─── CHAT ───
  if (screen === "chat" && activeConvoId) {
    const convo = conversations.find(c => c.id === activeConvoId);
    const partner = convo ? getConvoPartner(convo) : { name: "Unknown", avatar: "👤" };
    return (
      <div style={S.app}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(10,10,15,0.95)"}}>
          <button onClick={() => { setScreen("home"); setActiveConvoId(null); setShowEmoji(false); }} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button>
          <div style={{width:38,height:38,borderRadius:19,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{partner.avatar}</div>
          <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600}}>{partner.name}</div><div style={{fontSize:11,color:partner.status === "online" ? "#22c55e" : "#64748b"}}>{partner.status || "offline"}</div></div>
          <button onClick={() => setShowGames(!showGames)} style={{...S.btn,background:"rgba(255,255,255,0.06)",borderRadius:20,padding:"6px 12px",color:"#FF1744",fontSize:13,fontWeight:600}}>🎮 Challenge</button>
        </div>
        {showGames && (
          <div style={{background:"rgba(30,27,75,0.95)",borderBottom:"1px solid rgba(255,255,255,0.08)",padding:"10px 8px",display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
            {GAMES_LIST.map(g => (
              <button key={g.key} onClick={() => challengeToGame(g.key)} style={{...S.btn,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"8px 12px",color:"#e2e8f0",fontSize:10,minWidth:60}}>
                <span style={{fontSize:20}}>{g.icon}</span>
                <span style={{fontWeight:600}}>{g.label}</span>
                {g.multi && <span style={{fontSize:8,color:"#22c55e",fontWeight:700}}>LIVE</span>}
              </button>
            ))}
          </div>
        )}
        <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>
          {messages.map(m => {
            const me = m.from === authUser.uid;
            return (
              <div key={m.id} style={{display:"flex",justifyContent:me?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"78%",padding:"10px 14px",borderRadius:me?"18px 18px 4px 18px":"18px 18px 18px 4px",background:me?"linear-gradient(135deg,#D50000,#7c3aed)":"rgba(255,255,255,0.06)"}}>
                  <div style={{fontSize:15,lineHeight:1.4,wordBreak:"break-word"}}>{m.text}</div>
                  <div style={{fontSize:10,color:me?"rgba(255,255,255,0.5)":"#64748b",marginTop:4,textAlign:"right"}}>
                    {m.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || ""}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        {showEmoji && <div style={{maxHeight:160,overflowY:"auto",padding:8,display:"flex",flexWrap:"wrap",gap:2,background:"rgba(15,15,25,0.98)",borderTop:"1px solid rgba(255,255,255,0.06)"}}>{EMOJI_LIST.map(e => (<button key={e} onClick={() => setMsgText(m => m + e)} style={{...S.btn,fontSize:22,width:36,height:36,background:"transparent",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>{e}</button>))}</div>}
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px 16px",borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(10,10,15,0.95)"}}>
          <button onClick={() => setShowEmoji(!showEmoji)} style={{...S.btn,background:"none",fontSize:20,color:"#64748b",padding:4}}>😊</button>
          <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendMessage(msgText); }} placeholder="Message..." style={{...S.inp,flex:1,borderRadius:20,padding:"10px 16px",fontSize:14}} />
          <button onClick={() => sendMessage(msgText)} style={{...S.btn,width:36,height:36,borderRadius:18,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
        </div>
      </div>
    );
  }

  // ─── FIND FRIENDS ───
  if (screen === "findFriends") return (
    <div style={S.app}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <button onClick={() => setScreen("home")} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button>
        <h2 style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,margin:0}}>Add Friends</h2>
      </div>
      <div style={{padding:20,flex:1,overflowY:"auto"}}>
        {/* Search by email */}
        <div style={{marginBottom:24}}>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:8,fontWeight:600,letterSpacing:1,fontFamily:"'Orbitron',sans-serif"}}>SEARCH BY EMAIL</div>
          <div style={{display:"flex",gap:8}}>
            <input style={{...S.inp,flex:1}} placeholder="friend@email.com" value={searchEmail} onChange={e => setSearchEmail(e.target.value)} onKeyDown={e => { if (e.key === "Enter") searchForFriend(); }} />
            <button onClick={searchForFriend} style={{...S.btn,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",padding:"0 20px",borderRadius:12,fontSize:14,fontWeight:600}}>Search</button>
          </div>
          {searchError && <div style={{color:"#ef4444",fontSize:13,marginTop:8}}>{searchError}</div>}
          {searchResult && (
            <div style={{marginTop:12,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:16,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:48,height:48,borderRadius:24,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{searchResult.avatar}</div>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:15}}>{searchResult.name}</div><div style={{fontSize:12,color:"#64748b"}}>{searchResult.email}</div></div>
              {userProfile.friends?.includes(searchResult.uid) ? <div style={{color:"#22c55e",fontSize:12,fontWeight:600}}>✓ Friends</div> :
                <button onClick={() => addFriend(searchResult.uid)} style={{...S.btn,background:"#22c55e",color:"#fff",padding:"8px 16px",borderRadius:10,fontSize:13,fontWeight:600}}>Add</button>}
            </div>
          )}
        </div>
        {/* Invite link */}
        <div style={{marginBottom:24}}>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:8,fontWeight:600,letterSpacing:1,fontFamily:"'Orbitron',sans-serif"}}>INVITE FRIENDS</div>
          <p style={{fontSize:13,color:"#64748b",marginBottom:12}}>Share a link so friends can sign up and add you automatically</p>
          <button onClick={shareInvite} style={{...S.btn,width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#FF5722,#FF9100)",color:"#fff",fontSize:15,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            📤 Share Invite Link
          </button>
          <div style={{textAlign:"center",marginTop:8,fontSize:12,color:"#64748b"}}>Your invite code: <span style={{color:"#FF1744",fontFamily:"'Orbitron',sans-serif",fontWeight:700}}>{userProfile?.inviteCode}</span></div>
        </div>
        {/* Current friends */}
        <div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:8,fontWeight:600,letterSpacing:1,fontFamily:"'Orbitron',sans-serif"}}>YOUR FRIENDS ({friends.length})</div>
          {friends.map(f => (
            <div key={f.uid} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <div style={{width:42,height:42,borderRadius:21,background:"linear-gradient(135deg,#374151,#1f2937)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,position:"relative"}}>{f.avatar}{f.status==="online"&&<div style={{position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:5,background:"#22c55e",border:"2px solid #0a0a0f"}}/>}</div>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{f.name}</div><div style={{fontSize:11,color:"#64748b"}}>{f.status||"offline"}</div></div>
              <button onClick={() => startConversation(f.uid)} style={{...S.btn,background:"rgba(213,0,0,0.1)",color:"#FF1744",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600}}>Chat</button>
            </div>
          ))}
          {friends.length === 0 && <div style={{textAlign:"center",padding:24,color:"#475569",fontSize:13}}>No friends yet. Search by email or share your invite link!</div>}
        </div>
      </div>
    </div>
  );

  // ─── NOTIFICATIONS ───
  if (screen === "notifications") return (
    <div style={S.app}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <button onClick={() => setScreen("home")} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button>
        <h2 style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,margin:0}}>Notifications</h2>
        {unreadCount > 0 && <span style={{background:"#D50000",color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700}}>{unreadCount}</span>}
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {notifications.map(n => (
          <div key={n.id} onClick={() => {
            if (n.type === "game_challenge" && n.gameId) acceptGame(n);
            else updateDoc(doc(db, "notifications", n.id), { read: true });
          }} style={{padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,0.04)",background:n.read?"transparent":"rgba(213,0,0,0.05)",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
            {!n.read && <div style={{width:8,height:8,borderRadius:4,background:"#D50000",flexShrink:0}} />}
            <div style={{flex:1}}>
              <div style={{fontSize:14,lineHeight:1.4}}>{n.text}</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                {n.createdAt?.toDate?.()?.toLocaleString([], { month:"short",day:"numeric",hour:"2-digit",minute:"2-digit" }) || ""}
              </div>
              {n.type === "game_challenge" && !n.read && <div style={{marginTop:6}}><span style={{background:"#22c55e",color:"#fff",padding:"4px 12px",borderRadius:8,fontSize:12,fontWeight:600}}>Tap to play!</span></div>}
            </div>
          </div>
        ))}
        {notifications.length === 0 && <div style={{textAlign:"center",padding:48,color:"#475569"}}><div style={{fontSize:40,marginBottom:8}}>🔔</div><div>No notifications yet</div></div>}
      </div>
    </div>
  );

  // ─── PROFILE ───
  if (screen === "profile") return (
    <div style={S.app}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <button onClick={() => setScreen("home")} style={{...S.btn,background:"none",color:"#94a3b8",fontSize:20,padding:0}}>‹</button>
        <h2 style={{fontFamily:"'Orbitron',sans-serif",fontSize:18,fontWeight:700,margin:0}}>Profile</h2>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:24}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:80,height:80,borderRadius:40,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,margin:"0 auto 12px"}}>{userProfile?.avatar}</div>
          <h3 style={{margin:"0 0 4px",fontSize:20,fontWeight:700}}>{userProfile?.name}</h3>
          <p style={{margin:0,color:"#64748b",fontSize:14}}>{authUser?.email}</p>
          <p style={{margin:"4px 0 0",color:"#FF1744",fontSize:12,fontFamily:"'Orbitron',sans-serif"}}>Invite code: {userProfile?.inviteCode}</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
          {[{l:"Friends",v:userProfile?.friends?.length||0},{l:"Convos",v:conversations.length},{l:"Games",v:"♾️"}].map(st => (
            <div key={st.l} style={{textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:16,padding:"14px 8px"}}>
              <div style={{fontSize:22,fontWeight:700,color:"#FF1744"}}>{st.v}</div>
              <div style={{fontSize:10,color:"#64748b",marginTop:2}}>{st.l}</div>
            </div>
          ))}
        </div>
        <button onClick={shareInvite} style={{...S.btn,width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#FF5722,#FF9100)",color:"#fff",fontSize:15,fontWeight:600,marginBottom:12}}>📤 Share Invite Link</button>
        <button onClick={handleLogout} style={{...S.btn,width:"100%",padding:14,borderRadius:14,background:"rgba(239,68,68,0.1)",color:"#ef4444",fontSize:15,fontWeight:600}}>Sign Out</button>
      </div>
    </div>
  );

  // ─── HOME ───
  return (
    <div style={S.app}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px 12px"}}>
        <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:24,fontWeight:800,margin:0,background:"linear-gradient(135deg,#FF1744,#FF5722)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RIVAL</h1>
        <div style={{display:"flex",gap:8}}>
          <button onClick={() => setScreen("findFriends")} style={{...S.btn,width:40,height:40,borderRadius:20,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",fontSize:18,color:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center"}}>👥</button>
          <button onClick={() => setScreen("notifications")} style={{...S.btn,width:40,height:40,borderRadius:20,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",fontSize:18,color:"#e2e8f0",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>🔔{unreadCount > 0 && <div style={{position:"absolute",top:-2,right:-2,width:18,height:18,borderRadius:9,background:"#ef4444",fontSize:10,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadCount}</div>}</button>
          <button onClick={() => setScreen("profile")} style={{...S.btn,width:40,height:40,borderRadius:20,background:"linear-gradient(135deg,#D50000,#FF1744)",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{userProfile?.avatar}</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",padding:"0 20px 12px"}}>
        {["chats","games"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{...S.btn,flex:1,padding:"8px 0",fontSize:13,fontWeight:600,color:tab===t?"#FF1744":"#64748b",background:"none",borderBottom:tab===t?"2px solid #FF1744":"2px solid transparent",textTransform:"uppercase",letterSpacing:1}}>
            {t === "games" ? "🎮 Games" : "💬 Chats"}
          </button>
        ))}
      </div>

      {/* GAMES TAB */}
      {tab === "games" && (
        <div style={{flex:1,overflowY:"auto",padding:"8px 20px"}}>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:12,fontFamily:"'Orbitron',sans-serif",letterSpacing:1}}>CHALLENGE A FRIEND</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
            {GAMES_LIST.map(g => (
              <button key={g.key} onClick={() => {
                if (friends.length === 0) { setScreen("findFriends"); return; }
                // Open first friend's chat and challenge
                startConversation(friends[0].uid).then(() => { setShowGames(true); });
              }} style={{...S.btn,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"20px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,color:"#e2e8f0"}}>
                <div style={{fontSize:36}}>{g.icon}</div>
                <div style={{fontWeight:700,fontSize:14}}>{g.label}</div>
                <div style={{fontSize:11,color:"#64748b"}}>{g.desc}</div>
                {g.multi && <div style={{fontSize:10,color:"#22c55e",fontWeight:700,fontFamily:"'Orbitron',sans-serif"}}>MULTIPLAYER</div>}
              </button>
            ))}
          </div>
          {friends.length === 0 && (
            <div style={{textAlign:"center",padding:"24px 0"}}>
              <div style={{fontSize:13,color:"#64748b",marginBottom:12}}>Add friends to start challenging them!</div>
              <button onClick={() => setScreen("findFriends")} style={{...S.btn,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",padding:"10px 24px",borderRadius:12,fontSize:14,fontWeight:600}}>👥 Find Friends</button>
            </div>
          )}
        </div>
      )}

      {/* CHATS TAB */}
      {tab === "chats" && (
        <>
          {/* Online friends bar */}
          {friends.filter(f => f.status === "online").length > 0 && (
            <div style={{padding:"0 20px 12px"}}>
              <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:4}}>
                {friends.filter(f => f.status === "online").map(f => (
                  <button key={f.uid} onClick={() => startConversation(f.uid)} style={{...S.btn,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",padding:0,minWidth:56}}>
                    <div style={{width:48,height:48,borderRadius:24,background:"linear-gradient(135deg,#D50000,#FF1744)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,position:"relative"}}>{f.avatar}<div style={{position:"absolute",bottom:0,right:0,width:12,height:12,borderRadius:6,background:"#22c55e",border:"2px solid #0a0a0f"}} /></div>
                    <span style={{fontSize:10,color:"#94a3b8",maxWidth:56,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{flex:1,overflowY:"auto"}}>
            {conversations.map(c => {
              const partner = getConvoPartner(c);
              return (
                <button key={c.id} onClick={() => { setActiveConvoId(c.id); setScreen("chat"); }} style={{...S.btn,width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 20px",background:"none",textAlign:"left",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                  <div style={{width:50,height:50,borderRadius:25,background:"linear-gradient(135deg,#374151,#1f2937)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,position:"relative"}}>{partner.avatar}{partner.status === "online" && <div style={{position:"absolute",bottom:1,right:1,width:12,height:12,borderRadius:6,background:"#22c55e",border:"2px solid #0a0a0f"}} />}</div>
                  <div style={{flex:1,overflow:"hidden"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontWeight:600,color:"#e2e8f0"}}>{partner.name}</span><span style={{fontSize:11,color:"#64748b"}}>{c.lastMessageTime?.toDate?.()?.toLocaleTimeString([], { hour:"2-digit",minute:"2-digit" }) || ""}</span></div>
                    <div style={{fontSize:13,color:"#64748b",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.lastMessage || "Start chatting!"}</div>
                  </div>
                </button>
              );
            })}
            {conversations.length === 0 && (
              <div style={{textAlign:"center",padding:48}}>
                <div style={{fontSize:48,marginBottom:12}}>💬</div>
                <div style={{fontSize:15,color:"#94a3b8",marginBottom:16}}>No conversations yet</div>
                <button onClick={() => setScreen("findFriends")} style={{...S.btn,background:"linear-gradient(135deg,#D50000,#FF1744)",color:"#fff",padding:"12px 28px",borderRadius:14,fontSize:15,fontWeight:600}}>👥 Add Friends to Start</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
