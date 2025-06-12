import * as THREE from 'three';

export class SimplePolice {
  constructor(x, y, stations, faction) {
    this.mesh = this.createMesh(faction);
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 25;
    this.health = 60;
    this.maxHealth = 60;
    this.faction = faction;
    this.stations = stations;
    this.state = 'PATROL';
    this.target = null;
    this.lastShotTime = 0;
    this.fireRate = 400;
  }

  createMesh(faction) {
    const group = new THREE.Group();
    const hullGeometry = new THREE.ConeGeometry(0.6, 3, 4);
    const hullColor = faction === 'Federated Commerce Guild' ? 0x0088ff : 0xffaa00;
    const hullMaterial = new THREE.MeshBasicMaterial({ color: hullColor });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI / 2;
    group.add(hull);
    return group;
  }

  update(deltaTime, game) {
    this.velocity.multiplyScalar(0.8);
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
  }

  takeDamage(amount) {
    this.health -= amount;
    return this.health <= 0;
  }
}
