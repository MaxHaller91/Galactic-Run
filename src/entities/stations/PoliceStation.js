import * as THREE from 'three';
import { Station } from './Station.js';
import { SimplePolice } from '../ships/SimplePolice.js';

export class PoliceStation extends Station {
  /**
   * @param {THREE.Vector3} position
   * @param {Object} [options]
   * @param {Object} [options.resources]  Starting stock (optional)
   */
  constructor(position, options = {}) {
    super(
      'police',
      position,
      options.resources || { materials: 60, food: 30 },
      options.prices || {},
    );
    // `Station` already provides this.credits
  }

  /** Blue-white cylinder so the station stands out. */
  createMesh() {
    const geo = new THREE.CylinderGeometry(3, 3, 5, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x114488 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.position);
    return mesh;
  }

  /** Build a police ship every time we reach 100 000 cr, up to a limit. */
  update(deltaTime, game) {
    super.update(deltaTime, game);

    if (this.credits >= 100_000) {
      // Count only alive police ships
      const alivePoliceCount = game.entities.police.filter((ship) => ship.mesh.visible).length;
      if (alivePoliceCount < 10) {
        this.credits -= 100_000;
        this.spawnPoliceShip(game);
      }
    }
  }

  /** Other stations will call this later to donate 5 000 cr at a time. */
  receiveCredits(amount) {
    this.credits += amount;
  }

  /** Spawns an existing SimplePolice craft. */
  spawnPoliceShip(game) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 10;
    const x = this.position.x + Math.cos(angle) * dist;
    const y = this.position.y + Math.sin(angle) * dist;
    const ship = new SimplePolice(x, y, game);
    game.entities.police.push(ship);
    game.scene.add(ship.mesh);
  }
}
