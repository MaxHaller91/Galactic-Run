import * as THREE from 'three';

// Weapon types with different characteristics
export const WEAPON_TYPES = {
  LASER: {
    name: 'Pulse Laser',
    projectileSpeed: 60,
    damage: 10,
    fireRate: 0.3, // seconds between shots
    energyCost: 5,
    range: 2.0, // projectile lifetime
    color: 0x00ff44,
    size: 0.2,
    sound: 'laser'
  },
  RAILGUN: {
    name: 'Railgun',
    projectileSpeed: 120,
    damage: 25,
    fireRate: 1.0, // slower fire rate
    energyCost: 15,
    range: 3.0,
    color: 0x00ffff,
    size: 0.15,
    sound: 'railgun'
  },
  MISSILE: {
    name: 'Missile Launcher',
    projectileSpeed: 40,
    damage: 30,
    fireRate: 1.5,
    energyCost: 20,
    range: 4.0,
    color: 0xff8800,
    size: 0.3,
    sound: 'missile',
    homing: true
  },
  PLASMA: {
    name: 'Plasma Cannon',
    projectileSpeed: 45,
    damage: 20,
    fireRate: 0.8,
    energyCost: 12,
    range: 2.5,
    color: 0xff00ff,
    size: 0.25,
    sound: 'plasma',
    splash: true
  }
};

export class WeaponSystem {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.weapons = [
      { type: WEAPON_TYPES.LASER, level: 1 },
      { type: WEAPON_TYPES.RAILGUN, level: 1 },
      { type: WEAPON_TYPES.MISSILE, level: 1 }
    ];
    this.currentWeapon = 0;
    this.energy = 100;
    this.maxEnergy = 100;
    this.energyRegenRate = 10; // energy per second
    this.lastFireTime = 0;
    this.overheated = false;
    this.overheatThreshold = 20; // energy level that triggers overheat
  }

  update(deltaTime) {
    // Regenerate energy
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenRate * deltaTime);
    }

    // Check overheat recovery
    if (this.overheated && this.energy > this.overheatThreshold + 10) {
      this.overheated = false;
      this.game.ui.showMessage('Weapons systems online', 'system-neutral');
    }
  }

  canFire() {
    const currentWeapon = this.weapons[this.currentWeapon];
    if (!currentWeapon || this.overheated) return false;
    
    const now = Date.now() / 1000;
    const timeSinceLastFire = now - this.lastFireTime;
    
    return timeSinceLastFire >= currentWeapon.type.fireRate && 
           this.energy >= currentWeapon.type.energyCost;
  }

  fireWeapon(playerPos, playerRot) {
    if (!this.canFire()) return false;

    const currentWeapon = this.weapons[this.currentWeapon];
    const weaponType = currentWeapon.type;
    
    // Consume energy
    this.energy -= weaponType.energyCost;
    this.lastFireTime = Date.now() / 1000;

    // Check for overheat
    if (this.energy <= this.overheatThreshold) {
      this.overheated = true;
      this.game.ui.showMessage('Weapons overheated!', 'warning');
    }

    // Create projectiles based on weapon type and level
    this.createProjectiles(playerPos, playerRot, currentWeapon);
    
    return true;
  }

  createProjectiles(playerPos, playerRot, weapon) {
    const weaponType = weapon.type;
    const level = weapon.level;

    // Base projectile
    this.createProjectile(playerPos, playerRot, weaponType, true);

    // Additional projectiles based on level
    if (level >= 2) {
      // Dual shot
      const offset = 0.8;
      const offsetX = Math.cos(playerRot + Math.PI / 2) * offset;
      const offsetY = Math.sin(playerRot + Math.PI / 2) * offset;
      
      this.createProjectile(
        { x: playerPos.x + offsetX, y: playerPos.y + offsetY }, 
        playerRot, weaponType, false
      );
      this.createProjectile(
        { x: playerPos.x - offsetX, y: playerPos.y - offsetY }, 
        playerRot, weaponType, false
      );
    }

    if (level >= 3) {
      // Spread shot
      this.createProjectile(playerPos, playerRot + 0.15, weaponType, false);
      this.createProjectile(playerPos, playerRot - 0.15, weaponType, false);
    }

    if (level >= 4) {
      // Burst fire
      setTimeout(() => {
        if (this.energy >= weaponType.energyCost * 0.5) {
          this.energy -= weaponType.energyCost * 0.5;
          this.createProjectile(playerPos, playerRot, weaponType, false);
        }
      }, 100);
    }
  }

  createProjectile(pos, angle, weaponType, isMainShot) {
    const projectile = new EnhancedProjectile(
      pos.x, pos.y, angle, true, weaponType, isMainShot
    );
    this.game.entities.projectiles.push(projectile);
    this.game.scene.add(projectile.mesh);
  }

  switchWeapon(direction = 1) {
    let newWeapon = this.currentWeapon;
    do {
      newWeapon = (newWeapon + direction) % this.weapons.length;
      if (newWeapon < 0) newWeapon = this.weapons.length - 1;
    } while (!this.weapons[newWeapon] && newWeapon !== this.currentWeapon);

    if (this.weapons[newWeapon]) {
      this.currentWeapon = newWeapon;
      this.game.ui.showMessage(`Switched to ${this.weapons[newWeapon].type.name}`, 'system-neutral');
    }
  }

  getCurrentWeapon() {
    return this.weapons[this.currentWeapon];
  }

  addWeapon(weaponType, slot = null) {
    if (slot === null) {
      // Find first empty slot
      slot = this.weapons.findIndex(w => w === null);
      if (slot === -1) slot = 1; // Replace second weapon if no empty slots
    }
    
    this.weapons[slot] = { type: weaponType, level: 1 };
    this.game.ui.showMessage(`${weaponType.name} installed in slot ${slot + 1}`, 'player-trade');
  }

  upgradeWeapon(slot = null) {
    if (slot === null) slot = this.currentWeapon;
    const weapon = this.weapons[slot];
    
    if (weapon && weapon.level < 4) {
      weapon.level++;
      this.game.ui.showMessage(`${weapon.type.name} upgraded to level ${weapon.level}`, 'player-trade');
      return true;
    }
    return false;
  }
}

export class EnhancedProjectile {
  constructor(x, y, angle, isPlayerProjectile, weaponType, isMainShot = true) {
    this.weaponType = weaponType;
    this.isPlayerProjectile = isPlayerProjectile;
    this.isMainShot = isMainShot;
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    
    const speed = weaponType.projectileSpeed;
    this.velocity = new THREE.Vector2(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    
    this.life = weaponType.range;
    this.damage = weaponType.damage;
    this.target = null; // For homing missiles
    
    // Special weapon behaviors
    if (weaponType.homing && isPlayerProjectile) {
      this.setupHoming();
    }
  }

  createMesh() {
    let size = this.weaponType.size;
    let color = this.weaponType.color;
    
    if (!this.isMainShot) {
      size *= 0.8; // Secondary shots are smaller
    }

    if (this.weaponType.name === 'Missile Launcher') {
      // Create missile-like projectile
      const group = new THREE.Group();
      
      const bodyGeometry = new THREE.CylinderGeometry(size * 0.3, size * 0.5, size * 3, 6);
      const bodyMaterial = new THREE.MeshBasicMaterial({ color: color });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.rotation.z = Math.PI / 2;
      group.add(body);
      
      // Exhaust trail
      const trailGeometry = new THREE.ConeGeometry(size * 0.2, size, 4);
      const trailMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff4400, 
        transparent: true, 
        opacity: 0.7 
      });
      const trail = new THREE.Mesh(trailGeometry, trailMaterial);
      trail.position.x = -size * 1.5;
      trail.rotation.z = -Math.PI / 2;
      group.add(trail);
      
      return group;
    } else {
      // Standard projectile
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const material = new THREE.MeshBasicMaterial({ color: color });
      return new THREE.Mesh(geometry, material);
    }
  }

  setupHoming() {
    // Find nearest enemy for homing
    // This would be implemented to target pirates
  }

  update(deltaTime, game) {
    // Homing behavior for missiles
    if (this.weaponType.homing && this.isPlayerProjectile && !this.target) {
      this.findTarget(game);
    }

    if (this.target && this.weaponType.homing) {
      this.updateHoming(deltaTime);
    }

    // Update position
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
    
    // Update rotation to match velocity direction
    const angle = Math.atan2(this.velocity.y, this.velocity.x);
    this.mesh.rotation.z = angle;
    
    this.life -= deltaTime;
  }

  findTarget(game) {
    let closestDistance = Infinity;
    let closestPirate = null;
    
    game.entities.pirates.forEach(pirate => {
      const distance = this.mesh.position.distanceTo(pirate.mesh.position);
      if (distance < 100 && distance < closestDistance) { // 100 unit detection range
        closestDistance = distance;
        closestPirate = pirate;
      }
    });
    
    this.target = closestPirate;
  }

  updateHoming(deltaTime) {
    if (!this.target || !this.target.mesh) {
      this.target = null;
      return;
    }

    const targetPos = this.target.mesh.position;
    const currentPos = this.mesh.position;
    
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const targetAngle = Math.atan2(dy, dx);
      const currentAngle = Math.atan2(this.velocity.y, this.velocity.x);
      
      // Gradually turn towards target
      let angleDiff = targetAngle - currentAngle;
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      
      const turnRate = 3.0; // radians per second
      const maxTurn = turnRate * deltaTime;
      const actualTurn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
      
      const newAngle = currentAngle + actualTurn;
      const speed = this.velocity.length();
      
      this.velocity.x = Math.cos(newAngle) * speed;
      this.velocity.y = Math.sin(newAngle) * speed;
    }
  }

  checkCollision(target, game) {
    const distance = this.mesh.position.distanceTo(target.mesh.position);
    const hitRadius = 3;
    
    if (distance < hitRadius) {
      // Handle splash damage for plasma weapons
      if (this.weaponType.splash) {
        this.applySplashDamage(game);
      }
      return true;
    }
    return false;
  }

  applySplashDamage(game) {
    const splashRadius = 15;
    const splashDamage = this.damage * 0.5;
    
    game.entities.pirates.forEach(pirate => {
      const distance = this.mesh.position.distanceTo(pirate.mesh.position);
      if (distance < splashRadius) {
        pirate.takeDamage(splashDamage, game);
      }
    });
    
    // Visual splash effect
    this.createSplashEffect(game);
  }

  createSplashEffect(game) {
    const splashGeometry = new THREE.RingGeometry(5, 15, 16);
    const splashMaterial = new THREE.MeshBasicMaterial({ 
      color: this.weaponType.color, 
      transparent: true, 
      opacity: 0.6 
    });
    const splash = new THREE.Mesh(splashGeometry, splashMaterial);
    splash.position.copy(this.mesh.position);
    game.scene.add(splash);
    
    // Animate and remove splash effect
    let opacity = 0.6;
    const fadeOut = () => {
      opacity -= 0.05;
      splash.material.opacity = opacity;
      splash.scale.multiplyScalar(1.1);
      
      if (opacity <= 0) {
        game.scene.remove(splash);
      } else {
        requestAnimationFrame(fadeOut);
      }
    };
    fadeOut();
  }
}
