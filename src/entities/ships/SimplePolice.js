import * as THREE from 'three';
import {
  POLICE_SPEED,
  POLICE_FIRE_RANGE,
  POLICE_BURST_SIZE
} from '../../constants/PoliceAI.js';
import { EnhancedProjectile, WEAPON_TYPES } from 'weapons';

const POLICE_DEBUG = true; // flip to false to silence logs

function dbg(ship, msg = '') {
  if (!POLICE_DEBUG) return;
  const v = ship.velocity.length().toFixed(1);
  const text = `[P${ship.id}] state:${ship.state} vel:${v} tgt:${ship.targetShip ? ship.targetShip.id : 'none'} ${msg}`;
  console.log(text);
  // Route to Ctrl+L overlay if event logger is available
  if (ship.game && ship.game.eventLogger && ship.game.eventLogger.logPolice) {
    ship.game.eventLogger.logPolice(text);
  }
}

export class SimplePolice {
  constructor(x, y, game) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.position = this.mesh.position; // Alias for easier access in AI logic
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = POLICE_SPEED;
    this.health = 240;
    this.maxHealth = 240;
    this.faction = 'police';
    this.game = game;
    this.id = Math.floor(Math.random() * 1000); // Unique ID for debugging
    this.state = 'PATROL';
    this.patrolIndex = 0; // Current station index
    this.holdTimer = 0;
    this.lastShotTime = 0;
    this.fireRate = 400;
    this.patrolTarget = null; // THREE.Vector2 of current waypoint
    dbg(this, 'spawned');
  }

  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      dbg(this, '→ ' + newState);
    }
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

  //-------------------------------------------------------------
  // ─── constants ──────────────────────────────────────────────
  SENSOR_RADIUS   = 400;
  FIRE_RADIUS     = 250;

  // ─── new persistent slots ───────────────────────────────────

  // ─── public update() override ───────────────────────────────
  update(dt, game) {
    switch (this.state) {

      case 'PATROL': {
        if (game.activeBeacon) {
          this.beaconPos = game.activeBeacon.position.clone();
          this.state = 'RESPOND'; dbg(this,'→ RESPOND'); break;
        }
        const p = this.findNearestPirate(game);
        if (p) { this.targetShip = p; this.state = 'INTERCEPT';
                 dbg(this,'→ INTERCEPT tgt:'+p.id); break; }
        this.patrolMove(dt);                              break;
      }

      case 'INTERCEPT': {
        if (!this.targetShip || this.targetShip.destroyed) { this.reset(); break; }
        const dist = this.seek(this.targetShip.mesh.position, dt);
        if (dist < this.FIRE_RADIUS) this.fireAt(this.targetShip, game);
        break;
      }

      case 'RESPOND': {
        if (!game.activeBeacon) { this.reset(); break; }
        const dist = this.seek(this.beaconPos, dt);
        if (dist < this.SENSOR_RADIUS) {
          const p = this.findNearestPirate(game);
          if (p) { this.targetShip = p; this.state='INTERCEPT';
                   dbg(this,'→ INTERCEPT tgt:'+p.id); }
          else if (dist < 50) this.reset();
        }
        break;
      }
    }
  }

  // ─── helpers ────────────────────────────────────────────────
  findNearestPirate(game) {
    let best=null, bestSq=this.SENSOR_RADIUS*this.SENSOR_RADIUS;
    for (const p of game.entities.pirates)
      if (!p.destroyed) {
        const dSq = this.mesh.position.distanceToSquared(p.mesh.position);
        if (dSq < bestSq) { best=p; bestSq=dSq; }
      }
    return best;
  }

  reset() { this.state='PATROL'; this.targetShip=null; this.beaconPos=null;
            dbg(this,'→ PATROL'); }

  seek(targetPos, dt) {
    const dir = targetPos.clone().sub(this.mesh.position);
    const dist = dir.length();
    if (dist>1) {
      dir.setLength(this.maxSpeed);
      this.velocity.lerp(dir,0.1);
    }
    this.mesh.position.addScaledVector(this.velocity, dt);
    return dist;
  }

  fireAt(enemy, game) {
    const now = Date.now();
    if (now - this.lastShotTime < this.fireRate) return;
    this.lastShotTime = now;

    for (let i = 0; i < POLICE_BURST_SIZE; i++) {
      // Slight angle offset so missiles don’t overlap perfectly
      const fireAngle = Math.atan2(
        enemy.mesh.position.y - this.position.y,
        enemy.mesh.position.x - this.position.x
      ) + (i - 1) * 0.05;
      const missile = new EnhancedProjectile(
        this.position.x,
        this.position.y,
        fireAngle,
        false,
        WEAPON_TYPES.MISSILE,
        true
      );
      game.entities.projectiles.push(missile);
      game.scene.add(missile.mesh);
    }
  }

  patrolMove(dt) {
    // lazily pick the first target
    if (!this.patrolTarget) this.pickNextPatrolTarget();

    // seek current target
    const dist = this.seek(this.patrolTarget, dt);

    // arrived → choose next station
    if (dist < 50) this.pickNextPatrolTarget();

    // mild damping
    this.velocity.multiplyScalar(0.9);
  }

  pickNextPatrolTarget() {
    const stations = (this.game.entities && this.game.entities.stations) || [];
    if (!stations || stations.length === 0) {
      // fallback: map centre
      this.patrolTarget = new THREE.Vector2(0, 0);
      return;
    }
    this.patrolIndex = (this.patrolIndex + 1) % stations.length;
    const s = stations[this.patrolIndex];
    this.patrolTarget = new THREE.Vector2(s.mesh.position.x, s.mesh.position.y);
  }

  takeDamage(amount) {
    this.health -= amount;
    return this.health <= 0;
  }
}
