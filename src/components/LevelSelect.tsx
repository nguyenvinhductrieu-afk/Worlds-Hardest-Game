import { ArrowLeft, Lock } from 'lucide-react';
import { audioManager } from '@/game/audio';
import { TOTAL_LEVELS } from '@/game/constants';
import { SaveData } from '@/game/types';

interface Props {
  save: SaveData;
  onSelect: (levelId: number) => void;
  onBack: () => void;
}

export function LevelSelect({ save, onSelect, onBack }: Props) {
  const handleSelect = (levelId: number) => {
    audioManager.play('button');
    onSelect(levelId);
  };

  const handleBack = () => {
    audioManager.play('button');
    onBack();
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center p-6">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} /> Quay lại
          </button>
          <h2 className="text-2xl font-bold text-white">Chọn màn chơi</h2>
          <div className="w-20" />
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-3">
          {Array.from({ length: TOTAL_LEVELS }).map((_, i) => {
            const id = i + 1;
            const unlocked = id <= save.highestUnlocked;
            const bestDeaths = save.bestDeaths[id];

            return (
              <button
                key={id}
                onClick={() => unlocked && handleSelect(id)}
                disabled={!unlocked}
                className={`
                  aspect-square rounded-xl font-bold text-lg flex flex-col items-center justify-center
                  transition-all relative
                  ${unlocked
                    ? 'bg-gray-800 hover:bg-gray-700 text-white hover:scale-105 cursor-pointer border-2 border-gray-700 hover:border-red-500'
                    : 'bg-gray-900 text-gray-700 cursor-not-allowed border-2 border-gray-900'
                  }
                `}
              >
                {unlocked ? (
                  <>
                    <span>{id}</span>
                    {bestDeaths !== undefined && (
                      <span className="text-[10px] text-red-400 font-normal mt-0.5">
                        {bestDeaths} lần chết
                      </span>
                    )}
                  </>
                ) : (
                  <Lock size={18} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
