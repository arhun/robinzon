import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface MusicControlsProps {
  isPlaying: boolean;
  volume: number;
  onTogglePlay: () => void;
  onChangeVolume: (next: number) => void;
}

export const MusicControls: React.FC<MusicControlsProps> = ({
  isPlaying,
  volume,
  onTogglePlay,
  onChangeVolume,
}) => {
  const isMutedOrOff = !isPlaying || volume === 0;
  const percent = Math.round(volume * 100);

  return (
    <div className="music-controls" role="region" aria-label="Фоновая музыка">
      <button
        type="button"
        className={`icon-btn music-toggle-btn ${isPlaying ? 'is-active' : ''}`}
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Выключить фоновую музыку' : 'Включить фоновую музыку'}
        aria-pressed={isPlaying}
        title={isPlaying ? 'Выключить музыку' : 'Включить музыку'}
      >
        {isMutedOrOff ? <VolumeX size={16} /> : <Volume2 size={16} />}
        <span className="music-status-label">{isPlaying ? 'Звук вкл' : 'Музыка'}</span>
      </button>

      <input
        type="range"
        className="music-volume-slider"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onChangeVolume(Number(e.target.value))}
        aria-label="Громкость фоновой музыки"
        title={`Громкость: ${percent}%`}
      />
      <span className="music-volume-pct">{percent}%</span>
    </div>
  );
};
