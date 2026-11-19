import * as THREE from 'three';

function fract(v: number): number {
  return v - Math.floor(v);
}

function hash2(ix: number, iz: number): number {
  return fract(Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123);
}

function smoothNoise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm2D(x: number, z: number): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    value += amp * (smoothNoise2D(x * freq, z * freq) * 2 - 1);
    freq *= 2.05;
    amp *= 0.5;
  }
  return value;
}

function gauss(x: number, z: number, cx: number, cz: number, rx: number, rz: number): number {
  const dx = (x - cx) / rx;
  const dz = (z - cz) / rz;
  return Math.exp(-(dx * dx + dz * dz));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Расстояние до кривой пресного ручья (от центрального холма через долину и поля к Южному берегу) */
export function distanceToStream(x: number, z: number): number {
  const segments: Array<[number, number]> = [
    [-4, 0],
    [-8, 3],
    [-11, 5],
    [-5, 9],
    [1, 13],
    [6, 17],
    [10, 21.5],
  ];
  let minD = Infinity;
  for (let i = 0; i < segments.length - 1; i++) {
    const [ax, az] = segments[i];
    const [bx, bz] = segments[i + 1];
    const vx = bx - ax;
    const vz = bz - az;
    const wx = x - ax;
    const wz = z - az;
    const lenSq = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / lenSq));
    const px = ax + vx * t;
    const pz = az + vz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < minD) minD = d;
  }
  return minD;
}

/**
 * Детерминированная функция рельефа острова Робинзона (уровень моря = 0).
 * Координаты согласованы с `src/data/locations.ts`.
 */
export function getIslandHeight(x: number, z: number): number {
  // Базовое океанское дно
  let h = -3.8;

  // Основное тело острова (вытянутое с запада на восток, с изгибом к северу)
  h += 4.3 * gauss(x, z, -2, 0, 27, 19);
  h += 2.6 * gauss(x, z, 15, -4, 16, 15);
  h += 2.4 * gauss(x, z, -19, 6, 14, 14);

  // Полуострова и мысы
  h += 3.9 * gauss(x, z, 31, 4, 8.5, 6.0); // Мыс Сильного Течения
  h += 3.2 * gauss(x, z, 21, -12, 8.0, 6.2); // Северо-Восточная земля у бухты
  h += 3.4 * gauss(x, z, -26, 6, 7.5, 7.5); // Западный пляж
  h += 3.1 * gauss(x, z, -20, 17, 7.2, 6.5); // Юго-Западный берег (Пятница)
  h += 3.2 * gauss(x, z, 11, 18.5, 7.5, 5.5); // Берег Отчаяния

  // Главные вершины и скалы
  h += 7.5 * gauss(x, z, -2, -4, 7.6, 6.8); // Холм Разведки (высшая точка ~10.3)
  h += 4.4 * gauss(x, z, 8, 4.5, 4.6, 4.0); // Отвесная скала позади Крепости
  h += 3.5 * gauss(x, z, -17, -7, 5.2, 4.8); // Скальный отрог Тайного грота
  h += 2.9 * gauss(x, z, -6, -12, 7.2, 5.5); // Северное плато козьих пастбищ
  h += 2.2 * gauss(x, z, 12, -14, 6.8, 5.6); // Лесной массив первой пироги
  h += 3.4 * gauss(x, z, 20, 12, 4.6, 4.2); // Восточный утёс монумента клуба

  // Естественные выемки бухт
  h -= 2.9 * gauss(x, z, 25, -16, 4.2, 3.8); // Глубина Северо-Восточной бухты
  h -= 2.3 * gauss(x, z, 15, 23.5, 5.5, 4.0); // Южная бухта причаливания
  h -= 2.4 * gauss(x, z, -10, 22, 8.5, 5.5); // Глубокий южный залив (рейд фрегата)
  h -= 1.9 * gauss(x, z, -28, 22, 6.0, 5.0); // Бухта у ЮЗ берега
  h -= 1.6 * gauss(x, z, 4, -20, 9.0, 5.5); // Северная бухта

  // Подводные рифы крушений (чуть ниже 0, чтобы отмель читалась, но была под водой)
  const reef1659 = gauss(x, z, 20, 28, 4.2, 3.6);
  h += 2.45 * reef1659;
  const reef1683 = gauss(x, z, -41, 16, 4.4, 3.8);
  h += 2.85 * reef1683;

  // Природный мультиоктавный микрорельеф (мягче на ровных террасах)
  const detail = fbm2D(x * 0.11, z * 0.11) * 0.72 + fbm2D(x * 0.27 + 7, z * 0.27 - 3) * 0.24;
  const landMask = smoothstep(-2.4, 1.5, h);
  h += detail * (0.35 + 0.65 * landMask);

  // Благодатная долина (-12, 4) — живописная вогнутая чаша
  const valleyBowl = gauss(x, z, -12, 4, 5.8, 4.8);
  h = h * (1 - valleyBowl * 0.55) + 2.8 * (valleyBowl * 0.55);

  // Терраса Крепости (10, 10) — ровная площадка у подножия скалы
  const fortPad = gauss(x, z, 10, 10, 3.4, 3.1);
  h = h * (1 - fortPad * 0.88) + 2.15 * (fortPad * 0.88);

  // Поля ячменя (3, 14) — ровный плодородный склон
  const fieldsPad = gauss(x, z, 3, 14, 3.8, 3.2);
  h = h * (1 - fieldsPad * 0.75) + 1.65 * (fieldsPad * 0.75);

  // Площадка монумента клуба (20, 12) — ровная вершина утёса для устойчивой посадки 3D-логотипа
  const monumentPad = gauss(x, z, 20, 12, 3.3, 3.1);
  h = h * (1 - monumentPad * 0.92) + 4.45 * (monumentPad * 0.92);

  // Пологая береговая посадка в точках Берега Отчаяния, Западного пляжа, Бухты лодки и ЮЗ берега
  const landingPad = gauss(x, z, 12, 20, 3.2, 2.8);
  h = h * (1 - landingPad * 0.8) + 0.62 * (landingPad * 0.8);

  const westBeachPad = gauss(x, z, -28, 6, 3.6, 3.2);
  h = h * (1 - westBeachPad * 0.82) + 0.55 * (westBeachPad * 0.82);

  const harborPad = gauss(x, z, 23, -13, 2.8, 2.6);
  h = h * (1 - harborPad * 0.82) + 0.68 * (harborPad * 0.82);

  const cannibalPad = gauss(x, z, -21, 19, 3.2, 2.8);
  h = h * (1 - cannibalPad * 0.8) + 0.68 * (cannibalPad * 0.8);

  // Русло пресного ручья (слегка углубляем)
  const streamD = distanceToStream(x, z);
  const streamCarve = 1 - smoothstep(0.3, 1.5, streamD);
  if (h > 0.1) {
    h -= streamCarve * 0.35 * smoothstep(0.1, 1.0, h);
  }

  // Гарантируем, что морские рифы и рейд остаются ниже уровня моря
  if (reef1659 > 0.35) {
    h = Math.min(h, -0.45);
  }
  if (reef1683 > 0.35) {
    h = Math.min(h, -0.55);
  }

  return h;
}

/** Нормаль рельефа через центральные конечные разности */
export function getTerrainNormal(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
  const eps = 0.45;
  const hL = getIslandHeight(x - eps, z);
  const hR = getIslandHeight(x + eps, z);
  const hD = getIslandHeight(x, z - eps);
  const hU = getIslandHeight(x, z + eps);
  return out.set(hL - hR, 2 * eps, hD - hU).normalize();
}

export interface TerrainBuildResult {
  group: THREE.Group;
  heightTexture: THREE.DataTexture;
}

const TERRAIN_WORLD_WIDTH = 128;
const TERRAIN_WORLD_DEPTH = 112;

/**
 * Генерирует 3D-меш острова с вертексной палитрой биомов,
 * отдельной лентой пресного ручья и текстурой высот для шейдера океана.
 */
export function createIslandTerrain(highQuality: boolean): TerrainBuildResult {
  const group = new THREE.Group();
  group.name = 'island-terrain-group';

  const segX = highQuality ? 168 : 124;
  const segZ = highQuality ? 148 : 108;

  const geometry = new THREE.PlaneGeometry(TERRAIN_WORLD_WIDTH, TERRAIN_WORLD_DEPTH, segX, segZ);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  const cDeepSand = new THREE.Color('#9c8660');
  const cWetSand = new THREE.Color('#ccb387');
  const cBeach = new THREE.Color('#e6d4ad');
  const cGrassWarm = new THREE.Color('#83a34d');
  const cJungle = new THREE.Color('#3b6d34');
  const cDeepJungle = new THREE.Color('#285128');
  const cCliff = new THREE.Color('#8e7c64');
  const cPeakStone = new THREE.Color('#b0a18a');
  const cStreamBank = new THREE.Color('#4a7642');
  const tempColor = new THREE.Color();

  // Первая проходка: выставляем Y
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getIslandHeight(x, z));
  }
  geometry.computeVertexNormals();

  const normals = geometry.attributes.normal as THREE.BufferAttribute;

  // Вторая проходка: окрашиваем биомы по высоте, крутизне и руслу ручья
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = normals.getY(i);
    const slope = 1 - Math.max(0, Math.min(1, ny));

    if (y < -0.5) {
      tempColor.copy(cDeepSand);
    } else if (y < 0.25) {
      tempColor.lerpColors(cWetSand, cBeach, smoothstep(-0.5, 0.25, y));
    } else if (y < 1.15) {
      tempColor.lerpColors(cBeach, cGrassWarm, smoothstep(0.25, 1.15, y));
    } else if (y < 3.6) {
      tempColor.lerpColors(cGrassWarm, cJungle, smoothstep(1.15, 3.6, y));
    } else if (y < 7.2) {
      tempColor.lerpColors(cJungle, cDeepJungle, smoothstep(3.6, 7.2, y));
    } else {
      tempColor.lerpColors(cDeepJungle, cPeakStone, smoothstep(7.2, 10.2, y));
    }

    // Крутые склоны становятся каменистыми утесами
    if (y > 0.7 && slope > 0.18) {
      const rockMix = smoothstep(0.18, 0.48, slope);
      tempColor.lerp(cCliff, rockMix * 0.85);
    }

    // Влажный берег вдоль ручья
    const streamD = distanceToStream(x, z);
    if (y > 0.15 && streamD < 1.6) {
      tempColor.lerp(cStreamBank, (1 - smoothstep(0.3, 1.6, streamD)) * 0.55);
    }

    // Лёгкая цветовая вариация по шуму, чтобы поверхность была живой
    const grain = (smoothNoise2D(x * 0.35, z * 0.35) - 0.5) * 0.06;
    colors[i * 3] = Math.min(1, Math.max(0, tempColor.r + grain));
    colors[i * 3 + 1] = Math.min(1, Math.max(0, tempColor.g + grain));
    colors[i * 3 + 2] = Math.min(1, Math.max(0, tempColor.b + grain * 0.8));
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: false,
  });

  const terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  terrainMesh.name = 'island-terrain-mesh';
  group.add(terrainMesh);

  // Пресный ручей в виде мягкой ленты воды поверх углубления русла
  const streamMesh = createFreshStreamMesh();
  group.add(streamMesh);

  // 128x128 карта высот острова для точной береговой пены и бирюзовой отмели в шейдере океана
  const heightTexture = buildHeightDataTexture(128, 128);

  return { group, heightTexture };
}

function createFreshStreamMesh(): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-4, 0, 0),
      new THREE.Vector3(-8, 0, 3),
      new THREE.Vector3(-11, 0, 5),
      new THREE.Vector3(-5, 0, 9),
      new THREE.Vector3(1, 0, 13),
      new THREE.Vector3(6, 0, 17),
      new THREE.Vector3(10, 0, 21.5),
    ].map((p) => {
      p.y = Math.max(getIslandHeight(p.x, p.z) + 0.14, 0.06);
      return p;
    })
  );

  const tube = new THREE.TubeGeometry(curve, 64, 0.38, 6, false);
  // Сплющиваем сечение ручья по вертикали
  const p = tube.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const groundY = Math.max(getIslandHeight(x, z), 0.02);
    const currentY = p.getY(i);
    const rel = currentY - groundY;
    p.setY(i, groundY + Math.max(0.05, rel * 0.35));
  }
  tube.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: '#4ab8c8',
    emissive: '#144c58',
    emissiveIntensity: 0.25,
    roughness: 0.18,
    metalness: 0.12,
    transparent: true,
    opacity: 0.88,
  });

  const mesh = new THREE.Mesh(tube, mat);
  mesh.name = 'island-fresh-stream';
  return mesh;
}

function buildHeightDataTexture(width: number, height: number): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    // v = 0..1 соответствует z от -TERRAIN_WORLD_DEPTH/2 до +TERRAIN_WORLD_DEPTH/2
    const vz = row / (height - 1);
    const z = (vz - 0.5) * TERRAIN_WORLD_DEPTH;
    for (let col = 0; col < width; col++) {
      const ux = col / (width - 1);
      const x = (ux - 0.5) * TERRAIN_WORLD_WIDTH;
      const h = getIslandHeight(x, z);
      // Нормализуем диапазон [-4.5, 11.5] в [0, 255]
      const norm = Math.max(0, Math.min(1, (h + 4.5) / 16.0));
      const byte = Math.round(norm * 255);
      const idx = (row * width + col) * 4;
      data[idx] = byte;
      data[idx + 1] = byte;
      data[idx + 2] = byte;
      data[idx + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export { TERRAIN_WORLD_WIDTH, TERRAIN_WORLD_DEPTH };
