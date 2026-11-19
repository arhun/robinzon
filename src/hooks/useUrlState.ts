import { useEffect } from 'react';
import type { MapMode } from '../types/island';
import { CHRONOLOGY_EVENTS } from '../data/chronology';
import { ISLAND_LOCATIONS } from '../data/locations';

export interface InitialUrlState {
  stage: number;
  mode: MapMode;
  selectedLocationId: string | null;
  selectedEventId: string | null;
  hasDeepLink: boolean;
}

export function parseInitialUrlState(): InitialUrlState {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);

  const eventId = params.get('event');
  const locId = params.get('loc');
  const modeParam = params.get('mode');

  const mode: MapMode = modeParam === 'all' ? 'all' : 'chronology';

  if (eventId) {
    const foundEvent = CHRONOLOGY_EVENTS.find((ev) => ev.id === eventId);
    if (foundEvent) {
      return {
        stage: foundEvent.stage,
        mode,
        selectedLocationId: foundEvent.locationId,
        selectedEventId: foundEvent.id,
        hasDeepLink: true,
      };
    }
  }

  if (locId) {
    const foundLoc = ISLAND_LOCATIONS.find((l) => l.id === locId);
    if (foundLoc) {
      const firstEv = CHRONOLOGY_EVENTS.find((ev) => ev.locationId === foundLoc.id);
      return {
        stage: mode === 'all' ? 20 : Math.max(1, foundLoc.firstStage),
        mode,
        selectedLocationId: foundLoc.id,
        selectedEventId: firstEv?.id ?? null,
        hasDeepLink: true,
      };
    }
  }

  return {
    stage: 1,
    mode,
    selectedLocationId: null,
    selectedEventId: CHRONOLOGY_EVENTS[0].id,
    hasDeepLink: false,
  };
}

export function useUrlStateSync(params: {
  mode: MapMode;
  selectedLocationId: string | null;
  selectedEventId: string | null;
}): void {
  const { mode, selectedLocationId, selectedEventId } = params;

  useEffect(() => {
    const search = new URLSearchParams();
    if (mode === 'all') {
      search.set('mode', 'all');
    }
    if (selectedEventId && selectedLocationId) {
      search.set('event', selectedEventId);
    } else if (selectedLocationId) {
      search.set('loc', selectedLocationId);
    }
    const nextHash = search.toString() ? `#${search.toString()}` : '';
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, [mode, selectedLocationId, selectedEventId]);
}
