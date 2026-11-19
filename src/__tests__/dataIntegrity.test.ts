import { describe, expect, it } from 'vitest';
import { CHRONOLOGY_EVENTS } from '../data/chronology';
import { ENCYCLOPEDIA_ARTICLES } from '../data/encyclopedia';
import { ISLAND_LOCATIONS } from '../data/locations';
import { ISLAND_ROUTES } from '../data/routes';

describe('Целостность справочника и хронологии романа', () => {
  it('содержит все 16 локаций с уникальными ID и непустыми описаниями', () => {
    expect(ISLAND_LOCATIONS).toHaveLength(16);
    const ids = new Set(ISLAND_LOCATIONS.map((l) => l.id));
    expect(ids.size).toBe(16);

    for (const loc of ISLAND_LOCATIONS) {
      expect(loc.name.trim().length).toBeGreaterThan(3);
      expect(loc.summary.trim().length).toBeGreaterThan(15);
      expect(loc.details.trim().length).toBeGreaterThan(25);
      expect(loc.facts.length).toBeGreaterThanOrEqual(2);
      expect(loc.firstStage).toBeGreaterThanOrEqual(1);
      expect(loc.firstStage).toBeLessThanOrEqual(20);
    }
  });

  it('содержит 20 строго упорядоченных событий хронологии (1659–1686)', () => {
    expect(CHRONOLOGY_EVENTS).toHaveLength(20);
    const locIds = new Set(ISLAND_LOCATIONS.map((l) => l.id));

    let prevYear = 1659;
    CHRONOLOGY_EVENTS.forEach((ev, idx) => {
      expect(ev.stage).toBe(idx + 1);
      expect(ev.year).toBeGreaterThanOrEqual(prevYear);
      expect(ev.year).toBeLessThanOrEqual(1686);
      prevYear = ev.year;

      expect(locIds.has(ev.locationId)).toBe(true);
      expect(ev.title.trim().length).toBeGreaterThan(5);
      expect(ev.quote.trim().length).toBeGreaterThan(10);
      expect(ev.facts.length).toBeGreaterThanOrEqual(2);
    });

    expect(CHRONOLOGY_EVENTS[0].year).toBe(1659);
    expect(CHRONOLOGY_EVENTS[19].year).toBe(1686);
  });

  it('имеет 5 корректных маршрутов и 4 статьи энциклопедии', () => {
    expect(ISLAND_ROUTES).toHaveLength(5);
    for (const r of ISLAND_ROUTES) {
      expect(r.points.length).toBeGreaterThanOrEqual(3);
      expect(r.fromStage).toBeGreaterThanOrEqual(1);
      expect(r.fromStage).toBeLessThanOrEqual(20);
    }

    expect(ENCYCLOPEDIA_ARTICLES).toHaveLength(4);
    for (const art of ENCYCLOPEDIA_ARTICLES) {
      expect(art.body.length).toBeGreaterThan(40);
      expect(art.bullets.length).toBeGreaterThanOrEqual(3);
    }
  });
});
