//-------------------------------------------------------------------
// minimal-yuka-test.js
//-------------------------------------------------------------------
import * as THREE from 'three';
import {
  Vehicle,
  ArriveBehavior,
  GameEntity,
  Time,
  World           // ← Yuka's default world helper
} from 'yuka';

/* ╔════════════════════════════════════════════════════════════╗
   ║ 1.  Simple ship class (extends Vehicle)                    ║
   ╚════════════════════════════════════════════════════════════╝ */
class TestShip extends Vehicle {
  constructor(target, scene) {
    super();

    // basic physics
    this.maxSpeed = 60;
    this.mass     = 10;

    // single steering behaviour
    const arrive = new ArriveBehavior(target.position);
    arrive.deceleration = 3;        // 1 = slow, 5 = hard brake
    this.steering.add(arrive);

    // simple cube mesh for visuals
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 20),
      new THREE.MeshNormalMaterial()
    );
    scene.add(mesh);

    // sync mesh ↔ Yuka entity every frame
    this.setRenderComponent(mesh, (entity, visual) => {
      visual.position.copy(entity.position);
      visual.quaternion.copy(entity.rotation);
    });
  }

  /* optional: print force & speed for confirmation */
  update(dt) {
    super.update(dt);
    console.log(
      `[MINIMAL TEST] force=${this.steeringForce.length().toFixed(2)}  ` +
      `speed=${this.velocity.length().toFixed(2)}`
    );
  }
}

/* ╔════════════════════════════════════════════════════════════╗
   ║ 2.  Three.js scene & Yuka world setup                      ║
   ╚════════════════════════════════════════════════════════════╝ */
export function runMinimalTest() {
  console.log('=== STARTING MINIMAL YUKA TEST ===');
  
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 80, 300);
  camera.lookAt(scene.position);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  /* Yuka world + time helper */
  const world = new World();
  const clock = new Time();

  /* ╔════════════════════════════════════════════════════════════╗
     ║ 3.  Create a static station (just a point)                 ║
     ╚════════════════════════════════════════════════════════════╝ */
  const station = new GameEntity();
  station.position.set(200, 0, 0);            // docking point
  world.add(station);

  /* Optional: little sphere so you can see the goal */
  const stationMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  stationMesh.position.copy(station.position);
  scene.add(stationMesh);

  /* ╔════════════════════════════════════════════════════════════╗
     ║ 4.  Spawn the ship                                         ║
     ╚════════════════════════════════════════════════════════════╝ */
  const ship = new TestShip(station, scene);
  world.add(ship);

  /* ╔════════════════════════════════════════════════════════════╗
     ║ 5.  Main loop                                              ║
     ╚════════════════════════════════════════════════════════════╝ */
  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.update().getDelta();  // seconds since last frame
    world.update(delta);                      // advances Yuka physics
    renderer.render(scene, camera);
  }

  animate();
  
  console.log('=== MINIMAL YUKA TEST RUNNING ===');
}
