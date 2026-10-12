import { ArrowLeft, Volume2, Music, Volume1, Heart, Zap } from 'lucide-react';
import { audioManager } from '@/game/audio';
import { SaveData } from '@/game/types';

interface Props {
  save: SaveData;
  onSave: (data: Partial<SaveData>) => void;
  onBack: () => void;
}

export function Settings({ save, onSave, onBack }: Props) {
  const handleBack = () => {
    audioManager.play('button');
    onBack();
  };

  const updateVolume = (key: 'masterVolume' | 'sfxVolume' | 'musicVolume', value: number) => {
    onSave({ [key]: value } as Partial<SaveData>);
    if (key === 'masterVolume') audioManager.setMasterVolume(value);
    if (key === 'sfxVolume') audioManager.setSfxVolume(value);
    if (key === 'musicVolume') audioManager.setMusicVolume(value);
  };

  const toggleMusic = () => {
    audioManager.play('button');
    const enabled = !save.musicEnabled;
    onSave({ musicEnabled: enabled });
    audioManager.setMusicEnabled(enabled);
  };

  const toggleLivesMode = () => {
    audioManager.play('button');
    onSave({ livesMode: !save.livesMode });
  };

  const toggleSuperHardMode = () => {
    audioManager.play('button');
    onSave({ superHardMode: !save.superHardMode });
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} /> Quay lại
          </button>
          <h2 className="text-2xl font-bold text-white">Cài đặt</h2>
          <div className="w-20" />
        </div>

        <div className="space-y-6">
          {/* Âm lượng tổng */}
          <div>
            <label className="flex items-center gap-2 text-gray-300 mb-2">
              <Volume2 size={18} /> Âm lượng tổng
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={save.masterVolume}
              onChange={(e) => updateVolume('masterVolume', parseFloat(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>

          {/* SFX volume */}
          <div>
            <label className="flex items-center gap-2 text-gray-300 mb-2">
              <Volume1 size={18} /> Âm thanh hiệu ứng
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={save.sfxVolume}
              onChange={(e) => updateVolume('sfxVolume', parseFloat(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>

          {/* Music volume */}
          <div>
            <label className="flex items-center gap-2 text-gray-300 mb-2">
              <Music size={18} /> Âm lượng nhạc
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={save.musicVolume}
              onChange={(e) => updateVolume('musicVolume', parseFloat(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>

          {/* Music toggle */}
          <div>
            <button
              onClick={toggleMusic}
              className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                save.musicEnabled
                  ? 'bg-green-700 hover:bg-green-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
              }`}
            >
              <Music size={18} /> Nhạc nền: {save.musicEnabled ? 'Bật' : 'Tắt'}
            </button>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-gray-400 text-sm font-semibold mb-4 uppercase tracking-wider">Lối chơi</h3>

            {/* Lives mode toggle */}
            <button
              onClick={toggleLivesMode}
              className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                save.livesMode
                  ? 'bg-red-700 hover:bg-red-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
              }`}
            >
              <Heart size={18} /> Chế độ mạng: {save.livesMode ? `${save.maxLives} mạng` : 'Không giới hạn'}
            </button>
            <p className="text-gray-500 text-xs mt-2 text-center">
              Khi bật, mỗi màn có số mạng giới hạn. Hết mạng sẽ kết thúc lượt chơi.
            </p>

            <button
              onClick={toggleSuperHardMode}
              className={`w-full mt-5 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                save.superHardMode
                  ? 'bg-orange-700 hover:bg-orange-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
              }`}
            >
              <Zap size={18} /> Chế độ Siêu khó: {save.superHardMode ? 'Bật' : 'Tắt'}
            </button>
            <p className="text-gray-500 text-xs mt-2 text-center">
              Chướng ngại vật nhanh hơn, di chuyển nhanh hơn và nhiều khối giải đố hơn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
