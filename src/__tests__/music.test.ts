import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useBackgroundMusic hook', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let playSpy: ReturnType<typeof vi.spyOn>;
  let pauseSpy: ReturnType<typeof vi.spyOn>;
  let loadSpy: ReturnType<typeof vi.spyOn>;
  let isPaused: boolean;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    isPaused = true;
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get: () => isPaused,
    });

    loadSpy = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});

    playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      isPaused = false;
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });

    pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      isPaused = true;
      this.dispatchEvent(new Event('pause'));
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('автоматически вызывает audio.play() при монтировании хука', async () => {
    let hookResult: ReturnType<typeof useBackgroundMusic> | undefined;

    function TestComp() {
      hookResult = useBackgroundMusic();
      return null;
    }

    await act(async () => {
      root.render(React.createElement(TestComp));
    });

    expect(playSpy).toHaveBeenCalled();
    expect(hookResult?.isPlaying).toBe(true);
    expect(hookResult?.volume).toBeGreaterThan(0);
  });

  it('при вызове togglePlay корректно ставит на паузу и не перезапускает при кликах', async () => {
    let hookResult: ReturnType<typeof useBackgroundMusic> | undefined;

    function TestComp() {
      hookResult = useBackgroundMusic();
      return null;
    }

    await act(async () => {
      root.render(React.createElement(TestComp));
    });

    expect(hookResult?.isPlaying).toBe(true);

    // Ручная пауза пользователем
    await act(async () => {
      hookResult?.togglePlay();
    });

    expect(pauseSpy).toHaveBeenCalled();
    expect(hookResult?.isPlaying).toBe(false);
    playSpy.mockClear();

    // Последующий жест пользователя не должен возобновлять воспроизведение
    await act(async () => {
      window.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(playSpy).not.toHaveBeenCalled();
    expect(loadSpy).toBeDefined();
  });
});
