import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IslandViewport } from './components/IslandViewport';
import { LocationSheet } from './components/LocationSheet';
import { ReferenceDrawer } from './components/ReferenceDrawer';
import { TimelineBar } from './components/TimelineBar';
import { TopBar } from './components/TopBar';
import { WelcomeOverlay } from './components/WelcomeOverlay';
import { CHRONOLOGY_EVENTS } from './data/chronology';
import { ISLAND_LOCATIONS } from './data/locations';
import { parseInitialUrlState, useUrlStateSync } from './hooks/useUrlState';
import { IslandSceneManager } from './scene/IslandSceneManager';
import type { ChronologyEvent, IslandLocation, MapMode, QualityMode, TimeOfDay } from './types/island';

const WELCOME_STORAGE_KEY = 'robinzon_welcome_seen';
const TOTAL_STAGES = CHRONOLOGY_EVENTS.length;

function isLikelyMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

export const App: React.FC = () => {
  const initial = useMemo(() => parseInitialUrlState(), []);

  const [stage, setStage] = useState<number>(initial.stage);
  const [mode, setMode] = useState<MapMode>(initial.mode);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [quality, setQuality] = useState<QualityMode>(() => (isLikelyMobile() ? 'balanced' : 'high'));

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(initial.selectedLocationId);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initial.selectedEventId);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    if (initial.hasDeepLink) return false;
    try {
      return window.sessionStorage.getItem(WELCOME_STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const sceneRef = useRef<IslandSceneManager | null>(null);
  const compassNeedleRef = useRef<HTMLSpanElement | null>(null);

  const stageEvent = useMemo(
    () => CHRONOLOGY_EVENTS.find((ev) => ev.stage === stage) ?? CHRONOLOGY_EVENTS[0],
    [stage]
  );

  const selectedLocation = useMemo(
    () => ISLAND_LOCATIONS.find((l) => l.id === selectedLocationId) ?? null,
    [selectedLocationId]
  );

  const activeEvent = useMemo(() => {
    if (!selectedLocationId) return null;
    if (selectedEventId) {
      const ev = CHRONOLOGY_EVENTS.find((e) => e.id === selectedEventId);
      if (ev && ev.locationId === selectedLocationId) return ev;
    }
    return CHRONOLOGY_EVENTS.find((e) => e.locationId === selectedLocationId) ?? null;
  }, [selectedLocationId, selectedEventId]);

  useUrlStateSync({
    mode,
    selectedLocationId,
    selectedEventId: activeEvent?.id ?? null,
  });

  const flyToLocation = useCallback((loc: IslandLocation, ev?: ChronologyEvent | null) => {
    const pos = ev?.cameraPos ?? loc.cameraPos;
    const target = ev?.cameraTarget ?? loc.cameraTarget;
    sceneRef.current?.flyTo(pos, target, 1050);
  }, []);

  // Первоначальный фокус при открытии по deep link
  useEffect(() => {
    if (!initial.hasDeepLink || !selectedLocationId) return;
    const loc = ISLAND_LOCATIONS.find((l) => l.id === selectedLocationId);
    if (!loc) return;
    const ev = initial.selectedEventId
      ? CHRONOLOGY_EVENTS.find((e) => e.id === initial.selectedEventId) ?? null
      : null;
    const timer = window.setTimeout(() => {
      flyToLocation(loc, ev);
    }, 180);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Поддержка навигации по URL hash без перезагрузки страницы
  useEffect(() => {
    const onHashChange = () => {
      const next = parseInitialUrlState();
      if (!next.hasDeepLink) return;
      setShowWelcome(false);
      setMode(next.mode);
      setStage(next.stage);
      setSelectedLocationId(next.selectedLocationId);
      setSelectedEventId(next.selectedEventId);
      if (next.selectedLocationId) {
        const loc = ISLAND_LOCATIONS.find((l) => l.id === next.selectedLocationId);
        const ev = next.selectedEventId
          ? CHRONOLOGY_EVENTS.find((e) => e.id === next.selectedEventId) ?? null
          : null;
        if (loc) flyToLocation(loc, ev);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [flyToLocation]);

  // Авто-экскурсия по этапам
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setStage((prev) => {
        if (prev >= TOTAL_STAGES) {
          setIsPlaying(false);
          return prev;
        }
        const nextStage = prev + 1;
        const ev = CHRONOLOGY_EVENTS.find((e) => e.stage === nextStage);
        if (ev) {
          const loc = ISLAND_LOCATIONS.find((l) => l.id === ev.locationId);
          setSelectedLocationId(ev.locationId);
          setSelectedEventId(ev.id);
          if (loc) flyToLocation(loc, ev);
        }
        return nextStage;
      });
    }, 5200);
    return () => window.clearInterval(timer);
  }, [isPlaying, flyToLocation]);

  // Автоскрытие тоста
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    try {
      window.sessionStorage.setItem(WELCOME_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  const handleSelectEvent = useCallback(
    (ev: ChronologyEvent, stopAutoplay = true) => {
      if (stopAutoplay) setIsPlaying(false);
      setStage(ev.stage);
      setSelectedLocationId(ev.locationId);
      setSelectedEventId(ev.id);
      const loc = ISLAND_LOCATIONS.find((l) => l.id === ev.locationId);
      if (loc) flyToLocation(loc, ev);
    },
    [flyToLocation]
  );

  const handleSelectLocationById = useCallback(
    (locId: string) => {
      setIsPlaying(false);
      const loc = ISLAND_LOCATIONS.find((l) => l.id === locId);
      if (!loc) return;

      // Если объект появляется позже в хронологии, переходим на его первый этап
      if (mode === 'chronology' && stage < loc.firstStage) {
        setStage(loc.firstStage);
      }

      const matchingEvents = CHRONOLOGY_EVENTS.filter((e) => e.locationId === loc.id);
      const bestEvent =
        [...matchingEvents].reverse().find((e) => e.stage <= Math.max(stage, loc.firstStage)) ??
        matchingEvents[0] ??
        null;

      setSelectedLocationId(loc.id);
      setSelectedEventId(bestEvent?.id ?? null);
      flyToLocation(loc, bestEvent);
    },
    [mode, stage, flyToLocation]
  );

  const handleChangeStage = (nextStage: number) => {
    setIsPlaying(false);
    const clamped = Math.max(1, Math.min(TOTAL_STAGES, nextStage));
    setStage(clamped);
    const ev = CHRONOLOGY_EVENTS.find((e) => e.stage === clamped);
    if (ev) {
      setSelectedEventId(ev.id);
      if (selectedLocationId !== null) {
        setSelectedLocationId(ev.locationId);
      }
      const loc = ISLAND_LOCATIONS.find((l) => l.id === ev.locationId);
      if (loc) flyToLocation(loc, ev);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setMode('chronology');
    const startStage = stage >= TOTAL_STAGES ? 1 : stage;
    const ev = CHRONOLOGY_EVENTS.find((e) => e.stage === startStage) ?? CHRONOLOGY_EVENTS[0];
    setStage(ev.stage);
    setSelectedLocationId(ev.locationId);
    setSelectedEventId(ev.id);
    const loc = ISLAND_LOCATIONS.find((l) => l.id === ev.locationId);
    if (loc) flyToLocation(loc, ev);
    setIsPlaying(true);
  };

  const handleCycleTime = () => {
    setTimeOfDay((prev) => (prev === 'day' ? 'sunset' : prev === 'sunset' ? 'night' : 'day'));
  };

  const handleFocusMonument = () => {
    handleSelectLocationById('club_monument');
  };

  const handleResetOverview = () => {
    setIsPlaying(false);
    setSelectedLocationId(null);
    sceneRef.current?.resetOverview();
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast('Ссылка на локацию скопирована');
    } catch {
      setToast('Скопируйте адрес из строки браузера');
    }
  };

  const handleStartChronology = () => {
    dismissWelcome();
    setMode('chronology');
    handleSelectEvent(CHRONOLOGY_EVENTS[0]);
  };

  const handleExploreAll = () => {
    dismissWelcome();
    setMode('all');
    setSelectedLocationId(null);
    sceneRef.current?.resetOverview();
  };

  return (
    <div className={`app-shell ${selectedLocation ? 'has-sheet' : ''}`}>
      <IslandViewport
        stage={stage}
        mode={mode}
        timeOfDay={timeOfDay}
        showRoutes={showRoutes}
        quality={quality}
        panelOpen={Boolean(selectedLocation)}
        selectedLocationId={selectedLocationId}
        compassNeedleRef={compassNeedleRef}
        sceneRef={sceneRef}
        onSelectLocation={handleSelectLocationById}
      />

      <TopBar
        yearLabel={`${stageEvent.year} · ${stageEvent.islandYearLabel}`}
        mode={mode}
        timeOfDay={timeOfDay}
        showRoutes={showRoutes}
        compassNeedleRef={compassNeedleRef}
        onOpenReference={() => setDrawerOpen(true)}
        onFocusMonument={handleFocusMonument}
        onCycleTimeOfDay={handleCycleTime}
        onToggleRoutes={() => setShowRoutes((v) => !v)}
        onResetOverview={handleResetOverview}
      />

      <TimelineBar
        stage={stage}
        totalStages={TOTAL_STAGES}
        currentEvent={stageEvent}
        mode={mode}
        isPlaying={isPlaying}
        onChangeStage={handleChangeStage}
        onPrevStage={() => handleChangeStage(stage - 1)}
        onNextStage={() => handleChangeStage(stage + 1)}
        onTogglePlay={handleTogglePlay}
        onChangeMode={(m) => {
          setIsPlaying(false);
          setMode(m);
        }}
        onOpenCurrentEventDetails={() => handleSelectEvent(stageEvent)}
      />

      {selectedLocation && (
        <LocationSheet
          location={selectedLocation}
          activeEvent={activeEvent}
          totalStages={TOTAL_STAGES}
          onClose={() => setSelectedLocationId(null)}
          onSelectEvent={(ev) => handleSelectEvent(ev)}
          onShare={handleShare}
        />
      )}

      <ReferenceDrawer
        open={drawerOpen}
        currentStage={stage}
        quality={quality}
        onClose={() => setDrawerOpen(false)}
        onSelectLocation={(loc) => handleSelectLocationById(loc.id)}
        onSelectEvent={(ev) => handleSelectEvent(ev)}
        onToggleQuality={setQuality}
      />

      {showWelcome && (
        <WelcomeOverlay
          onStartChronology={handleStartChronology}
          onExploreAll={handleExploreAll}
        />
      )}

      {toast && <div className="toast-banner">{toast}</div>}
    </div>
  );
};

export default App;
