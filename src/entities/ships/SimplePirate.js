import * as THREE from 'three';
import { Projectile } from '../misc/Projectile.js';
import { safeDiv } from '../../util/Math.js';

export class SimplePirate {
  constructor(x, y) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 15;
    this.health = 30;
    this.maxHealth = 30;
    this.state = 'HUNT';
    this.target = null;
    this.lastShotTime = 0;
    this.fireRate = 800;
    this.attackRange = 60;
    this.detectionRange = 200;
    this.optimalRange = 45;
  }

  createMesh() {
    const group = new THREE.Group();
    const hullGeometry = new THREE.ConeGeometry(0.8, 2.5, 3);
    const hullMaterial = new THREE.MeshBasicMaterial({ color: 0xaa2222 });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI / 2;
    group.add(hull);
    return group;
  }

  update(deltaTime, game) {
    switch (this.state) {
      case 'HUNT': this.huntTarget(deltaTime, game); break;
      case 'ATTACK': this.attackTarget(deltaTime, game); break;
      case 'FLEE': this.fleeFromDanger(deltaTime, game); break;
    }
    this.velocity.multiplyScalar(0.8);
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
  }

  huntTarget(deltaTime, game) {
    this.target = this.findClosestTarget(game);
    if (!this.target) {
      this.patrol(deltaTime);
      return;
    }
    const distance = this.mesh.position.distanceTo(this.target.position);
    if (distance > this.detectionRange * 2) {
      this.target = null;
      return;
    }
    if (distance < this.attackRange) {
      this.state = 'ATTACK';
      return;
    }
    this.moveToward(this.target.position, deltaTime);
  }

  attackTarget(deltaTime, game) {
    if (!this.target) {
      this.state = 'HUNT';
      return;
    }
    const distance = this.mesh.position.distanceTo(this.target.position);
    if (distance > this.attackRange * 1.5) {
      this.state = 'HUNT';
      return;
    }
    if (this.health < this.maxHealth * 0.4 || this.policeNearby(game)) {
      this.state = 'FLEE';
      return;
    }
    if (distance < this.optimalRange) {
      this.moveAwayFrom(this.target.position, deltaTime);
    } else if (distance > this.optimalRange * 1.3) {
      this.moveToward(this.target.position, deltaTime);
    } else {
      this.circleTarget(this.target.position, deltaTime);
    }
    this.fireAtTarget(game);
  }

  fleeFromDanger(deltaTime, game) {
    const threats = this.findThreats(game);
    if (threats.length === 0) {
      this.state = 'HUNT';
      return;
    }
    this.moveAwayFrom(threats[0].position, deltaTime, 1.5);
    if (this.health > this.maxHealth * 0.7 && !this.policeNearby(game)) {
      this.state = 'HUNT';
    }
  }

  findClosestTarget(game) {
    let closest = null;
    let closestDist = this.detectionRange;
    const playerDist = this.mesh.position.distanceTo(game.playerShip.mesh.position);
    if (playerDist < closestDist) {
      closest = { position: game.playerShip.mesh.position, type: 'player', entity: game.playerShip };
      closestDist = playerDist;
    }
    game.entities.friendlyShips.forEach((ship) => {
      if (ship.docked) return;
      const dist = this.mesh.position.distanceTo(ship.mesh.position);
      if (dist < closestDist) {
        closest = { position: ship.mesh.position, type: 'friendly', entity: ship };
        closestDist = dist;
      }
    });
    if (game.entities.tradingShips) {
      game.entities.tradingShips.forEach((trader) => {
        if (trader.docked) return;
        const dist = this.mesh.position.distanceTo(trader.mesh.position);
        if (dist < closestDist) {
          closest = { position: trader.mesh.position, type: 'trader', entity: trader };
          closestDist = dist;
        }
      });
    }
    return closest;
  }

  findThreats(game) {
    const threats = [];
    game.entities.police.forEach((police) => {
      const dist = this.mesh.position.distanceTo(police.mesh.position);
      if (dist < 120) {
        threats.push({ position: police.mesh.position, distance: dist });
      }
    });
    return threats.sort((a, b) => a.distance - b.distance);
  }

  policeNearby(game) {
    return game.entities.police.some((police) => police.mesh.position.distanceTo(this.mesh.position) < 80);
  }

  patrol(deltaTime) {
    if (!this.patrolTarget || this.reachedTarget(this.patrolTarget, 30)) {
      this.patrolTarget = {
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
      };
    }
    this.moveToward(this.patrolTarget, deltaTime, 0.7);
  }

  moveToward(targetPos, deltaTime, speedMod = 1.0) {
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y - this.mesh.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const inv = safeDiv(1, dist);
      this.velocity.x += dx * inv * this.maxSpeed * speedMod * deltaTime * 3;
      this.velocity.y += dy * inv * this.maxSpeed * speedMod * deltaTime * 3;
    }
    this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
  }

  moveAwayFrom(targetPos, deltaTime, speedMod = 1.0) {
    const dx = this.mesh.position.x - targetPos.x;
    const dy = this.mesh.position.y - targetPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const inv = safeDiv(1, dist);
      this.velocity.x += dx * inv * this.maxSpeed * speedMod * deltaTime * 3;
      this.velocity.y += dy * inv * this.maxSpeed * speedMod * deltaTime * 3;
      this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  circleTarget(targetPos, deltaTime) {
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y - this.mesh.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const inv = safeDiv(1, dist);
      const perpX = -dy * inv;
      const perpY = dx * inv;
      this.velocity.x += perpX * this.maxSpeed * deltaTime * 2;
      this.velocity.y += perpY * this.maxSpeed * deltaTime * 2;
      this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  fireAtTarget(game) {
    const currentTime = Date.now();
    if (currentTime - this.lastShotTime < this.fireRate) return;
    const dx = this.target.position.x - this.mesh.position.x;
    const dy = this.target.position.y - this.mesh.position.y;
    const angle = Math.atan2(dy, dx);
    const projectile = new Projectile(this.mesh.position.x, this.mesh.position.y, angle, false);
    projectile.damage = 15;
    game.entities.projectiles.push(projectile);
    game.scene.add(projectile.mesh);
    this.lastShotTime = currentTime;
  }

  reachedTarget(target, threshold) {
    const dx = target.x - this.mesh.position.x;
    const dy = target.y - this.mesh.position.y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  }

  takeDamage(amount) {
    this.health -= amount;
    return this.health <= 0;
  }
}
