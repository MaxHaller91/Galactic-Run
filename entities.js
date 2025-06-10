import * as THREE from 'three';

// DISTRESS BEACON
export class DistressBeacon {
  constructor(x, y) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.timeLeft = 30;
    this.responded = false;
  }

  createMesh() {
    const geometry = new THREE.SphereGeometry(2, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
    const beacon = new THREE.Mesh(geometry, material);
    beacon.userData = { pulseTimer: 0 };
    return beacon;
  }

  update(deltaTime) {
    this.timeLeft -= deltaTime;
    this.mesh.userData.pulseTimer += deltaTime * 4;
    const pulse = Math.sin(this.mesh.userData.pulseTimer) * 0.3 + 0.7;
    this.mesh.material.opacity = pulse;
    this.mesh.scale.setScalar(0.8 + pulse * 0.4);
    return this.timeLeft > 0;
  }
}

// PIRATE
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
    switch(this.state) {
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
    game.entities.friendlyShips.forEach(ship => {
      if (ship.docked) return;
      const dist = this.mesh.position.distanceTo(ship.mesh.position);
      if (dist < closestDist) {
        closest = { position: ship.mesh.position, type: 'friendly', entity: ship };
        closestDist = dist;
      }
    });
    if (game.entities.tradingShips) {
      game.entities.tradingShips.forEach(trader => {
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
    if (!this.patrolTarget || this.reachedTarget(this.patrolTarget, 30)) {
      this.patrolTarget = {
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000
      };
    }
    this.moveToward(this.patrolTarget, deltaTime, 0.7);
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

// POLICE (simplified)
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

// FRIENDLY SHIP (simplified)  
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
    return this.game.entities.pirates.some(pirate => 
      pirate.mesh.position.distanceTo(this.mesh.position) < 60
    );
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

// BASIC PLACEHOLDERS
export class Station {
  constructor(type, position, resources, prices) {
    this.type = type;
    this.position = position;
    this.resources = resources || { materials: 20, food: 20 };
    this.prices = prices || {};
    this.mesh = this.createMesh();
    this.credits = 1000 + Math.random() * 500;
    this.orderTimer = 0; // Use accumulated game time instead
    this.orderCooldown = 10; // Create orders every 10 game seconds (now affected by time scale)
    this.myOrders = []; // Track orders this station created
  }
  
  createMesh() {
    const geometry = new THREE.BoxGeometry(5, 5, 5);
    const material = new THREE.MeshBasicMaterial({ color: this.type === 'mining' ? 0x666666 : 0x336633 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    return mesh;
  }
  
  update(deltaTime, game) {
    // Consume resources over time
    this.consumeResources(deltaTime);
    
    // Produce resources based on type
    this.produceResources(deltaTime);
    
    // Update order timer (now affected by time scale)
    this.orderTimer += deltaTime;
    
    // Create trade orders when needed
    if (this.orderTimer >= this.orderCooldown) {
      this.checkAndCreateOrders(game);
      this.orderTimer = 0; // Reset timer
    }
    
    // Clean up completed orders
    this.myOrders = this.myOrders.filter(order => 
      game.availableOrders.includes(order) && !order.completed
    );
  }
  
  consumeResources(deltaTime) {
    // Simple consumption - stations use resources slowly
    if (this.resources.food > 0) {
      this.resources.food -= deltaTime * 0.1; // Consume 0.1 food per second
    }
    if (this.resources.materials > 0 && this.type === 'agricultural') {
      this.resources.materials -= deltaTime * 0.05; // Agricultural stations use materials
    }
  }
  
  produceResources(deltaTime) {
    // Simple production based on station type
    if (this.type === 'mining' && this.resources.food > 5) {
      this.resources.materials += deltaTime * 0.2; // Produce materials if fed
    } else if (this.type === 'agricultural' && this.resources.materials > 5) {
      this.resources.food += deltaTime * 0.2; // Produce food if supplied
    }
    
    // Generate credits when station is well-supplied (both resources available)
    if (this.resources.food > 10 && this.resources.materials > 10) {
      this.credits += deltaTime * 100; // Earn credits when operating efficiently
    }
    
    // Cap resources
    this.resources.materials = Math.min(100, Math.max(0, this.resources.materials));
    this.resources.food = Math.min(100, Math.max(0, this.resources.food));
  }
  
  checkAndCreateOrders(game) {
    // Station-specific order creation based on specialization
    if (this.type === 'mining') {
      // Mining stations: BUY food, SELL materials
      if (this.resources.food < 15 && this.credits > 150) {
        this.createBuyOrder(game, 'food', 10, 40);
      }
      if (this.resources.materials > 80) {
        this.createSellOrder(game, 'materials', 20, 45);
      }
    } else if (this.type === 'agricultural') {
      // Agricultural stations: BUY materials, SELL food
      if (this.resources.materials < 15 && this.credits > 200) {
        this.createBuyOrder(game, 'materials', 10, 50);
      }
      if (this.resources.food > 80) {
        this.createSellOrder(game, 'food', 20, 35);
      }
    }
  }
  
  createBuyOrder(game, resourceType, quantity, price) {
    const order = {
      id: `${this.name || 'Station'}_${Date.now()}_${Math.random()}`,
      type: 'buy',
      resourceType: resourceType,
      quantity: quantity,
      price: price,
      totalValue: quantity * price,
      station: this,
      stationName: this.name || 'Unknown Station',
      created: Date.now(),
      completed: false,
      takenBy: null
    };
    
    game.availableOrders.push(order);
    this.myOrders.push(order);
    
    console.log(`📋 ${this.name || 'Station'} created BUY order: ${quantity} ${resourceType} for $${price} each`);
  }
  
  createSellOrder(game, resourceType, quantity, price) {
    const order = {
      id: `${this.name || 'Station'}_${Date.now()}_${Math.random()}`,
      type: 'sell',
      resourceType: resourceType,
      quantity: quantity,
      price: price,
      totalValue: quantity * price,
      station: this,
      stationName: this.name || 'Unknown Station',
      created: Date.now(),
      completed: false,
      takenBy: null
    };
    
    game.availableOrders.push(order);
    this.myOrders.push(order);
    
    console.log(`📋 ${this.name || 'Station'} created SELL order: ${quantity} ${resourceType} for $${price} each`);
  }
  
  // Handle trader interactions
  sellResourceToTrader(resourceType, quantity) {
    if (this.resources[resourceType] >= quantity) {
      this.resources[resourceType] -= quantity;
      return true;
    }
    return false;
  }
  
  buyResourceFromTrader(resourceType, quantity) {
    this.resources[resourceType] += quantity;
    return true;
  }
}

export class TradingShip {
  constructor(position, stations) {
    this.position = position;
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.credits = 1000 + Math.random() * 500;
    this.cargo = { materials: 0, food: 0 };
    this.maxCargo = 20;
    this.stations = stations || [];
    
    // AI State
    this.state = 'SEEKING_ORDER'; // SEEKING_ORDER, SOURCING, TRAVELING_TO_PICKUP, PICKING_UP, TRAVELING_TO_DELIVERY, DELIVERING
    this.currentOrder = null;
    this.sourceOrder = null; // For when we need to source goods for a BUY order
    this.target = null;
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 18;
    this.actionTimer = 0;
    this.stateTimer = 0; // Track how long we've been in current state
    this.maxStateTime = 8; // Force action after 15 seconds
  }
  
  createMesh() {
    const geometry = new THREE.ConeGeometry(1, 3, 6);
    const material = new THREE.MeshBasicMaterial({ color: 0x00aaaa });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }
  
  update(deltaTime, game) {
    this.actionTimer -= deltaTime;
    this.stateTimer += deltaTime;
    
    // Timeout protection - only for states where ships can get stuck
    const timeoutStates = ['SEEKING_ORDER', 'PICKING_UP'];
    if (timeoutStates.includes(this.state) && this.stateTimer > this.maxStateTime) {
      console.log(`⏰ Trader timeout in state ${this.state}, forcing reset`);
      this.forceReset();
    }
    
    switch(this.state) {
      case 'SEEKING_ORDER':
        this.seekOrder(game);
        break;
      case 'TRAVELING_TO_PICKUP':
        this.travelToPickup(deltaTime);
        break;
      case 'PICKING_UP':
        this.handlePickup(game);
        break;
      case 'TRAVELING_TO_DELIVERY':
        this.travelToDelivery(deltaTime);
        break;
      case 'DELIVERING':
        this.handleDelivery(game);
        break;
    }
    
    // Apply movement
    this.velocity.multiplyScalar(0.85);
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
  }
  
  forceReset() {
    console.log(`🔄 Trader force reset - was in ${this.state} with cargo: M:${this.cargo.materials} F:${this.cargo.food}`);
    this.resetToSeeking();
  }
  
  resetToSeeking() {
    this.abandonOrder({ availableOrders: [] });
    this.stateTimer = 0;
  }
  
  setState(newState) {
    if (this.state !== newState) {
      console.log(`🔄 Trader state: ${this.state} → ${newState}`);
      this.state = newState;
      this.stateTimer = 0;
    }
  }
  
  seekOrder(game) {
    if (!game.availableOrders || game.availableOrders.length === 0) {
      this.moveToOtherStation();
      return;
    }
    
    // Find best order to fulfill
    const viableOrders = game.availableOrders.filter(order => 
      !order.takenBy && !order.completed && this.canHandleOrder(order)
    );
    
    if (viableOrders.length === 0) {
      this.moveToOtherStation();
      return;
    }
    
    // Pick closest order
    let bestOrder = null;
    let bestDistance = Infinity;
    
    viableOrders.forEach(order => {
      const distance = this.mesh.position.distanceTo(order.station.mesh.position);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestOrder = order;
      }
    });
    
    if (bestOrder) {
      this.takeOrder(bestOrder);
      console.log(`🚛 Trader taking order: ${bestOrder.type} ${bestOrder.quantity} ${bestOrder.resourceType} from ${bestOrder.stationName}`);
    }
  }
  
  moveToOtherStation() {
    if (this.stations.length >= 2) {
      // Find station that's not our current target
      const otherStation = this.stations.find(station => {
        const distance = this.mesh.position.distanceTo(station.mesh.position);
        return distance > 50; // Far enough to be the other station
      });
      
      if (otherStation) {
        this.target = otherStation;
        this.state = 'TRAVELING_TO_PICKUP';
        this.stateTimer = 0;
      }
    }
  }
  
  canHandleOrder(order) {
    if (order.type === 'buy') {
      // For buy orders, check if we already have the resource
      if (this.cargo[order.resourceType] >= order.quantity) {
        return true; // We can fulfill immediately
      }
      // If we don't have it, check if we have space to source it
      return (this.cargo.materials + this.cargo.food + order.quantity) <= this.maxCargo;
    } else {
      // For sell orders, we need credits and cargo space
      return this.credits >= order.totalValue && 
             (this.cargo.materials + this.cargo.food + order.quantity) <= this.maxCargo;
    }
  }
  
  takeOrder(order) {
    this.currentOrder = order;
    order.takenBy = this;
    
    if (order.type === 'sell') {
      // For sell orders, we go to pick up from the station
      this.target = order.station;
      this.state = 'TRAVELING_TO_PICKUP';
    } else {
      // For buy orders, check if we already have the resource
      if (this.cargo[order.resourceType] >= order.quantity) {
        // We have the resource, go deliver directly
        this.target = order.station;
        this.state = 'TRAVELING_TO_DELIVERY';
      } else {
        // We need to source the resource first
        this.findSourceForBuyOrder(order);
      }
    }
  }
  
  findSourceForBuyOrder(buyOrder) {
    // Look for SELL orders for the same resource
    const sellOrders = this.stations.filter(station => 
      station.resources[buyOrder.resourceType] > buyOrder.quantity
    );
    
    if (sellOrders.length > 0) {
      // Find closest station with the resource
      let closestStation = null;
      let closestDistance = Infinity;
      
      sellOrders.forEach(station => {
        const distance = this.mesh.position.distanceTo(station.mesh.position);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestStation = station;
        }
      });
      
      if (closestStation) {
        this.target = closestStation;
        this.state = 'TRAVELING_TO_PICKUP';
        console.log(`🔍 Trader sourcing ${buyOrder.quantity} ${buyOrder.resourceType} from ${closestStation.name || 'Station'} for delivery to ${buyOrder.stationName}`);
      } else {
        // No source found, abandon order
        this.abandonOrder({ availableOrders: [] });
      }
    } else {
      // No stations have the resource, abandon order
      this.abandonOrder({ availableOrders: [] });
    }
  }
  
  travelToPickup(deltaTime) {
    if (!this.target || !this.currentOrder) {
      this.state = 'SEEKING_ORDER';
      return;
    }
    
    const distance = this.mesh.position.distanceTo(this.target.mesh.position);
    
    if (distance < 15) {
      this.state = 'PICKING_UP';
      this.actionTimer = 0.5; // 0.5 seconds to load cargo
      this.velocity.set(0, 0);
    } else {
      this.moveToward(this.target.mesh.position, deltaTime);
    }
  }
  
  handlePickup(game) {
    if (this.actionTimer > 0) return; // Still loading
    
    const order = this.currentOrder;
    if (!order) {
      this.state = 'SEEKING_ORDER';
      return;
    }
    
    if (order.type === 'sell') {
      // Handling pickup for SELL orders (traditional approach)
      if (order.station.sellResourceToTrader(order.resourceType, order.quantity)) {
        this.cargo[order.resourceType] += order.quantity;
        console.log(`📦 Trader picked up ${order.quantity} ${order.resourceType} from ${order.stationName}`);
        
        // Now find a station that wants this resource
        this.findBuyerStation(game);
      } else {
        // Station doesn't have the resource, abandon order
        console.log(`❌ Station ${order.stationName} couldn't provide ${order.resourceType}`);
        this.abandonOrder(game);
      }
    } else if (order.type === 'buy') {
      // Handling pickup for BUY orders (sourcing goods to fulfill contract)
      if (this.target.sellResourceToTrader(order.resourceType, order.quantity)) {
        this.cargo[order.resourceType] += order.quantity;
        console.log(`📦 Trader sourced ${order.quantity} ${order.resourceType} from ${this.target.name || 'Station'} for delivery to ${order.stationName}`);
        
        // Now go deliver to the original BUY order station
        this.target = order.station;
        this.state = 'TRAVELING_TO_DELIVERY';
      } else {
        // Source station doesn't have the resource, abandon order
        console.log(`❌ Source station couldn't provide ${order.resourceType} for ${order.stationName}`);
        this.abandonOrder(game);
      }
    }
  }
  
  findBuyerStation(game) {
    // Look for a buy order for the same resource type
    const buyOrders = game.availableOrders.filter(order => 
      order.type === 'buy' && 
      order.resourceType === this.currentOrder.resourceType &&
      !order.takenBy && 
      !order.completed
    );
    
    if (buyOrders.length > 0) {
      // Find the highest paying buyer
      const bestBuyer = buyOrders.reduce((best, order) => 
        order.price > best.price ? order : best
      );
      
      this.target = bestBuyer.station;
      bestBuyer.takenBy = this;
      this.deliveryOrder = bestBuyer;
      this.state = 'TRAVELING_TO_DELIVERY';
      
      console.log(`🎯 Trader found buyer: ${bestBuyer.stationName} wants ${bestBuyer.quantity} ${bestBuyer.resourceType} for $${bestBuyer.price} each`);
    } else {
      // No buyer found, find any station that might want it
      const needyStations = this.stations.filter(station => 
        station.resources[this.currentOrder.resourceType] < 30
      );
      
      if (needyStations.length > 0) {
        this.target = needyStations[0];
        this.state = 'TRAVELING_TO_DELIVERY';
      } else {
        // No one wants it, abandon
        this.abandonOrder(game);
      }
    }
  }
  
  travelToDelivery(deltaTime) {
    if (!this.target) {
      this.state = 'SEEKING_ORDER';
      return;
    }
    
    const distance = this.mesh.position.distanceTo(this.target.mesh.position);
    
    if (distance < 15) {
      this.state = 'DELIVERING';
      this.actionTimer = 2.0; // 2 seconds to unload cargo
      this.velocity.set(0, 0);
    } else {
      this.moveToward(this.target.mesh.position, deltaTime);
    }
  }
  
  handleDelivery(game) {
    if (this.actionTimer > 0) return; // Still unloading
    
    const order = this.currentOrder;
    if (!order) {
      this.state = 'SEEKING_ORDER';
      return;
    }
    
    if (order.type === 'buy') {
      // Delivering to a buy order
      if (this.cargo[order.resourceType] >= order.quantity && order.station.credits >= order.totalValue) {
        this.cargo[order.resourceType] -= order.quantity;
        order.station.buyResourceFromTrader(order.resourceType, order.quantity);
        this.credits += order.totalValue;
        order.station.credits -= order.totalValue;
        
        console.log(`💰 Trader sold ${order.quantity} ${order.resourceType} to ${order.stationName} for $${order.totalValue}`);
        this.completeOrder(game, order);
      } else {
        console.log(`❌ Couldn't complete sale to ${order.stationName}`);
        this.abandonOrder(game);
      }
    } else {
      // Delivering after pickup (selling to a buyer)
      const deliveryOrder = this.deliveryOrder;
      if (deliveryOrder && this.cargo[deliveryOrder.resourceType] >= deliveryOrder.quantity) {
        this.cargo[deliveryOrder.resourceType] -= deliveryOrder.quantity;
        deliveryOrder.station.buyResourceFromTrader(deliveryOrder.resourceType, deliveryOrder.quantity);
        this.credits += deliveryOrder.totalValue;
        deliveryOrder.station.credits -= deliveryOrder.totalValue;
        
        console.log(`💰 Trader delivered ${deliveryOrder.quantity} ${deliveryOrder.resourceType} to ${deliveryOrder.stationName} for $${deliveryOrder.totalValue}`);
        this.completeOrder(game, deliveryOrder);
      }
      
      // Also complete the original sell order
      this.completeOrder(game, order);
    }
  }
  
  completeOrder(game, order) {
    order.completed = true;
    order.takenBy = null;
    
    // Remove completed order from available orders
    const index = game.availableOrders.indexOf(order);
    if (index > -1) {
      game.availableOrders.splice(index, 1);
    }
    
    this.currentOrder = null;
    this.deliveryOrder = null;
    this.target = null;
    this.state = 'SEEKING_ORDER';
  }
  
  abandonOrder(game) {
    if (this.currentOrder) {
      this.currentOrder.takenBy = null;
    }
    if (this.deliveryOrder) {
      this.deliveryOrder.takenBy = null;
    }
    
    this.currentOrder = null;
    this.deliveryOrder = null;
    this.target = null;
    this.state = 'SEEKING_ORDER';
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
  
  getCargoString() { 
    return `M:${this.cargo.materials} F:${this.cargo.food}`;
  }
}

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
    this.maxOre = Math.floor(size * 10);
    this.currentOre = this.maxOre;
    this.rotationSpeed = (Math.random() - 0.5) * 0.01;
  }

  createMesh() {
    const geometry = new THREE.IcosahedronGeometry(this.size, 0);
    const material = new THREE.MeshBasicMaterial({ color: 0x888888 });
    return new THREE.Mesh(geometry, material);
  }

  update(deltaTime) {
    this.mesh.rotation.z += this.rotationSpeed;
  }
}

export class JumpGate {
  constructor(x, y, targetZoneId, destinationName) {
    this.targetZoneId = targetZoneId;
    this.destinationName = destinationName;
    this.interactionRadius = 20;
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.animationTime = 0;
  }

  createMesh() {
    const group = new THREE.Group();
    const ringGeometry = new THREE.TorusGeometry(8, 1, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00ccff });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    group.add(ring);
    return group;
  }

  update(deltaTime) {
    this.animationTime += deltaTime;
    this.mesh.rotation.z += deltaTime * 0.5;
  }
}

// ECONOMIC ENGINE (placeholder for compatibility)
export class EconomicEngine {
  constructor() {
    this.priceMultipliers = {
      food: 1.0,
      materials: 1.0
    };
  }
  
  update() {}
  updatePrices() {}
  getPrice(resource, basePrice) {
    return basePrice * (this.priceMultipliers[resource] || 1.0);
  }
}

// PIRATE STATION (placeholder for compatibility)
export class PirateStation {
  constructor(position) {
    this.position = position;
    this.mesh = this.createMesh();
    this.type = 'pirate';
    this.resources = { materials: 0, food: 0 };
  }
  
  createMesh() {
    const geometry = new THREE.BoxGeometry(4, 4, 4);
    const material = new THREE.MeshBasicMaterial({ color: 0x441111 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    return mesh;
  }
  
  update() {}
}
