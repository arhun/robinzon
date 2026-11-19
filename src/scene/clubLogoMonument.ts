import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import clubLogoSvgRaw from '../assets/logo.svg?raw';
import { createFernRosetteGeometry } from './flora';
import { getIslandHeight } from './terrain';

export interface LogoGeometryBuildResult {
  geometry: THREE.ExtrudeGeometry;
  shapes: THREE.Shape[];
  holesCount: number;
}

/**
 * Преобразует исходный SVG клуба в 3D-геометрию с сохранением пропорций,
 * внутренних арок-вырезов и корректных нормалей (без отрицательного масштаба).
 */
export function buildClubLogoGeometry(svgMarkup: string): LogoGeometryBuildResult {
  const loader = new SVGLoader();
  const data = loader.parse(svgMarkup);

  const shapes: THREE.Shape[] = [];
  let holesCount = 0;
  for (const path of data.paths) {
    const pathShapes = SVGLoader.createShapes(path);
    for (const s of pathShapes) {
      shapes.push(s);
      holesCount += s.holes.length;
    }
  }

  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: 92,
    bevelEnabled: true,
    bevelThickness: 12,
    bevelSize: 8,
    bevelSegments: 4,
    curveSegments: 24,
  });

  geometry.center();
  // Поворот вокруг X на 180° поднимает SVG-ось Y вверх без зеркалирования X и без выворачивания граней
  geometry.rotateX(Math.PI);
  geometry.scale(0.0096, 0.0096, 0.0096);
  geometry.computeVertexNormals();

  return { geometry, shapes, holesCount };
}

export interface ClubLogoMonumentController {
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  dispose: () => void;
}

/**
 * Создаёт каменный монумент клуба на восточном утёсе (20, 12):
 * экструзия `logo.svg`, процедурный замшелый камень (GLSL `onBeforeCompile`),
 * объёмные 3D-подушки мха на верхних кромках, свисающие лианы и папоротник у цоколя.
 */
export function createClubLogoMonument(): ClubLogoMonumentController {
  const group = new THREE.Group();
  group.name = 'club-logo-monument';

  const anchorX = 20;
  const anchorZ = 12;
  const groundY = getIslandHeight(anchorX, anchorZ);
  group.position.set(anchorX, groundY, anchorZ);
  group.rotation.y = 0.36; // Развёрнут к южной/юго-восточной камере и морю

  const disposables: Array<{ dispose: () => void }> = [];

  // 1. Скальный пьедестал, врастающий в склон утёса
  const pedestalGroup = new THREE.Group();
  const pedestalMat = createMossyStoneMaterial('#8f826d', 0.92, 0.72);
  disposables.push(pedestalMat);

  const rockSpecs: Array<[number, number, number, number, number, number]> = [
    [0, 0.35, 0, 3.1, 1.0, 2.2],
    [-1.7, 0.15, 0.65, 1.5, 0.85, 1.3],
    [1.85, 0.2, -0.4, 1.6, 0.95, 1.35],
    [0.45, 0.12, 1.25, 1.75, 0.7, 1.15],
    [-0.9, 0.18, -1.1, 1.5, 0.8, 1.1],
  ];
  const baseRockGeo = new THREE.DodecahedronGeometry(1.0, 1);
  disposables.push(baseRockGeo);

  for (const [rx, ry, rz, sx, sy, sz] of rockSpecs) {
    const rMesh = new THREE.Mesh(baseRockGeo, pedestalMat);
    rMesh.position.set(rx, ry, rz);
    rMesh.scale.set(sx, sy, sz);
    rMesh.rotation.set(rx * 0.15, rz * 0.4, ry * 0.2);
    rMesh.castShadow = true;
    rMesh.receiveShadow = true;
    pedestalGroup.add(rMesh);
  }
  group.add(pedestalGroup);

  // 2. Трёхмерный логотип клуба
  const { geometry: logoGeo } = buildClubLogoGeometry(clubLogoSvgRaw);
  disposables.push(logoGeo);

  logoGeo.computeBoundingBox();
  const bbox = logoGeo.boundingBox!;
  const logoHeight = bbox.max.y - bbox.min.y;

  const logoMaterial = createMossyStoneMaterial('#B5A58C', 0.86, 0.95);
  disposables.push(logoMaterial);

  const logoMesh = new THREE.Mesh(logoGeo, logoMaterial);
  logoMesh.name = 'club-logo-mesh';
  logoMesh.userData.locationId = 'club_monument';
  logoMesh.castShadow = true;
  logoMesh.receiveShadow = true;

  // Устанавливаем логотип чуть вросшим в каменный цоколь с лёгким натуральным наклоном назад
  const logoMount = new THREE.Group();
  logoMount.position.set(0, 0.72 + logoHeight * 0.48, 0);
  logoMount.rotation.x = -0.09;
  logoMount.add(logoMesh);
  group.add(logoMount);

  // 3. Физические объёмные 3D-подушки мха прямо на верхних кромках логотипа
  const mossCushionPositions = sampleTopSurfaces(logoGeo, 88);
  if (mossCushionPositions.length > 0) {
    const cushionGeo = new THREE.DodecahedronGeometry(0.16, 1);
    cushionGeo.scale(1.35, 0.62, 1.15);
    const cushionMat = new THREE.MeshStandardMaterial({
      color: '#4f7f38',
      roughness: 0.96,
      metalness: 0.0,
      flatShading: true,
    });
    const cushions = new THREE.InstancedMesh(cushionGeo, cushionMat, mossCushionPositions.length);
    cushions.castShadow = true;
    cushions.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    mossCushionPositions.forEach((pt, idx) => {
      dummy.position.copy(pt);
      dummy.rotation.set(((idx * 17) % 10) * 0.04, idx * 1.1, ((idx * 13) % 10) * 0.04);
      const scale = 0.7 + ((idx * 29) % 10) * 0.07;
      dummy.scale.set(scale, scale * 0.85, scale);
      dummy.updateMatrix();
      cushions.setMatrixAt(idx, dummy.matrix);

      tint.setHSL(0.26 + (idx % 4) * 0.015, 0.44, 0.28 + (idx % 5) * 0.03);
      cushions.setColorAt(idx, tint);
    });
    logoMount.add(cushions);
    disposables.push(cushionGeo, cushionMat);
  }

  // 4. Свисающие лианы и мелкие листочки вдоль изгибов логотипа
  const vineMat = new THREE.MeshStandardMaterial({ color: '#396127', roughness: 0.9 });
  const leafGeo = new THREE.OctahedronGeometry(0.11, 0);
  leafGeo.scale(1.2, 0.4, 0.85);
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#5c913e',
    roughness: 0.82,
    flatShading: true,
  });
  disposables.push(vineMat, leafGeo, leafMat);

  const vinePaths: Array<Array<[number, number, number]>> = [
    [
      [-1.7, 2.35, 0.52],
      [-1.8, 1.55, 0.56],
      [-1.62, 0.65, 0.5],
      [-1.75, -0.35, 0.45],
    ],
    [
      [-0.25, 2.38, -0.48],
      [0.05, 1.65, -0.52],
      [0.35, 0.85, -0.45],
      [0.15, 0.05, -0.5],
    ],
    [
      [1.2, 2.35, 0.48],
      [1.45, 1.62, 0.55],
      [1.3, 0.95, 0.42],
      [0.82, 0.35, 0.52],
    ],
    [
      [2.1, 1.75, 0.42],
      [2.32, 0.95, 0.48],
      [1.92, 0.25, 0.5],
    ],
    [
      [0.85, -0.15, 0.48],
      [1.35, -0.82, 0.54],
      [1.55, -1.65, 0.48],
      [1.25, -2.25, 0.52],
    ],
    [
      [-1.55, -0.85, -0.48],
      [-1.42, -1.55, -0.52],
      [-1.6, -2.2, -0.46],
    ],
    [
      [2.15, -0.8, -0.4],
      [2.35, -1.55, -0.48],
      [2.05, -2.15, -0.42],
    ],
  ];

  const leafPositions: THREE.Vector3[] = [];
  for (const pts of vinePaths) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const vineGeo = new THREE.TubeGeometry(curve, 14, 0.036, 5, false);
    const vineMesh = new THREE.Mesh(vineGeo, vineMat);
    vineMesh.castShadow = true;
    logoMount.add(vineMesh);
    disposables.push(vineGeo);

    for (let s = 0.15; s <= 0.95; s += 0.2) {
      leafPositions.push(curve.getPointAt(s));
    }
  }

  if (leafPositions.length > 0) {
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafPositions.length);
    const dummy = new THREE.Object3D();
    leafPositions.forEach((pt, idx) => {
      dummy.position.copy(pt);
      dummy.rotation.set(idx * 0.7, idx * 1.4, idx * 0.5);
      dummy.scale.setScalar(0.85 + (idx % 3) * 0.22);
      dummy.updateMatrix();
      leaves.setMatrixAt(idx, dummy.matrix);
    });
    logoMount.add(leaves);
  }

  // 5. Пышные кусты папоротников у подножия монумента
  const fernGeo = createFernRosetteGeometry();
  const fernMat = new THREE.MeshStandardMaterial({
    color: '#4c8236',
    roughness: 0.86,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  disposables.push(fernGeo, fernMat);

  const fernSpots: Array<[number, number, number, number]> = [
    [-2.1, 0.52, 0.95, 1.05],
    [2.15, 0.52, 0.75, 1.1],
    [-0.45, 0.6, 1.05, 0.9],
    [1.1, 0.56, -0.95, 0.95],
    [-1.4, 0.54, -0.85, 0.85],
  ];
  const ferns = new THREE.InstancedMesh(fernGeo, fernMat, fernSpots.length);
  const fDummy = new THREE.Object3D();
  fernSpots.forEach(([fx, fy, fz, fs], idx) => {
    fDummy.position.set(fx, fy, fz);
    fDummy.rotation.set(0, idx * 1.2, 0);
    fDummy.scale.setScalar(fs);
    fDummy.updateMatrix();
    ferns.setMatrixAt(idx, fDummy.matrix);
  });
  group.add(ferns);

  return {
    group,
    hitMesh: logoMesh,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

/**
 * Создаёт материал состаренного камня с процедурным 3D-мхом и лишайником через `onBeforeCompile`.
 * Явно вычисляет мировую позицию и нормаль без опоры на скрытую директиву `worldPosition`.
 */
function createMossyStoneMaterial(
  baseHex: string,
  roughness: number,
  mossCoverage: number
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: baseHex,
    roughness,
    metalness: 0.04,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uMossCoverage = { value: mossCoverage };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        varying vec3 vMossWorldPos;
        varying vec3 vMossWorldNormal;
        varying vec3 vMossLocalPos;
        `
      )
      .replace(
        '#include <worldpos_vertex>',
        /* glsl */ `
        #include <worldpos_vertex>
        vec4 mossWp = modelMatrix * vec4(transformed, 1.0);
        vMossWorldPos = mossWp.xyz;
        vMossWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
        vMossLocalPos = transformed;
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uMossCoverage;
        varying vec3 vMossWorldPos;
        varying vec3 vMossWorldNormal;
        varying vec3 vMossLocalPos;

        float mossHash(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float mossNoise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(
              mix(mossHash(i + vec3(0, 0, 0)), mossHash(i + vec3(1, 0, 0)), f.x),
              mix(mossHash(i + vec3(0, 1, 0)), mossHash(i + vec3(1, 1, 0)), f.x),
              f.y
            ),
            mix(
              mix(mossHash(i + vec3(0, 0, 1)), mossHash(i + vec3(1, 0, 1)), f.x),
              mix(mossHash(i + vec3(0, 1, 1)), mossHash(i + vec3(1, 1, 1)), f.x),
              f.y
            ),
            f.z
          );
        }

        float mossFbm(vec3 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * mossNoise(p);
            p = p * 2.08 + vec3(1.7, 9.2, 4.3);
            a *= 0.5;
          }
          return v;
        }
        `
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
        #include <color_fragment>
        float n1 = mossFbm(vMossWorldPos * 1.15);
        float n2 = mossFbm(vMossWorldPos * 3.8 + vec3(5.2));

        // Тёплое выветривание песчаника и потемнение в трещинах
        vec3 darkStone = diffuseColor.rgb * 0.58;
        vec3 weatheredStone = mix(darkStone, diffuseColor.rgb * 1.06, smoothstep(0.28, 0.72, n1));

        // Верхние полки и фаски мягко покрываются густым мхом
        float topMask = smoothstep(0.08, 0.68, vMossWorldNormal.y + (n1 - 0.42) * 0.52);
        // Нижняя часть монумента, врастающая в утёс, также зарастает мхом
        float baseMask = (1.0 - smoothstep(-2.45, -0.5, vMossLocalPos.y)) * (0.5 + 0.5 * n1);
        // Пятна лишайника на вертикальных гранях
        float sideSpots = smoothstep(0.56, 0.78, n1 * 0.65 + n2 * 0.35) * 0.78;

        float mossAmount = clamp(max(max(topMask, baseMask), sideSpots) * uMossCoverage, 0.0, 0.94);

        vec3 deepMoss = vec3(0.16, 0.30, 0.12);
        vec3 lushMoss = vec3(0.35, 0.53, 0.21);
        vec3 mossCol = mix(deepMoss, lushMoss, smoothstep(0.3, 0.78, n2));

        diffuseColor.rgb = mix(weatheredStone, mossCol, mossAmount);
        `
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
        #include <roughnessmap_fragment>
        float mossRoughN = mossFbm(vMossWorldPos * 1.15);
        float mossRoughTop = smoothstep(0.22, 0.74, vMossWorldNormal.y + (mossRoughN - 0.45) * 0.42);
        roughnessFactor = mix(roughnessFactor, 0.97, clamp(mossRoughTop * uMossCoverage, 0.0, 1.0));
        `
      );
  };

  mat.customProgramCacheKey = () => `mossy-stone-${mossCoverage.toFixed(2)}`;
  return mat;
}

/** Семплирует верхние горизонтальные полки геометрии логотипа для рассадки 3D-подушек мха */
function sampleTopSurfaces(geometry: THREE.BufferGeometry, targetCount: number): THREE.Vector3[] {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const norm = geometry.attributes.normal as THREE.BufferAttribute;
  if (!pos || !norm) return [];

  const candidates: THREE.Vector3[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const nA = new THREE.Vector3();
  const nB = new THREE.Vector3();
  const nC = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    nA.fromBufferAttribute(norm, i);
    nB.fromBufferAttribute(norm, i + 1);
    nC.fromBufferAttribute(norm, i + 2);
    const avgNy = (nA.y + nB.y + nC.y) / 3;
    if (avgNy > 0.52) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      c.fromBufferAttribute(pos, i + 2);
      const ab = new THREE.Vector3().subVectors(b, a);
      const ac = new THREE.Vector3().subVectors(c, a);
      const area = ab.cross(ac).length() * 0.5;
      const samples = Math.min(8, Math.max(1, Math.round(area * 12)));
      for (let s = 0; s < samples; s++) {
        // Квазиравномерные барицентрические координаты внутри треугольника
        const u = ((s * 0.6180339887) % 1) * 0.8 + 0.1;
        const v = ((s * 0.3819660113 + 0.25) % 1) * (1 - u);
        const w = 1 - u - v;
        const pt = new THREE.Vector3()
          .addScaledVector(a, u)
          .addScaledVector(b, v)
          .addScaledVector(c, w);
        pt.y += 0.04;
        candidates.push(pt);
      }
    }
  }

  if (candidates.length === 0) return [];
  const picked: THREE.Vector3[] = [];
  const step = Math.max(1, Math.floor(candidates.length / targetCount));
  for (let i = 0; i < candidates.length && picked.length < targetCount; i += step) {
    const pt = candidates[i];
    // Фильтруем слишком близкие дубликаты
    let tooClose = false;
    for (const existing of picked) {
      if (existing.distanceToSquared(pt) < 0.08) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) picked.push(pt);
  }
  return picked;
}
