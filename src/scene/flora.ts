import * as THREE from 'three';
import { ISLAND_LOCATIONS } from '../data/locations';
import { distanceToStream, getIslandHeight, getTerrainNormal } from './terrain';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function isNearProtectedLandmark(x: number, z: number): boolean {
  // Защищаем радиусы вокруг построек, монумента, полей и ручья
  if (distanceToStream(x, z) < 1.9) return true;

  for (const loc of ISLAND_LOCATIONS) {
    if (loc.isWater) continue;
    const dx = x - loc.coords[0];
    const dz = z - loc.coords[1];
    const d = Math.hypot(dx, dz);
    let minClear = 3.2;
    if (loc.id === 'fortress') minClear = 5.4;
    if (loc.id === 'plantations') minClear = 4.8;
    if (loc.id === 'valley') minClear = 4.4;
    if (loc.id === 'pastures') minClear = 4.6;
    if (loc.id === 'club_monument') minClear = 5.0;
    if (loc.id === 'first_canoe') minClear = 3.6;
    if (loc.id === 'footprint_beach') minClear = 3.8;
    if (d < minClear) return true;
  }
  return false;
}

export interface FloraController {
  group: THREE.Group;
  dispose: () => void;
}

export function createIslandFlora(highQuality: boolean): FloraController {
  const group = new THREE.Group();
  group.name = 'island-flora-group';

  const rand = mulberry32(16591686);
  const dummy = new THREE.Object3D();
  const normal = new THREE.Vector3();

  // Массивы матриц трансформации для InstancedMesh
  const palmTransforms: THREE.Matrix4[] = [];
  const jungleTransforms: THREE.Matrix4[] = [];
  const citrusTransforms: THREE.Matrix4[] = [];
  const rockTransforms: THREE.Matrix4[] = [];
  const fernTransforms: THREE.Matrix4[] = [];

  const targetPalms = highQuality ? 95 : 65;
  const targetJungle = highQuality ? 160 : 105;
  const targetCitrus = highQuality ? 26 : 18;
  const targetRocks = highQuality ? 90 : 60;
  const targetFerns = highQuality ? 120 : 75;

  // 1. Пальмы (вдоль тёплых берегов и южных бухт)
  for (let attempt = 0; attempt < 900 && palmTransforms.length < targetPalms; attempt++) {
    const x = (rand() - 0.5) * 76;
    const z = (rand() - 0.5) * 58;
    const y = getIslandHeight(x, z);
    if (y < 0.32 || y > 2.8) continue;
    getTerrainNormal(x, z, normal);
    if (normal.y < 0.78) continue;
    if (isNearProtectedLandmark(x, z)) continue;

    dummy.position.set(x, y - 0.08, z);
    dummy.rotation.set((rand() - 0.5) * 0.16, rand() * Math.PI * 2, (rand() - 0.5) * 0.16);
    const s = 0.78 + rand() * 0.52;
    dummy.scale.set(s, s * (0.9 + rand() * 0.25), s);
    dummy.updateMatrix();
    palmTransforms.push(dummy.matrix.clone());
  }

  // Особое колючее дерево у Берега Отчаяния (первая ночь 30 сентября 1659)
  {
    const tx = 14.8;
    const tz = 18.2;
    const ty = getIslandHeight(tx, tz);
    if (ty > 0.2) {
      dummy.position.set(tx, ty - 0.05, tz);
      dummy.rotation.set(0.05, 0.7, -0.05);
      dummy.scale.set(1.18, 1.25, 1.18);
      dummy.updateMatrix();
      jungleTransforms.push(dummy.matrix.clone());
    }
  }

  // 2. Деревья тропических джунглей (склоны и внутренний лес)
  for (let attempt = 0; attempt < 1500 && jungleTransforms.length < targetJungle; attempt++) {
    const x = (rand() - 0.5) * 70;
    const z = (rand() - 0.5) * 50;
    const y = getIslandHeight(x, z);
    if (y < 1.2 || y > 8.2) continue;
    getTerrainNormal(x, z, normal);
    if (normal.y < 0.72) continue;
    if (isNearProtectedLandmark(x, z)) continue;

    dummy.position.set(x, y - 0.1, z);
    dummy.rotation.set((rand() - 0.5) * 0.08, rand() * Math.PI * 2, (rand() - 0.5) * 0.08);
    const s = 0.8 + rand() * 0.65;
    dummy.scale.set(s, s * (0.85 + rand() * 0.35), s);
    dummy.updateMatrix();
    jungleTransforms.push(dummy.matrix.clone());
  }

  // 3. Цитрусовые деревья в Благодатной долине (-12, 4)
  for (let attempt = 0; attempt < 400 && citrusTransforms.length < targetCitrus; attempt++) {
    const ang = rand() * Math.PI * 2;
    const r = 3.2 + rand() * 6.4;
    const x = -12 + Math.cos(ang) * r;
    const z = 4 + Math.sin(ang) * r * 0.82;
    const y = getIslandHeight(x, z);
    if (y < 1.5 || y > 5.2) continue;
    if (isNearProtectedLandmark(x, z)) continue;

    dummy.position.set(x, y - 0.05, z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    const s = 0.75 + rand() * 0.35;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    citrusTransforms.push(dummy.matrix.clone());
  }

  // 4. Прибрежные валуны и рифовые камни
  // Принудительные рифы у мест кораблекрушений и Мыса Течений
  const forcedRocks: Array<[number, number, number]> = [
    [22.5, 29.2, 1.35],
    [18.2, 26.8, 0.95],
    [-42.5, 17.5, 1.45],
    [-39.4, 14.5, 1.05],
    [35.8, 3.2, 1.35],
    [36.8, 5.4, 1.15],
    [33.5, 6.2, 0.95],
  ];
  for (const [rx, rz, rs] of forcedRocks) {
    const ry = getIslandHeight(rx, rz);
    dummy.position.set(rx, Math.max(ry, -0.35), rz);
    dummy.rotation.set(rand() * 0.5, rand() * Math.PI * 2, rand() * 0.5);
    dummy.scale.set(rs * 1.3, rs * 0.85, rs * 1.1);
    dummy.updateMatrix();
    rockTransforms.push(dummy.matrix.clone());
  }

  for (let attempt = 0; attempt < 900 && rockTransforms.length < targetRocks; attempt++) {
    const x = (rand() - 0.5) * 86;
    const z = (rand() - 0.5) * 62;
    const y = getIslandHeight(x, z);
    getTerrainNormal(x, z, normal);
    const isShore = y >= -0.4 && y <= 1.2;
    const isSteep = y > 1.2 && normal.y < 0.8;
    if (!isShore && !isSteep) continue;
    if (isNearProtectedLandmark(x, z)) continue;

    dummy.position.set(x, y - 0.12, z);
    dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    const sx = 0.5 + rand() * 1.15;
    const sy = 0.38 + rand() * 0.65;
    const sz = 0.5 + rand() * 1.15;
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    rockTransforms.push(dummy.matrix.clone());
  }

  // 5. Кусты папоротников по всему острову
  for (let attempt = 0; attempt < 900 && fernTransforms.length < targetFerns; attempt++) {
    const x = (rand() - 0.5) * 70;
    const z = (rand() - 0.5) * 52;
    const y = getIslandHeight(x, z);
    if (y < 0.7 || y > 7.5) continue;
    if (isNearProtectedLandmark(x, z)) continue;

    dummy.position.set(x, y - 0.05, z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    const s = 0.65 + rand() * 0.6;
    dummy.scale.set(s, s * 0.75, s);
    dummy.updateMatrix();
    fernTransforms.push(dummy.matrix.clone());
  }

  const disposables: Array<{ dispose: () => void }> = [];

  // Построение InstancedMesh для пальм (ствол + веерная крона)
  if (palmTransforms.length > 0) {
    const trunkGeo = createCurvedPalmTrunkGeometry();
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#7a593c', roughness: 0.92 });
    const canopyGeo = createPalmCanopyGeometry();
    const canopyMat = new THREE.MeshStandardMaterial({
      color: '#468a39',
      roughness: 0.78,
      side: THREE.DoubleSide,
    });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmTransforms.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, palmTransforms.length);
    trunks.castShadow = true;
    trunks.receiveShadow = true;
    canopies.castShadow = true;

    palmTransforms.forEach((m, idx) => {
      trunks.setMatrixAt(idx, m);
      canopies.setMatrixAt(idx, m);
    });
    group.add(trunks, canopies);
    disposables.push(trunkGeo, trunkMat, canopyGeo, canopyMat);
  }

  // Деревья джунглей (ствол + пышная многоуровневая крона)
  if (jungleTransforms.length > 0) {
    const jTrunkGeo = new THREE.CylinderGeometry(0.14, 0.25, 1.9, 6);
    jTrunkGeo.translate(0, 0.95, 0);
    const jTrunkMat = new THREE.MeshStandardMaterial({ color: '#5c432d', roughness: 0.92 });

    const jCrownGeo = createClusteredCrownGeometry();
    const jCrownMat = new THREE.MeshStandardMaterial({
      color: '#2e6a32',
      roughness: 0.85,
      flatShading: true,
    });

    const jTrunks = new THREE.InstancedMesh(jTrunkGeo, jTrunkMat, jungleTransforms.length);
    const jCrowns = new THREE.InstancedMesh(jCrownGeo, jCrownMat, jungleTransforms.length);
    jTrunks.castShadow = true;
    jCrowns.castShadow = true;
    jCrowns.receiveShadow = true;

    const tint = new THREE.Color();
    jungleTransforms.forEach((m, idx) => {
      jTrunks.setMatrixAt(idx, m);
      jCrowns.setMatrixAt(idx, m);
      tint.setHSL(0.31 + (idx % 7) * 0.01, 0.42, 0.28 + (idx % 5) * 0.025);
      jCrowns.setColorAt(idx, tint);
    });
    group.add(jTrunks, jCrowns);
    disposables.push(jTrunkGeo, jTrunkMat, jCrownGeo, jCrownMat);
  }

  // Цитрусовые рощи в Благодатной долине
  if (citrusTransforms.length > 0) {
    const cTrunkGeo = new THREE.CylinderGeometry(0.1, 0.17, 1.15, 6);
    cTrunkGeo.translate(0, 0.58, 0);
    const cTrunkMat = new THREE.MeshStandardMaterial({ color: '#614831', roughness: 0.9 });

    const cCrownGeo = new THREE.DodecahedronGeometry(0.95, 1);
    cCrownGeo.translate(0, 1.55, 0);
    const cCrownMat = new THREE.MeshStandardMaterial({
      color: '#468736',
      roughness: 0.8,
      flatShading: true,
    });

    const fruitGeo = createCitrusFruitsGeometry();
    const fruitMat = new THREE.MeshStandardMaterial({
      color: '#f2b824',
      emissive: '#3a2200',
      emissiveIntensity: 0.15,
      roughness: 0.5,
    });

    const cTrunks = new THREE.InstancedMesh(cTrunkGeo, cTrunkMat, citrusTransforms.length);
    const cCrowns = new THREE.InstancedMesh(cCrownGeo, cCrownMat, citrusTransforms.length);
    const cFruits = new THREE.InstancedMesh(fruitGeo, fruitMat, citrusTransforms.length);
    cCrowns.castShadow = true;

    citrusTransforms.forEach((m, idx) => {
      cTrunks.setMatrixAt(idx, m);
      cCrowns.setMatrixAt(idx, m);
      cFruits.setMatrixAt(idx, m);
    });
    group.add(cTrunks, cCrowns, cFruits);
    disposables.push(cTrunkGeo, cTrunkMat, cCrownGeo, cCrownMat, fruitGeo, fruitMat);
  }

  // Прибрежные и рифовые камни
  if (rockTransforms.length > 0) {
    const rockGeo = new THREE.DodecahedronGeometry(0.75, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: '#7a7367',
      roughness: 0.94,
      flatShading: true,
    });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockTransforms.length);
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    const rockTint = new THREE.Color();
    rockTransforms.forEach((m, idx) => {
      rocks.setMatrixAt(idx, m);
      rockTint.setHSL(0.08, 0.12, 0.42 + (idx % 4) * 0.05);
      rocks.setColorAt(idx, rockTint);
    });
    group.add(rocks);
    disposables.push(rockGeo, rockMat);
  }

  // Кусты папоротников (объёмные розетки из дугообразных листьев)
  if (fernTransforms.length > 0) {
    const fernGeo = createFernRosetteGeometry();
    const fernMat = new THREE.MeshStandardMaterial({
      color: '#4e883b',
      roughness: 0.85,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    const ferns = new THREE.InstancedMesh(fernGeo, fernMat, fernTransforms.length);
    ferns.receiveShadow = true;
    ferns.castShadow = true;
    fernTransforms.forEach((m, idx) => ferns.setMatrixAt(idx, m));
    group.add(ferns);
    disposables.push(fernGeo, fernMat);
  }

  return {
    group,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

function createCurvedPalmTrunkGeometry(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.22, 1.0, 0.08),
    new THREE.Vector3(0.42, 2.05, 0.15),
    new THREE.Vector3(0.55, 2.95, 0.12),
  ]);
  return new THREE.TubeGeometry(curve, 7, 0.13, 6, false);
}

function createPalmCanopyGeometry(): THREE.BufferGeometry {
  // Строим 6 дугообразных пальмовых листьев вокруг вершины (0.55, 2.95, 0.12)
  const positions: number[] = [];
  const normals: number[] = [];
  const top = new THREE.Vector3(0.55, 2.95, 0.12);
  const fronds = 6;

  for (let f = 0; f < fronds; f++) {
    const angle = (f / fronds) * Math.PI * 2;
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    const sideX = -dirZ;
    const sideZ = dirX;

    const segs = 4;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs;
      const t1 = (s + 1) / segs;
      const r0 = t0 * 1.45;
      const r1 = t1 * 1.45;
      const y0 = top.y + Math.sin(t0 * Math.PI * 0.72) * 0.48 - t0 * t0 * 0.75;
      const y1 = top.y + Math.sin(t1 * Math.PI * 0.72) * 0.48 - t1 * t1 * 0.75;
      const w0 = 0.24 * (1 - t0 * 0.65);
      const w1 = 0.24 * (1 - t1 * 0.65);

      const p0L = new THREE.Vector3(top.x + dirX * r0 - sideX * w0, y0, top.z + dirZ * r0 - sideZ * w0);
      const p0R = new THREE.Vector3(top.x + dirX * r0 + sideX * w0, y0, top.z + dirZ * r0 + sideZ * w0);
      const p1L = new THREE.Vector3(top.x + dirX * r1 - sideX * w1, y1, top.z + dirZ * r1 - sideZ * w1);
      const p1R = new THREE.Vector3(top.x + dirX * r1 + sideX * w1, y1, top.z + dirZ * r1 + sideZ * w1);

      pushTriangle(positions, normals, p0L, p1L, p1R);
      pushTriangle(positions, normals, p0L, p1R, p0R);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function createClusteredCrownGeometry(): THREE.BufferGeometry {
  // Сливаем 3 смещённые сферы (икосаэдры) в одну геометрию
  const parts = [
    { x: 0, y: 2.35, z: 0, r: 1.05 },
    { x: -0.58, y: 2.05, z: 0.32, r: 0.72 },
    { x: 0.56, y: 2.08, z: -0.28, r: 0.76 },
  ];
  const positions: number[] = [];
  const normals: number[] = [];

  for (const part of parts) {
    const sub = new THREE.DodecahedronGeometry(part.r, 0).toNonIndexed();
    sub.translate(part.x, part.y, part.z);
    sub.computeVertexNormals();
    const pos = sub.attributes.position;
    const norm = sub.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
    }
    sub.dispose();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function createCitrusFruitsGeometry(): THREE.BufferGeometry {
  const offsets: Array<[number, number, number]> = [
    [0.62, 1.52, 0.58],
    [-0.65, 1.75, 0.35],
    [0.2, 2.05, -0.68],
    [-0.25, 1.32, -0.65],
    [0.72, 1.88, -0.18],
  ];
  const positions: number[] = [];
  const normals: number[] = [];
  for (const [fx, fy, fz] of offsets) {
    const s = new THREE.SphereGeometry(0.11, 5, 5).toNonIndexed();
    s.translate(fx, fy, fz);
    const pos = s.attributes.position;
    const norm = s.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
    }
    s.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

export function createFernRosetteGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const fronds = 7;

  for (let f = 0; f < fronds; f++) {
    const isInner = f >= 5;
    const angle = (f / (isInner ? 2 : 5)) * Math.PI * 2 + (isInner ? 0.5 : 0);
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    const sideX = -dirZ;
    const sideZ = dirX;
    const maxLen = isInner ? 0.45 : 0.72;
    const maxH = isInner ? 0.58 : 0.42;

    const segs = 3;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs;
      const t1 = (s + 1) / segs;
      const r0 = 0.05 + t0 * maxLen;
      const r1 = 0.05 + t1 * maxLen;
      const y0 = 0.04 + Math.sin(t0 * Math.PI * 0.65) * maxH - t0 * t0 * 0.14;
      const y1 = 0.04 + Math.sin(t1 * Math.PI * 0.65) * maxH - t1 * t1 * 0.14;
      const w0 = 0.14 * (1 - t0 * 0.72);
      const w1 = 0.14 * (1 - t1 * 0.88);

      const p0L = new THREE.Vector3(dirX * r0 - sideX * w0, y0, dirZ * r0 - sideZ * w0);
      const p0R = new THREE.Vector3(dirX * r0 + sideX * w0, y0, dirZ * r0 + sideZ * w0);
      const p1L = new THREE.Vector3(dirX * r1 - sideX * w1, y1, dirZ * r1 - sideZ * w1);
      const p1R = new THREE.Vector3(dirX * r1 + sideX * w1, y1, dirZ * r1 + sideZ * w1);

      pushTriangle(positions, normals, p0L, p1L, p1R);
      pushTriangle(positions, normals, p0L, p1R, p0R);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function pushTriangle(
  positions: number[],
  normals: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3
): void {
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  const ab = new THREE.Vector3().subVectors(b, a);
  const ac = new THREE.Vector3().subVectors(c, a);
  const n = new THREE.Vector3().crossVectors(ab, ac).normalize();
  normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
}
