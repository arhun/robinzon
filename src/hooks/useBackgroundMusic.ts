import { useCallback, useEffect, useRef, useState } from 'react';

const VOLUME_STORAGE_KEY = 'robinzon_music_volume';
const DEFAULT_VOLUME = 0.45;

function readInitialVolume(): number {
  try {
    const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.min(1, parsed));
      }
    }
  } catch {
    // ignore storage access errors
  }
  return DEFAULT_VOLUME;
}

export interface BackgroundMusicControls {
  isPlaying: boolean;
  volume: number;
  togglePlay: () => void;
  setVolume: (next: number) => void;
}

/**
 * Управляет фоновой музыкой острова без предварительного декодирования в RAM
 * (preload="none", потоковое HTML5-аудио) и ставит на паузу при сворачивании вкладки.
 */
export function useBackgroundMusic(): BackgroundMusicControls {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState<number>(() => readInitialVolume());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wantPlayingRef = useRef(false);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    const audio = document.createElement('audio');
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = volumeRef.current;

    const oggSource = document.createElement('source');
    oggSource.src = '/audio/island-theme.ogg';
    oggSource.type = 'audio/ogg; codecs=opus';

    const mp3Source = document.createElement('source');
    mp3Source.src = '/audio/island-theme.mp3';
    mp3Source.type = 'audio/mpeg';

    audio.appendChild(oggSource);
    audio.appendChild(mp3Source);
    audioRef.current = audio;

    const handleVisibilityChange = () => {
      if (!audioRef.current || !wantPlayingRef.current) return;
      if (document.hidden) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {
          wantPlayingRef.current = false;
          setIsPlaying(false);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      audio.pause();
      audio.replaceChildren();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (wantPlayingRef.current && !audio.paused) {
      wantPlayingRef.current = false;
      audio.pause();
      setIsPlaying(false);
      return;
    }

    audio.volume = volumeRef.current;
    wantPlayingRef.current = true;
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        wantPlayingRef.current = false;
        setIsPlaying(false);
      });
  }, []);

  const setVolume = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(next) ? next : DEFAULT_VOLUME));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, clamped.toFixed(2));
    } catch {
      // ignore storage access errors
    }
  }, []);

  return { isPlaying, volume, togglePlay, setVolume };
}
