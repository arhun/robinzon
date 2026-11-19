import { describe, expect, it } from 'vitest';
import { ISLAND_LOCATIONS } from '../data/locations';
import { getIslandHeight, getTerrainNormal } from '../scene/terrain';

describe('Рельеф острова (getIslandHeight)', () => {
  it('детерминирован при повторных вызовах', () => {
    const samples: Array<[number, number]> = [
      [10, 10],
      [-2, -4],
      [20, 12],
      [-28, 6],
      [20, 28],
    ];
    for (const [x, z] of samples) {
      expect(getIslandHeight(x, z)).toBe(getIslandHeight(x, z));
    }
  });

  it('размещает все сухопутные локации выше уровня моря (> 0.25)', () => {
    const landLocs = ISLAND_LOCATIONS.filter((l) => !l.isWater);
    for (const loc of landLocs) {
      const h = getIslandHeight(loc.coords[0], loc.coords[1]);
      expect(h, `Локация ${loc.id} должна быть над водой, получено ${h}`).toBeGreaterThan(0.25);
    }
  });

  it('размещает морские локации (кораблекрушения и рейд) ниже уровня моря (< 0)', () => {
    const waterLocs = ISLAND_LOCATIONS.filter((l) => l.isWater);
    expect(waterLocs.map((l) => l.id).sort()).toEqual(
      ['english_ship', 'shipwreck', 'spanish_wreck'].sort()
    );
    for (const loc of waterLocs) {
      const h = getIslandHeight(loc.coords[0], loc.coords[1]);
      expect(h, `Морская локация ${loc.id} должна быть ниже 0, получено ${h}`).toBeLessThan(0);
    }
  });

  it('делает Холм Разведки высочайшей локацией острова', () => {
    const lookout = ISLAND_LOCATIONS.find((l) => l.id === 'lookout')!;
    const lookoutH = getIslandHeight(lookout.coords[0], lookout.coords[1]);
    expect(lookoutH).toBeGreaterThan(8.5);
    for (const loc of ISLAND_LOCATIONS) {
      if (loc.id === 'lookout') continue;
      const h = getIslandHeight(loc.coords[0], loc.coords[1]);
      expect(lookoutH).toBeGreaterThan(h);
    }
  });

  it('возвращает единичную нормаль рельефа без NaN', () => {
    const n = getTerrainNormal(20, 12);
    expect(Number.isFinite(n.x)).toBe(true);
    expect(Number.isFinite(n.y)).toBe(true);
    expect(Number.isFinite(n.z)).toBe(true);
    expect(Math.abs(n.length() - 1)).toBeLessThan(1e-5);
    expect(n.y).toBeGreaterThan(0);
  });

  it('обеспечивает ровный холм под всеми 12 опорами загона коз (-6, -12)', () => {
    const cx = -6;
    const cz = -12;
    const centerH = getIslandHeight(cx, cz);
    expect(centerH).toBeGreaterThan(3.0);

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const px = cx + Math.cos(a) * 2.7;
      const pz = cz + Math.sin(a) * 2.7;
      const h = getIslandHeight(px, pz);
      expect(h).toBeGreaterThan(2.8);
      expect(Math.abs(h - centerH)).toBeLessThan(0.45);
    }
  });
});
