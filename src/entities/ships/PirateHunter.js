import * as THREE from 'three';
import { POLICE_BURST_SIZE } from '../../constants/PoliceAI.js';
import { EnhancedProjectile, WEAPON_TYPES } from 'weapons';

export class PirateHunter {
  constructor(x, y, game) {
    this.game = game;
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2();
    this.maxSpeed = 120;                 // faster than cops
    this.sensor   = 700;
    this.fireR    = 350;
    this.lastShot = 0;
    this.fireRate = 250;                 // shoots faster
  }
  createMesh() {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(1),
      new THREE.MeshBasicMaterial({ color: 0xff44ff })
    );
    m.rotation.z = Math.PI / 2;
    return m;
  }
  update(dt) {
    const tgt = this.findPirate();
    if (tgt) {
      const dist = this.seek(tgt.mesh.position, dt);
      if (dist < this.fireR) this.fireAt(tgt);
    } else {
      // idle: slow circle toward centre
      this.seek(new THREE.Vector2(0,0), dt);
    }
    this.mesh.position.addScaledVector(this.velocity, dt);
    this.velocity.multiplyScalar(0.9);   // damping
  }
  findPirate() {
    let best = null, bestSq = this.sensor*this.sensor;
    for (const p of this.game.entities.pirates)
      if (!p.destroyed) {
        const d = this.mesh.position.distanceToSquared(p.mesh.position);
        if (d < bestSq) { best = p; bestSq = d; }
      }
    return best;
  }
  seek(pos, dt) {
    const dir = pos.clone().sub(this.mesh.position);
    const dist = dir.length();
    if (dist > 50) {
      dir.setLength(this.maxSpeed);
      this.velocity.lerp(dir, 0.2);
    }
    return dist;
  }
  fireAt(pirate) {
    const now = Date.now();
    if (now - this.lastShot < this.fireRate) return;
    this.lastShot = now;
    const angle = Math.atan2(
      pirate.mesh.position.y - this.mesh.position.y,
      pirate.mesh.position.x - this.mesh.position.x
    );
    for (let i=0;i<POLICE_BURST_SIZE;i++){
      const missile = new EnhancedProjectile(
        this.mesh.position.x, this.mesh.position.y,
        angle + (i-1)*0.05,   // slight spread
        false, WEAPON_TYPES.MISSILE, true
      );
      this.game.entities.projectiles.push(missile);
      this.game.scene.add(missile.mesh);
    }
  }
}
