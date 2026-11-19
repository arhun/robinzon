import React from 'react';
import { BookOpen, Compass, Moon, Route, Shield, Sun, Sunset } from 'lucide-react';
import logoUrl from '../assets/logo.svg';
import type { MapMode, TimeOfDay } from '../types/island';

interface TopBarProps {
  yearLabel: string;
  mode: MapMode;
  timeOfDay: TimeOfDay;
  showRoutes: boolean;
  compassNeedleRef: React.RefObject<HTMLSpanElement | null>;
  onOpenReference: () => void;
  onFocusMonument: () => void;
  onCycleTimeOfDay: () => void;
  onToggleRoutes: () => void;
  onResetOverview: () => void;
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  day: 'День',
  sunset: 'Закат',
  night: 'Ночь',
};

export const TopBar: React.FC<TopBarProps> = ({
  yearLabel,
  mode,
  timeOfDay,
  showRoutes,
  compassNeedleRef,
  onOpenReference,
  onFocusMonument,
  onCycleTimeOfDay,
  onToggleRoutes,
  onResetOverview,
}) => {
  const TimeIcon = timeOfDay === 'day' ? Sun : timeOfDay === 'sunset' ? Sunset : Moon;

  return (
    <header className="top-bar">
      <div className="top-brand">
        <div className="brand-logo-wrap" title="Эмблема книжного клуба">
          <img src={logoUrl} alt="Эмблема клуба" width={22} height={20} style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="brand-titles">
          <h1 className="brand-title">Остров Робинзона</h1>
          <span className="brand-sub">{mode === 'all' ? '1659–1686 · Атлас' : yearLabel}</span>
        </div>
      </div>

      <nav className="top-actions" aria-label="Инструменты карты">
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenReference}
          title="Справочник читателя и поиск"
          aria-label="Справочник читателя"
        >
          <BookOpen size={17} />
          <span className="btn-label-desktop">Справочник</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onFocusMonument}
          title="К 3D-монументу клуба во мху"
          aria-label="Монумент клуба"
        >
          <Shield size={17} />
          <span className="btn-label-desktop">Монумент</span>
        </button>

        <button
          type="button"
          className={`icon-btn ${showRoutes ? 'is-active' : ''}`}
          onClick={onToggleRoutes}
          title="Показать или скрыть маршруты героя"
          aria-label="Маршруты"
          aria-pressed={showRoutes}
        >
          <Route size={17} />
          <span className="btn-label-desktop">Маршруты</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onCycleTimeOfDay}
          title={`Время суток: ${TIME_LABELS[timeOfDay]}`}
          aria-label={`Сменить время суток (${TIME_LABELS[timeOfDay]})`}
        >
          <TimeIcon size={17} />
          <span className="btn-label-desktop">{TIME_LABELS[timeOfDay]}</span>
        </button>

        <button
          type="button"
          className="icon-btn compass-btn"
          onClick={onResetOverview}
          title="Компас — сбросить камеру на общий вид острова"
          aria-label="Сбросить вид камеры"
        >
          <span ref={compassNeedleRef} className="compass-needle">
            <Compass size={18} />
          </span>
        </button>
      </nav>
    </header>
  );
};
