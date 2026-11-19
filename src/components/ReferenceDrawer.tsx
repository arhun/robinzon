import React, { useMemo, useState } from 'react';
import { BookOpen, Clock, Compass, Hammer, Users, X } from 'lucide-react';
import { CHRONOLOGY_EVENTS } from '../data/chronology';
import { ENCYCLOPEDIA_ARTICLES } from '../data/encyclopedia';
import { ISLAND_LOCATIONS } from '../data/locations';
import {
  CATEGORY_LABELS,
  type ChronologyEvent,
  type IslandLocation,
  type LocationCategory,
  type QualityMode,
} from '../types/island';

type DrawerTab = 'locations' | 'timeline' | 'facts';

interface ReferenceDrawerProps {
  open: boolean;
  currentStage: number;
  quality: QualityMode;
  onClose: () => void;
  onSelectLocation: (loc: IslandLocation) => void;
  onSelectEvent: (ev: ChronologyEvent) => void;
  onToggleQuality: (q: QualityMode) => void;
}

const CATEGORIES: Array<LocationCategory | 'all'> = [
  'all',
  'shelter',
  'survival',
  'sea',
  'encounter',
  'landmark',
  'monument',
];

function renderArticleIcon(icon: string): React.ReactNode {
  switch (icon) {
    case 'compass':
      return <Compass size={17} />;
    case 'clock':
      return <Clock size={17} />;
    case 'hammer':
      return <Hammer size={17} />;
    case 'users':
      return <Users size={17} />;
    default:
      return <BookOpen size={17} />;
  }
}

export const ReferenceDrawer: React.FC<ReferenceDrawerProps> = ({
  open,
  currentStage,
  quality,
  onClose,
  onSelectLocation,
  onSelectEvent,
  onToggleQuality,
}) => {
  const [tab, setTab] = useState<DrawerTab>('locations');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<LocationCategory | 'all'>('all');

  const filteredLocations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ISLAND_LOCATIONS.filter((loc) => {
      if (category !== 'all' && loc.category !== category) return false;
      if (!q) return true;
      return (
        loc.name.toLowerCase().includes(q) ||
        loc.summary.toLowerCase().includes(q) ||
        loc.details.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CHRONOLOGY_EVENTS;
    return CHRONOLOGY_EVENTS.filter(
      (ev) =>
        ev.title.toLowerCase().includes(q) ||
        ev.dateLabel.toLowerCase().includes(q) ||
        ev.summary.toLowerCase().includes(q)
    );
  }, [query]);

  if (!open) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="reference-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Справочник читателя"
      >
        <div className="drawer-header">
          <div>
            <h2>Справочник читателя</h2>
            <div style={{ fontSize: 12, color: 'var(--gold)' }}>
              Атлас острова, 20 этапов и факты романа Д. Дефо
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть справочник">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'locations'}
            className={`drawer-tab-btn ${tab === 'locations' ? 'is-active' : ''}`}
            onClick={() => setTab('locations')}
          >
            Локации ({ISLAND_LOCATIONS.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'timeline'}
            className={`drawer-tab-btn ${tab === 'timeline' ? 'is-active' : ''}`}
            onClick={() => setTab('timeline')}
          >
            Хронология ({CHRONOLOGY_EVENTS.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'facts'}
            className={`drawer-tab-btn ${tab === 'facts' ? 'is-active' : ''}`}
            onClick={() => setTab('facts')}
          >
            Статьи
          </button>
        </div>

        {tab !== 'facts' && (
          <div className="drawer-search-box">
            <input
              type="search"
              className="search-input"
              placeholder={
                tab === 'locations'
                  ? 'Поиск локаций (Крепость, Пятница, лодка, грот...)'
                  : 'Поиск по событиям и годам (1659, хлеб, козы...)'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {tab === 'locations' && (
              <div className="filter-pills">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`filter-pill ${category === cat ? 'is-active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat === 'all' ? 'Все' : CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="drawer-content">
          {tab === 'locations' &&
            filteredLocations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                className="drawer-card"
                onClick={() => {
                  onSelectLocation(loc);
                  onClose();
                }}
              >
                <div className="drawer-card-head">
                  <span className="drawer-card-title">{loc.name}</span>
                </div>
                <span className="drawer-card-sub">
                  {CATEGORY_LABELS[loc.category]} · с этапа {loc.firstStage}
                </span>
                <p className="drawer-card-desc">{loc.summary}</p>
              </button>
            ))}

          {tab === 'timeline' &&
            filteredEvents.map((ev) => (
              <button
                key={ev.id}
                type="button"
                className="drawer-card"
                style={
                  ev.stage === currentStage
                    ? { borderColor: 'var(--gold-bright)', background: 'rgba(181,165,140,0.14)' }
                    : undefined
                }
                onClick={() => {
                  onSelectEvent(ev);
                  onClose();
                }}
              >
                <div className="drawer-card-head">
                  <span className="drawer-card-sub">
                    Этап {ev.stage} · {ev.dateLabel} · {ev.islandYearLabel}
                  </span>
                </div>
                <span className="drawer-card-title">{ev.title}</span>
                <p className="drawer-card-desc">{ev.summary}</p>
              </button>
            ))}

          {tab === 'facts' && (
            <>
              <div className="quality-box">
                <div>
                  <div className="drawer-card-title">Качество 3D-графики</div>
                  <div className="drawer-card-desc">
                    Экономный режим экономит заряд на смартфонах
                  </div>
                </div>
                <div className="mode-switch">
                  <button
                    type="button"
                    className={`mode-pill ${quality === 'balanced' ? 'is-active' : ''}`}
                    onClick={() => onToggleQuality('balanced')}
                  >
                    Смартфон
                  </button>
                  <button
                    type="button"
                    className={`mode-pill ${quality === 'high' ? 'is-active' : ''}`}
                    onClick={() => onToggleQuality('high')}
                  >
                    Максимум
                  </button>
                </div>
              </div>

              {ENCYCLOPEDIA_ARTICLES.map((art) => (
                <article key={art.id} className="article-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gold-bright)' }}>
                    {renderArticleIcon(art.icon)}
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                      {art.subtitle}
                    </span>
                  </div>
                  <h3>{art.title}</h3>
                  <p className="drawer-card-desc">{art.body}</p>
                  <ul className="facts-list">
                    {art.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </>
          )}
        </div>
      </aside>
    </div>
  );
};
