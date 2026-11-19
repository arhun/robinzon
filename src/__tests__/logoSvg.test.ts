import { describe, expect, it } from 'vitest';
import logoSvgRaw from '../assets/logo.svg?raw';
import { buildClubLogoGeometry } from '../scene/clubLogoMonument';

describe('3D-геометрия логотипа клуба из SVG', () => {
  it('парсит logo.svg и сохраняет 2 внутренних выреза (holes)', () => {
    const { geometry, shapes, holesCount } = buildClubLogoGeometry(logoSvgRaw);

    expect(shapes.length).toBeGreaterThanOrEqual(1);
    expect(holesCount).toBe(2);

    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    expect(pos.count).toBeGreaterThan(200);
    expect(norm.count).toBe(pos.count);

    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const sizeX = box.max.x - box.min.x;
    const sizeY = box.max.y - box.min.y;
    const sizeZ = box.max.z - box.min.z;

    expect(sizeX).toBeGreaterThan(4.5);
    expect(sizeY).toBeGreaterThan(4.0);
    expect(sizeZ).toBeGreaterThan(0.7);

    // Проверяем отсутствие NaN в нормалях и координатах
    for (let i = 0; i < pos.count; i++) {
      expect(Number.isFinite(pos.getX(i))).toBe(true);
      expect(Number.isFinite(pos.getY(i))).toBe(true);
      expect(Number.isFinite(pos.getZ(i))).toBe(true);
      expect(Number.isFinite(norm.getX(i))).toBe(true);
      expect(Number.isFinite(norm.getY(i))).toBe(true);
      expect(Number.isFinite(norm.getZ(i))).toBe(true);
    }

    geometry.dispose();
  });
});
