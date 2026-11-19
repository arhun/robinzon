import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ISLAND_LOCATIONS } from '../data/locations';
import type { MapMode, ProjectedMarker, QualityMode, TimeOfDay } from '../types/island';
import { createAtmosphere, type AtmosphereController } from './atmosphere';
import { createClubLogoMonument, type ClubLogoMonumentController } from './clubLogoMonument';
import { createIslandFlora, type FloraController } from './flora';
import { createIslandLandmarks, type LandmarksController } from './landmarks';
import { createRoutes3D, type RoutesController } from './routes3d';
import { createIslandTerrain, getIslandHeight, type TerrainBuildResult } from './terrain';
import { createOcean, type OceanController } from './water';

export interface SceneCallbacks {
  onSelectLocation: (locationId: string) => void;
  onProjectMarkers: (markers: Record<string, ProjectedMarker>, azimuthDeg: number) => void;
  onWebGLError?: (errorMessage: string) => void;
}

export interface SceneState {
  stage: number;
  mode: MapMode;
  timeOfDay: TimeOfDay;
  showRoutes: boolean;
  quality: QualityMode;
  panelOpen: boolean;
}

const OVERVIEW_POS = new THREE.Vector3(6, 36, 54);
const OVERVIEW_TARGET = new THREE.Vector3(0, 1.5, 2);

export class IslandSceneManager {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  private terrain: TerrainBuildResult;
  private ocean: OceanController;
  private atmosphere: AtmosphereController;
  private flora: FloraController;
  private monument: ClubLogoMonumentController;
  private landmarks: LandmarksController;
  private routes: RoutesController;

  private interactiveMeshes: THREE.Object3D[] = [];
  private locationAnchors: Map<string, THREE.Vector3> = new Map();

  private state: SceneState;
  private animFrameId = 0;
  private startTime = performance.now();
  private lastTime = performance.now();
  private resizeObserver: ResizeObserver;
  private disposed = false;

  // Перелёт камеры
  private flyAnim: {
    startMs: number;
    durationMs: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null = null;

  private pointerDownPos: { x: number; y: number } | null = null;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private tempVec = new THREE.Vector3();

  private width = 1;
  private height = 1;

  constructor(container: HTMLElement, initialState: SceneState, callbacks: SceneCallbacks) {
    this.container = container;
    this.state = { ...initialState };
    this.callbacks = callbacks;

    this.width = Math.max(1, container.clientWidth);
    this.height = Math.max(1, container.clientHeight);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.4, 520);
    this.camera.position.copy(OVERVIEW_POS);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.applyPixelRatio();
    this.renderer.setSize(this.width, this.height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(OVERVIEW_TARGET);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.maxPolarAngle = Math.PI * 0.455;
    this.controls.minPolarAngle = 0.16;
    this.controls.minDistance = 9;
    this.controls.maxDistance = 105;
    this.controls.rotateSpeed = 0.78;
    this.controls.zoomSpeed = 0.95;
    this.controls.panSpeed = 0.72;

    // Отменяем автоперелёт, если пользователь сам начал крутить камеру
    this.controls.addEventListener('start', () => {
      this.flyAnim = null;
    });

    const isHigh = this.state.quality === 'high';
    this.atmosphere = createAtmosphere(this.scene, isHigh);
    this.atmosphere.setTargetPreset(this.state.timeOfDay);

    this.terrain = createIslandTerrain(isHigh);
    this.scene.add(this.terrain.group);

    this.ocean = createOcean(this.terrain.heightTexture, isHigh);
    this.scene.add(this.ocean.mesh);

    this.flora = createIslandFlora(isHigh);
    this.scene.add(this.flora.group);

    this.monument = createClubLogoMonument();
    this.scene.add(this.monument.group);

    this.landmarks = createIslandLandmarks();
    this.scene.add(this.landmarks.group);

    this.routes = createRoutes3D();
    this.scene.add(this.routes.group);

    this.interactiveMeshes = [...this.landmarks.interactiveMeshes, this.monument.hitMesh];

    // Предвычисляем якоря маркеров для всех локаций
    for (const loc of ISLAND_LOCATIONS) {
      const [lx, lz] = loc.coords;
      const groundY = loc.isWater ? 0 : Math.max(0, getIslandHeight(lx, lz));
      this.locationAnchors.set(loc.id, new THREE.Vector3(lx, groundY + (loc.yOffset ?? 2.2), lz));
    }

    this.applyViewOffset();
    this.bindEvents();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.animate();
  }

  private applyPixelRatio(): void {
    const cap = this.state.quality === 'high' ? 2 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  }

  private applyViewOffset(): void {
    if (!this.state.panelOpen) {
      this.camera.clearViewOffset();
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.width < 960) {
      // На мобильном открыта нижняя шторка: смещаем фокус выше на видимую верхнюю часть
      const shiftY = Math.round(this.height * 0.16);
      this.camera.setViewOffset(this.width, this.height, 0, shiftY, this.width, this.height);
    } else {
      // На десктопе открыта правая карточка (380px): чуть смещаем остров влево
      const shiftX = Math.round(Math.min(130, this.width * 0.08));
      this.camera.setViewOffset(this.width, this.height, shiftX, 0, this.width, this.height);
    }
    this.camera.updateProjectionMatrix();
  }

  private bindEvents(): void {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.pointerDownPos) return;
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    this.pointerDownPos = null;
    if (dist > 8) return; // Это был свайп/поворот камеры, а не клик

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveMeshes, false);
    for (const hit of hits) {
      // Проверяем видимость по цепочке родителей
      let cur: THREE.Object3D | null = hit.object;
      let vis = true;
      while (cur) {
        if (!cur.visible) {
          vis = false;
          break;
        }
        cur = cur.parent;
      }
      if (!vis) continue;

      const locId = hit.object.userData.locationId as string | undefined;
      if (locId) {
        this.callbacks.onSelectLocation(locId);
        return;
      }
    }
  };

  public updateState(next: Partial<SceneState>): void {
    const prevQuality = this.state.quality;
    const prevPanel = this.state.panelOpen;
    this.state = { ...this.state, ...next };

    if (next.timeOfDay) {
      this.atmosphere.setTargetPreset(next.timeOfDay);
    }
    if (next.quality && next.quality !== prevQuality) {
      this.applyPixelRatio();
    }
    if (next.panelOpen !== undefined && next.panelOpen !== prevPanel) {
      this.applyViewOffset();
    }
  }

  public flyTo(pos: [number, number, number], target: [number, number, number], durationMs = 1100): void {
    this.flyAnim = {
      startMs: performance.now(),
      durationMs,
      fromPos: this.camera.position.clone(),
      toPos: new THREE.Vector3(pos[0], pos[1], pos[2]),
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(target[0], target[1], target[2]),
    };
  }

  public resetOverview(): void {
    this.flyTo(
      [OVERVIEW_POS.x, OVERVIEW_POS.y, OVERVIEW_POS.z],
      [OVERVIEW_TARGET.x, OVERVIEW_TARGET.y, OVERVIEW_TARGET.z],
      950
    );
  }

  private handleResize(): void {
    if (this.disposed) return;
    this.width = Math.max(1, this.container.clientWidth);
    this.height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = this.width / this.height;
    this.renderer.setSize(this.width, this.height);
    this.applyViewOffset();
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.06, (now - this.lastTime) / 1000);
    const elapsed = (now - this.startTime) / 1000;
    this.lastTime = now;

    // Плавный перелёт камеры
    if (this.flyAnim) {
      const rawT = Math.min(1, (now - this.flyAnim.startMs) / this.flyAnim.durationMs);
      // easeInOutCubic
      const ease = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
      this.camera.position.lerpVectors(this.flyAnim.fromPos, this.flyAnim.toPos, ease);
      this.controls.target.lerpVectors(this.flyAnim.fromTarget, this.flyAnim.toTarget, ease);
      if (rawT >= 1) {
        this.flyAnim = null;
      }
    }

    this.controls.update();

    const showAll = this.state.mode === 'all';
    const isNight = this.state.timeOfDay === 'night';

    this.atmosphere.update(dt, elapsed, this.state.stage, showAll);
    this.ocean.update({
      elapsed,
      sunDir: this.atmosphere.currentSunDir,
      sunColor: this.atmosphere.currentSunColor,
      deepColor: this.atmosphere.currentDeepWater,
      shallowColor: this.atmosphere.currentShallowWater,
      fogColor: this.atmosphere.currentFogColor,
      fogDensity: this.atmosphere.fog.density,
    });
    this.landmarks.update(this.state.stage, this.state.mode, isNight, elapsed);
    this.routes.update(this.state.stage, this.state.mode, this.state.showRoutes, elapsed);

    this.renderer.render(this.scene, this.camera);

    // Проекция маркеров в экранные координаты
    this.projectMarkers();
  };

  private projectMarkers(): void {
    const projected: Record<string, ProjectedMarker> = {};
    const showAll = this.state.mode === 'all';

    for (const loc of ISLAND_LOCATIONS) {
      const anchor = this.locationAnchors.get(loc.id);
      if (!anchor) continue;

      const unlocked = showAll || this.state.stage >= loc.firstStage;
      if (!unlocked) {
        projected[loc.id] = { id: loc.id, x: -999, y: -999, visible: false, distance: 999 };
        continue;
      }

      this.tempVec.copy(anchor);
      const distance = this.tempVec.distanceTo(this.camera.position);
      this.tempVec.project(this.camera);

      const inFront = this.tempVec.z > -1 && this.tempVec.z < 1;
      const sx = (this.tempVec.x * 0.5 + 0.5) * this.width;
      const sy = (-this.tempVec.y * 0.5 + 0.5) * this.height;
      const inBounds = sx >= -40 && sx <= this.width + 40 && sy >= -40 && sy <= this.height + 40;

      projected[loc.id] = {
        id: loc.id,
        x: sx,
        y: sy,
        visible: inFront && inBounds,
        distance,
      };
    }

    // Азимут камеры для поворота стрелки компаса
    const dx = this.camera.position.x - this.controls.target.x;
    const dz = this.camera.position.z - this.controls.target.z;
    const azimuthDeg = (Math.atan2(dx, dz) * 180) / Math.PI;

    this.callbacks.onProjectMarkers(projected, azimuthDeg);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animFrameId);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);

    this.controls.dispose();
    this.ocean.dispose();
    this.atmosphere.dispose();
    this.flora.dispose();
    this.monument.dispose();
    this.landmarks.dispose();
    this.routes.dispose();
    this.terrain.heightTexture.dispose();
    this.terrain.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (el.parentElement) {
      el.parentElement.removeChild(el);
    }
  }
}
