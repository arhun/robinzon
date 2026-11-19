import React from 'react';
import logoUrl from '../assets/logo.svg';

interface WelcomeOverlayProps {
  onStartChronology: () => void;
  onExploreAll: () => void;
}

export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({
  onStartChronology,
  onExploreAll,
}) => {
  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true" aria-label="Добро пожаловать на остров Робинзона">
      <div className="welcome-card">
        <div className="welcome-logo">
          <img src={logoUrl} alt="Эмблема книжного клуба" style={{ width: '100%', height: '100%' }} />
        </div>

        <h1>Остров Робинзона Крузо</h1>
        <p>
          Интерактивная 3D-карта и справочник событий романа Даниэля Дефо от книжного клуба{' '}
          <strong style={{ color: 'var(--gold-bright)' }}>kitab tdk</strong> (Талдықорған Кітап
          клубы | Книжный клуб г. Талдыкорган): 16 ключевых мест острова, 28 лет хронологии
          (1659–1686) и каменный монумент клуба во мху.
        </p>

        <div className="welcome-actions">
          <button type="button" className="primary-btn" onClick={onStartChronology}>
            Начать с 1659 года
          </button>
          <button type="button" className="secondary-btn" onClick={onExploreAll}>
            Обзор всего острова
          </button>
        </div>
      </div>
    </div>
  );
};
