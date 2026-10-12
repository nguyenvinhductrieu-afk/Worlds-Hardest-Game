import { Play, Grid3x3, Settings as SettingsIcon, Gamepad2 } from 'lucide-react';
import { audioManager } from '@/game/audio';
import { TOTAL_LEVELS } from '@/game/constants';
import { SaveData } from '@/game/types';

interface Props {
  save: SaveData;
  onPlay: () => void;
  onLevelSelect: () => void;
  onSettings: () => void;
}

export function MainMenu({ save, onPlay, onLevelSelect, onSettings }: Props) {
  const handlePlay = () => {
    audioManager.play('button');
    onPlay();
  };

  const handleLevelSelect = () => {
    audioManager.play('button');
    onLevelSelect();
  };

  const handleSettings = () => {
    audioManager.play('button');
    onSettings();
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background hazards */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-blue-600/10"
            style={{
              width: `${30 + i * 12}px`,
              height: `${30 + i * 12}px`,
              left: `${(i * 13) % 90}%`,
              top: `${(i * 17) % 80}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out ${i * 0.3}s infinite alternate`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          from { transform: translate(0, 0); }
          to { transform: translate(30px, -40px); }
        }
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.3); }
          50% { text-shadow: 0 0 30px rgba(239,68,68,0.7), 0 0 60px rgba(239,68,68,0.4); }
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Title */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-8 h-8 bg-red-500 rounded-sm shadow-lg shadow-red-500/50" />
            <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight">
              Trò Chơi Khó Nhất
            </h1>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-red-500 tracking-widest" style={{ animation: 'glow 2s ease-in-out infinite' }}>
            THẾ GIỚI
          </p>
          <p className="text-gray-500 mt-3 text-sm">
            {TOTAL_LEVELS} màn chơi đầy thử thách
          </p>
        </div>

        {/* Menu buttons */}
        <div className="flex flex-col gap-3 w-64">
          <button
            onClick={handlePlay}
            className="flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] shadow-lg shadow-red-600/30"
          >
            <Play size={22} /> CHƠI
          </button>
          <button
            onClick={handleLevelSelect}
            className="flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
          >
            <Grid3x3 size={20} /> Chọn màn
          </button>
          <button
            onClick={handleSettings}
            className="flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
          >
            <SettingsIcon size={20} /> Cài đặt
          </button>
        </div>

        {/* Controls info */}
        <div className="flex items-center gap-6 text-gray-400 text-sm mt-4">
          <div className="flex items-center gap-2">
            <Gamepad2 size={18} />
            <span>Dùng phím mũi tên hoặc WASD để di chuyển</span>
          </div>
        </div>

        {/* Progress */}
        {save.highestUnlocked > 1 && (
          <p className="text-gray-500 text-sm">
            Tiến độ: <span className="text-green-400 font-semibold">{save.highestUnlocked - 1}</span> / {TOTAL_LEVELS} màn đã hoàn thành
          </p>
        )}
      </div>
    </div>
  );
}
