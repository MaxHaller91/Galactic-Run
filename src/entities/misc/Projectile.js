import * as THREE from 'three';

export class Projectile {
  constructor(x, y, angle, isPlayerProjectile, weaponLevel = 1) {
    this.mesh = this.createMesh(isPlayerProjectile, weaponLevel);
    this.mesh.position.set(x, y, 0);
    const speed = 60;
    this.velocity = new THREE.Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.life = 2.0;
    this.isPlayerProjectile = isPlayerProjectile;
    this.damage = isPlayerProjectile ? 20 : 15;
  }

  createMesh(isPlayerProjectile, weaponLevel) {
    const size = 0.2 + (weaponLevel - 1) * 0.05;
    const color = isPlayerProjectile ? 0x00dd88 : 0xff4400;
    const geometry = new THREE.SphereGeometry(size, 6, 6);
    const material = new THREE.MeshBasicMaterial({ color });
    return new THREE.Mesh(geometry, material);
  }

  update(deltaTime) {
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
    this.life -= deltaTime;
  }
}
