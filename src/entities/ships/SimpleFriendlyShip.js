import * as THREE from 'three';
import { DistressBeacon } from '../misc/DistressBeacon.js';

export class SimpleFriendlyShip {
  constructor(x, y, allStations, game) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 20;
    this.health = 25;
    this.maxHealth = 25;
    this.allStations = allStations;
    this.game = game;
    this.state = 'TRADE';
  }

  createMesh() {
    const group = new THREE.Group();
    const hullGeometry = new THREE.CapsuleGeometry(0.8, 2.5, 4, 8);
    const hullMaterial = new THREE.MeshBasicMaterial({ color: 0x00cc44 });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI / 2;
    group.add(hull);
    return group;
  }

  update(deltaTime) {
    this.velocity.multiplyScalar(0.8);
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
  }

  pirateNearby() {
    return this.game.entities.pirates.some((pirate) => pirate.mesh.position.distanceTo(this.mesh.position) < 60);
  }

  dropDistressBeacon() {
    const beacon = new DistressBeacon(this.mesh.position.x, this.mesh.position.y);
    if (!this.game.entities.distressBeacons) {
      this.game.entities.distressBeacons = [];
    }
    this.game.entities.distressBeacons.push(beacon);
    this.game.scene.add(beacon.mesh);
    if (this.game.ui) {
      this.game.ui.showMessage('Friendly ship under attack! Distress beacon deployed.', 'warning');
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    this.dropDistressBeacon();
    return this.health <= 0;
  }
}
