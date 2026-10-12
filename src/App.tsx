import { useCallback, useEffect, useState } from 'react';
import { MainMenu } from '@/components/MainMenu';
import { LevelSelect } from '@/components/LevelSelect';
import { Settings } from '@/components/Settings';
import { GameView } from '@/components/GameView';
import { LEVELS } from '@/game/levels';
import { SaveData, DEFAULT_SAVE } from '@/game/types';
import { loadSave, writeSave } from '@/game/save';
import { audioManager } from '@/game/audio';
import { TOTAL_LEVELS } from '@/game/constants';

type Screen = 'menu' | 'game' | 'level-select' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [save, setSave] = useState<SaveData>(DEFAULT_SAVE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const data = loadSave();
    setSave(data);
    audioManager.setMasterVolume(data.masterVolume);
    audioManager.setSfxVolume(data.sfxVolume);
    audioManager.setMusicVolume(data.musicVolume);
    setLoaded(true);
  }, []);

  const updateSave = useCallback((partial: Partial<SaveData>) => {
    setSave((prev) => {
      const next = { ...prev, ...partial };
      writeSave(next);
      return next;
    });
  }, []);

  const handlePlay = () => {
    setCurrentLevelId(save.highestUnlocked);
    setScreen('game');
  };

  const handleLevelSelect = (levelId: number) => {
    setCurrentLevelId(levelId);
    setScreen('game');
  };

  const handleDeath = useCallback(() => {
    setSave((prev) => {
      const next = { ...prev, deaths: prev.deaths + 1 };
      writeSave(next);
      return next;
    });
  }, []);

  const handleLevelComplete = useCallback(
    (levelId: number, deaths: number) => {
      setSave((prev) => {
        const newHighest = Math.min(
          Math.max(prev.highestUnlocked, levelId + 1),
          TOTAL_LEVELS,
        );
        const prevBest = prev.bestDeaths[levelId];
        const newBest =
          prevBest === undefined ? deaths : Math.min(prevBest, deaths);
        const next: SaveData = {
          ...prev,
          highestUnlocked: newHighest,
          bestDeaths: { ...prev.bestDeaths, [levelId]: newBest },
        };
        writeSave(next);
        return next;
      });
    },
    [],
  );

  const handleNextLevel = () => {
    const nextId = Math.min(currentLevelId + 1, TOTAL_LEVELS);
    setCurrentLevelId(nextId);
  };

  const handleExit = () => {
    audioManager.stopMusic();
    setScreen('menu');
  };

  if (!loaded) {
    return <div className="min-h-screen bg-[#0a0e1a]" />;
  }

  const currentLevel = LEVELS.find((l) => l.id === currentLevelId) ?? LEVELS[0];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {screen === 'menu' && (
        <MainMenu
          save={save}
          onPlay={handlePlay}
          onLevelSelect={() => setScreen('level-select')}
          onSettings={() => setScreen('settings')}
        />
      )}

      {screen === 'level-select' && (
        <LevelSelect
          save={save}
          onSelect={handleLevelSelect}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'settings' && (
        <Settings
          save={save}
          onSave={updateSave}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'game' && (
        <GameView
          key={currentLevelId}
          level={currentLevel}
          save={save}
          onDeath={handleDeath}
          onLevelComplete={handleLevelComplete}
          onExit={handleExit}
          onNextLevel={handleNextLevel}
          hasNextLevel={currentLevelId < TOTAL_LEVELS}
        />
      )}
    </div>
  );
}
