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
  ensurePlaying: () => void;
  setVolume: (next: number) => void;
}

/**
 * Управляет фоновой музыкой острова:
 * - Включает воспроизведение сразу при входе на сайт (с авто-разблокировкой
 *   по первому жесту пользователя, если браузер блокирует немой autoplay).
 * - Уважает явную паузу пользователя (не перезапускает при кликах, если юзер сам выключил).
 * - Ставит на паузу при сворачивании вкладки (visibilitychange).
 */
export function useBackgroundMusic(): BackgroundMusicControls {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState<number>(() => readInitialVolume());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userManuallyPausedRef = useRef(false);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const startPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || userManuallyPausedRef.current) return;

    audio.volume = volumeRef.current;
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        // Браузерная политика autoplay заблокировала запуск без жеста.
        // Ожидаем первого касания/клика через capture-слушатели.
        setIsPlaying(false);
      });
  }, []);

  useEffect(() => {
    const audio = document.createElement('audio');
    audio.loop = true;
    audio.preload = 'auto';
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

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    // Разблокировка по первому клику/тапу в браузере с ограничениями autoplay
    const unlockEvents: Array<keyof WindowEventMap> = ['pointerdown', 'touchstart', 'click', 'keydown'];
    const handleFirstGesture = () => {
      if (!userManuallyPausedRef.current) {
        startPlayback();
      }
    };

    unlockEvents.forEach((evt) => {
      window.addEventListener(evt, handleFirstGesture, { capture: true, passive: true });
    });

    const handleVisibilityChange = () => {
      const a = audioRef.current;
      if (!a) return;
      if (document.hidden) {
        a.pause();
      } else if (!userManuallyPausedRef.current) {
        startPlayback();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Пытаемся запустить воспроизведение сразу при входе на сайт
    startPlayback();

    return () => {
      unlockEvents.forEach((evt) => {
        window.removeEventListener(evt, handleFirstGesture, { capture: true });
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      audio.replaceChildren();
      audio.removeAttribute('src');
      try {
        audio.load();
      } catch {
        // ignore in environments without full media element implementation (e.g. jsdom)
      }
      audioRef.current = null;
    };
  }, [startPlayback]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      userManuallyPausedRef.current = true;
      audio.pause();
      setIsPlaying(false);
      return;
    }

    userManuallyPausedRef.current = false;
    audio.volume = volumeRef.current;
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        setIsPlaying(false);
      });
  }, []);

  const ensurePlaying = useCallback(() => {
    userManuallyPausedRef.current = false;
    startPlayback();
  }, [startPlayback]);

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

  return { isPlaying, volume, togglePlay, ensurePlaying, setVolume };
}
