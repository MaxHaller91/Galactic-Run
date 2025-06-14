import * as THREE from 'three';
import {
  POLICE_DEFENCE_RADIUS,
  POLICE_PATROL_HOLD,
  POLICE_SPEED,
  POLICE_FIRE_RANGE,
  POLICE_BURST_SIZE
} from '../../constants/PoliceAI.js';
import { HomingMissile } from '../misc/HomingMissile.js';

export class SimplePolice {
  constructor(x, y, game) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.position = this.mesh.position; // Alias for easier access in AI logic
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = POLICE_SPEED;
    this.health = 60;
    this.maxHealth = 60;
    this.faction = 'police';
    this.game = game;
    this.state = 'PATROLLING';
    this.patrolIndex = 0; // Current station index
    this.holdTimer = 0;
    this.targetPirate = null;
    this.lastShotTime = 0;
    this.fireRate = 400;
  }

  createMesh() {
    const group = new THREE.Group();
    const hullGeometry = new THREE.ConeGeometry(0.6, 3, 4);
    const hullMaterial = new THREE.MeshBasicMaterial({ color: 0x3366ff });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI / 2;
    group.add(hull);
    return group;
  }

  update(deltaTime, game) {
    switch (this.state) {
      case 'PATROLLING':
        this.patrol(deltaTime, game);
        break;
      case 'INTERCEPT':
        this.intercept(deltaTime, game);
        break;
    }
    // Apply movement
    this.velocity.multiplyScalar(0.8);
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
  }

  patrol(deltaTime, game) {
    const stations = game.entities.stations;
    if (!stations.length) return;

    // 1️⃣ Look for pirates endangering ANY station
    const pirate = this.findThreat(game);
    if (pirate) {
      this.targetPirate = pirate;
      this.state = 'INTERCEPT';
      return;
    }

    // 2️⃣ Navigate toward current patrol station
    const station = stations[this.patrolIndex % stations.length];
    const dist = this.position.distanceTo(station.mesh.position);

    if (dist > 5) {
      this.seek(station.mesh.position, POLICE_SPEED, deltaTime);
      return;
    }

    // 3️⃣ Arrived – hold for a bit then advance to next station
    this.holdTimer += deltaTime;
    if (this.holdTimer >= POLICE_PATROL_HOLD) {
      this.holdTimer = 0;
      this.patrolIndex++;
    }
  }

  // Helper – point back toward next patrol so we don’t freeze
  resumePatrolVelocity(game) {
    const sts = game.entities.stations;
    if (!sts.length) return;
    const dest = sts[this.patrolIndex % sts.length].mesh.position;
    this.seek(dest, POLICE_SPEED, 0); // dt 0 → just sets velocity
  }

  intercept(deltaTime, game) {
    const p = this.targetPirate;

    if (!p || !p.mesh.visible || p.health <= 0) {
      this.targetPirate = null;
      this.state = 'PATROLLING';
      this.resumePatrolVelocity(game);
      return;
    }

    const dist = this.position.distanceTo(p.mesh.position);

    if (dist > POLICE_DEFENCE_RADIUS * 1.5) {
      this.targetPirate = null;
      this.state = 'PATROLLING';
      this.resumePatrolVelocity(game);
      return;
    }

    if (dist <= POLICE_FIRE_RANGE) {
      this.velocity.set(0, 0); // Brake
      this.fireAt(p, game); // Burst of 3 missiles
      return;
    }

    this.seek(p.mesh.position, POLICE_SPEED * 1.2, deltaTime); // Close in
  }

  findThreat(game) {
    const stations = game.entities.stations;
    return game.entities.pirates.find(pirate =>
      pirate.mesh.visible && stations.some(st =>
        st.mesh.position.distanceTo(pirate.mesh.position) <= POLICE_DEFENCE_RADIUS
      )
    );
  }

  seek(targetPos, speed, deltaTime) {
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y - this.mesh.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const invDist = 1 / dist;
      this.velocity.x += dx * invDist * speed * deltaTime * 3;
      this.velocity.y += dy * invDist * speed * deltaTime * 3;
    }
    this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
  }

  fireAt(enemy, game) {
    const now = Date.now();
    if (now - this.lastShotTime < this.fireRate) return;
    this.lastShotTime = now;

    for (let i = 0; i < POLICE_BURST_SIZE; i++) {
      // Slight angle offset so missiles don’t overlap perfectly
      const missile = new HomingMissile(
        this.position.x,
        this.position.y,
        enemy,
        /* speed   */ 30,
        /* turnRate*/ 0.12 + i * 0.01
      );
      game.entities.projectiles.push(missile);
      game.scene.add(missile.mesh);
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    return this.health <= 0;
  }
}
