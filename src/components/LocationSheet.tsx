import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, Share2, X } from 'lucide-react';
import { CHRONOLOGY_EVENTS } from '../data/chronology';
import { CATEGORY_LABELS, type ChronologyEvent, type IslandLocation } from '../types/island';

interface LocationSheetProps {
  location: IslandLocation;
  activeEvent: ChronologyEvent | null;
  totalStages: number;
  onClose: () => void;
  onSelectEvent: (event: ChronologyEvent) => void;
  onShare: () => void;
}

export const LocationSheet: React.FC<LocationSheetProps> = ({
  location,
  activeEvent,
  totalStages,
  onClose,
  onSelectEvent,
  onShare,
}) => {
  const [expanded, setExpanded] = useState(false);

  const relatedEvents = CHRONOLOGY_EVENTS.filter((ev) => ev.locationId === location.id);
  const currentStage = activeEvent?.stage ?? 1;
  const prevEvent = currentStage > 1 ? CHRONOLOGY_EVENTS[currentStage - 2] : null;
  const nextEvent = currentStage < totalStages ? CHRONOLOGY_EVENTS[currentStage] : null;

  return (
    <aside
      className={`location-sheet ${expanded ? 'is-expanded' : ''}`}
      aria-label={`Карточка: ${location.name}`}
    >
      <div className="sheet-header">
        <div className="sheet-header-top">
          <div className="sheet-badges">
            <span className="badge-chip">{CATEGORY_LABELS[location.category]}</span>
            {activeEvent && (
              <span className="badge-chip is-stage">
                {activeEvent.dateLabel} · {activeEvent.chapter}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? 'Свернуть текст' : 'Развернуть подробнее'}
              aria-label={expanded ? 'Свернуть панель' : 'Развернуть панель'}
              style={{ minWidth: 32, height: 32, padding: 0 }}
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              title="Закрыть карточку"
              aria-label="Закрыть карточку"
              style={{ minWidth: 32, height: 32, padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <h2 className="sheet-title">{activeEvent ? activeEvent.title : location.name}</h2>
        {activeEvent && (
          <div style={{ fontSize: 12, color: 'var(--gold)' }}>
            Локация: <strong style={{ color: 'var(--parchment)' }}>{location.name}</strong>
          </div>
        )}
      </div>

      <div className="sheet-body">
        {location.clubInfo && (
          <section className="club-info-card" aria-label="Информация о клубе kitab tdk">
            <div className="club-info-eyebrow">info:</div>
            <div className="club-info-name">{location.clubInfo.name}</div>
            <div className="club-info-subtitle">{location.clubInfo.subtitle}</div>
            <div className="club-info-line">{location.clubInfo.established}</div>
            {location.clubInfo.lines.map((line, idx) => (
              <div key={idx} className="club-info-line">
                {line}
              </div>
            ))}
            <div className="club-info-links">
              <a
                href={location.clubInfo.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="club-link-pill"
              >
                <span>{location.clubInfo.telegramLabel}</span>
                <ExternalLink size={12} />
              </a>
              <a
                href={location.clubInfo.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="club-link-pill"
              >
                <span>insta: {location.clubInfo.instagramLabel}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </section>
        )}

        <p className="sheet-lead">{activeEvent ? activeEvent.summary : location.summary}</p>

        {activeEvent?.quote && <blockquote className="sheet-quote">{activeEvent.quote}</blockquote>}

        <p className="sheet-details">{location.details}</p>

        <div>
          <div className="section-caption" style={{ marginBottom: 6 }}>
            {location.category === 'monument' ? 'О монументе' : 'Детали и факты из романа'}
          </div>
          <ul className="facts-list">
            {(activeEvent ? activeEvent.facts : location.facts).map((fact, idx) => (
              <li key={idx}>{fact}</li>
            ))}
          </ul>
        </div>

        {relatedEvents.length > 0 && (
          <div className="linked-events-box">
            <div className="section-caption">События хронологии в этом месте</div>
            {relatedEvents.map((ev) => {
              const isCurrent = activeEvent?.id === ev.id;
              return (
                <button
                  key={ev.id}
                  type="button"
                  className={`linked-event-btn ${isCurrent ? 'is-current' : ''}`}
                  onClick={() => onSelectEvent(ev)}
                >
                  <small>
                    Этап {ev.stage} · {ev.dateLabel} ({ev.islandYearLabel})
                  </small>
                  <span>{ev.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="sheet-footer">
        <button
          type="button"
          className="icon-btn"
          onClick={onShare}
          title="Скопировать ссылку на это место и год"
        >
          <Share2 size={15} />
          <span>Поделиться</span>
        </button>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="icon-btn"
            disabled={!prevEvent}
            onClick={() => prevEvent && onSelectEvent(prevEvent)}
            style={{ opacity: prevEvent ? 1 : 0.4 }}
          >
            <ChevronLeft size={16} />
            <span>Назад</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={!nextEvent}
            onClick={() => nextEvent && onSelectEvent(nextEvent)}
            style={{ opacity: nextEvent ? 1 : 0.4 }}
          >
            <span>Далее</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
