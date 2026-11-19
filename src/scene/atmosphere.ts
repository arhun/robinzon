import * as THREE from 'three';
import type { TimeOfDay } from '../types/island';

export interface AtmosphereController {
  group: THREE.Group;
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  fog: THREE.FogExp2;
  currentSunDir: THREE.Vector3;
  currentSunColor: THREE.Color;
  currentDeepWater: THREE.Color;
  currentShallowWater: THREE.Color;
  currentFogColor: THREE.Color;
  setTargetPreset: (preset: TimeOfDay) => void;
  update: (dt: number, elapsed: number, stage: number, showAll: boolean) => void;
  dispose: () => void;
}

interface PresetValues {
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  deepWater: THREE.Color;
  shallowWater: THREE.Color;
  starsOpacity: number;
  cloudTint: THREE.Color;
}

const PRESETS: Record<TimeOfDay, PresetValues> = {
  day: {
    skyTop: new THREE.Color('#276fa8'),
    skyHorizon: new THREE.Color('#b6dce8'),
    fogColor: new THREE.Color('#97cade'),
    fogDensity: 0.0042,
    sunDir: new THREE.Vector3(0.56, 0.74, 0.42).normalize(),
    sunColor: new THREE.Color('#fff5dd'),
    sunIntensity: 2.35,
    hemiSky: new THREE.Color('#cbe8f8'),
    hemiGround: new THREE.Color('#5a503a'),
    hemiIntensity: 0.95,
    deepWater: new THREE.Color('#0c3b57'),
    shallowWater: new THREE.Color('#289ca1'),
    starsOpacity: 0,
    cloudTint: new THREE.Color('#ffffff'),
  },
  sunset: {
    skyTop: new THREE.Color('#2d3166'),
    skyHorizon: new THREE.Color('#f08d57'),
    fogColor: new THREE.Color('#d2825e'),
    fogDensity: 0.0048,
    sunDir: new THREE.Vector3(-0.75, 0.24, 0.56).normalize(),
    sunColor: new THREE.Color('#ffb36b'),
    sunIntensity: 2.4,
    hemiSky: new THREE.Color('#ffaa7a'),
    hemiGround: new THREE.Color('#3b2b27'),
    hemiIntensity: 0.78,
    deepWater: new THREE.Color('#132444'),
    shallowWater: new THREE.Color('#3a7378'),
    starsOpacity: 0.22,
    cloudTint: new THREE.Color('#ffd0b2'),
  },
  night: {
    skyTop: new THREE.Color('#060f1c'),
    skyHorizon: new THREE.Color('#132c45'),
    fogColor: new THREE.Color('#0d2236'),
    fogDensity: 0.0052,
    sunDir: new THREE.Vector3(0.42, 0.62, -0.58).normalize(),
    sunColor: new THREE.Color('#a4c9ff'),
    sunIntensity: 0.95,
    hemiSky: new THREE.Color('#2d4e7a'),
    hemiGround: new THREE.Color('#111820'),
    hemiIntensity: 0.52,
    deepWater: new THREE.Color('#051424'),
    shallowWater: new THREE.Color('#103c4e'),
    starsOpacity: 0.92,
    cloudTint: new THREE.Color('#4d6988'),
  },
};

export function createAtmosphere(scene: THREE.Scene, highQuality: boolean): AtmosphereController {
  const group = new THREE.Group();
  group.name = 'atmosphere-group';

  const fog = new THREE.FogExp2(PRESETS.day.fogColor.getHex(), PRESETS.day.fogDensity);
  scene.fog = fog;

  // Купол неба
  const skyUniforms = {
    uTopColor: { value: PRESETS.day.skyTop.clone() },
    uHorizonColor: { value: PRESETS.day.skyHorizon.clone() },
  };
  const skyGeo = new THREE.SphereGeometry(260, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      varying vec3 vLocalPos;
      void main() {
        float h = normalize(vLocalPos).y;
        float t = smoothstep(-0.04, 0.62, h);
        vec3 col = mix(uHorizonColor, uTopColor, t);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.name = 'sky-dome';
  group.add(skyDome);

  // Звёзды (проявляются на закате и ночью)
  const starsGeo = new THREE.BufferGeometry();
  const starCount = 420;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = (i * 137.5 * Math.PI) / 180;
    const phi = Math.acos(0.15 + ((i * 73) % 100) / 118);
    const r = 230;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starsMat = new THREE.PointsMaterial({
    color: '#e8f1ff',
    size: 1.5,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const stars = new THREE.Points(starsGeo, starsMat);
  group.add(stars);

  // Диск Солнца / Луны
  const discGeo = new THREE.SphereGeometry(5.5, 16, 16);
  const discMat = new THREE.MeshBasicMaterial({
    color: '#fff6da',
    fog: false,
  });
  const sunDisc = new THREE.Mesh(discGeo, discMat);
  group.add(sunDisc);

  // Освещение
  const hemiLight = new THREE.HemisphereLight(
    PRESETS.day.hemiSky.getHex(),
    PRESETS.day.hemiGround.getHex(),
    PRESETS.day.hemiIntensity
  );
  group.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(PRESETS.day.sunColor.getHex(), PRESETS.day.sunIntensity);
  sunLight.castShadow = true;
  const shadowSize = highQuality ? 2048 : 1024;
  sunLight.shadow.mapSize.set(shadowSize, shadowSize);
  sunLight.shadow.camera.left = -46;
  sunLight.shadow.camera.right = 46;
  sunLight.shadow.camera.top = 40;
  sunLight.shadow.camera.bottom = -40;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 160;
  sunLight.shadow.bias = -0.0007;
  sunLight.shadow.normalBias = 0.03;
  group.add(sunLight);
  group.add(sunLight.target);

  // Облака (лёгкие, высоко и в стороне от центрального хребта)
  const cloudMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.95,
    metalness: 0,
    transparent: true,
    opacity: 0.72,
  });
  const cloudGroup = new THREE.Group();
  const cloudDefs = [
    { x: -34, y: 31, z: -26, s: 0.95, speed: 0.35 },
    { x: 26, y: 34, z: -28, s: 1.05, speed: 0.28 },
    { x: 42, y: 30, z: 14, s: 0.9, speed: 0.42 },
    { x: -42, y: 32, z: 22, s: 0.95, speed: 0.31 },
    { x: 4, y: 36, z: 36, s: 1.0, speed: 0.24 },
  ];
  const cloudGeo = new THREE.DodecahedronGeometry(1.9, 1);
  const clouds: Array<{ mesh: THREE.Group; baseX: number; speed: number }> = [];
  for (const def of cloudDefs) {
    const cg = new THREE.Group();
    const offsets = [
      [0, 0, 0, 1.1],
      [-1.7, -0.25, 0.3, 0.82],
      [1.8, -0.2, -0.25, 0.86],
      [0.4, 0.55, 0.25, 0.78],
    ];
    for (const [ox, oy, oz, os] of offsets) {
      const puff = new THREE.Mesh(cloudGeo, cloudMat);
      puff.position.set(ox, oy, oz);
      puff.scale.set(os * 1.25, os * 0.68, os);
      cg.add(puff);
    }
    cg.position.set(def.x, def.y, def.z);
    cg.scale.setScalar(def.s);
    cloudGroup.add(cg);
    clouds.push({ mesh: cg, baseX: def.x, speed: def.speed });
  }
  group.add(cloudGroup);

  // Попугай Попка (сюжетный спутник у Крепости с этапа 10; чайки убраны)
  const birdsGroup = new THREE.Group();
  const birdWingGeo = new THREE.ConeGeometry(0.18, 0.72, 4);
  birdWingGeo.rotateZ(Math.PI / 2);
  const parrotMat = new THREE.MeshStandardMaterial({ color: '#2ea84a', roughness: 0.65 });
  const parrotAccentMat = new THREE.MeshStandardMaterial({ color: '#e6582c', roughness: 0.65 });

  interface BirdInstance {
    root: THREE.Group;
    leftWing: THREE.Mesh;
    rightWing: THREE.Mesh;
    radius: number;
    speed: number;
    phase: number;
    center: THREE.Vector3;
    isParrot?: boolean;
  }

  const birds: BirdInstance[] = [];

  // Попка кружит около Крепости начиная с этапа 10
  const parrotRoot = new THREE.Group();
  const pBody = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), parrotAccentMat);
  pBody.scale.set(0.9, 1.3, 0.9);
  const pLw = new THREE.Mesh(birdWingGeo, parrotMat);
  pLw.scale.setScalar(0.8);
  pLw.position.x = -0.22;
  const pRw = new THREE.Mesh(birdWingGeo, parrotMat);
  pRw.scale.setScalar(0.8);
  pRw.rotation.y = Math.PI;
  pRw.position.x = 0.22;
  parrotRoot.add(pBody, pLw, pRw);
  birdsGroup.add(parrotRoot);
  const parrot: BirdInstance = {
    root: parrotRoot,
    leftWing: pLw,
    rightWing: pRw,
    radius: 3.4,
    speed: 0.78,
    phase: 0.4,
    center: new THREE.Vector3(10, 5.2, 10),
    isParrot: true,
  };
  birds.push(parrot);
  group.add(birdsGroup);

  scene.add(group);

  let targetPreset: TimeOfDay = 'day';
  const currentSunDir = PRESETS.day.sunDir.clone();
  const currentSunColor = PRESETS.day.sunColor.clone();
  const currentDeepWater = PRESETS.day.deepWater.clone();
  const currentShallowWater = PRESETS.day.shallowWater.clone();
  const currentFogColor = PRESETS.day.fogColor.clone();

  return {
    group,
    sunLight,
    hemiLight,
    fog,
    currentSunDir,
    currentSunColor,
    currentDeepWater,
    currentShallowWater,
    currentFogColor,
    setTargetPreset: (preset) => {
      targetPreset = preset;
    },
    update: (dt, elapsed, stage, showAll) => {
      const target = PRESETS[targetPreset];
      const lerpAlpha = Math.min(1, dt * 2.8);

      skyUniforms.uTopColor.value.lerp(target.skyTop, lerpAlpha);
      skyUniforms.uHorizonColor.value.lerp(target.skyHorizon, lerpAlpha);
      currentFogColor.lerp(target.fogColor, lerpAlpha);
      fog.color.copy(currentFogColor);
      fog.density += (target.fogDensity - fog.density) * lerpAlpha;

      currentSunDir.lerp(target.sunDir, lerpAlpha).normalize();
      currentSunColor.lerp(target.sunColor, lerpAlpha);
      sunLight.position.copy(currentSunDir).multiplyScalar(78);
      sunLight.color.copy(currentSunColor);
      sunLight.intensity += (target.sunIntensity - sunLight.intensity) * lerpAlpha;

      sunDisc.position.copy(currentSunDir).multiplyScalar(205);
      discMat.color.copy(currentSunColor);

      hemiLight.color.lerp(target.hemiSky, lerpAlpha);
      hemiLight.groundColor.lerp(target.hemiGround, lerpAlpha);
      hemiLight.intensity += (target.hemiIntensity - hemiLight.intensity) * lerpAlpha;

      currentDeepWater.lerp(target.deepWater, lerpAlpha);
      currentShallowWater.lerp(target.shallowWater, lerpAlpha);

      starsMat.opacity += (target.starsOpacity - starsMat.opacity) * lerpAlpha;
      cloudMat.color.lerp(target.cloudTint, lerpAlpha);

      // Медленное движение облаков
      for (const c of clouds) {
        const span = 120;
        const offset = ((elapsed * c.speed + c.baseX + 60) % span) - 60;
        c.mesh.position.x = offset;
      }

      // Полёт чаек и попугая Попки
      for (const b of birds) {
        if (b.isParrot) {
          b.root.visible = showAll || stage >= 10;
          if (!b.root.visible) continue;
        }
        const ang = elapsed * b.speed + b.phase;
        const nx = b.center.x + Math.cos(ang) * b.radius;
        const nz = b.center.z + Math.sin(ang) * b.radius * 0.72;
        const ny = b.center.y + Math.sin(ang * 2.2) * 0.55;
        b.root.position.set(nx, ny, nz);
        b.root.rotation.y = -ang;
        const flap = Math.sin(elapsed * (b.isParrot ? 11 : 6.5) + b.phase) * 0.42;
        b.leftWing.rotation.z = flap;
        b.rightWing.rotation.z = -flap;
      }
    },
    dispose: () => {
      skyGeo.dispose();
      skyMat.dispose();
      starsGeo.dispose();
      starsMat.dispose();
      discGeo.dispose();
      discMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      birdWingGeo.dispose();
      parrotMat.dispose();
      parrotAccentMat.dispose();
    },
  };
}
