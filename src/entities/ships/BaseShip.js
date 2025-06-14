// src/entities/ships/BaseShip.js
import * as THREE from "three";
import { safeDiv } from "../../util/Math.js";

export class BaseShip {
  constructor(x, y, opts = {}) {
    this.type = opts.type ?? "genericShip";
    this.faction = opts.faction ?? "neutral";
    this.mesh = this.makeMesh(opts.color ?? 0xffffff);
    this.mesh.position.set(x, y, 0);

    this.velocity = new THREE.Vector3();
    this.maxSpeed = opts.maxSpeed ?? 60;
    this.hull      = opts.hull   ?? 100;
    this.shield    = opts.shield ?? 0;
  }

  /** Override for custom geometry */
  makeMesh(color) {
    const geo = new THREE.ConeGeometry(4, 12, 4);
    const mat = new THREE.MeshPhongMaterial({ color });
    return new THREE.Mesh(geo, mat);
  }

  applyThrust(dirVec, dt) {
    this.velocity.addScaledVector(dirVec, dt);
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.setLength(this.maxSpeed);
    }
  }

  takeDamage(amt) {
    const absorb = Math.min(this.shield, amt);
    this.shield -= absorb;
    this.hull   -= (amt - absorb);
    if (this.hull <= 0) this.destroy();
  }

  update(dt, game) {
    this.mesh.position.addScaledVector(this.velocity, dt);
    this.think(dt, game);        // AI hook
  }

  // AI defaults to "do nothing"
  think(/* dt, game */) {}

  destroy() {
    this.mesh.visible = false;   // simple cleanup; SpawnSystem may remove
  }
}
