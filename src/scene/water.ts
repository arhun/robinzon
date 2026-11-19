import * as THREE from 'three';
import { TERRAIN_WORLD_DEPTH, TERRAIN_WORLD_WIDTH } from './terrain';

export interface OceanController {
  mesh: THREE.Mesh;
  update: (params: {
    elapsed: number;
    sunDir: THREE.Vector3;
    sunColor: THREE.Color;
    deepColor: THREE.Color;
    shallowColor: THREE.Color;
    fogColor: THREE.Color;
    fogDensity: number;
  }) => void;
  dispose: () => void;
}

export function createOcean(heightTexture: THREE.DataTexture, highQuality: boolean): OceanController {
  const seg = highQuality ? 120 : 84;
  const geometry = new THREE.PlaneGeometry(460, 460, seg, seg);
  geometry.rotateX(-Math.PI / 2);

  const uniforms = {
    uTime: { value: 0 },
    uHeightMap: { value: heightTexture },
    uTerrainSize: { value: new THREE.Vector2(TERRAIN_WORLD_WIDTH, TERRAIN_WORLD_DEPTH) },
    uSunDir: { value: new THREE.Vector3(0.55, 0.7, 0.45).normalize() },
    uSunColor: { value: new THREE.Color('#fff5dd') },
    uDeepColor: { value: new THREE.Color('#0c344d') },
    uShallowColor: { value: new THREE.Color('#27949b') },
    uFogColor: { value: new THREE.Color('#95c8dc') },
    uFogDensity: { value: 0.0042 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform sampler2D uHeightMap;
      uniform vec2 uTerrainSize;

      varying vec3 vWorldPos;
      varying float vTerrainHeight;
      varying float vWaveSlopeX;
      varying float vWaveSlopeZ;

      float sampleIslandHeight(vec2 xz) {
        vec2 uv = xz / uTerrainSize + 0.5;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          return -3.8;
        }
        float norm = texture2D(uHeightMap, uv).r;
        return norm * 16.0 - 4.5;
      }

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        float terrainH = sampleIslandHeight(worldPos.xz);
        float deepFactor = smoothstep(0.15, -1.8, terrainH);

        float w1 = sin(worldPos.x * 0.24 + uTime * 1.35 + worldPos.z * 0.14);
        float w2 = cos(worldPos.z * 0.31 - uTime * 1.1 + worldPos.x * 0.11);
        float w3 = sin((worldPos.x - worldPos.z) * 0.18 + uTime * 0.85);
        float wave = (w1 * 0.065 + w2 * 0.05 + w3 * 0.04) * deepFactor;

        worldPos.y += wave;

        vWorldPos = worldPos.xyz;
        vTerrainHeight = terrainH;
        vWaveSlopeX = cos(worldPos.x * 0.24 + uTime * 1.35 + worldPos.z * 0.14) * 0.08;
        vWaveSlopeZ = -sin(worldPos.z * 0.31 - uTime * 1.1 + worldPos.x * 0.11) * 0.08;

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform sampler2D uHeightMap;
      uniform vec2 uTerrainSize;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFogColor;
      uniform float uFogDensity;

      varying vec3 vWorldPos;
      varying float vTerrainHeight;
      varying float vWaveSlopeX;
      varying float vWaveSlopeZ;

      float sampleIslandHeightFrag(vec2 xz) {
        vec2 uv = xz / uTerrainSize + 0.5;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          return -3.8;
        }
        return texture2D(uHeightMap, uv).r * 16.0 - 4.5;
      }

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise21(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        float h = sampleIslandHeightFrag(vWorldPos.xz);
        float shallowMask = smoothstep(-2.8, -0.05, h);

        vec3 baseWater = mix(uDeepColor, uShallowColor, shallowMask);

        // Нормаль воды с мелкими переливами ряби
        float r1 = noise21(vWorldPos.xz * 0.75 + vec2(uTime * 0.32, -uTime * 0.21));
        float r2 = noise21(vWorldPos.xz * 1.45 - vec2(uTime * 0.25, uTime * 0.34));
        vec3 N = normalize(vec3(
          vWaveSlopeX + (r1 - 0.5) * 0.16,
          1.0,
          vWaveSlopeZ + (r2 - 0.5) * 0.16
        ));

        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uSunDir);
        vec3 H = normalize(L + V);

        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.2);
        float spec = pow(max(dot(N, H), 0.0), 92.0) * 0.85;
        float broadSpec = pow(max(dot(N, H), 0.0), 18.0) * 0.14;

        vec3 col = mix(baseWater, uFogColor * 1.05, fresnel * 0.42);
        col += uSunColor * (spec + broadSpec);

        // Береговая пена вдоль линии прибоя (h около 0..-0.65)
        float surfWave = sin(h * 14.0 - uTime * 2.4 + r1 * 2.4);
        float shoreBand = smoothstep(-0.85, -0.02, h) * (1.0 - smoothstep(0.0, 0.25, h));
        float foamNoise = smoothstep(0.32, 0.72, r1 * 0.65 + r2 * 0.35);
        float shoreFoam = shoreBand * (0.45 + 0.55 * max(0.0, surfWave)) * (0.55 + 0.45 * foamNoise);

        // Вихревые струи сильного течения у восточного Мыса Течений (38, 4)
        vec2 currentPos = vWorldPos.xz - vec2(38.0, 4.0);
        float currentDist = length(currentPos * vec2(0.85, 0.72));
        float currentZone = 1.0 - smoothstep(2.5, 11.5, currentDist);
        float streamBands = smoothstep(0.55, 0.92, sin(currentPos.y * 1.6 - uTime * 3.1 + sin(currentPos.x * 0.8) * 1.5));
        float currentFoam = currentZone * streamBands * 0.42;

        float totalFoam = clamp(shoreFoam + currentFoam, 0.0, 0.92);
        col = mix(col, vec3(0.92, 0.97, 0.99), totalFoam);

        // Экспоненциальный атмосферный туман, совпадающий с горизонтом
        float dist = length(cameraPosition - vWorldPos);
        float fogFactor = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
        col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));

        // Полупрозрачность только у самой кромки пляжа, чтобы просвечивал мокрый песок
        float alpha = mix(0.68, 0.97, smoothstep(0.0, -2.0, h));
        alpha = max(alpha, totalFoam * 0.95);

        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0;
  mesh.renderOrder = 1;
  mesh.name = 'island-ocean';

  return {
    mesh,
    update: ({ elapsed, sunDir, sunColor, deepColor, shallowColor, fogColor, fogDensity }) => {
      uniforms.uTime.value = elapsed;
      uniforms.uSunDir.value.copy(sunDir).normalize();
      uniforms.uSunColor.value.copy(sunColor);
      uniforms.uDeepColor.value.copy(deepColor);
      uniforms.uShallowColor.value.copy(shallowColor);
      uniforms.uFogColor.value.copy(fogColor);
      uniforms.uFogDensity.value = fogDensity;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
