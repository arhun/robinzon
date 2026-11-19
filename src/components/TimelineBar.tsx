import React from 'react';
import { ChevronLeft, ChevronRight, Info, Pause, Play } from 'lucide-react';
import type { ChronologyEvent, MapMode } from '../types/island';

interface TimelineBarProps {
  stage: number;
  totalStages: number;
  currentEvent: ChronologyEvent;
  mode: MapMode;
  isPlaying: boolean;
  onChangeStage: (stage: number) => void;
  onPrevStage: () => void;
  onNextStage: () => void;
  onTogglePlay: () => void;
  onChangeMode: (mode: MapMode) => void;
  onOpenCurrentEventDetails: () => void;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  stage,
  totalStages,
  currentEvent,
  mode,
  isPlaying,
  onChangeStage,
  onPrevStage,
  onNextStage,
  onTogglePlay,
  onChangeMode,
  onOpenCurrentEventDetails,
}) => {
  return (
    <section className="timeline-bar" aria-label="Хронология событий 1659–1686">
      <div className="timeline-top-row">
        <button
          type="button"
          className="timeline-event-trigger"
          onClick={onOpenCurrentEventDetails}
          title="Открыть описание события"
        >
          <div className="timeline-event-meta">
            <span className="timeline-date">
              Этап {stage}/{totalStages} · {currentEvent.dateLabel} ({currentEvent.islandYearLabel})
            </span>
            <span className="timeline-title">{currentEvent.title}</span>
          </div>
          <Info size={16} style={{ flexShrink: 0, color: 'var(--gold-bright)' }} />
        </button>

        <div className="mode-switch" role="group" aria-label="Режим карты">
          <button
            type="button"
            className={`mode-pill ${mode === 'chronology' ? 'is-active' : ''}`}
            onClick={() => onChangeMode('chronology')}
          >
            Хронология
          </button>
          <button
            type="button"
            className={`mode-pill ${mode === 'all' ? 'is-active' : ''}`}
            onClick={() => onChangeMode('all')}
          >
            Весь остров
          </button>
        </div>
      </div>

      <div className="timeline-controls-row">
        <button
          type="button"
          className={`icon-btn ${isPlaying ? 'is-active' : ''}`}
          onClick={onTogglePlay}
          title={isPlaying ? 'Пауза экскурсии' : 'Авто-экскурсия по годам'}
          aria-label={isPlaying ? 'Пауза экскурсии' : 'Запустить авто-экскурсию'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onPrevStage}
          disabled={stage <= 1}
          title="Предыдущий этап"
          aria-label="Предыдущий этап"
          style={{ opacity: stage <= 1 ? 0.45 : 1 }}
        >
          <ChevronLeft size={17} />
        </button>

        <div className="timeline-slider-wrap">
          <input
            type="range"
            className="timeline-slider"
            min={1}
            max={totalStages}
            step={1}
            value={stage}
            onChange={(e) => onChangeStage(Number(e.target.value))}
            aria-label="Этап хронологии"
          />
          <div className="timeline-years-axis">
            <span>1659</span>
            <span>1664</span>
            <span>1674</span>
            <span>1684</span>
            <span>1686</span>
          </div>
        </div>

        <button
          type="button"
          className="icon-btn"
          onClick={onNextStage}
          disabled={stage >= totalStages}
          title="Следующий этап"
          aria-label="Следующий этап"
          style={{ opacity: stage >= totalStages ? 0.45 : 1 }}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </section>
  );
};
