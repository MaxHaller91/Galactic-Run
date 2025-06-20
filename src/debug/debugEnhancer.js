import * as THREE from 'three';

/**
 * Attach a visual debug marker to an entity's arrive target.
 * Call this in your initializeGame() after entity creation.
 */
export function addArriveDebugMarker(entity, scene) {
  const geometry = new THREE.SphereGeometry(5, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
  const marker = new THREE.Mesh(geometry, material);
  marker.name = `${entity.name}-arriveMarker`;
  scene.add(marker);
  entity.debugArriveMarker = marker;
}

/**
 * Optionally show a line from entity to its target.
 * Will recreate the line each frame.
 */
export function updateDebugLine(entity, scene) {
  if (!entity.arrive || !entity.arrive.target) return;

  if (entity.debugLine) {
    scene.remove(entity.debugLine);
  }

  const material = new THREE.LineBasicMaterial({ color: 0xffaa00 });
  const points = [entity.position.clone(), entity.arrive.target.clone()];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  line.name = `${entity.name}-debugLine`;
  scene.add(line);
  entity.debugLine = line;
}

/**
 * Syncs all debug visuals for a list of AI ships.
 * Call this in the game update loop.
 */
export function syncDebugVisuals(entities) {
  for (const e of entities) {
    if (e.arrive?.target && e.debugArriveMarker) {
      e.debugArriveMarker.position.copy(e.arrive.target);
    }
  }
}
