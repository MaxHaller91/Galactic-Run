import * as THREE from 'three';
import { COMMODITIES_LIST } from 'constants';

export class SpaceStation {
  constructor(x, y, name, CSS2DObjectConstructor) {
    this.name = name;
    const factions = ['Federated Commerce Guild', 'Outer Rim Prospectors'];
    this.faction = factions[Math.floor(Math.random() * factions.length)];
    this.factionColors = {
      'Federated Commerce Guild': new THREE.Color(0x0088ff),
      'Outer Rim Prospectors': new THREE.Color(0xffaa00),
      'Pirates': new THREE.Color(0xff0000)
    };
    
    this.population = 800 + Math.floor(Math.random() * 1200);
    this.maxPopulation = this.population * 1.5;
    this.foodStock = 400 + Math.floor(Math.random() * 200);
    this.waterStock = 250 + Math.floor(Math.random() * 150);
    this.happiness = 60 + Math.floor(Math.random() * 30);
    this.lastUpdateTime = Date.now();
    this.updateInterval = 30000;
    this.consumptionRate = { food: 0.1, water: 0.05 };
    this.productivityMultiplier = 1.0;
    this.controllingFaction = this.faction;
    this.stationHealth = 'healthy';
    
    this.tier = Math.max(1, Math.floor(this.population / 1000));
    this.maxCargo = 100 + (this.tier * 100);
    this.cargoHold = new Map();
    this.credits = 2000 + Math.floor(Math.random() * 3000);
    
    const stationTypes = ['mining', 'agricultural', 'industrial', 'commercial', 'research'];
    this.stationType = stationTypes[Math.floor(Math.random() * stationTypes.length)];
    
    this.defenseLevel = this.tier >= 3 ? Math.min(this.tier - 2, 3) : 0;
    this.defenseRange = this.defenseLevel > 0 ? 40 + (this.defenseLevel * 20) : 0;
    this.defenseDamage = this.defenseLevel > 0 ? 15 + (this.defenseLevel * 10) : 0;
    this.defenseFireRate = this.defenseLevel > 0 ? 0.5 - (this.defenseLevel * 0.1) : 0;
    this.lastDefenseShot = 0;
    
    // Add missing properties that game.js expects
    this.constructionQueue = [];
    this.ownedShips = [];
    this.governor = null; // Will be initialized later if needed
    
    const availableForProduction = COMMODITIES_LIST.filter(c => c.type === 'industrial' || c.type === 'consumer' || c.type === 'tech');
    this.productionFocus = availableForProduction[Math.floor(Math.random() * availableForProduction.length)].name;
    const availableForConsumption = COMMODITIES_LIST.filter(c => c.name !== this.productionFocus);
    this.consumptionFocus = availableForConsumption[Math.floor(Math.random() * availableForConsumption.length)].name;
    
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.initializeCargo();
    this.inventory = {};
    this.goods = this.initializeEconomy();
    this.label = this.createLabel(CSS2DObjectConstructor);
    this.mesh.add(this.label);
  }

  createMesh() {
    const group = new THREE.Group();
    const coreGeometry = new THREE.CylinderGeometry(3, 3, 1, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);
    
    const ringGeometry = new THREE.TorusGeometry(4, 0.5, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    
    const lightGeometry = new THREE.SphereGeometry(0.2, 6, 6);
    const factionColor = this.factionColors[this.faction] || new THREE.Color(0x00ff88);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: factionColor });
    for (let i = 0; i < 8; i++) {
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      const angle = (i / 8) * Math.PI * 2;
      light.position.set(Math.cos(angle) * 4, Math.sin(angle) * 4, 0.5);
      group.add(light);
    }
    return group;
  }

  createLabel(CSS2DObjectConstructor) {
    const div = document.createElement('div');
    div.className = 'station-label';
    const factionColorHex = this.factionColors[this.faction] ? `#${this.factionColors[this.faction].getHexString()}` : '#00ff88';
    const stationTypeColors = {
      'mining': '#ffaa00', 'agricultural': '#00ff00', 'industrial': '#ff6600',
      'commercial': '#00ffff', 'research': '#aa00ff'
    };
    const typeColor = stationTypeColors[this.stationType] || '#ffffff';
    
    div.innerHTML = `${this.name}<br><span style="font-size: 0.7em; color: ${typeColor};">${this.stationType.toUpperCase()} STATION</span><br><span style="font-size: 0.8em; color: ${factionColorHex};">${this.faction}</span><br><span style="font-size: 0.6em; color: #888888;">Tier ${this.tier} | ${this.credits}cr</span>`;
    div.style.fontFamily = "'Lucida Console', 'Courier New', monospace";
    div.style.color = '#00ff00';
    div.style.fontSize = '13px';
    div.style.textAlign = 'center';
    div.style.textShadow = '1px 1px 1px rgba(0,0,0,0.7)';
    div.style.backgroundColor = 'rgba(0, 20, 0, 0.5)';
    div.style.padding = '2px 4px';
    div.style.border = '1px solid rgba(0,255,0,0.3)';
    div.style.borderRadius = '2px';
    
    const label = new CSS2DObjectConstructor(div);
    label.position.set(0, 5.5, 0);
    return label;
  }

  initializeEconomy() {
    const goodsForSale = [];
    COMMODITIES_LIST.forEach(commodity => {
      let initialQuantity, baseStationSellPrice, baseStationBuyPrice;
      const P_base = commodity.basePrice;
      
      if (commodity.name === this.productionFocus) {
        initialQuantity = 200 + Math.floor(Math.random() * 301);
        baseStationSellPrice = Math.floor(P_base * (0.8 + Math.random() * 0.15));
        baseStationBuyPrice = Math.floor(P_base * (0.5 + Math.random() * 0.2));
      } else if (commodity.name === this.consumptionFocus) {
        initialQuantity = 0 + Math.floor(Math.random() * 51);
        baseStationSellPrice = Math.floor(P_base * (1.3 + Math.random() * 0.3));
        baseStationBuyPrice = Math.floor(P_base * (1.1 + Math.random() * 0.15));
      } else {
        initialQuantity = 0 + Math.floor(Math.random() * 21);
        baseStationSellPrice = Math.floor(P_base * (1.0 + Math.random() * 0.2));
        baseStationBuyPrice = Math.floor(P_base * (0.8 + Math.random() * 0.15));
      }
      
      if (baseStationBuyPrice >= baseStationSellPrice) {
        baseStationBuyPrice = Math.floor(baseStationSellPrice * 0.9);
      }
      baseStationSellPrice = Math.max(1, baseStationSellPrice);
      baseStationBuyPrice = Math.max(1, baseStationBuyPrice);
      this.inventory[commodity.name] = initialQuantity;
      
      if (initialQuantity > 0) {
        goodsForSale.push({
          name: commodity.name, type: commodity.type,
          stationBaseSellPrice: baseStationSellPrice,
          stationBaseBuyPrice: baseStationBuyPrice, basePrice: P_base,
        });
      }
    });
    return goodsForSale;
  }

  buyCommodity(commodityName, quantity) {
    if (this.inventory[commodityName] === undefined || this.inventory[commodityName] < quantity) return false;
    this.inventory[commodityName] -= quantity;
    return true;
  }

  sellCommodity(commodityName, quantity) {
    if (this.inventory[commodityName] === undefined) {
      const commodityDetails = COMMODITIES_LIST.find(c => c.name === commodityName);
      if (!commodityDetails) return false;
      this.inventory[commodityName] = 0;
    }
    this.inventory[commodityName] += quantity;
    return true;
  }

  initializeCargo() {
    const cargoByType = {
      mining: { 'Iron Ore': 150, 'Copper Ore': 100, 'Food Rations': 100, 'Water': 100, 'Basic Tools': 50 },
      agricultural: { 'Food Rations': 300, 'Seeds': 100, 'Water': 200, 'Basic Tools': 50, 'Fertilizer': 75 },
      industrial: { 'Manufactured Goods': 200, 'Iron Ore': 150, 'Electronics': 100, 'Basic Tools': 100, 'Energy Cells': 50 },
      commercial: { 'Food Rations': 100, 'Water': 100, 'Electronics': 100, 'Manufactured Goods': 100, 'Luxury Items': 50 },
      research: { 'Advanced Tech': 50, 'Rare Crystals': 75, 'Electronics': 150, 'Data Cores': 100, 'Research Equipment': 25 }
    };

    const startingCargo = cargoByType[this.stationType] || cargoByType.commercial;
    for (const [commodity, quantity] of Object.entries(startingCargo)) {
      this.cargoHold.set(commodity, quantity);
    }
  }

  spawnEmergencyPolice(game) {
    if (this.credits < 1000) return;
    this.credits -= 1000;
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 10;
    const x = this.mesh.position.x + Math.cos(angle) * distance;
    const y = this.mesh.position.y + Math.sin(angle) * distance;
    
    const police = new SimplePolice(x, y, game.entities.stations, this.controllingFaction);
    game.entities.police.push(police);
    game.scene.add(police.mesh);
    
    if (game.ui) {
      game.ui.showMessage(`${this.name} deployed emergency police!`, 'system-neutral');
    }
  }

  // Essential methods that game.js expects
  updateEconomy(currentTime, game) {
    // Simple placeholder - just update credits occasionally
    if (currentTime - this.lastUpdateTime > this.updateInterval) {
      this.credits += Math.floor(Math.random() * 100);
      this.lastUpdateTime = currentTime;
    }
  }

  updateTier() {
    // Simple tier calculation
    this.tier = Math.max(1, Math.floor(this.population / 1000));
  }

  defendAgainstPirates(game, deltaTime) {
    // Simple defense - stations can shoot at nearby pirates
    if (this.defenseLevel <= 0) return;
    
    const nearbyPirates = game.entities.pirates.filter(pirate => {
      const distance = pirate.mesh.position.distanceTo(this.mesh.position);
      return distance < this.defenseRange;
    });

    if (nearbyPirates.length > 0 && Date.now() - this.lastDefenseShot > (this.defenseFireRate * 1000)) {
      const target = nearbyPirates[0];
      const dx = target.mesh.position.x - this.mesh.position.x;
      const dy = target.mesh.position.y - this.mesh.position.y;
      const angle = Math.atan2(dy, dx);

      const projectile = new Projectile(
        this.mesh.position.x,
        this.mesh.position.y,
        angle,
        false,
        1,
        true
      );
      projectile.damage = this.defenseDamage;
      projectile.isStationDefense = true;

      game.entities.projectiles.push(projectile);
      game.scene.add(projectile.mesh);
      this.lastDefenseShot = Date.now();
    }
  }
}

// 1. SIMPLE DISTRESS BEACON ENTITY
export class DistressBeacon {
  constructor(x, y) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.timeLeft = 30; // Beacon lasts 30 seconds
    this.responded = false; // Has police responded yet?
  }

  createMesh() {
    const geometry = new THREE.SphereGeometry(2, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      transparent: true,
      opacity: 0.8 
    });
    const beacon = new THREE.Mesh(geometry, material);
    
    // Pulsing animation
    beacon.userData = { pulseTimer: 0 };
    return beacon;
  }

  update(deltaTime) {
    this.timeLeft -= deltaTime;
    
    // Pulse animation
    this.mesh.userData.pulseTimer += deltaTime * 4;
    const pulse = Math.sin(this.mesh.userData.pulseTimer) * 0.3 + 0.7;
    this.mesh.material.opacity = pulse;
    this.mesh.scale.setScalar(0.8 + pulse * 0.4);
    
    return this.timeLeft > 0; // Return false when expired
  }
}

// 2. SIMPLE PIRATE - ONLY 3 STATES
export class SimplePirate {
  constructor(x, y) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 15;
    this.health = 30;
    this.maxHealth = 30;
    
    // SIMPLE STATE MACHINE
    this.state = 'HUNT'; // HUNT, ATTACK, FLEE
    this.target = null;
    this.lastShotTime = 0;
    this.fireRate = 800;
    this.attackRange = 60;
    this.detectionRange = 100;
    this.optimalRange = 45; // Stay this far from target
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
    // SIMPLE 3-STATE MACHINE
    switch(this.state) {
      case 'HUNT':
        this.huntTarget(deltaTime, game);
        break;
      case 'ATTACK':
        this.attackTarget(deltaTime, game);
        break;
      case 'FLEE':
        this.fleeFromDanger(deltaTime, game);
        break;
    }

    // SIMPLE MOVEMENT
    this.velocity.multiplyScalar(0.8); // Strong dampening
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
  }

  huntTarget(deltaTime, game) {
    // Find closest target
    this.target = this.findClosestTarget(game);
    
    if (!this.target) {
      // No target, patrol randomly
      this.patrol(deltaTime);
      return;
    }

    const distance = this.mesh.position.distanceTo(this.target.position);
    
    // Too far? Give up
    if (distance > this.detectionRange * 2) {
      this.target = null;
      return;
    }

    // Close enough to attack?
    if (distance < this.attackRange) {
      this.state = 'ATTACK';
      return;
    }

    // Chase target
    this.moveToward(this.target.position, deltaTime);
  }

  attackTarget(deltaTime, game) {
    if (!this.target) {
      this.state = 'HUNT';
      return;
    }

    const distance = this.mesh.position.distanceTo(this.target.position);
    
    // Target escaped?
    if (distance > this.attackRange * 1.5) {
      this.state = 'HUNT';
      return;
    }

    // Health low? Flee!
    if (this.health < this.maxHealth * 0.4) {
      this.state = 'FLEE';
      return;
    }

    // Police nearby? Flee!
    if (this.policeNearby(game)) {
      this.state = 'FLEE';
      return;
    }

    // MAINTAIN OPTIMAL RANGE
    if (distance < this.optimalRange) {
      // Too close, back away
      this.moveAwayFrom(this.target.position, deltaTime);
    } else if (distance > this.optimalRange * 1.3) {
      // Too far, move closer
      this.moveToward(this.target.position, deltaTime);
    } else {
      // Good range, circle strafe
      this.circleTarget(this.target.position, deltaTime);
    }

    // Shoot
    this.fireAtTarget(game);
  }

  fleeFromDanger(deltaTime, game) {
    // Find nearest threat
    const threats = this.findThreats(game);
    
    if (threats.length === 0) {
      // No more threats, go back to hunting
      this.state = 'HUNT';
      return;
    }

    // Flee from closest threat
    this.moveAwayFrom(threats[0].position, deltaTime, 1.5);
    
    // Recovered enough to fight?
    if (this.health > this.maxHealth * 0.7 && !this.policeNearby(game)) {
      this.state = 'HUNT';
    }
  }

  findClosestTarget(game) {
    let closest = null;
    let closestDist = this.detectionRange;

    // Check player
    const playerDist = this.mesh.position.distanceTo(game.playerShip.mesh.position);
    if (playerDist < closestDist) {
      closest = { position: game.playerShip.mesh.position, type: 'player', entity: game.playerShip };
      closestDist = playerDist;
    }

    // Check friendly ships (but ignore docked ones)
    game.entities.friendlyShips.forEach(ship => {
      if (ship.docked) return; // Skip docked ships - they're safe!
      
      const dist = this.mesh.position.distanceTo(ship.mesh.position);
      if (dist < closestDist) {
        closest = { position: ship.mesh.position, type: 'friendly', entity: ship };
        closestDist = dist;
      }
    });

    // Check traders (but ignore docked ones)
    if (game.entities.traders) {
      game.entities.traders.forEach(trader => {
        if (trader.docked) return; // Skip docked traders - they're safe!
        
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
    
    // Police are threats
    game.entities.police.forEach(police => {
      const dist = this.mesh.position.distanceTo(police.mesh.position);
      if (dist < 120) {
        threats.push({ position: police.mesh.position, distance: dist });
      }
    });

    return threats.sort((a, b) => a.distance - b.distance);
  }

  policeNearby(game) {
    return game.entities.police.some(police => 
      police.mesh.position.distanceTo(this.mesh.position) < 80
    );
  }

  patrol(deltaTime) {
    // Simple random movement
    if (!this.patrolTarget || this.reachedTarget(this.patrolTarget, 20)) {
      this.patrolTarget = {
        x: this.mesh.position.x + (Math.random() - 0.5) * 100,
        y: this.mesh.position.y + (Math.random() - 0.5) * 100
      };
    }
    this.moveToward(this.patrolTarget, deltaTime, 0.5);
  }

  moveToward(targetPos, deltaTime, speedMod = 1.0) {
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y - this.mesh.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      this.velocity.x += (dx / dist) * this.maxSpeed * speedMod * deltaTime * 3;
      this.velocity.y += (dy / dist) * this.maxSpeed * speedMod * deltaTime * 3;
    }
    
    // Face movement direction
    this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
  }

  moveAwayFrom(targetPos, deltaTime, speedMod = 1.0) {
    const dx = this.mesh.position.x - targetPos.x;
    const dy = this.mesh.position.y - targetPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      this.velocity.x += (dx / dist) * this.maxSpeed * speedMod * deltaTime * 3;
      this.velocity.y += (dy / dist) * this.maxSpeed * speedMod * deltaTime * 3;
      
      // Face movement direction
      this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  circleTarget(targetPos, deltaTime) {
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y - this.mesh.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      // Perpendicular direction for circling
      const perpX = -dy / dist;
      const perpY = dx / dist;
      
      this.velocity.x += perpX * this.maxSpeed * deltaTime * 2;
      this.velocity.y += perpY * this.maxSpeed * deltaTime * 2;
      
      // Face target
      this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  fireAtTarget(game) {
    const currentTime = Date.now();
    if (currentTime - this.lastShotTime < this.fireRate) return;

    const dx = this.target.position.x - this.mesh.position.x;
    const dy = this.target.position.y - this.mesh.position.y;
    const angle = Math.atan2(dy, dx);

    const projectile = new Projectile(
      this.mesh.position.x,
      this.mesh.position.y,
      angle,
      false // Enemy projectile
    );
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

// 3. SIMPLE POLICE - ONLY 3 STATES
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
    
    // SIMPLE STATE MACHINE
    this.state = 'PATROL'; // PATROL, RESPOND, FIGHT
    this.target = null;
    this.patrolTarget = null;
    this.lastShotTime = 0;
    this.fireRate = 400;
    this.attackRange = 70;
    this.detectionRange = 120;
    this.optimalRange = 55;
  }

  createMesh(faction) {
    const group = new THREE.Group();
    const hullGeometry = new THREE.ConeGeometry(0.6, 3, 4);
    const factionColors = {
      'Federated Commerce Guild': 0x0088ff,
      'Outer Rim Prospectors': 0xffaa00,
    };
    const hullColor = factionColors[faction] || 0x00aaff;
    const hullMaterial = new THREE.MeshBasicMaterial({ color: hullColor });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI / 2;
    group.add(hull);
    return group;
  }

  update(deltaTime, game) {
    // SIMPLE 3-STATE MACHINE
    switch(this.state) {
      case 'PATROL':
        this.patrolArea(deltaTime, game);
        break;
      case 'RESPOND':
        this.respondToBeacon(deltaTime, game);
        break;
      case 'FIGHT':
        this.fightPirates(deltaTime, game);
        break;
    }

    // SIMPLE MOVEMENT
    this.velocity.multiplyScalar(0.8); // Strong dampening
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
  }

  patrolArea(deltaTime, game) {
    // Check for pirates
    const pirate = this.findClosestPirate(game);
    if (pirate) {
      this.target = pirate;
      this.state = 'FIGHT';
      return;
    }

    // Check for distress beacons
    const beacon = this.findClosestBeacon(game);
    if (beacon) {
      this.target = beacon;
      this.state = 'RESPOND';
      return;
    }

    // Normal patrol
    if (!this.patrolTarget || this.reachedTarget(this.patrolTarget, 25)) {
      this.selectPatrolTarget();
    }
    this.moveToward(this.patrolTarget, deltaTime, 0.7);
  }

  respondToBeacon(deltaTime, game) {
    // Is beacon still there?
    if (!game.entities.distressBeacons.includes(this.target)) {
      this.state = 'PATROL';
      this.target = null;
      return;
    }

    // Move to beacon
    this.moveToward(this.target.mesh.position, deltaTime, 1.5);

    // Reached beacon area? Look for pirates
    if (this.reachedTarget(this.target.mesh.position, 30)) {
      const pirate = this.findClosestPirate(game);
      if (pirate) {
        this.target = pirate;
        this.state = 'FIGHT';
      } else {
        // No pirates found, back to patrol
        this.state = 'PATROL';
        this.target = null;
      }
    }
  }

  fightPirates(deltaTime, game) {
    // Is target still a valid pirate?
    if (!this.target || !game.entities.pirates.includes(this.target)) {
      // Look for another pirate nearby
      const pirate = this.findClosestPirate(game);
      if (pirate) {
        this.target = pirate;
      } else {
        this.state = 'PATROL';
        this.target = null;
        return;
      }
    }

    const distance = this.mesh.position.distanceTo(this.target.mesh.position);
    
    // Pirate escaped?
    if (distance > this.detectionRange * 2) {
      this.state = 'PATROL';
      this.target = null;
      return;
    }

    // Health low? Retreat but keep target
    if (this.health < this.maxHealth * 0.3) {
      this.moveTowardNearestStation(deltaTime);
      // Still keep target and try to shoot
      if (distance < this.attackRange) {
        this.fireAtTarget(game);
      }
      return;
    }

    // MAINTAIN OPTIMAL RANGE
    if (distance < this.optimalRange) {
      // Too close, back away
      this.moveAwayFrom(this.target.mesh.position, deltaTime);
    } else if (distance > this.optimalRange * 1.3) {
      // Too far, move closer
      this.moveToward(this.target.mesh.position, deltaTime);
    } else {
      // Good range, circle strafe
      this.circleTarget(this.target.mesh.position, deltaTime);
    }

    // Shoot
    if (distance < this.attackRange) {
      this.fireAtTarget(game);
    }
  }

  findClosestPirate(game) {
    let closest = null;
    let closestDist = this.detectionRange;

    game.entities.pirates.forEach(pirate => {
      const dist = this.mesh.position.distanceTo(pirate.mesh.position);
      if (dist < closestDist) {
        closest = pirate;
        closestDist = dist;
      }
    });

    return closest;
  }

  findClosestBeacon(game) {
    if (!game.entities.distressBeacons) return null;
    
    let closest = null;
    let closestDist = 200; // Max response range

    game.entities.distressBeacons.forEach(beacon => {
      const dist = this.mesh.position.distanceTo(beacon.mesh.position);
      if (dist < closestDist) {
        closest = beacon;
        closestDist = dist;
      }
    });

    return closest;
  }

  selectPatrolTarget() {
    if (this.stations.length === 0) return;
    
    // Patrol around a random friendly station
    const station = this.stations[Math.floor(Math.random() * this.stations.length)];
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 30; // 40-70 units from station
    
    this.patrolTarget = {
      x: station.mesh.position.x + Math.cos(angle) * distance,
      y: station.mesh.position.y + Math.sin(angle) * distance
    };
  }

  moveTowardNearestStation(deltaTime) {
    if (this.stations.length === 0) return;
    
    let nearest = this.stations[0];
    let nearestDist = this.mesh.position.distanceTo(nearest.mesh.position);
    
    this.stations.forEach(station => {
      const dist = this.mesh.position.distanceTo(station.mesh.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = station;
      }
    });
    
    this.moveToward(nearest.mesh.position, deltaTime, 1.2);
  }

  fireAtTarget(game) {
    const currentTime = Date.now();
    if (currentTime - this.lastShotTime < this.fireRate) return;

    const dx = this.target.mesh.position.x - this.mesh.position.x;
    const dy = this.target.mesh.position.y - this.mesh.position.y;
    const angle = Math.atan2(dy, dx);

    const projectile = new Projectile(
      this.mesh.position.x,
      this.mesh.position.y,
      angle,
      true // Friendly projectile
    );
    projectile.damage = 25;

    game.entities.projectiles.push(projectile);
    game.scene.add(projectile.mesh);
    this.lastShotTime = currentTime;
  }

  // Reuse movement methods from pirate (same logic)
  moveToward(targetPos, deltaTime, speedMod = 1.0) {
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y - this.mesh.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      this.velocity.x += (dx / dist) * this.maxSpeed * speedMod * deltaTime * 3;
      this.velocity.y += (dy / dist) * this.maxSpeed * speedMod * deltaTime * 3;
    }
    
    this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
  }

  moveAwayFrom(targetPos, deltaTime, speedMod = 1.0) {
    const dx = this.mesh.position.x - targetPos.x;
    const dy = this.mesh.position.y - targetPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      this.velocity.x += (dx / dist) * this.maxSpeed * speedMod * deltaTime * 3;
      this.velocity.y += (dy / dist) * this.maxSpeed * speedMod * deltaTime * 3;
      
      this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  circleTarget(targetPos, deltaTime) {
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y - this.mesh.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      const perpX = -dy / dist;
      const perpY = dx / dist;
      
      this.velocity.x += perpX * this.maxSpeed * deltaTime * 2;
      this.velocity.y += perpY * this.maxSpeed * deltaTime * 2;
      
      this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
    }
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

// 4. SIMPLE FRIENDLY SHIP - JUST TRADE AND FLEE
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
    
    // SIMPLE STATE MACHINE  
    this.state = 'TRADE'; // TRADE, FLEE
    this.target = null;
    this.fleeTimer = 0;
    this.attackedRecently = false;
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
    this.fleeTimer -= deltaTime;
    
    // SIMPLE 2-STATE MACHINE
    switch(this.state) {
      case 'TRADE':
        this.doTrading(deltaTime);
        break;
      case 'FLEE':
        this.fleeToSafety(deltaTime);
        break;
    }

    // SIMPLE MOVEMENT
    this.velocity.multiplyScalar(0.8);
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
  }

  doTrading(deltaTime) {
    // Check for nearby pirates
    if (this.pirateNearby()) {
      this.state = 'FLEE';
      this.fleeTimer = 15; // Flee for 15 seconds
      this.dropDistressBeacon();
      return;
    }

    // Simple trading: just move between random stations
    if (!this.target || this.reachedTarget(this.target, 20)) {
      this.target = this.selectRandomStation();
    }
    
    if (this.target) {
      this.moveToward(this.target, deltaTime, 0.8);
    }
  }

  fleeToSafety(deltaTime) {
    if (this.fleeTimer <= 0) {
      this.state = 'TRADE';
      this.attackedRecently = false;
      return;
    }

    // Find safest station (furthest from pirates)
    const safeStation = this.findSafestStation();
    if (safeStation) {
      this.moveToward(safeStation.mesh.position, deltaTime, 2.0); // Flee fast!
    }
  }

  pirateNearby() {
    return this.game.entities.pirates.some(pirate => 
      pirate.mesh.position.distanceTo(this.mesh.position) < 60
    );
  }

  dropDistressBeacon() {
    // Only drop one beacon per attack
    if (this.attackedRecently) return;
    this.attackedRecently = true;

    const beacon = new DistressBeacon(this.mesh.position.x, this.mesh.position.y);
    
    // Add to game entities
    if (!this.game.entities.distressBeacons) {
      this.game.entities.distressBeacons = [];
    }
    this.game.entities.distressBeacons.push(beacon);
    this.game.scene.add(beacon.mesh);
    
    if (this.game.ui) {
      this.game.ui.showMessage('Friendly ship under attack! Distress beacon deployed.', 'warning');
    }
  }

  selectRandomStation() {
    if (this.allStations.length === 0) return null;
    const station = this.allStations[Math.floor(Math.random() * this.allStations.length)];
    return station.mesh.position;
  }

  findSafestStation() {
    if (this.allStations.length === 0) return null;
    
    let safest = this.allStations[0];
    let safestScore = this.calculateSafety(safest);
    
    this.allStations.forEach(station => {
      const safety = this.calculateSafety(station);
      if (safety > safestScore) {
        safestScore = safety;
        safest = station;
      }
    });
    
    return safest;
  }

  calculateSafety(station) {
    let safety = 100;
    
    // Penalty for each nearby pirate
    this.game.entities.pirates.forEach(pirate => {
      const dist = pirate.mesh.position.distanceTo(station.mesh.position);
      if (dist < 100) {
        safety -= (100 - dist); // Closer pirates = less safe
      }
    });
    
    return safety;
  }

  moveToward(targetPos, deltaTime, speedMod = 1.0) {
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y - this.mesh.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      this.velocity.x += (dx / dist) * this.maxSpeed * speedMod * deltaTime * 3;
      this.velocity.y += (dy / dist) * this.maxSpeed * speedMod * deltaTime * 3;
    }
    
    this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
  }

  reachedTarget(target, threshold) {
    const dx = target.x - this.mesh.position.x;
    const dy = target.y - this.mesh.position.y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  }

  takeDamage(amount) {
    this.health -= amount;
    
    // If not already fleeing, start fleeing
    if (this.state !== 'FLEE') {
      this.state = 'FLEE';
      this.fleeTimer = 20;
      this.dropDistressBeacon();
    }
    
    return this.health <= 0;
  }
}

export class Projectile {
  constructor(x, y, angle, isPlayerProjectile, weaponLevel = 1, isMainShot = true) {
    this.mesh = this.createMesh(isPlayerProjectile, weaponLevel, isMainShot);
    this.mesh.position.set(x, y, 0);
    const baseSpeed = 60;
    const speed = baseSpeed + (weaponLevel - 1) * 5; 
    this.velocity = new THREE.Vector2(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    this.life = 2.0 + (weaponLevel - 1) * 0.2;
    this.isPlayerProjectile = isPlayerProjectile;
    this.weaponLevel = weaponLevel;
  }

  createMesh(isPlayerProjectile, weaponLevel, isMainShot) {
    let size = 0.2;
    let color = 0x00ff44;
    if (isPlayerProjectile) {
      size = 0.2 + (weaponLevel -1) * 0.05;
      if (!isMainShot) size *= 0.7;
      if (weaponLevel === 1) color = 0x00dd88;
      else if (weaponLevel === 2) color = 0x00ffff;
      else if (weaponLevel === 3) color = 0xffee00;
      else color = 0xff8800;
    } else {
      color = 0xff4400;
      size = 0.25;
    }
    const geometry = new THREE.SphereGeometry(size, 6, 6);
    const material = new THREE.MeshBasicMaterial({ color: color });
    return new THREE.Mesh(geometry, material);
  }

  update(deltaTime) {
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
    this.life -= deltaTime;
  }
}

export class Asteroid {
  constructor(x, y, size) {
    this.size = size;
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.health = size * 20;
    
    // FOR AI MINER MINING SYSTEM
    this.maxOre = 30;        // AI miners look for currentOre > 0
    this.currentOre = 30;    // Start full of ore for AI miners
    
    // FOR PLAYER MINING SYSTEM (existing)
    this.resourceType = this.getRandomResourceType();
    this.resourceValue = this.getResourceValue(this.resourceType);
    
    this.rotationSpeed = (Math.random() - 0.5) * 0.01;
    this.mesh.rotation.x = Math.random() * Math.PI * 2;
    this.mesh.rotation.y = Math.random() * Math.PI * 2;
  }

  createMesh() {
    const geometry = new THREE.IcosahedronGeometry(this.size, 0);
    const positionAttribute = geometry.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
      const displacement = Math.random() * this.size * 0.3;
      vertex.normalize().multiplyScalar(this.size + displacement);
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();
    
    const color = new THREE.Color(0x888888).lerp(new THREE.Color(0x444444), Math.random());
    const material = new THREE.MeshBasicMaterial({ color: color });
    return new THREE.Mesh(geometry, material);
  }

  getRandomResourceType() {
    const types = ['Iron Ore', 'Copper Ore', 'Titanium Ore', 'Rare Crystals'];
    return types[Math.floor(Math.random() * types.length)];
  }

  getResourceValue(type) {
    switch(type) {
      case 'Iron Ore': return 20;
      case 'Copper Ore': return 35;
      case 'Titanium Ore': return 70;
      case 'Rare Crystals': return 150;
      default: return 10;
    }
  }

  update(deltaTime) {
    this.mesh.rotation.z += this.rotationSpeed;
  }
}

export class JumpGate {
  constructor(x, y, targetZoneId, destinationName, CSS2DObjectConstructor) {
    this.targetZoneId = targetZoneId;
    this.destinationName = destinationName;
    this.interactionRadius = 20;
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.label = this.createLabel(CSS2DObjectConstructor);
    this.mesh.add(this.label);
    this.animationTime = 0;
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Main ring
    const ringGeometry = new THREE.TorusGeometry(8, 1, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    
    // Inner energy field
    const fieldGeometry = new THREE.CircleGeometry(7, 16);
    const fieldMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0088ff, 
      transparent: true, 
      opacity: 0.3 
    });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    group.add(field);
    
    return group;
  }

  createLabel(CSS2DObjectConstructor) {
    const div = document.createElement('div');
    div.className = 'jumpgate-label';
    div.innerHTML = `JUMP GATE<br><span style="font-size: 0.8em; color: #00ffff;">TO ${this.destinationName.toUpperCase()}</span>`;
    div.style.fontFamily = "'Lucida Console', 'Courier New', monospace";
    div.style.color = '#00ffff';
    div.style.fontSize = '12px';
    div.style.textAlign = 'center';
    div.style.textShadow = '1px 1px 1px rgba(0,0,0,0.7)';
    div.style.backgroundColor = 'rgba(0, 40, 40, 0.5)';
    div.style.padding = '2px 4px';
    div.style.border = '1px solid rgba(0,255,255,0.3)';
    div.style.borderRadius = '2px';
    
    const label = new CSS2DObjectConstructor(div);
    label.position.set(0, 10, 0);
    return label;
  }

  update(deltaTime) {
    this.animationTime += deltaTime;
    this.mesh.rotation.z += deltaTime * 0.5;
    
    // Pulse the inner field
    const field = this.mesh.children[1];
    if (field) {
      field.material.opacity = 0.2 + Math.sin(this.animationTime * 2) * 0.1;
    }
  }
}

export class MiningShip {
  constructor(x, y, asteroids, homeStation) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 12;
    this.health = 40;
    this.asteroids = asteroids;
    this.homeStation = homeStation;
    this.state = 'SEEKING'; // SEEKING, MINING, RETURNING
    this.target = null;
    this.cargo = 0;
    this.maxCargo = 5;
    this.miningTimer = 0;
  }

  createMesh() {
    const group = new THREE.Group();
    const hullGeometry = new THREE.BoxGeometry(2, 1.5, 0.8);
    const hullMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    group.add(hull);
    
    // Mining equipment
    const drillGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1, 6);
    const drillMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const drill = new THREE.Mesh(drillGeometry, drillMaterial);
    drill.position.set(1.2, 0, 0);
    drill.rotation.z = Math.PI / 2;
    group.add(drill);
    
    return group;
  }

  update(deltaTime) {
    // Simple mining ship AI - placeholder for now
    this.velocity.multiplyScalar(0.9);
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
  }
}

export class PirateStation {
  constructor(x, y, CSS2DObjectConstructor) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.health = 200;
    this.maxHealth = 200;
    this.lastSpawnTime = 0;
    this.spawnCooldown = 30000; // 30 seconds
    this.label = this.createLabel(CSS2DObjectConstructor);
    this.mesh.add(this.label);
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Main structure - more menacing than regular stations
    const coreGeometry = new THREE.BoxGeometry(4, 4, 2);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x440000 });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);
    
    // Weapon turrets
    for (let i = 0; i < 4; i++) {
      const turretGeometry = new THREE.CylinderGeometry(0.5, 0.8, 1, 6);
      const turretMaterial = new THREE.MeshBasicMaterial({ color: 0x660000 });
      const turret = new THREE.Mesh(turretGeometry, turretMaterial);
      const angle = (i / 4) * Math.PI * 2;
      turret.position.set(Math.cos(angle) * 3, Math.sin(angle) * 3, 1);
      group.add(turret);
    }
    
    // Red warning lights
    const lightGeometry = new THREE.SphereGeometry(0.3, 6, 6);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    for (let i = 0; i < 6; i++) {
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      const angle = (i / 6) * Math.PI * 2;
      light.position.set(Math.cos(angle) * 2.5, Math.sin(angle) * 2.5, 1.5);
      group.add(light);
    }
    
    return group;
  }

  createLabel(CSS2DObjectConstructor) {
    const div = document.createElement('div');
    div.className = 'pirate-station-label';
    div.innerHTML = `PIRATE OUTPOST<br><span style="font-size: 0.7em; color: #ff6666;">HOSTILE TERRITORY</span>`;
    div.style.fontFamily = "'Lucida Console', 'Courier New', monospace";
    div.style.color = '#ff4444';
    div.style.fontSize = '12px';
    div.style.textAlign = 'center';
    div.style.textShadow = '1px 1px 1px rgba(0,0,0,0.7)';
    div.style.backgroundColor = 'rgba(40, 0, 0, 0.5)';
    div.style.padding = '2px 4px';
    div.style.border = '1px solid rgba(255,0,0,0.3)';
    div.style.borderRadius = '2px';
    
    const label = new CSS2DObjectConstructor(div);
    label.position.set(0, 6, 0);
    return label;
  }

  update(deltaTime, game) {
    // Spawn pirates periodically
    const currentTime = Date.now();
    if (currentTime - this.lastSpawnTime > this.spawnCooldown) {
      this.spawnPirate(game);
      this.lastSpawnTime = currentTime;
    }
  }

  spawnPirate(game) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 10;
    const x = this.mesh.position.x + Math.cos(angle) * distance;
    const y = this.mesh.position.y + Math.sin(angle) * distance;
    
    // Spawn pirate with homeStation reference for enhanced AI
    const pirate = new SimplePirate(x, y);
    game.entities.pirates.push(pirate);
    game.scene.add(pirate.mesh);
    
    if (game.ui) {
      game.ui.showMessage('Pirate station launched raider!', 'warning');
    }
  }
}

// SIMPLE STATION ECONOMY - Just Materials & Production

export class SimpleStation {
  constructor(x, y, name, CSS2DObjectConstructor) {
    this.name = name;
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    
    // SIMPLE CARGO SYSTEM
    this.materials = 5 + Math.floor(Math.random() * 15); // 5-20 materials to start
    this.producedGoods = 2 + Math.floor(Math.random() * 8); // 2-10 produced goods to start
    this.maxCargo = 50; // Can hold up to 50 total items
    
    // POPULATION & CONSUMPTION
    this.population = 800 + Math.floor(Math.random() * 1200);
    this.consumptionRate = this.population / 1000; // 1 good per 1000 people per day
    
    // PRODUCTION SYSTEM
    this.productionRate = 1.0; // Can produce 1 good per 2 materials (when conditions are met)
    this.lastProductionTime = Date.now();
    this.productionInterval = 5000; // Try to produce every 5 seconds
    
    // PIRATE DETECTION
    this.pirateDetectionRange = 100; // Can see pirates within 100 units
    this.lastDistressCall = 0;
    this.distressCallCooldown = 30000; // Only call for help every 30 seconds
    
    // VISUAL
    this.label = this.createLabel(CSS2DObjectConstructor);
    this.mesh.add(this.label);
  }

  createMesh() {
    const group = new THREE.Group();
    const coreGeometry = new THREE.CylinderGeometry(3, 3, 1, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);
    
    const ringGeometry = new THREE.TorusGeometry(4, 0.5, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    
    return group;
  }

  createLabel(CSS2DObjectConstructor) {
    const div = document.createElement('div');
    div.className = 'station-label';
    this.updateLabelContent(div);
    
    div.style.fontFamily = "'Lucida Console', 'Courier New', monospace";
    div.style.color = '#00ff00';
    div.style.fontSize = '13px';
    div.style.textAlign = 'center';
    div.style.textShadow = '1px 1px 1px rgba(0,0,0,0.7)';
    div.style.backgroundColor = 'rgba(0, 20, 0, 0.5)';
    div.style.padding = '2px 4px';
    div.style.border = '1px solid rgba(0,255,0,0.3)';
    div.style.borderRadius = '2px';
    
    const label = new CSS2DObjectConstructor(div);
    label.position.set(0, 5.5, 0);
    return label;
  }

  updateLabelContent(div) {
    const totalCargo = this.materials + this.producedGoods;
    const cargoPercent = Math.floor((totalCargo / this.maxCargo) * 100);
    
    div.innerHTML = `${this.name}<br>
      <span style="font-size: 0.8em; color: #ffaa00;">Pop: ${Math.floor(this.population)}</span><br>
      <span style="font-size: 0.7em; color: #00ffff;">Materials: ${this.materials}</span><br>
      <span style="font-size: 0.7em; color: #ff88ff;">Goods: ${this.producedGoods}</span><br>
      <span style="font-size: 0.6em; color: #888888;">Cargo: ${cargoPercent}%</span>`;
  }

  update(deltaTime, game) {
    const currentTime = Date.now();
    
    // 1. CHECK FOR PIRATES AND CALL FOR HELP
    this.checkForPiratesAndCallHelp(game, currentTime);
    
    // 2. CONSUME GOODS (population needs)
    this.consumeGoods(deltaTime);
    
    // 3. PRODUCE GOODS (if we have materials)
    this.produceGoods(currentTime);
    
    // 4. UPDATE VISUAL LABEL
    this.updateLabelContent(this.label.element);
  }

  checkForPiratesAndCallHelp(game, currentTime) {
    // Only check if we haven't called for help recently
    if (currentTime - this.lastDistressCall < this.distressCallCooldown) return;
    
    // Look for pirates within detection range
    const nearbyPirates = game.entities.pirates.filter(pirate => {
      const distance = pirate.mesh.position.distanceTo(this.mesh.position);
      return distance < this.pirateDetectionRange;
    });
    
    if (nearbyPirates.length > 0) {
      this.callForPoliceHelp(game);
      this.lastDistressCall = currentTime;
    }
  }

  callForPoliceHelp(game) {
    // Create distress beacon at station location
    const beacon = new DistressBeacon(this.mesh.position.x, this.mesh.position.y);
    beacon.isStationDistress = true;
    
    if (!game.entities.distressBeacons) {
      game.entities.distressBeacons = [];
    }
    game.entities.distressBeacons.push(beacon);
    game.scene.add(beacon.mesh);
    
    if (game.ui) {
      game.ui.showMessage(`${this.name}: Pirates detected! Police assistance requested!`, 'warning');
    }
  }

  consumeGoods(deltaTime) {
    // Population consumes 1 produced good per 1000 people per day
    // Convert to per-second: 1 good per 1000 people per 180 seconds (3 minutes = 1 game day)
    const consumptionPerSecond = this.consumptionRate / 180; // Game time, not real time!
    const actualConsumption = consumptionPerSecond * deltaTime;
    
    // Accumulate fractional consumption
    if (!this.consumptionAccumulator) this.consumptionAccumulator = 0;
    this.consumptionAccumulator += actualConsumption;
    
    // When we've accumulated enough for a whole good, consume it
    if (this.consumptionAccumulator >= 1.0 && this.producedGoods > 0) {
      this.producedGoods--;
      this.consumptionAccumulator -= 1.0;
    }
    
    // POPULATION DECLINE when no goods available - MUCH FASTER!
    if (this.producedGoods === 0 && this.consumptionAccumulator >= 1.0) {
      // Lose multiple people when starving - dramatic population collapse!
      const populationLoss = Math.min(10, Math.floor(this.population * 0.01)); // Lose 1% of population or 10 people, whichever is smaller
      this.population -= populationLoss;
      this.consumptionAccumulator -= 1.0; // Still consume the "demand"
      console.log(`${this.name} population declining: ${this.population} (-${populationLoss} people - STARVATION!)`);
      
      // Also reduce consumption rate since we have fewer people
      this.consumptionRate = Math.max(0.1, this.population / 1000); // Don't let it go below 0.1
      
      // Station in crisis - lose credits too from economic collapse
      this.credits = Math.max(0, this.credits - 50);
    }
  }

  produceGoods(currentTime) {
    // Only try to produce every few seconds
    if (currentTime - this.lastProductionTime < this.productionInterval) return;
    
    // Need 2 materials to produce 1 good
    if (this.materials >= 2) {
      // Check if we have cargo space
      const totalCargo = this.materials + this.producedGoods;
      if (totalCargo < this.maxCargo) {
        // Produce!
        this.materials -= 2;
        this.producedGoods += 1;
        this.lastProductionTime = currentTime;
        
        // Visual feedback for production
        this.showProductionEffect();
      }
    }
  }

  showProductionEffect() {
    // Simple visual effect - change station color briefly
    const core = this.mesh.children[0]; // First child is the core
    const originalColor = core.material.color.clone();
    
    // Flash green for production
    core.material.color.setHex(0x00ff00);
    
    setTimeout(() => {
      core.material.color.copy(originalColor);
    }, 500);
  }

  // TRADE METHODS - For player interaction
  canSellMaterials(quantity) {
    return this.materials >= quantity;
  }

  canBuyMaterials(quantity) {
    const totalCargo = this.materials + this.producedGoods;
    return (totalCargo + quantity) <= this.maxCargo;
  }

  canSellGoods(quantity) {
    return this.producedGoods >= quantity;
  }

  canBuyGoods(quantity) {
    const totalCargo = this.materials + this.producedGoods;
    return (totalCargo + quantity) <= this.maxCargo;
  }

  sellMaterials(quantity) {
    if (this.canSellMaterials(quantity)) {
      this.materials -= quantity;
      return true;
    }
    return false;
  }

  buyMaterials(quantity) {
    if (this.canBuyMaterials(quantity)) {
      this.materials += quantity;
      return true;
    }
    return false;
  }

  sellGoods(quantity) {
    if (this.canSellGoods(quantity)) {
      this.producedGoods -= quantity;
      return true;
    }
    return false;
  }

  buyGoods(quantity) {
    if (this.canBuyGoods(quantity)) {
      this.producedGoods += quantity;
      return true;
    }
    return false;
  }

  // SIMPLE PRICING - Materials cheaper, goods more expensive
  getMaterialPrice() {
    // Base price affected by scarcity
    const scarcityMultiplier = this.materials < 5 ? 1.5 : (this.materials > 20 ? 0.8 : 1.0);
    return Math.floor(50 * scarcityMultiplier);
  }

  getGoodsPrice() {
    // Base price affected by scarcity  
    const scarcityMultiplier = this.producedGoods < 3 ? 1.8 : (this.producedGoods > 15 ? 0.7 : 1.0);
    return Math.floor(120 * scarcityMultiplier);
  }

  // GET STATUS FOR UI/DEBUG
  getEconomicStatus() {
    const totalCargo = this.materials + this.producedGoods;
    const cargoFull = totalCargo >= this.maxCargo;
    const canProduce = this.materials >= 2 && !cargoFull;
    const needsGoods = this.producedGoods < 5;
    const needsMaterials = this.materials < 10;
    
    return {
      materials: this.materials,
      goods: this.producedGoods,
      totalCargo: totalCargo,
      cargoFull: cargoFull,
      canProduce: canProduce,
      needsGoods: needsGoods,
      needsMaterials: needsMaterials,
      population: Math.floor(this.population),
      consumptionRate: this.consumptionRate
    };
  }
}

// SIMPLE ZONE ECONOMY BALANCER
export class SimpleZoneEconomy {
  static balanceZoneEconomy(stations, deltaTime) {
    // Simple zone-wide economic pressure
    const totalMaterials = stations.reduce((sum, station) => sum + station.materials, 0);
    const totalGoods = stations.reduce((sum, station) => sum + station.producedGoods, 0);
    const avgMaterials = totalMaterials / stations.length;
    const avgGoods = totalGoods / stations.length;
    
    // If zone is running low on materials, encourage material gathering
    // If zone has excess goods, encourage goods trading
    // This could affect prices or spawn trader ships
    
    return {
      materialScarcity: avgMaterials < 8, // Zone needs more materials
      goodsScarcity: avgGoods < 5,        // Zone needs more goods  
      avgMaterials: avgMaterials,
      avgGoods: avgGoods
    };
  }
}

// SIMPLE TRADER AI - Moves materials/goods between stations
export class SimpleTrader {
  constructor(x, y, stations, game) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 18;
    this.stations = stations;
    this.game = game;
    
    // SIMPLE CARGO
    this.materials = 0;
    this.goods = 0;
    this.maxCargo = 8;
    
    // CREDITS FOR TRADING - CRITICAL FIX!
    this.credits = 1000 + Math.floor(Math.random() * 500); // Start with 1000-1500 credits
    
    // AI STATE
    this.state = 'SEEKING'; // SEEKING, TRAVELING, TRADING
    this.target = null;
    this.tradeType = null; // 'materials' or 'goods'
    this.actionCooldown = 0; // Prevent rapid trading loops
    
    // DOCKING SYSTEM
    this.docked = false;
    this.dockedStation = null;
    this.dockTime = 0;
    this.minDockTime = 5.0; // Minimum 5 seconds docked
    this.maxDockTime = 10.0; // Maximum 10 seconds docked
  }

  createMesh() {
    const group = new THREE.Group();
    const hullGeometry = new THREE.BoxGeometry(2, 1.5, 0.8);
    const hullMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaaa });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    group.add(hull);
    return group;
  }

  update(deltaTime) {
    // Handle docking time
    if (this.docked) {
      this.dockTime -= deltaTime;
      
      if (this.dockTime <= 0) {
        this.undockFromStation();
      } else {
        // While docked, try to trade
        this.handleDockedTrading();
        return; // Don't move while docked
      }
    }

    // Update cooldown timer
    if (this.actionCooldown > 0) {
      this.actionCooldown -= deltaTime;
    }

    // Rest of existing update logic for non-docked ships
    switch(this.state) {
      case 'SEEKING':
        this.seekTradingOpportunity();
        break;
      case 'TRAVELING':
        this.travelToTarget(deltaTime);
        break;
      case 'TRADING':
        this.arriveAtStation(); // Modified to handle docking
        break;
    }

    // Apply movement (only if not docked)
    if (!this.docked) {
      this.velocity.multiplyScalar(0.85);
      if (this.velocity.length() > this.maxSpeed) {
        this.velocity.normalize().multiplyScalar(this.maxSpeed);
      }
      this.mesh.position.x += this.velocity.x * deltaTime;
      this.mesh.position.y += this.velocity.y * deltaTime;
    }
  }

  seekTradingOpportunity() {
    // Skip seeking while on cooldown
    if (this.actionCooldown > 0) return;
    
    // Find best trade opportunity
    const opportunities = [];
    
    this.stations.forEach(station => {
      const status = station.getEconomicStatus();
      
      // If we have materials, find stations that need them
      if (this.materials > 0 && status.needsMaterials) {
        opportunities.push({
          station: station,
          type: 'sell_materials',
          priority: (10 - status.materials) * 2 // Higher priority for stations with fewer materials
        });
      }
      
      // If we have goods, find stations that need them  
      if (this.goods > 0 && status.needsGoods) {
        opportunities.push({
          station: station,
          type: 'sell_goods',
          priority: (8 - status.goods) * 3 // Higher priority for stations with fewer goods
        });
      }
      
      // If we have cargo space, find stations with excess
      if (this.materials + this.goods < this.maxCargo) {
        if (status.materials > 15) {
          opportunities.push({
            station: station,
            type: 'buy_materials',
            priority: status.materials
          });
        }
        if (status.goods > 10) {
          opportunities.push({
            station: station,
            type: 'buy_goods', 
            priority: status.goods
          });
        }
      }
    });

    if (opportunities.length > 0) {
      // Pick best opportunity
      opportunities.sort((a, b) => b.priority - a.priority);
      const best = opportunities[0];
      
      this.target = best.station;
      this.tradeType = best.type;
      this.state = 'TRAVELING';
    }
  }

  travelToTarget(deltaTime) {
    if (!this.target) {
      this.state = 'SEEKING';
      return;
    }

    const dx = this.target.mesh.position.x - this.mesh.position.x;
    const dy = this.target.mesh.position.y - this.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 15) {
      this.state = 'TRADING';
      this.velocity.set(0, 0);
    } else {
      this.velocity.x += (dx / distance) * this.maxSpeed * deltaTime * 2;
      this.velocity.y += (dy / distance) * this.maxSpeed * deltaTime * 2;
      
      this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  // NEW: Handle arrival at station (replaces old performTrade)
  arriveAtStation() {
    if (!this.target || !this.tradeType) {
      this.state = 'SEEKING';
      return;
    }

    // Dock at the station
    this.dockAtStation(this.target);
  }

  // NEW: Dock at station
  dockAtStation(station) {
    // DEBUG: Check if docking is happening
    console.log(`TRADER DOCKED: ${this.mesh.uuid.slice(0,4)} at ${station.name} with ${this.credits || 'undefined'} credits`);
    console.log(`Planned trade: ${this.tradeType}, Cargo: materials=${this.materials}, goods=${this.goods}`);
    
    this.docked = true;
    this.dockedStation = station;
    this.dockTime = this.minDockTime + Math.random() * (this.maxDockTime - this.minDockTime);
    
    // Move ship to station position (visual docking)
    this.mesh.position.copy(station.mesh.position);
    this.velocity.set(0, 0);
    
    // Log docking
    if (this.game.eventLogger) {
      this.game.eventLogger.logEconomic(
        `Trader ${this.mesh.uuid.slice(0, 8)} docked at ${station.name} (${this.dockTime.toFixed(1)}s)`,
        { 
          trader: this.mesh.uuid.slice(0, 8),
          station: station.name,
          action: 'dock',
          cargo: { materials: this.materials, goods: this.goods },
          plannedTrade: this.tradeType
        }
      );
    }
  }

  // NEW: Handle trading while docked - WITH ACTUAL CREDIT EXCHANGE!
  handleDockedTrading() {
    if (!this.dockedStation || !this.tradeType) return;

    // DEBUG: Check if trading even happens
    console.log(`TRADING ATTEMPT: ${this.tradeType} - Trader has ${this.credits || 'undefined'} credits, Station has ${this.dockedStation.credits}`);

    // DEBUG LOGGING
    console.log(`BEFORE TRADE: Trader credits=${this.credits}, Station credits=${this.dockedStation.credits}`);

    // Perform the planned trade
    let tradeSuccess = false;
    const tradeQuantity = Math.min(3, this.maxCargo);

    switch(this.tradeType) {
      case 'sell_materials':
        if (this.materials > 0 && this.dockedStation.canBuyMaterials(tradeQuantity)) {
          const actualQuantity = Math.min(this.materials, tradeQuantity);
          const pricePerUnit = Math.floor(this.dockedStation.getMaterialPrice() * 0.8); // Trader gets 80% of station price
          const totalPayment = pricePerUnit * actualQuantity;
          
          // ACTUAL CREDIT EXCHANGE
          if (this.dockedStation.credits >= totalPayment) {
            this.materials -= actualQuantity;
            this.dockedStation.buyMaterials(actualQuantity);
            this.dockedStation.credits -= totalPayment;  // Station pays
            this.credits += totalPayment;                // Trader receives
            tradeSuccess = true;
            
            if (this.game.eventLogger) {
              this.game.eventLogger.logEconomic(
                `Trader ${this.mesh.uuid.slice(0, 8)} sold ${actualQuantity} materials to ${this.dockedStation.name} for $${totalPayment}`,
                { trader: this.mesh.uuid.slice(0, 8), action: 'sell', item: 'materials', quantity: actualQuantity, payment: totalPayment }
              );
            }
          }
        }
        break;
        
      case 'sell_goods':
        if (this.goods > 0 && this.dockedStation.canBuyGoods(tradeQuantity)) {
          const actualQuantity = Math.min(this.goods, tradeQuantity);
          const pricePerUnit = Math.floor(this.dockedStation.getGoodsPrice() * 0.9); // Trader gets 90% of station price
          const totalPayment = pricePerUnit * actualQuantity;
          
          // ACTUAL CREDIT EXCHANGE
          if (this.dockedStation.credits >= totalPayment) {
            this.goods -= actualQuantity;
            this.dockedStation.buyGoods(actualQuantity);
            this.dockedStation.credits -= totalPayment;  // Station pays
            this.credits += totalPayment;                // Trader receives
            tradeSuccess = true;
            
            if (this.game.eventLogger) {
              this.game.eventLogger.logEconomic(
                `Trader ${this.mesh.uuid.slice(0, 8)} sold ${actualQuantity} goods to ${this.dockedStation.name} for $${totalPayment}`,
                { trader: this.mesh.uuid.slice(0, 8), action: 'sell', item: 'goods', quantity: actualQuantity, payment: totalPayment }
              );
            }
          }
        }
        break;
        
      case 'buy_materials':
        if (this.materials + this.goods < this.maxCargo && this.dockedStation.canSellMaterials(tradeQuantity)) {
          const actualQuantity = Math.min(tradeQuantity, this.maxCargo - (this.materials + this.goods));
          const pricePerUnit = this.dockedStation.getMaterialPrice();
          const totalCost = pricePerUnit * actualQuantity;
          
          // ACTUAL CREDIT EXCHANGE  
          if (this.credits >= totalCost) {
            this.materials += actualQuantity;
            this.dockedStation.sellMaterials(actualQuantity);
            this.credits -= totalCost;                   // Trader pays
            this.dockedStation.credits += totalCost;     // Station receives
            tradeSuccess = true;
            
            if (this.game.eventLogger) {
              this.game.eventLogger.logEconomic(
                `Trader ${this.mesh.uuid.slice(0, 8)} bought ${actualQuantity} materials from ${this.dockedStation.name} for $${totalCost}`,
                { trader: this.mesh.uuid.slice(0, 8), action: 'buy', item: 'materials', quantity: actualQuantity, cost: totalCost }
              );
            }
          }
        }
        break;
        
      case 'buy_goods':
        if (this.materials + this.goods < this.maxCargo && this.dockedStation.canSellGoods(tradeQuantity)) {
          const actualQuantity = Math.min(tradeQuantity, this.maxCargo - (this.materials + this.goods));
          const pricePerUnit = this.dockedStation.getGoodsPrice();
          const totalCost = pricePerUnit * actualQuantity;
          
          // ACTUAL CREDIT EXCHANGE
          if (this.credits >= totalCost) {
            this.goods += actualQuantity;
            this.dockedStation.sellGoods(actualQuantity);
            this.credits -= totalCost;                   // Trader pays
            this.dockedStation.credits += totalCost;     // Station receives
            tradeSuccess = true;
            
            if (this.game.eventLogger) {
              this.game.eventLogger.logEconomic(
                `Trader ${this.mesh.uuid.slice(0, 8)} bought ${actualQuantity} goods from ${this.dockedStation.name} for $${totalCost}`,
                { trader: this.mesh.uuid.slice(0, 8), action: 'buy', item: 'goods', quantity: actualQuantity, cost: totalCost }
              );
            }
          }
        }
        break;
    }

    // DEBUG LOGGING
    console.log(`AFTER TRADE: Trader credits=${this.credits}, Station credits=${this.dockedStation.credits}`);

    // Clear trade plan after attempting (successful or not)
    this.tradeType = null;
  }

  // NEW: Undock from station
  undockFromStation() {
    if (this.game.eventLogger) {
      this.game.eventLogger.logEconomic(
        `Trader ${this.mesh.uuid.slice(0, 8)} undocked from ${this.dockedStation.name}`,
        { 
          trader: this.mesh.uuid.slice(0, 8),
          station: this.dockedStation.name,
          action: 'undock',
          cargo: { materials: this.materials, goods: this.goods }
        }
      );
    }

    this.docked = false;
    this.dockedStation = null;
    this.dockTime = 0;
    this.target = null;
    this.actionCooldown = 2.0; // Brief cooldown before seeking new opportunities
    this.state = 'SEEKING';
  }
}

// SIMPLE STATION WITH PLAYER TRADING SUPPORT
export class SimpleStationWithTrading extends SimpleStation {
  constructor(x, y, name, CSS2DObjectConstructor) {
    super(x, y, name, CSS2DObjectConstructor);
    
    // ADD CREDITS FOR TRADING
    this.credits = 1000 + Math.floor(Math.random() * 2000);
    
    // MINER SPAWNING SYSTEM
    this.miners = [];
    this.maxMiners = 1; // Start with 1 miner per station
    this.minerCost = { goods: 2, credits: 300 }; // Cheaper than traders
    this.lastMinerCheck = 0;
    this.minerCheckInterval = 10000; // Check every 10 seconds
  }

  // Override update to add debug logging and miner spawning
  update(deltaTime, game) {
    console.log(`${this.name}: update called, materials=${this.materials}, goods=${this.producedGoods}, credits=${this.credits}`);
    
    // Call parent update method
    super.update(deltaTime, game);
    
    // Check for miner spawning
    this.checkMinerSpawning(Date.now(), game);
    
    console.log(`${this.name}: after update, materials=${this.materials}, goods=${this.producedGoods}`);
  }

  checkMinerSpawning(currentTime, game) {
    // Only check every 10 seconds
    if (currentTime - this.lastMinerCheck < this.minerCheckInterval) return;
    this.lastMinerCheck = currentTime;

    // Clean up destroyed miners
    this.miners = this.miners.filter(miner => game.entities.miners && game.entities.miners.includes(miner));
    
    // Do we need miners? (when materials < 5 and we can afford it)
    if (this.miners.length < this.maxMiners && 
        this.materials < 5 && 
        this.producedGoods >= this.minerCost.goods && 
        this.credits >= this.minerCost.credits) {
      
      this.spawnMiner(game);
    }
  }

  spawnMiner(game) {
    // Pay cost
    this.producedGoods -= this.minerCost.goods;
    this.credits -= this.minerCost.credits;
    
    // Spawn near station
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 10;
    const x = this.mesh.position.x + Math.cos(angle) * distance;
    const y = this.mesh.position.y + Math.sin(angle) * distance;
    
    // Create SimpleMiner
    const miner = new SimpleMiner(x, y, this, game);
    
    // Add to game
    if (!game.entities.miners) game.entities.miners = [];
    game.entities.miners.push(miner);
    game.scene.add(miner.mesh);
    this.miners.push(miner);
    
    // Log it
    if (game.eventLogger) {
      game.eventLogger.logStation(`${this.name} deployed mining ship (-${this.minerCost.goods} goods, -$${this.minerCost.credits})`);
    }

    if (game.ui) {
      game.ui.showMessage(`${this.name} deployed mining ship!`, 'system-neutral');
    }
  }

  // PLAYER TRADING METHODS
  
  // Player wants to BUY materials FROM station (station sells to player)
  playerBuyMaterials(quantity, playerCredits) {
    const price = this.getMaterialPrice();
    const totalCost = price * quantity;
    
    if (playerCredits >= totalCost && this.canSellMaterials(quantity)) {
      this.sellMaterials(quantity);
      this.credits += totalCost;
      return { success: true, cost: totalCost, unitPrice: price };
    }
    return { success: false, reason: playerCredits < totalCost ? 'insufficient_credits' : 'insufficient_stock' };
  }

  // Player wants to SELL materials TO station (station buys from player)  
  playerSellMaterials(quantity, playerMaterials) {
    const price = Math.floor(this.getMaterialPrice() * 0.8); // Station buys at 80% of sell price
    const totalValue = price * quantity;
    
    if (playerMaterials >= quantity && this.canBuyMaterials(quantity) && this.credits >= totalValue) {
      this.buyMaterials(quantity);
      this.credits -= totalValue;
      return { success: true, value: totalValue, unitPrice: price };
    }
    return { success: false, reason: this.credits < totalValue ? 'station_poor' : 'station_full' };
  }

  // Player wants to BUY goods FROM station
  playerBuyGoods(quantity, playerCredits) {
    const price = this.getGoodsPrice();
    const totalCost = price * quantity;
    
    if (playerCredits >= totalCost && this.canSellGoods(quantity)) {
      this.sellGoods(quantity);
      this.credits += totalCost;
      return { success: true, cost: totalCost, unitPrice: price };
    }
    return { success: false, reason: playerCredits < totalCost ? 'insufficient_credits' : 'insufficient_stock' };
  }

  // Player wants to SELL goods TO station
  playerSellGoods(quantity, playerGoods) {
    const price = Math.floor(this.getGoodsPrice() * 0.9); // Station buys at 90% of sell price
    const totalValue = price * quantity;
    
    if (playerGoods >= quantity && this.canBuyGoods(quantity) && this.credits >= totalValue) {
      this.buyGoods(quantity);
      this.credits -= totalValue;
      return { success: true, value: totalValue, unitPrice: price };
    }
    return { success: false, reason: this.credits < totalValue ? 'station_poor' : 'station_full' };
  }

  // GET TRADE OPTIONS FOR UI
  getTradeOptions() {
    return {
      // What station is selling TO player
      selling: {
        materials: {
          available: this.materials,
          price: this.getMaterialPrice(),
          canSell: this.materials > 0
        },
        goods: {
          available: this.producedGoods,
          price: this.getGoodsPrice(),
          canSell: this.producedGoods > 0
        }
      },
      // What station is buying FROM player
      buying: {
        materials: {
          space: this.maxCargo - (this.materials + this.producedGoods),
          price: Math.floor(this.getMaterialPrice() * 0.8),
          canBuy: this.canBuyMaterials(1) && this.credits >= Math.floor(this.getMaterialPrice() * 0.8)
        },
        goods: {
          space: this.maxCargo - (this.materials + this.producedGoods),
          price: Math.floor(this.getGoodsPrice() * 0.9),
          canBuy: this.canBuyGoods(1) && this.credits >= Math.floor(this.getGoodsPrice() * 0.9)
        }
      },
      stationCredits: this.credits
    };
  }

  // UPDATE LABEL TO SHOW CREDITS
  updateLabelContent(div) {
    const totalCargo = this.materials + this.producedGoods;
    const cargoPercent = Math.floor((totalCargo / this.maxCargo) * 100);
    
    div.innerHTML = `${this.name}<br>
      <span style="font-size: 0.8em; color: #ffaa00;">Pop: ${Math.floor(this.population)}</span><br>
      <span style="font-size: 0.7em; color: #00ffff;">Materials: ${this.materials}</span><br>
      <span style="font-size: 0.7em; color: #ff88ff;">Goods: ${this.producedGoods}</span><br>
      <span style="font-size: 0.6em; color: #ffff00;">Credits: ${this.credits}</span><br>
      <span style="font-size: 0.6em; color: #888888;">Cargo: ${cargoPercent}%</span>`;
  }
}

// SIMPLE PLAYER CARGO SYSTEM
export class SimplePlayerCargo {
  static initializePlayerCargo(gameState) {
    // Replace complex cargo system with simple one
    gameState.materials = 0;
    gameState.goods = 0;
    gameState.cargo = []; // Keep old cargo for backwards compatibility
    gameState.maxCargo = 10; // Total items (materials + goods)
  }

  static getPlayerCargoStatus(gameState) {
    return {
      materials: gameState.materials || 0,
      goods: gameState.goods || 0,
      totalCargo: (gameState.materials || 0) + (gameState.goods || 0),
      maxCargo: gameState.maxCargo,
      cargoSpace: gameState.maxCargo - ((gameState.materials || 0) + (gameState.goods || 0))
    };
  }

  static canCarryMore(gameState, quantity = 1) {
    const current = (gameState.materials || 0) + (gameState.goods || 0);
    return current + quantity <= gameState.maxCargo;
  }
}

// SIMPLE MINER AI - Collects ore from asteroids and returns to station
export class SimpleMiner {
  constructor(x, y, homeStation, game) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 15;
    this.homeStation = homeStation;
    this.game = game;
    
    // MINING CARGO
    this.ore = 0;
    this.maxOre = 5; // Can carry 5 ore before returning
    
    // AI STATE - 3-state FSM like other ships
    this.state = 'SEEK_ASTEROID'; // SEEK_ASTEROID, MINE, RETURN
    this.target = null;
    this.miningTimer = 0;
    this.miningTimeNeeded = 3.0; // 3 seconds to mine an asteroid
    
    // DOCKING SYSTEM (like SimpleTrader)
    this.docked = false;
    this.dockedStation = null;
    this.dockTime = 0;
    this.minDockTime = 2.0; // Faster docking for miners
    this.maxDockTime = 4.0;
    
    this.health = 30; // Lighter than traders
    this.maxHealth = 30;
  }

  createMesh() {
    const group = new THREE.Group();
    // Mining ship - yellow/orange color
    const hullGeometry = new THREE.BoxGeometry(1.8, 1.2, 0.8);
    const hullMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    group.add(hull);
    
    // Mining drill
    const drillGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1, 6);
    const drillMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const drill = new THREE.Mesh(drillGeometry, drillMaterial);
    drill.position.set(1.1, 0, 0);
    drill.rotation.z = Math.PI / 2;
    group.add(drill);
    
    return group;
  }

  update(deltaTime) {
    // DEBUG LOGGING FOR MINER STATE TRACKING
    console.log(`Miner ${this.mesh.uuid.slice(0,4)}: State=${this.state}, Target=${this.target?.constructor?.name || 'none'}, Ore=${this.ore}/${this.maxOre}`);

    // Handle docking time (same as trader)
    if (this.docked) {
      this.dockTime -= deltaTime;
      
      if (this.dockTime <= 0) {
        this.undockFromStation();
      } else {
        // While docked, try to deliver ore
        this.handleDockedDelivery();
        return; // Don't move while docked
      }
    }

    // 3-STATE FSM
    switch(this.state) {
      case 'SEEK_ASTEROID':
        this.seekAsteroid(deltaTime);
        break;
      case 'MINE':
        this.mineAsteroid(deltaTime);
        break;
      case 'RETURN':
        this.returnToStation(deltaTime);
        break;
    }

    // Apply movement (only if not docked)
    if (!this.docked) {
      this.velocity.multiplyScalar(0.85);
      if (this.velocity.length() > this.maxSpeed) {
        this.velocity.normalize().multiplyScalar(this.maxSpeed);
      }
      this.mesh.position.x += this.velocity.x * deltaTime;
      this.mesh.position.y += this.velocity.y * deltaTime;
    }
  }

  seekAsteroid(deltaTime) {
    // Find closest asteroid
    if (!this.target || !this.game.entities.asteroids.includes(this.target)) {
      this.target = this.findClosestAsteroid();
    }

    if (!this.target) {
      // No asteroids available, patrol around home station
      this.patrolAroundStation(deltaTime);
      return;
    }

    // Move toward target asteroid
    const dx = this.target.mesh.position.x - this.mesh.position.x;
    const dy = this.target.mesh.position.y - this.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 8) { // Close enough to start mining
      this.state = 'MINE';
      this.velocity.set(0, 0);
      this.miningTimer = 0;
    } else {
      // Move toward asteroid
      this.velocity.x += (dx / distance) * this.maxSpeed * deltaTime * 2;
      this.velocity.y += (dy / distance) * this.maxSpeed * deltaTime * 2;
      this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  mineAsteroid(deltaTime) {
    if (!this.target || !this.game.entities.asteroids.includes(this.target)) {
      // Asteroid was destroyed or disappeared
      this.state = 'SEEK_ASTEROID';
      this.target = null;
      return;
    }

    // Mining process
    this.miningTimer += deltaTime;
    
    if (this.miningTimer >= this.miningTimeNeeded) {
      // Successfully mined ore
      this.ore++;
      this.target.health -= 40; // Damage asteroid significantly
      this.miningTimer = 0;

      // Log mining
      if (this.game.eventLogger) {
        this.game.eventLogger.logEconomic(
          `Miner extracted ore from asteroid (${this.ore}/${this.maxOre})`,
          { miner: this.mesh.uuid.slice(0, 8), ore: this.ore }
        );
      }

      // Check if asteroid is depleted
      if (this.target.health <= 0) {
        // Remove asteroid
        this.game.scene.remove(this.target.mesh);
        const asteroidIndex = this.game.entities.asteroids.indexOf(this.target);
        if (asteroidIndex >= 0) {
          this.game.entities.asteroids.splice(asteroidIndex, 1);
        }
        this.target = null;
      }

      // Check if cargo is full or should return
      if (this.ore >= this.maxOre || !this.target) {
        this.state = 'RETURN';
        this.target = null;
      } else {
        // Continue mining same asteroid
        this.miningTimer = 0;
      }
    }
  }

  returnToStation(deltaTime) {
    // Move toward home station
    const dx = this.homeStation.mesh.position.x - this.mesh.position.x;
    const dy = this.homeStation.mesh.position.y - this.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 15) {
      // Close enough to dock
      this.dockAtStation();
    } else {
      // Move toward station
      this.velocity.x += (dx / distance) * this.maxSpeed * deltaTime * 2;
      this.velocity.y += (dy / distance) * this.maxSpeed * deltaTime * 2;
      this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  findClosestAsteroid() {
    let closest = null;
    let closestDist = 300; // Max search range

    this.game.entities.asteroids.forEach(asteroid => {
      const dist = this.mesh.position.distanceTo(asteroid.mesh.position);
      if (dist < closestDist) {
        closest = asteroid;
        closestDist = dist;
      }
    });

    return closest;
  }

  patrolAroundStation(deltaTime) {
    // Simple patrol around home station when no asteroids
    if (!this.patrolTarget || this.reachedTarget(this.patrolTarget, 20)) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      this.patrolTarget = {
        x: this.homeStation.mesh.position.x + Math.cos(angle) * distance,
        y: this.homeStation.mesh.position.y + Math.sin(angle) * distance
      };
    }
    this.moveToward(this.patrolTarget, deltaTime, 0.6);
  }

  dockAtStation() {
    this.docked = true;
    this.dockedStation = this.homeStation;
    this.dockTime = this.minDockTime + Math.random() * (this.maxDockTime - this.minDockTime);
    
    // Move ship to station position (visual docking)
    this.mesh.position.copy(this.homeStation.mesh.position);
    this.velocity.set(0, 0);
    
    // Log docking
    if (this.game.eventLogger) {
      this.game.eventLogger.logEconomic(
        `Miner docked at ${this.homeStation.name} with ${this.ore} ore`,
        { 
          miner: this.mesh.uuid.slice(0, 8),
          station: this.homeStation.name,
          ore: this.ore
        }
      );
    }
  }

  handleDockedDelivery() {
    if (this.ore > 0) {
      // Convert ore to materials (1 ore = 1 material)
      const materialsToAdd = this.ore;
      if (this.homeStation.canBuyMaterials(materialsToAdd)) {
        this.homeStation.buyMaterials(materialsToAdd);
        this.ore = 0;
        
        if (this.game.eventLogger) {
          this.game.eventLogger.logEconomic(
            `Miner delivered ${materialsToAdd} materials to ${this.homeStation.name}`,
            { 
              miner: this.mesh.uuid.slice(0, 8),
              materials: materialsToAdd,
              station: this.homeStation.name
            }
          );
        }
      }
    }
  }

  undockFromStation() {
    if (this.game.eventLogger) {
      this.game.eventLogger.logEconomic(
        `Miner undocked from ${this.homeStation.name}`,
        { 
          miner: this.mesh.uuid.slice(0, 8),
          station: this.homeStation.name
        }
      );
    }

    this.docked = false;
    this.dockedStation = null;
    this.dockTime = 0;
    this.state = 'SEEK_ASTEROID'; // Go find more asteroids
  }

  // Helper methods (same as other ships)
  moveToward(targetPos, deltaTime, speedMod = 1.0) {
    const dx = targetPos.x - this.mesh.position.x;
    const dy = targetPos.y - this.mesh.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      this.velocity.x += (dx / dist) * this.maxSpeed * speedMod * deltaTime * 3;
      this.velocity.y += (dy / dist) * this.maxSpeed * speedMod * deltaTime * 3;
    }
    
    this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
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

// Legacy aliases for compatibility
export const Pirate = SimplePirate;
export const Police = SimplePolice;
export const FriendlyShip = SimpleFriendlyShip;
