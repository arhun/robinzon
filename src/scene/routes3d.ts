import * as THREE from 'three';
import { ISLAND_ROUTES } from '../data/routes';
import type { MapMode } from '../types/island';
import { getIslandHeight } from './terrain';

interface BuiltRoute {
  fromStage: number;
  toStage?: number;
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  pulseMesh: THREE.InstancedMesh;
  pulseCount: number;
  speed: number;
}

export interface RoutesController {
  group: THREE.Group;
  update: (stage: number, mode: MapMode, visible: boolean, elapsed: number) => void;
  dispose: () => void;
}

export function createRoutes3D(): RoutesController {
  const group = new THREE.Group();
  group.name = 'island-routes-group';

  const disposables: Array<{ dispose: () => void }> = [];
  const builtRoutes: BuiltRoute[] = [];
  const pulseGeo = new THREE.SphereGeometry(0.22, 8, 8);
  disposables.push(pulseGeo);

  for (const routeDef of ISLAND_ROUTES) {
    const rGroup = new THREE.Group();
    const pts3D = routeDef.points.map(([x, z]) => {
      const h = getIslandHeight(x, z);
      const y = (routeDef.isSea ? Math.max(h, 0) : Math.max(h, 0.25)) + 0.42;
      return new THREE.Vector3(x, y, z);
    });

    const curve = new THREE.CatmullRomCurve3(pts3D);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.11, 6, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: routeDef.color,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    tubeMesh.renderOrder = 3;
    rGroup.add(tubeMesh);

    const pulseCount = Math.max(4, Math.min(8, routeDef.points.length));
    const pulseMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const pulseMesh = new THREE.InstancedMesh(pulseGeo, pulseMat, pulseCount);
    pulseMesh.renderOrder = 4;
    rGroup.add(pulseMesh);

    group.add(rGroup);
    disposables.push(tubeGeo, tubeMat, pulseMat);

    builtRoutes.push({
      fromStage: routeDef.fromStage,
      toStage: routeDef.toStage,
      group: rGroup,
      curve,
      pulseMesh,
      pulseCount,
      speed: routeDef.isSea ? 0.16 : 0.12,
    });
  }

  const dummy = new THREE.Object3D();
  const pt = new THREE.Vector3();

  return {
    group,
    update: (stage, mode: MapMode, visible: boolean, elapsed: number) => {
      group.visible = visible;
      if (!visible) return;

      const showAll = mode === 'all';
      for (const r of builtRoutes) {
        const isActive =
          showAll ||
          (stage >= r.fromStage && (r.toStage === undefined || stage <= r.toStage));
        r.group.visible = isActive;
        if (!isActive) continue;

        for (let i = 0; i < r.pulseCount; i++) {
          const t = (elapsed * r.speed + i / r.pulseCount) % 1;
          r.curve.getPointAt(t, pt);
          dummy.position.copy(pt);
          const s = 0.75 + Math.sin(t * Math.PI) * 0.45;
          dummy.scale.setScalar(s);
          dummy.updateMatrix();
          r.pulseMesh.setMatrixAt(i, dummy.matrix);
        }
        r.pulseMesh.instanceMatrix.needsUpdate = true;
      }
    },
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
