import * as THREE from 'three';
import { Station } from './Station.js';
import { SimplePirate } from '../ships/SimplePirate.js';

export class PirateStation extends Station {
  /**
   * @param {THREE.Vector3} position
   * @param {Object}   [options]
   * @param {number}   [options.aggressionRadius=300]  Detection radius (px)
   * @param {number}   [options.spawnCooldown=15]      Seconds between spawns
   * @param {Object}   [options.resources]             Starting stockpile
   */
  constructor(position, options = {}) {
    super(
      'pirate',
      position,
      options.resources || { materials: 40, food: 20 },
      options.prices   || {}
    );
    this.aggressionRadius = options.aggressionRadius ?? 300;
    this.spawnCooldown   = options.spawnCooldown   ?? 150;
    this.spawnTimer      = 0;
  }

  /** Dark-maroon cube that matches the old pirate station look */
  createMesh() {
    const geom = new THREE.BoxGeometry(4, 4, 4);
    const mat  = new THREE.MeshBasicMaterial({ color: 0x441111 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(this.position);
    return mesh;
  }

  /** Called each frame by AISystem */
  update(deltaTime, game) {
    super.update(deltaTime, game);          // Keep standard station economy
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.spawnCooldown) {
      this.spawnTimer = 0;
      this.spawnPirate(game);
    }
  }

  /** Drops a SimplePirate near the station and registers it */
  spawnPirate(game) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 10;
    const x = this.position.x + Math.cos(angle) * dist;
    const y = this.position.y + Math.sin(angle) * dist;
    const pirate = new SimplePirate(x, y);
    game.entities.pirates.push(pirate);
    game.scene.add(pirate.mesh);
  }
}
