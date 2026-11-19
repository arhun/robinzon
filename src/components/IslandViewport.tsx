import React, { useEffect, useRef } from 'react';
import {
  Anchor,
  Compass,
  Footprints,
  Home,
  Mountain,
  Shield,
  Sprout,
} from 'lucide-react';
import { ISLAND_LOCATIONS } from '../data/locations';
import { IslandSceneManager } from '../scene/IslandSceneManager';
import type { LocationCategory, MapMode, ProjectedMarker, QualityMode, TimeOfDay } from '../types/island';

interface IslandViewportProps {
  stage: number;
  mode: MapMode;
  timeOfDay: TimeOfDay;
  showRoutes: boolean;
  quality: QualityMode;
  panelOpen: boolean;
  selectedLocationId: string | null;
  compassNeedleRef: React.RefObject<HTMLSpanElement | null>;
  sceneRef: React.MutableRefObject<IslandSceneManager | null>;
  onSelectLocation: (locationId: string) => void;
}

function getCategoryIcon(category: LocationCategory): React.ReactNode {
  switch (category) {
    case 'shelter':
      return <Home size={15} />;
    case 'survival':
      return <Sprout size={15} />;
    case 'sea':
      return <Anchor size={15} />;
    case 'encounter':
      return <Footprints size={15} />;
    case 'monument':
      return <Shield size={15} />;
    case 'landmark':
    default:
      return <Mountain size={15} />;
  }
}

export const IslandViewport: React.FC<IslandViewportProps> = ({
  stage,
  mode,
  timeOfDay,
  showRoutes,
  quality,
  panelOpen,
  selectedLocationId,
  compassNeedleRef,
  sceneRef,
  onSelectLocation,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pinElsRef = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const onSelectRef = useRef(onSelectLocation);
  onSelectRef.current = onSelectLocation;
  const selectedIdRef = useRef(selectedLocationId);
  selectedIdRef.current = selectedLocationId;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const manager = new IslandSceneManager(
      host,
      { stage, mode, timeOfDay, showRoutes, quality, panelOpen },
      {
        onSelectLocation: (locId) => onSelectRef.current(locId),
        onProjectMarkers: (projected: Record<string, ProjectedMarker>, azimuthDeg: number) => {
          for (const loc of ISLAND_LOCATIONS) {
            const btn = pinElsRef.current.get(loc.id);
            if (!btn) continue;
            const info = projected[loc.id];
            if (!info || !info.visible) {
              btn.style.opacity = '0';
              btn.style.pointerEvents = 'none';
              btn.style.transform = 'translate3d(-999px, -999px, 0)';
              continue;
            }
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            btn.style.zIndex = loc.id === selectedIdRef.current ? '9' : String(Math.max(1, Math.round(100 - info.distance)));
            btn.style.transform = `translate3d(${Math.round(info.x)}px, ${Math.round(info.y)}px, 0) translate(-50%, -100%)`;
          }

          if (compassNeedleRef.current) {
            compassNeedleRef.current.style.transform = `rotate(${-azimuthDeg.toFixed(1)}deg)`;
          }
        },
      }
    );

    sceneRef.current = manager;
    return () => {
      sceneRef.current = null;
      manager.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.updateState({
      stage,
      mode,
      timeOfDay,
      showRoutes,
      quality,
      panelOpen,
    });
  }, [stage, mode, timeOfDay, showRoutes, quality, panelOpen, sceneRef]);

  return (
    <div className="viewport-root">
      <div ref={hostRef} className="viewport-canvas-host" aria-label="Интерактивная 3D-карта острова" />

      <div className="markers-overlay">
        {ISLAND_LOCATIONS.map((loc) => {
          const isActive = loc.id === selectedLocationId;
          return (
            <button
              key={loc.id}
              ref={(el) => {
                pinElsRef.current.set(loc.id, el);
              }}
              type="button"
              className={`map-pin ${isActive ? 'is-active' : ''}`}
              data-cat={loc.category}
              onClick={() => onSelectLocation(loc.id)}
              title={loc.name}
              aria-label={loc.name}
            >
              <span className="map-pin-dot">
                {getCategoryIcon(loc.category) ?? <Compass size={15} />}
              </span>
              <span className="map-pin-label">{loc.shortName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
