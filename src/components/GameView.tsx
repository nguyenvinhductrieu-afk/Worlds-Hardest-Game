import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/game/engine';
import { LevelDef, SaveData } from '@/game/types';
import { audioManager } from '@/game/audio';
import { TOTAL_LEVELS } from '@/game/constants';
import { Pause, Play, ArrowRight, Home, RotateCcw, X } from 'lucide-react';
import { Joystick } from '@/components/Joystick';

interface Props {
  level: LevelDef;
  save: SaveData;
  onDeath: () => void;
  onLevelComplete: (levelId: number, deaths: number) => void;
  onExit: () => void;
  onNextLevel: () => void;
  hasNextLevel: boolean;
}

export function GameView({
  level,
  save,
  onDeath,
  onLevelComplete,
  onExit,
  onNextLevel,
  hasNextLevel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [status, setStatus] = useState<GameEngine['getStatus'] extends () => infer R ? R : never>('playing');
  const [collected, setCollected] = useState(0);
  const [totalCollect, setTotalCollect] = useState(0);
  const [lives, setLives] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [showPause, setShowPause] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const deathCountRef = useRef(0);

  const handleDeath = useCallback(() => {
    audioManager.play('death');
    deathCountRef.current++;
    setDeaths(deathCountRef.current);
    onDeath();
  }, [onDeath]);

  const handleCollect = useCallback((c: number, total: number) => {
    if (c > 0) audioManager.play('collect');
    setCollected(c);
    setTotalCollect(total);
  }, []);

  const handleLevelComplete = useCallback(() => {
    audioManager.play('level_complete');
    setShowComplete(true);
    onLevelComplete(level.id, deathCountRef.current);
  }, [level.id, onLevelComplete]);

  const handleGameOver = useCallback(() => {
    audioManager.play('game_over');
    setShowGameOver(true);
  }, []);

  const handleStateChange = useCallback((s: typeof status) => {
    setStatus(s);
  }, []);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches,
    );
  }, []);

  const handleJoystickDirection = useCallback((dx: number, dy: number) => {
    engineRef.current?.setJoystickDirection(dx, dy);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cs = level.cellSize;
    canvas.width = level.cols * cs;
    canvas.height = level.rows * cs;

    const engine = new GameEngine(canvas, level, {
      onDeath: handleDeath,
      onCollect: handleCollect,
      onLevelComplete: handleLevelComplete,
      onGameOver: handleGameOver,
      onStateChange: handleStateChange,
    });

    engine.setLivesMode(save.livesMode, save.maxLives);
    engine.setSuperHardMode(save.superHardMode);
    engineRef.current = engine;
    deathCountRef.current = 0;
    setDeaths(0);
    setCollected(0);
    setTotalCollect(level.collectibles.length);
    setLives(save.livesMode ? save.maxLives : 0);
    setShowComplete(false);
    setShowGameOver(false);
    setShowPause(false);
    setStatus('playing');

    audioManager.init();
    audioManager.resume();
    if (save.musicEnabled) {
      audioManager.startMusic();
    }

    engine.start();

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.code === 'Escape') {
        if (engine.getStatus() === 'playing') {
          engine.pause();
          setShowPause(true);
        } else if (engine.getStatus() === 'paused') {
          engine.resume();
          setShowPause(false);
        }
        return;
      }
      engine.handleKeyDown(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      engine.handleKeyUp(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const interval = window.setInterval(() => {
      setLives(engine.getLives());
    }, 100);

    return () => {
      engine.stop();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearInterval(interval);
    };
  }, [level, handleDeath, handleCollect, handleLevelComplete, handleGameOver, handleStateChange, save.livesMode, save.maxLives, save.musicEnabled, save.superHardMode]);

  const handleResume = () => {
    audioManager.play('button');
    engineRef.current?.resume();
    setShowPause(false);
  };

  const handlePause = () => {
    audioManager.play('button');
    engineRef.current?.pause();
    setShowPause(true);
  };

  const handleRestart = () => {
    audioManager.play('button');
    setShowPause(false);
    setShowGameOver(false);
    setShowComplete(false);
    // Force re-mount by changing key in parent — but we can reset engine
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = engineRef.current;
    if (!engine) return;

    // Stop and recreate
    engine.stop();
    deathCountRef.current = 0;
    setDeaths(0);
    setCollected(0);
    setStatus('playing');

    const newEngine = new GameEngine(canvas, level, {
      onDeath: handleDeath,
      onCollect: handleCollect,
      onLevelComplete: handleLevelComplete,
      onGameOver: handleGameOver,
      onStateChange: handleStateChange,
    });
    newEngine.setLivesMode(save.livesMode, save.maxLives);
    newEngine.setSuperHardMode(save.superHardMode);
    engineRef.current = newEngine;
    newEngine.start();
  };

  const handleNext = () => {
    audioManager.play('button');
    onNextLevel();
  };

  const handleExit = () => {
    audioManager.play('button');
    onExit();
  };

  const allComplete = level.id >= TOTAL_LEVELS;

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-4 select-none">
      {/* HUD */}
      <div className="w-full max-w-[900px] flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold text-lg">Màn {level.id}</span>
          <span className="text-gray-400 text-sm">{level.name}</span>
          {save.superHardMode && (
            <span className="rounded-md bg-red-900/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-200">
              Siêu khó
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {save.livesMode && (
            <div className="flex items-center gap-1">
              {Array.from({ length: save.maxLives }).map((_, i) => (
                <span
                  key={i}
                  className={`w-3 h-3 rounded-sm ${i < lives ? 'bg-red-500' : 'bg-gray-700'}`}
                />
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-mono text-sm">
              {collected}/{totalCollect}
            </span>
            <span className="text-amber-300 text-xs">Đẩy khối vào ô sáng</span>
            <span className="text-red-400 font-mono text-sm">
              Lần chết: {deaths}
            </span>
          </div>
          <button
            onClick={handlePause}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Tạm dừng"
          >
            <Pause size={20} />
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div className="relative" style={{ maxWidth: '900px', width: '100%' }}>
        <canvas
          ref={canvasRef}
          className="block mx-auto rounded-lg shadow-2xl border border-gray-800"
          style={{
            maxWidth: '100%',
            width: '100%',
            height: 'auto',
            imageRendering: 'auto',
          }}
        />

        {/* Pause overlay */}
        {showPause && status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg z-10">
            <div className="flex flex-col gap-4 items-center">
              <h2 className="text-white text-3xl font-bold">Đã tạm dừng</h2>
              <div className="flex flex-col gap-3 w-48">
                <button
                  onClick={handleResume}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  <Play size={18} /> Tiếp tục
                </button>
                <button
                  onClick={handleRestart}
                  className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  <RotateCcw size={18} /> Chơi lại
                </button>
                <button
                  onClick={handleExit}
                  className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  <Home size={18} /> Menu chính
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Level complete overlay */}
        {showComplete && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 rounded-lg z-10">
            <div className="flex flex-col gap-5 items-center">
              <h2 className="text-3xl font-bold text-green-400 tracking-wide animate-pulse">
                HOÀN THÀNH MÀN!
              </h2>
              <p className="text-gray-300">
                Lần chết: <span className="text-red-400 font-bold">{deaths}</span>
              </p>
              <div className="flex flex-col gap-3 w-52">
                {hasNextLevel && (
                  <button
                    onClick={handleNext}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg font-bold transition-colors"
                  >
                    Màn tiếp theo <ArrowRight size={18} />
                  </button>
                )}
                <button
                  onClick={handleRestart}
                  className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  <RotateCcw size={18} /> Chơi lại
                </button>
                <button
                  onClick={handleExit}
                  className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  <Home size={18} /> Menu chính
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {showGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg z-10">
            <div className="flex flex-col gap-5 items-center">
              <h2 className="text-4xl font-bold text-red-500 tracking-wide">
                KẾT THÚC LƯỢT CHƠI
              </h2>
              <p className="text-gray-300">Bạn đã hết mạng.</p>
              <div className="flex flex-col gap-3 w-52">
                <button
                  onClick={handleRestart}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-bold transition-colors"
                >
                  <RotateCcw size={18} /> Thử lại
                </button>
                <button
                  onClick={handleExit}
                  className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  <Home size={18} /> Menu chính
                </button>
              </div>
            </div>
          </div>
        )}

        {/* All levels complete */}
        {showComplete && allComplete && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 rounded-lg z-20">
            <div className="flex flex-col gap-5 items-center text-center px-6">
              <h2 className="text-4xl font-bold text-yellow-400 tracking-wide">
                BẠN ĐÃ CHIẾN THẮNG!
              </h2>
              <p className="text-gray-300 max-w-md">
                Bạn đã chinh phục cả {TOTAL_LEVELS} màn. Bạn thật sự là cao thủ của trò chơi khó nhất thế giới.
              </p>
              <div className="flex flex-col gap-3 w-52">
                <button
                  onClick={handleExit}
                  className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white py-2.5 rounded-lg font-bold transition-colors"
                >
                  <Home size={18} /> Menu chính
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gợi ý điều khiển — chỉ hiện phím bấm trên máy không cảm ứng */}
      {!isTouch && (
        <div className="mt-4 text-gray-500 text-sm flex items-center gap-4">
          <span>Di chuyển: <kbd className="text-gray-300">Phím mũi tên</kbd> / <kbd className="text-gray-300">WASD</kbd></span>
          <span>Tạm dừng: <kbd className="text-gray-300">ESC</kbd></span>
        </div>
      )}

      {/* Joystick cảm ứng — chỉ hiện trên thiết bị cảm ứng */}
      {isTouch && !showPause && !showComplete && !showGameOver && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <Joystick onDirection={handleJoystickDirection} size={130} />
        </div>
      )}

      {/* Top-right exit button */}
      <button
        onClick={handleExit}
        className="fixed top-4 right-4 text-gray-500 hover:text-white transition-colors z-30"
        aria-label="Thoát"
      >
        <X size={24} />
      </button>
    </div>
  );
}
