
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, GameItem, GameState, QuestStep } from './types';
import { MISSION_GOALS, CANVAS_WIDTH, CANVAS_HEIGHT, WALLS, PICKUP_ZONE, DROP_ZONE } from './constants';
import { geminiService } from './services/gemini';
import InfoModal from './components/InfoModal';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [player, setPlayer] = useState<Player>({
    x: 500,
    y: 350,
    size: 32,
    speed: 7,
    color: '#fbbf24', // Yellow for Maccabi
    targetX: 500,
    targetY: 350,
    heldItemId: null
  });
  
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [questIndex, setQuestIndex] = useState(0);
  const [questStep, setQuestStep] = useState<QuestStep>(QuestStep.PICKUP);
  const [isMoving, setIsMoving] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);

  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; }, [player]);

  const activeQuestGoal = MISSION_GOALS[questIndex] || null;

  useEffect(() => {
    const loadBackground = async () => {
      setIsGeneratingBg(true);
      const prompt = "A top-down 2D pixel art professional basketball court. Hardwood floor with polished finish, center circle, three-point lines, and hoops at both ends. Vibrant indoor lighting, professional sports arena style.";
      const imageUrl = await geminiService.generateBackground(prompt);
      if (imageUrl) {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => { setBgImage(img); setIsGeneratingBg(false); };
      } else {
        setIsGeneratingBg(false);
      }
    };
    loadBackground();
  }, []);

  const resetGame = () => {
    setPlayer({
      x: 500,
      y: 350,
      size: 32,
      speed: 7,
      color: '#fbbf24',
      targetX: 500,
      targetY: 350,
      heldItemId: null
    });
    setQuestIndex(0);
    setQuestStep(QuestStep.PICKUP);
    setIsMoving(false);
    setKeys({});
    setGameState(GameState.START);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState === GameState.START) {
      if (['Enter', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        setGameState(GameState.PLAYING);
        return;
      }
    }
    if (gameState === GameState.COMPLETED) {
      if (['Enter', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        resetGame();
        return;
      }
    }

    setKeys(prev => ({ ...prev, [e.code]: true }));
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') setFacingLeft(true);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') setFacingLeft(false);
  }, [gameState]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: false })), []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const checkCollision = (x: number, y: number, size: number) => {
    const hWidth = size * 0.6;
    const hHeight = size * 0.3;
    const hx = x + (size - hWidth) / 2;
    const hy = y + size - hHeight - 2;
    if (hx < 0 || hx + hWidth > CANVAS_WIDTH || hy < 0 || hy + hHeight > CANVAS_HEIGHT) return true;
    for (const wall of WALLS) {
      if (hx < wall.x + wall.w && hx + hWidth > wall.x && hy < wall.y + wall.h && hy + hHeight > wall.y) return true;
    }
    return false;
  };

  useEffect(() => {
    let animationFrameId: number;
    const update = () => {
      if (gameState !== GameState.PLAYING) return;
      const p = playerRef.current;
      let dx = 0, dy = 0;
      if (keys['ArrowUp'] || keys['KeyW']) dy -= p.speed;
      if (keys['ArrowDown'] || keys['KeyS']) dy += p.speed;
      if (keys['ArrowLeft'] || keys['KeyA']) dx -= p.speed;
      if (keys['ArrowRight'] || keys['KeyD']) dx += p.speed;

      const moving = dx !== 0 || dy !== 0;
      if (moving !== isMoving) setIsMoving(moving);

      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      let nx = p.x + dx, ny = p.y + dy;
      let finalX = p.x, finalY = p.y;
      if (!checkCollision(nx, p.y, p.size)) finalX = nx;
      if (!checkCollision(finalX, ny, p.size)) finalY = ny;

      // Interaction Logic
      if (questStep === QuestStep.PICKUP) {
        const dist = Math.hypot(finalX + p.size/2 - PICKUP_ZONE.x, finalY + p.size/2 - PICKUP_ZONE.y);
        if (dist < 45) {
          setPlayer(prev => ({ ...prev, heldItemId: activeQuestGoal?.id || null }));
          setQuestStep(QuestStep.DELIVER);
        }
      } else if (questStep === QuestStep.DELIVER) {
        const dist = Math.hypot(finalX + p.size/2 - DROP_ZONE.x, finalY + p.size/2 - DROP_ZONE.y);
        if (dist < 45) {
          setGameState(GameState.MODAL_OPEN);
          setPlayer(prev => ({ ...prev, heldItemId: null }));
        }
      }

      if (finalX !== p.x || finalY !== p.y) {
        setPlayer(prev => ({ ...prev, x: finalX, y: finalY }));
      }
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (bgImage) ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      else { ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }

      const time = Date.now();

      // Draw Pickup/Drop Zones
      const drawZone = (zone: {x: number, y: number, label: string}, color: string, isActive: boolean, isHoop: boolean) => {
        ctx.save();
        ctx.globalAlpha = isActive ? 1 : 0.3;
        
        // Zone Indicator
        const pulse = 1 + Math.sin(time/250) * 0.1;
        ctx.beginPath();
        ctx.ellipse(zone.x, zone.y, 40 * pulse, 20 * pulse, 0, 0, Math.PI*2);
        ctx.fillStyle = isActive ? `${color}33` : '#ffffff11';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Icon for Hoop or Rack
        ctx.fillStyle = 'white';
        ctx.font = '24px "Font Awesome 6 Free"';
        ctx.fontWeight = '900';
        ctx.textAlign = 'center';
        ctx.fillText(isHoop ? '\uf11e' : '\uf44b', zone.x, zone.y);

        // Label
        ctx.font = 'bold 16px Assistant';
        const textWidth = ctx.measureText(zone.label).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(zone.x - (textWidth/2) - 8, zone.y + 25, textWidth + 16, 24);
        ctx.fillStyle = 'white';
        ctx.fillText(zone.label, zone.x, zone.y + 42);
        ctx.restore();
      };

      drawZone(PICKUP_ZONE, '#fbbf24', questStep === QuestStep.PICKUP, false);
      drawZone(DROP_ZONE, activeQuestGoal?.color || '#f87171', questStep === QuestStep.DELIVER, true);

      // Draw Basketball at rack
      if (questStep === QuestStep.PICKUP) {
        const hover = Math.sin(time/300) * 5;
        ctx.save();
        ctx.fillStyle = '#f97316';
        ctx.beginPath(); ctx.arc(PICKUP_ZONE.x, PICKUP_ZONE.y - 15 + hover, 12, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }

      // Draw Player
      const p = playerRef.current;
      const step = isMoving ? Math.sin(time / 100) * 5 : 0;
      const bob = Math.sin(time / 400) * 2;
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath(); ctx.ellipse(p.x + p.size/2, p.y + p.size - 2, 16, 6, 0, 0, Math.PI*2); ctx.fill();
      
      ctx.save();
      if (facingLeft) { ctx.translate(p.x + p.size, p.y); ctx.scale(-1, 1); ctx.translate(-p.x, -p.y); }
      ctx.fillStyle = "#1e3a8a"; ctx.fillRect(p.x + 6, p.y + 20 + step, 8, 10); ctx.fillRect(p.x + 18, p.y + 20 - step, 8, 10);
      ctx.fillStyle = "#fbbf24"; ctx.fillRect(p.x + 4, p.y + 8 + bob, 24, 16);
      ctx.fillStyle = "#1d4ed8"; ctx.fillRect(p.x + 12, p.y + 12 + bob, 8, 8);
      ctx.fillStyle = "#ffdbac"; ctx.fillRect(p.x + 10, p.y + bob - 8, 12, 12);
      ctx.fillStyle = "#4b2c20"; ctx.fillRect(p.x + 10, p.y + bob - 8, 12, 4);
      ctx.restore();

      if (p.heldItemId) {
        const dribble = Math.sin(time/150) * 10;
        const ballX = facingLeft ? p.x - 5 : p.x + p.size + 5;
        const ballY = p.y + 15 + dribble;
        ctx.save();
        ctx.fillStyle = '#f97316';
        ctx.beginPath(); ctx.arc(ballX, ballY, 10, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'black'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
    };

    const render = () => { update(); draw(); animationFrameId = requestAnimationFrame(render); };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, keys, bgImage, isMoving, facingLeft, questStep, questIndex, activeQuestGoal]);

  const closeModal = () => {
    if (questIndex < MISSION_GOALS.length - 1) {
      setQuestIndex(prev => prev + 1);
      setQuestStep(QuestStep.PICKUP);
      setGameState(GameState.PLAYING);
    } else {
      setGameState(GameState.COMPLETED);
    }
    setKeys({});
  };

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
      {/* Header UI */}
      <div className="absolute top-8 w-full px-8 flex justify-between items-start pointer-events-none z-10">
        <div className="bg-black/80 p-4 rounded-xl border border-yellow-500/50 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-yellow-400">תוכנית המשחק של מכבי: הסלאם הגדול</h1>
          <p className="text-white text-sm font-semibold">קלע סלים למימוש חזון ה-AI</p>
        </div>
        
        {gameState === GameState.PLAYING && activeQuestGoal && (
          <div className="absolute left-1/2 -translate-x-1/2 bg-black border-2 border-orange-500/50 py-4 px-10 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.3)] flex flex-col items-center gap-1 transition-all">
            <span className="text-xs uppercase text-slate-400 font-bold tracking-widest">משימה נוכחית</span>
            <div className="flex items-center gap-3">
               <i className="fa-solid fa-basketball text-orange-500 animate-bounce"></i>
               <span className="text-xl font-black text-white">
                 {questStep === QuestStep.PICKUP 
                    ? `קח כדור: ${activeQuestGoal.label}` 
                    : `רוץ לסל וקלע את הערך המנצח!`
                 }
               </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas */}
      <div className="relative">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-3xl shadow-2xl border-4 border-slate-700 bg-slate-900" />
        {isGeneratingBg && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-3xl backdrop-blur-md">
            <div className="text-center">
              <i className="fa-solid fa-basketball text-6xl text-orange-500 animate-bounce mb-4"></i>
              <p className="text-white font-bold text-xl">ה-AI מכין את המגרש...</p>
            </div>
          </div>
        )}
      </div>

      {/* States Overlays */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 z-40 backdrop-blur-sm">
          <div className="text-center p-12 max-w-xl bg-black border-2 border-yellow-500/50 rounded-3xl shadow-[0_0_50px_rgba(251,191,36,0.2)]">
            <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/30">
              <i className="fa-solid fa-basketball text-5xl text-yellow-400"></i>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-white">הניצחון הוא מטרה קבוצתית</h2>
            <div className="bg-slate-900/50 p-6 rounded-2xl mb-8 border border-slate-800">
              <p className="text-slate-200 text-lg leading-relaxed">
                ברוכים הבאים למגרש ה-AI של מכבי. המשימה שלכם: לקחת את הכדורים המייצגים את יעדי הניצחון ולקלוע אותם לסל כדי לחשוף את התוכנית המלאה.
              </p>
              <p className="text-yellow-500 text-xs font-bold mt-4 animate-pulse">לחץ על החיצים או Enter כדי לעלות למגרש</p>
            </div>
            <button onClick={() => setGameState(GameState.PLAYING)} disabled={isGeneratingBg} className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xl py-4 px-12 rounded-2xl transition-all shadow-xl hover:scale-105 active:scale-95">
              עולים למגרש
            </button>
          </div>
        </div>
      )}

      {gameState === GameState.COMPLETED && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 z-40 backdrop-blur-sm">
          <div className="text-center p-12 max-w-xl bg-black border-2 border-emerald-500/50 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <i className="fa-solid fa-trophy text-5xl text-emerald-400"></i>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-white">ניצחון מוחץ!</h2>
            <div className="bg-slate-900/50 p-6 rounded-2xl mb-8 border border-slate-800">
              <p className="text-slate-200 text-lg leading-relaxed">
                קלעתם את כל הסלים! התוכנית הוטמעה בהצלחה ומכבי מוכנה לנצח את המשחק בעידן ה-AI עם מוכנות לעתיד, הנגשה ואימוץ פנימי.
              </p>
              <p className="text-emerald-500 text-xs font-bold mt-4 animate-pulse">לחץ על החיצים או Enter למשחק חוזר</p>
            </div>
            <button onClick={resetGame} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xl py-4 px-12 rounded-2xl transition-all shadow-xl hover:scale-105 active:scale-95">
              משחק חוזר
            </button>
          </div>
        </div>
      )}

      {gameState === GameState.MODAL_OPEN && activeQuestGoal && (
        <InfoModal item={activeQuestGoal} onClose={closeModal} />
      )}

      <div className="absolute bottom-6 text-slate-500 text-xs text-center font-medium">
        Victory Pursuit Mode • Slam Dunk v7.0<br/>
        AI Arena Visualization by Gemini 2.5 Flash Image • Keyboard Full Control
      </div>
    </div>
  );
};

export default App;