import * as THREE from 'three';
import type { MapMode } from '../types/island';
import { getIslandHeight } from './terrain';

export interface LandmarksController {
  group: THREE.Group;
  interactiveMeshes: THREE.Object3D[];
  update: (stage: number, mode: MapMode, isNight: boolean, elapsed: number) => void;
  dispose: () => void;
}

function tagInteractive(obj: THREE.Object3D, locationId: string, list: THREE.Object3D[]): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.userData.locationId = locationId;
      child.castShadow = true;
      child.receiveShadow = true;
      list.push(child);
    }
  });
}

export function createIslandLandmarks(): LandmarksController {
  const group = new THREE.Group();
  group.name = 'island-landmarks-group';

  const interactiveMeshes: THREE.Object3D[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  // Общие материалы
  const woodDark = new THREE.MeshStandardMaterial({ color: '#5c3c24', roughness: 0.9 });
  const woodMid = new THREE.MeshStandardMaterial({ color: '#875c38', roughness: 0.88 });
  const woodLight = new THREE.MeshStandardMaterial({ color: '#b88b58', roughness: 0.86 });
  const sailMat = new THREE.MeshStandardMaterial({
    color: '#f2e8d2',
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const stoneDark = new THREE.MeshStandardMaterial({ color: '#59534a', roughness: 0.94 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: '#a88c62', roughness: 0.92 });
  const foliageGreen = new THREE.MeshStandardMaterial({ color: '#457d34', roughness: 0.84 });
  const wheatGold = new THREE.MeshStandardMaterial({ color: '#d8b44c', roughness: 0.82 });
  const emberMat = new THREE.MeshStandardMaterial({
    color: '#ff6f24',
    emissive: '#ff5100',
    emissiveIntensity: 1.8,
    roughness: 0.4,
  });
  const goatWhite = new THREE.MeshStandardMaterial({ color: '#e9e1d2', roughness: 0.88 });
  const goatBrown = new THREE.MeshStandardMaterial({ color: '#8a684a', roughness: 0.9 });

  disposables.push(
    woodDark,
    woodMid,
    woodLight,
    sailMat,
    stoneDark,
    ropeMat,
    foliageGreen,
    wheatGold,
    emberMat,
    goatWhite,
    goatBrown
  );

  // 1a. Целый наклонённый корабль 1659 (stage 1..2)
  const intactShip = buildSailingShip({
    scale: 1.0,
    hullColor: '#5c3b24',
    sailMat,
    woodDark,
    woodMid,
    damaged: true,
    flagColor: '#c94032',
    disposables,
  });
  intactShip.position.set(20, -0.05, 28);
  intactShip.rotation.set(0.14, -0.55, -0.22);
  tagInteractive(intactShip, 'shipwreck', interactiveMeshes);
  group.add(intactShip);

  // 1b. Полузатонувшие обломки рифа 1659 (stage >= 3 и в режиме 'all')
  const wreckRibs = new THREE.Group();
  const hullRemnant = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 3.8), woodDark);
  hullRemnant.position.y = -0.15;
  wreckRibs.add(hullRemnant);
  for (let i = -1.2; i <= 1.2; i += 0.6) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, 0.14), woodMid);
    rib.position.set(0, 0.15, i);
    rib.rotation.z = 0.28;
    wreckRibs.add(rib);
  }
  const brokenMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 2.2, 6), woodLight);
  brokenMast.position.set(0.1, 0.85, 0.2);
  brokenMast.rotation.z = -0.45;
  wreckRibs.add(brokenMast);
  wreckRibs.position.set(20, 0, 28);
  wreckRibs.rotation.set(0.1, -0.6, 0.22);
  tagInteractive(wreckRibs, 'shipwreck', interactiveMeshes);
  group.add(wreckRibs);

  // 2. Плот у Берега Отчаяния (stage 2..4)
  const raftGroup = new THREE.Group();
  for (let i = -2; i <= 2; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6), woodMid);
    log.rotation.x = Math.PI / 2;
    log.position.set(i * 0.25, 0.12, 0);
    raftGroup.add(log);
  }
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.55), woodLight);
  crate.position.set(0.15, 0.38, 0.1);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.48, 8), woodDark);
  barrel.position.set(-0.35, 0.4, -0.2);
  raftGroup.add(crate, barrel);
  raftGroup.position.set(14.5, 0.08, 22.8);
  raftGroup.rotation.y = -0.65;
  tagInteractive(raftGroup, 'shipwreck', interactiveMeshes);
  group.add(raftGroup);

  // 3. Крест-календарь на Берегу Отчаяния (stage >= 3)
  const crossGroup = new THREE.Group();
  const crossPost = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.0, 0.22), woodMid);
  crossPost.position.y = 1.0;
  const crossArm = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.18), woodMid);
  crossArm.position.y = 1.48;
  crossGroup.add(crossPost, crossArm);
  crossGroup.position.set(12, getIslandHeight(12, 20) - 0.05, 20);
  crossGroup.rotation.y = 0.2;
  tagInteractive(crossGroup, 'landing', interactiveMeshes);
  group.add(crossGroup);

  // 4. Веха-маячок на Холме Разведки (stage >= 4)
  const lookoutGroup = new THREE.Group();
  const cairn = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), stoneDark);
  cairn.scale.set(1.2, 0.8, 1.2);
  cairn.position.y = 0.25;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.7, 6), woodMid);
  pole.position.y = 1.05;
  const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), sailMat);
  pennant.position.set(0.36, 1.65, 0);
  lookoutGroup.add(cairn, pole, pennant);
  lookoutGroup.position.set(-2, getIslandHeight(-2, -4) - 0.05, -4);
  tagInteractive(lookoutGroup, 'lookout', interactiveMeshes);
  group.add(lookoutGroup);

  // 5. Крепость («Замок») (stage >= 5) + живая изгородь (stage >= 9) + двойной вал (stage >= 15)
  const fortressGroup = new THREE.Group();
  const fY = getIslandHeight(10, 10);
  fortressGroup.position.set(10, fY, 10);

  // Каменный вход в пещеру у задней стены
  const caveArch = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.42, 7, 10, Math.PI), stoneDark);
  caveArch.position.set(-0.3, 0.2, -1.9);
  const caveBack = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 10, 0, Math.PI),
    new THREE.MeshBasicMaterial({ color: '#14110f' })
  );
  caveBack.position.set(-0.3, 0.2, -1.85);
  fortressGroup.add(caveArch, caveBack);

  // Парусиновая палатка
  const tentGeo = new THREE.ConeGeometry(1.15, 1.35, 4);
  tentGeo.rotateY(Math.PI / 4);
  const tent = new THREE.Mesh(tentGeo, sailMat);
  tent.position.set(0.55, 0.65, -0.75);
  fortressGroup.add(tent);

  // Полукруглый внутренний частокол
  const stakeGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.45, 5);
  for (let i = 0; i < 16; i++) {
    const t = -Math.PI * 0.1 + (i / 15) * Math.PI * 1.2;
    const sx = Math.cos(t) * 2.35;
    const sz = Math.sin(t) * 2.15 - 0.5;
    const stake = new THREE.Mesh(stakeGeo, woodMid);
    stake.position.set(sx, 0.68, sz);
    stake.rotation.z = (Math.sin(i * 1.7) * 0.04);
    fortressGroup.add(stake);
  }

  // Приставная лестница
  const ladder = new THREE.Group();
  for (const lx of [-0.18, 0.18]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 5), woodLight);
    rail.position.x = lx;
    ladder.add(rail);
  }
  for (let r = -0.6; r <= 0.6; r += 0.3) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 4), woodLight);
    rung.rotation.z = Math.PI / 2;
    rung.position.y = r;
    ladder.add(rung);
  }
  ladder.position.set(1.25, 0.78, 1.45);
  ladder.rotation.set(-0.35, 0.55, 0);
  fortressGroup.add(ladder);

  // Костёр в Крепости
  const fortFireGroup = new THREE.Group();
  fortFireGroup.position.set(-0.7, 0.06, 0.45);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6), emberMat);
  flame.position.y = 0.25;
  fortFireGroup.add(flame);
  const fortLight = new THREE.PointLight('#ff7e29', 0, 14, 1.6);
  fortLight.position.y = 0.65;
  fortFireGroup.add(fortLight);
  fortressGroup.add(fortFireGroup);

  // Живая изгородь (stage >= 9)
  const fortHedgeGroup = new THREE.Group();
  const bushGeo = new THREE.DodecahedronGeometry(0.46, 0);
  for (let i = 0; i < 15; i++) {
    const t = -Math.PI * 0.12 + (i / 14) * Math.PI * 1.24;
    const bush = new THREE.Mesh(bushGeo, foliageGreen);
    bush.position.set(Math.cos(t) * 3.05, 0.45, Math.sin(t) * 2.75 - 0.5);
    bush.scale.set(1.1, 1.35 + (i % 3) * 0.2, 1.1);
    fortHedgeGroup.add(bush);
  }
  fortressGroup.add(fortHedgeGroup);

  // Двойной вал + батарея мушкетов (stage >= 15)
  const fortOuterWall = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const t = -Math.PI * 0.15 + (i / 17) * Math.PI * 1.3;
    const tree = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.65, 5), foliageGreen);
    tree.position.set(Math.cos(t) * 3.7, 0.78, Math.sin(t) * 3.35 - 0.5);
    fortOuterWall.add(tree);
  }
  for (let m = 0; m < 5; m++) {
    const ang = 0.25 + (m / 4) * (Math.PI - 0.5);
    const musket = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.9, 5), stoneDark);
    musket.rotation.x = Math.PI / 2;
    musket.rotation.z = -ang + Math.PI / 2;
    musket.position.set(Math.cos(ang) * 2.55, 1.05, Math.sin(ang) * 2.35 - 0.5);
    fortOuterWall.add(musket);
  }
  fortressGroup.add(fortOuterWall);

  tagInteractive(fortressGroup, 'fortress', interactiveMeshes);
  group.add(fortressGroup);

  // 6. Поля ячменя и риса (stage 6..8 — первые всходы; stage >= 9 — широкие золотые нивы)
  const fieldsBase = new THREE.Group();
  fieldsBase.position.set(3, getIslandHeight(3, 14), 14);

  const smallPatch = new THREE.Group();
  const patchSoil = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.14, 1.3),
    new THREE.MeshStandardMaterial({ color: '#5c462e', roughness: 0.95 })
  );
  patchSoil.position.y = 0.05;
  smallPatch.add(patchSoil);
  for (let i = -0.5; i <= 0.5; i += 0.32) {
    const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 4), foliageGreen);
    sprout.position.set(i, 0.28, (i * 0.5) % 0.4);
    smallPatch.add(sprout);
  }
  fieldsBase.add(smallPatch);

  const largeFields = new THREE.Group();
  const soilMat = new THREE.MeshStandardMaterial({ color: '#61482c', roughness: 0.95 });
  disposables.push(soilMat);
  const plotA = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.14, 2.6), soilMat);
  plotA.position.set(-0.6, 0.04, 0.2);
  largeFields.add(plotA);
  for (let row = -1.0; row <= 1.0; row += 0.42) {
    for (let col = -2.1; col <= 1.0; col += 0.42) {
      const stalk = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.58, 4), wheatGold);
      stalk.position.set(col, 0.34, row + 0.2);
      largeFields.add(stalk);
    }
  }
  // Плетеная изгородь по краю поля
  for (let x = -2.5; x <= 1.3; x += 0.95) {
    const fPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.55, 5), woodMid);
    fPost.position.set(x, 0.28, 1.55);
    largeFields.add(fPost);
  }
  const railBar = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.07, 0.06), woodLight);
  railBar.position.set(-0.6, 0.42, 1.55);
  largeFields.add(railBar);
  fieldsBase.add(largeFields);

  tagInteractive(fieldsBase, 'plantations', interactiveMeshes);
  group.add(fieldsBase);

  // 7. «Дача» в Благодатной долине (-12, 4) (stage >= 8)
  const dachaGroup = new THREE.Group();
  dachaGroup.position.set(-12, getIslandHeight(-12, 4), 4);
  const hutFloor = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.18, 8), woodDark);
  hutFloor.position.y = 0.08;
  const thatchRoof = new THREE.Mesh(new THREE.ConeGeometry(1.65, 1.35, 8), wheatGold);
  thatchRoof.position.y = 1.42;
  dachaGroup.add(hutFloor, thatchRoof);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.05, 5), woodMid);
    pillar.position.set(Math.cos(a) * 1.05, 0.55, Math.sin(a) * 1.05);
    dachaGroup.add(pillar);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const hedge = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), foliageGreen);
    hedge.position.set(Math.cos(a) * 2.35, 0.35, Math.sin(a) * 2.25);
    dachaGroup.add(hedge);
  }
  tagInteractive(dachaGroup, 'valley', interactiveMeshes);
  group.add(dachaGroup);

  // 8. Козьи пастбища (-6, -12) (stage >= 11)
  const pasturesGroup = new THREE.Group();
  pasturesGroup.position.set(-6, getIslandHeight(-6, -12), -12);
  // Деревянный загон
  const penRadius = 2.7;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.72, 5), woodMid);
    post.position.set(Math.cos(a) * penRadius, 0.34, Math.sin(a) * penRadius);
    pasturesGroup.add(post);
  }
  const penRing = new THREE.Mesh(new THREE.TorusGeometry(penRadius, 0.045, 5, 18), woodLight);
  penRing.rotation.x = Math.PI / 2;
  penRing.position.y = 0.52;
  pasturesGroup.add(penRing);

  // 7 стилизованных козочек
  const goats: THREE.Group[] = [];
  const goatPositions: Array<[number, number, number]> = [
    [-0.9, -0.7, 0.4],
    [0.8, -0.6, -1.2],
    [0.1, 0.85, 2.1],
    [-1.25, 0.5, 0.9],
    [1.15, 0.45, -0.4],
    [-0.25, -1.2, 1.5],
    [0.5, 1.25, -2.3],
  ];
  goatPositions.forEach(([gx, gz, rot], idx) => {
    const goat = new THREE.Group();
    const gMat = idx % 2 === 0 ? goatWhite : goatBrown;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.24), gMat);
    body.position.y = 0.24;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.16), gMat);
    head.position.set(0.26, 0.4, 0);
    goat.add(body, head);
    goat.position.set(gx, 0, gz);
    goat.rotation.y = rot;
    pasturesGroup.add(goat);
    goats.push(goat);
  });
  tagInteractive(pasturesGroup, 'pastures', interactiveMeshes);
  group.add(pasturesGroup);

  // 9. Гигантская первая пирога в лесу (12, -15) (stage >= 12)
  const canoe1Group = new THREE.Group();
  canoe1Group.position.set(12, getIslandHeight(12, -15), -15);
  canoe1Group.rotation.y = 0.5;
  const hull1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 3.6, 8), woodDark);
  hull1.rotation.z = Math.PI / 2;
  hull1.scale.set(0.8, 1, 1.15);
  hull1.position.y = 0.38;
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.5, 8), woodMid);
  stump.position.set(-2.3, 0.24, 0.5);
  canoe1Group.add(hull1, stump);
  tagInteractive(canoe1Group, 'first_canoe', interactiveMeshes);
  group.add(canoe1Group);

  // 10. Северо-Восточная бухта и вторая парусная лодка (stage >= 13)
  const harborGroup = new THREE.Group();
  const boatSpot = new THREE.Group();
  const boatHull = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.3, 6), woodMid);
  boatHull.rotation.x = Math.PI / 2;
  boatHull.scale.set(1, 1, 0.55);
  boatHull.position.y = 0.12;
  const boatMast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.85, 6), woodLight);
  boatMast.position.set(0, 1.0, 0.1);
  const boatSail = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.25), sailMat);
  boatSail.position.set(0.55, 1.08, 0.1);
  boatSail.rotation.y = 0.3;
  boatSpot.add(boatHull, boatMast, boatSail);
  boatSpot.position.set(25.8, 0.05, -14.8);
  boatSpot.rotation.y = 0.9;
  harborGroup.add(boatSpot);

  const mooringPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.75, 6), woodDark);
  mooringPost.position.set(23, getIslandHeight(23, -13) + 0.35, -13);
  harborGroup.add(mooringPost);
  tagInteractive(harborGroup, 'harbor', interactiveMeshes);
  group.add(harborGroup);

  // 11. След на песке (-28, 6) (stage >= 15)
  const footprintGroup = new THREE.Group();
  footprintGroup.position.set(-28, getIslandHeight(-28, 6) + 0.06, 6);
  footprintGroup.rotation.y = 0.45;
  const printMat = new THREE.MeshStandardMaterial({ color: '#7a5d3b', roughness: 0.96 });
  disposables.push(printMat);

  const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.05, 10), printMat);
  sole.scale.set(0.75, 1, 1.65);
  const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 8), printMat);
  heel.position.set(0, 0, -0.35);
  footprintGroup.add(sole, heel);
  for (let t = 0; t < 5; t++) {
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.065 - t * 0.005, 6, 6), printMat);
    toe.scale.set(1, 0.4, 1.2);
    toe.position.set(-0.16 + t * 0.08, 0.01, 0.52 - Math.abs(t - 1.5) * 0.025);
    footprintGroup.add(toe);
  }
  const footprintHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 0.9, 24),
    new THREE.MeshBasicMaterial({
      color: '#f2c97d',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
    })
  );
  footprintHalo.rotation.x = -Math.PI / 2;
  footprintHalo.position.y = 0.03;
  footprintGroup.add(footprintHalo);
  tagInteractive(footprintGroup, 'footprint_beach', interactiveMeshes);
  group.add(footprintGroup);

  // 12. Тайный грот (-17, -7) (stage >= 16)
  const grottoGroup = new THREE.Group();
  grottoGroup.position.set(-17, getIslandHeight(-17, -7) - 0.15, -7);
  grottoGroup.rotation.y = 0.6;
  const grottoArch = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.48, 7, 10, Math.PI), stoneDark);
  grottoArch.position.y = 0.25;
  const grottoVoid = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 10, 0, Math.PI),
    new THREE.MeshBasicMaterial({ color: '#0c0b0b' })
  );
  grottoVoid.position.set(0, 0.25, 0.05);
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#ffbe3d' });
  disposables.push(eyeMat);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), eyeMat);
  eyeL.position.set(-0.14, 0.62, 0.12);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), eyeMat);
  eyeR.position.set(0.14, 0.62, 0.12);
  const powderKeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 8), woodDark);
  powderKeg.position.set(0.82, 0.24, 0.55);
  grottoGroup.add(grottoArch, grottoVoid, eyeL, eyeR, powderKeg);
  tagInteractive(grottoGroup, 'secret_grotto', interactiveMeshes);
  group.add(grottoGroup);

  // 13. Испанское кораблекрушение на западном рифе (-41, 16) (stage >= 17)
  const spanishShip = buildSailingShip({
    scale: 0.9,
    hullColor: '#4a3022',
    sailMat,
    woodDark,
    woodMid,
    damaged: true,
    flagColor: '#d49d2a',
    disposables,
  });
  spanishShip.position.set(-41, -0.1, 16);
  spanishShip.rotation.set(-0.15, 0.72, 0.26);
  tagInteractive(spanishShip, 'spanish_wreck', interactiveMeshes);
  group.add(spanishShip);

  // 14. Юго-Западный берег и спасение Пятницы (-21, 19) (stage >= 18)
  const cannibalGroup = new THREE.Group();
  cannibalGroup.position.set(-21, getIslandHeight(-21, 19), 19);
  const campFlame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.62, 6), emberMat);
  campFlame.position.y = 0.28;
  const campLight = new THREE.PointLight('#ff6a1c', 0, 14, 1.6);
  campLight.position.y = 0.68;
  cannibalGroup.add(campFlame, campLight);
  for (let c = 0; c < 2; c++) {
    const canoe = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 2.3, 6), woodDark);
    canoe.rotation.z = Math.PI / 2;
    canoe.position.set(-1.3 + c * 2.5, 0.18, 1.45);
    canoe.rotation.y = 0.35 - c * 0.6;
    cannibalGroup.add(canoe);
  }
  tagInteractive(cannibalGroup, 'cannibal_cove', interactiveMeshes);
  group.add(cannibalGroup);

  // 15. Английский фрегат на рейде (-8, 31) (stage >= 20)
  const englishShip = buildSailingShip({
    scale: 1.18,
    hullColor: '#3f2818',
    sailMat,
    woodDark,
    woodMid,
    damaged: false,
    flagColor: '#c9332b',
    disposables,
  });
  englishShip.position.set(-8, 0.05, 31);
  englishShip.rotation.y = 0.42;

  // Шлюпка рядом с фрегатом
  const longboat = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.5, 5), woodLight);
  longboat.rotation.x = Math.PI / 2;
  longboat.scale.set(1, 1, 0.55);
  longboat.position.set(2.4, 0.08, -1.6);
  englishShip.add(longboat);

  tagInteractive(englishShip, 'english_ship', interactiveMeshes);
  group.add(englishShip);

  // Анимированный дымок над Крепостью
  const smokeMat = new THREE.MeshBasicMaterial({
    color: '#e5e2dc',
    transparent: true,
    opacity: 0.42,
  });
  disposables.push(smokeMat);
  const smokePuffs: THREE.Mesh[] = [];
  const smokeGeo = new THREE.SphereGeometry(0.18, 6, 6);
  disposables.push(smokeGeo);
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(smokeGeo, smokeMat);
    fortFireGroup.add(puff);
    smokePuffs.push(puff);
  }

  return {
    group,
    interactiveMeshes,
    update: (stage, mode: MapMode, isNight: boolean, elapsed: number) => {
      const showAll = mode === 'all';

      // Корабль 1659: целый на 1–2 этапах, затем обломки; в режиме 'all' показываем заметные обломки
      intactShip.visible = !showAll && stage <= 2;
      wreckRibs.visible = showAll || stage >= 3;

      raftGroup.visible = showAll || (stage >= 2 && stage <= 4);
      crossGroup.visible = showAll || stage >= 3;
      lookoutGroup.visible = showAll || stage >= 4;

      fortressGroup.visible = showAll || stage >= 5;
      fortHedgeGroup.visible = showAll || stage >= 9;
      fortOuterWall.visible = showAll || stage >= 15;

      fieldsBase.visible = showAll || stage >= 6;
      smallPatch.visible = !showAll && stage >= 6 && stage <= 8;
      largeFields.visible = showAll || stage >= 9;

      dachaGroup.visible = showAll || stage >= 8;
      pasturesGroup.visible = showAll || stage >= 11;
      canoe1Group.visible = showAll || stage >= 12;
      harborGroup.visible = showAll || stage >= 13;
      footprintGroup.visible = showAll || stage >= 15;
      grottoGroup.visible = showAll || stage >= 16;
      spanishShip.visible = showAll || stage >= 17;
      cannibalGroup.visible = showAll || stage >= 18;
      englishShip.visible = showAll || stage >= 20;

      // Огонь и дым
      const flicker = 0.85 + Math.sin(elapsed * 13.0) * 0.15 + Math.cos(elapsed * 21.0) * 0.1;
      flame.scale.set(1, flicker, 1);
      campFlame.scale.set(1, flicker, 1);
      fortLight.intensity = (isNight ? 4.2 : 1.1) * flicker;
      campLight.intensity = (isNight ? 3.8 : 0.9) * flicker;

      smokePuffs.forEach((puff, idx) => {
        const cycle = (elapsed * 0.42 + idx * 0.25) % 1;
        puff.position.set(Math.sin(elapsed + idx) * 0.14, 0.45 + cycle * 2.2, Math.cos(elapsed * 0.7 + idx) * 0.1);
        puff.scale.setScalar(0.55 + cycle * 1.3);
      });

      // Покачивание судов на волнах
      if (intactShip.visible) {
        intactShip.rotation.z = -0.22 + Math.sin(elapsed * 1.4) * 0.03;
      }
      if (boatSpot.visible) {
        boatSpot.position.y = 0.05 + Math.sin(elapsed * 1.9) * 0.06;
        boatSpot.rotation.z = Math.sin(elapsed * 1.5) * 0.05;
      }
      if (englishShip.visible) {
        englishShip.position.y = 0.04 + Math.sin(elapsed * 1.2) * 0.08;
        englishShip.rotation.z = Math.sin(elapsed * 0.95) * 0.03;
      }

      // Лёгкое покачивание козочек на пастбищах
      if (pasturesGroup.visible) {
        goats.forEach((g, idx) => {
          g.position.y = Math.max(0, Math.sin(elapsed * 2.1 + idx * 1.4)) * 0.06;
        });
      }

      // Пульсация кольца следа на песке
      if (footprintGroup.visible) {
        const pulse = 0.92 + Math.sin(elapsed * 2.8) * 0.1;
        footprintHalo.scale.setScalar(pulse);
      }
    },
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

function buildSailingShip(opts: {
  scale: number;
  hullColor: string;
  sailMat: THREE.Material;
  woodDark: THREE.Material;
  woodMid: THREE.Material;
  damaged: boolean;
  flagColor: string;
  disposables: Array<{ dispose: () => void }>;
}): THREE.Group {
  const ship = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: opts.hullColor, roughness: 0.88 });
  const flagMat = new THREE.MeshStandardMaterial({
    color: opts.flagColor,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  opts.disposables.push(hullMat, flagMat);

  // Корпус (вытянутый многогранник с сужением к носу и приподнятой кормой)
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 4.4), hullMat);
  hull.position.y = 0.35;
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.78, 1.5, 4), hullMat);
  bow.rotation.x = Math.PI / 2;
  bow.rotation.z = Math.PI / 4;
  bow.position.set(0, 0.36, 2.85);
  const stern = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.65, 1.25), opts.woodMid);
  stern.position.set(0, 1.0, -1.55);
  ship.add(hull, bow, stern);

  // Мачты и паруса
  const mastConfigs = opts.damaged
    ? [
        { z: 0.9, h: 3.1, tiltZ: 0.22, hasSail: true },
        { z: -0.6, h: 2.2, tiltZ: -0.18, hasSail: false },
      ]
    : [
        { z: 1.15, h: 3.2, tiltZ: 0, hasSail: true },
        { z: -0.15, h: 4.1, tiltZ: 0, hasSail: true },
        { z: -1.45, h: 2.7, tiltZ: 0, hasSail: true },
      ];

  for (const mc of mastConfigs) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, mc.h, 6), opts.woodDark);
    mast.position.set(0, 0.6 + mc.h / 2, mc.z);
    mast.rotation.z = mc.tiltZ;
    ship.add(mast);

    if (mc.hasSail) {
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.45, mc.h * 0.56), opts.sailMat);
      sail.position.set(0, 0.75 + mc.h * 0.55, mc.z + 0.14);
      sail.rotation.z = mc.tiltZ;
      ship.add(sail);
    }
  }

  // Вымпел на главной мачте
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.34), flagMat);
  flag.position.set(0.34, opts.damaged ? 3.4 : 4.45, opts.damaged ? 0.9 : -0.15);
  ship.add(flag);

  ship.scale.setScalar(opts.scale);
  return ship;
}
