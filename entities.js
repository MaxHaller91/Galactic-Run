import * as THREE from 'three';
// Re-export COMMODITIES from here if it's the canonical source, or import if game.js is.
import { COMMODITIES_LIST } from 'constants'; // Import from constants.js
// The COMMODITIES_STATION_INTERNAL is now replaced by the imported COMMODITIES_LIST
export class SpaceStation {
  constructor(x, y, name, CSS2DObjectConstructor) {
    this.name = name;
    const factions = ['Federated Commerce Guild', 'Outer Rim Prospectors'];
    this.faction = factions[Math.floor(Math.random() * factions.length)];
    this.factionColors = {
      'Federated Commerce Guild': new THREE.Color(0x0088ff), // Blueish
      'Outer Rim Prospectors': new THREE.Color(0xffaa00),  // Orangeish
      'Pirates': new THREE.Color(0xff0000)  // Red for pirate-controlled stations
    };
    
    // Economic simulation properties
    this.population = 800 + Math.floor(Math.random() * 1200); // 800-2000 starting population
    this.maxPopulation = this.population * 1.5; // Room for growth
    this.foodStock = 400 + Math.floor(Math.random() * 200); // 400-600 starting food
    this.waterStock = 250 + Math.floor(Math.random() * 150); // 250-400 starting water
    this.happiness = 60 + Math.floor(Math.random() * 30); // 60-90 starting happiness
    this.lastUpdateTime = Date.now();
    this.updateInterval = 30000; // 30 seconds
    this.consumptionRate = {
      food: 0.1,  // per person per day
      water: 0.05 // per person per day
    };
    this.productivityMultiplier = 1.0;
    this.controllingFaction = this.faction; // Track original vs current faction
    this.stationHealth = 'healthy'; // 'healthy', 'struggling', 'crisis', 'abandoned'
    
    // Assign production/consumption focus from the COMMODITIES_LIST
    const availableForProduction = COMMODITIES_LIST.filter(c => c.type === 'industrial' || c.type === 'consumer' || c.type === 'tech');
    this.productionFocus = availableForProduction[Math.floor(Math.random() * availableForProduction.length)].name;
    const availableForConsumption = COMMODITIES_LIST.filter(c => c.name !== this.productionFocus);
    this.consumptionFocus = availableForConsumption[Math.floor(Math.random() * availableForConsumption.length)].name;
    
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    
    this.inventory = {}; // Stores quantity of each commodity: { "Food Rations": 100, ... }
    this.goods = this.initializeEconomy(); // This will set up inventory and market prices
    this.label = this.createLabel(CSS2DObjectConstructor);
    this.mesh.add(this.label); // Attach label to the station's mesh group
  }
  createMesh() {
    const group = new THREE.Group();
    
    // Main structure
    const coreGeometry = new THREE.CylinderGeometry(3, 3, 1, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);
    
    // Docking rings
    const ringGeometry = new THREE.TorusGeometry(4, 0.5, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    
    // Lights with faction color
    const lightGeometry = new THREE.SphereGeometry(0.2, 6, 6);
    const factionColor = this.factionColors[this.faction] || new THREE.Color(0x00ff88); // Default green if faction color not found
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
    div.innerHTML = `${this.name}<br><span style="font-size: 0.8em; color: ${factionColorHex};">${this.faction}</span>`;
    div.style.fontFamily = "'Lucida Console', 'Courier New', monospace"; // Explicitly set retro font
    div.style.color = '#00ff00'; // Green for station labels, classic terminal look
    div.style.fontSize = '13px'; // Slightly larger for pixel font feel
    div.style.textAlign = 'center';
    div.style.textShadow = '1px 1px 1px rgba(0,0,0,0.7)'; // Simpler shadow
    div.style.backgroundColor = 'rgba(0, 20, 0, 0.5)'; // Darker green background
    div.style.padding = '2px 4px';
    div.style.border = '1px solid rgba(0,255,0,0.3)'; // Subtle border
    div.style.borderRadius = '2px'; // Sharper corners
    
    const label = new CSS2DObjectConstructor(div);
    label.position.set(0, 5.5, 0); // Position label slightly above the station center
    return label;
  }
  initializeEconomy() {
    const goodsForSale = [];
    COMMODITIES_LIST.forEach(commodity => {
      let initialQuantity;
      let baseStationSellPrice;
      let baseStationBuyPrice;
      const P_base = commodity.basePrice;
      if (commodity.name === this.productionFocus) {
        initialQuantity = 200 + Math.floor(Math.random() * 301); // 200-500 units
        // Station sells its produced good relatively cheaply
        baseStationSellPrice = Math.floor(P_base * (0.8 + Math.random() * 0.15)); // e.g. 80-95% of base
        // Station buys its produced good back at a low price
        baseStationBuyPrice = Math.floor(P_base * (0.5 + Math.random() * 0.2));  // e.g. 50-70% of base
      } else if (commodity.name === this.consumptionFocus) {
        initialQuantity = 0 + Math.floor(Math.random() * 51);   // 0-50 units (demand)
        // Station sells its consumed good at a high price (if it has any)
        baseStationSellPrice = Math.floor(P_base * (1.3 + Math.random() * 0.3)); // e.g. 130-160% of base
        // Station buys its consumed good at a premium
        baseStationBuyPrice = Math.floor(P_base * (1.1 + Math.random() * 0.15)); // e.g. 110-125% of base
      } else {
        initialQuantity = 0 + Math.floor(Math.random() * 21);   // 0-20 units of other goods
        // Neutral goods prices fluctuate mildly around base price
        baseStationSellPrice = Math.floor(P_base * (1.0 + Math.random() * 0.2)); // e.g. 100-120% of base
        baseStationBuyPrice = Math.floor(P_base * (0.8 + Math.random() * 0.15)); // e.g. 80-95% of base
      }
      // Ensure buy price isn't higher than sell price from station's perspective
      if (baseStationBuyPrice >= baseStationSellPrice) {
        baseStationBuyPrice = Math.floor(baseStationSellPrice * 0.9);
      }
      // Ensure prices are at least 1 credit
      baseStationSellPrice = Math.max(1, baseStationSellPrice);
      baseStationBuyPrice = Math.max(1, baseStationBuyPrice);
      this.inventory[commodity.name] = initialQuantity;
      // Add to goodsForSale if station has any quantity to sell
      // The UI's trade panel will use this `goods` array to list items player can buy from the station.
      // The station's willingness to buy items FROM the player is handled separately in the UI,
      // by checking player's cargo against all COMMODITIES and station's buy prices.
      if (initialQuantity > 0) {
        goodsForSale.push({
          name: commodity.name,
          type: commodity.type,
          stationBaseSellPrice: baseStationSellPrice, // Price player buys at from station
          stationBaseBuyPrice: baseStationBuyPrice,   // Price player sells at to station (used for comparison)
          basePrice: P_base,
          // quantity: initialQuantity // We can add this if UI needs to show station stock
        });
      }
      // Even if not for sale (quantity is 0), the station might still *want* to buy this good if it's its consumption focus.
      // This is handled by the UI checking against player's cargo and the station's `consumptionFocus` and calculated `stationBaseBuyPrice`.
      // For simplicity, we can ensure all commodities have a defined buy/sell price record for the station,
      // even if not actively sold by it.
      // Let's refine: the `goods` array should contain ALL commodities the station *could* trade,
      // and the UI will then check inventory for buy buttons.
      // OR, `goods` is just for what station SELLS, and UI looks up buy prices. The latter is current.
      // Let's stick to current: `goods` is what station offers for sale.
      // The calculation of `actualBuyPrice` in `ui.js` already fetches `stationGoodMatch` from `station.goods`
      // or defaults to a low price if not found. This works.
      // We need to make sure that `stationGoodMatch` (if found) has the correct `stationBaseBuyPrice`.
    });
    return goodsForSale;
  }
  // Called when player/AI BUYS a commodity FROM the station
  buyCommodity(commodityName, quantity) {
    if (this.inventory[commodityName] === undefined) {
      console.warn(`Station ${this.name} does not recognize commodity ${commodityName} for buying.`);
      return false; // Commodity not recognized
    }
    if (this.inventory[commodityName] < quantity) {
      console.warn(`Station ${this.name} has insufficient stock of ${commodityName} to sell ${quantity}. Stock: ${this.inventory[commodityName]}`);
      return false; // Not enough stock
    }
    this.inventory[commodityName] -= quantity;
    this.updateMarketGoods(); // Refresh what the station offers for sale
    // console.log(`${this.name} sold ${quantity} of ${commodityName}. Stock: ${this.inventory[commodityName]}`);
    return true; // Sale successful
  }
  // Called when player/AI SELLS a commodity TO the station
  sellCommodity(commodityName, quantity) {
    if (this.inventory[commodityName] === undefined) {
      // If commodity isn't in inventory yet, initialize it
      const commodityDetails = COMMODITIES_LIST.find(c => c.name === commodityName);
      if (!commodityDetails) {
        console.warn(`Commodity ${commodityName} not found in station's internal list.`);
        return false;
      }
      this.inventory[commodityName] = 0;
    }
    this.inventory[commodityName] += quantity;
    this.updateMarketGoods(); // Refresh what the station offers for sale
    // console.log(`${this.name} bought ${quantity} of ${commodityName}. Stock: ${this.inventory[commodityName]}`);
    return true; // Purchase successful
  }
  // Re-evaluates the station.goods array based on current inventory
  // This should be called after any inventory change.
  updateMarketGoods() {
    const newGoodsForSale = [];
    COMMODITIES_LIST.forEach(commodity => {
      const currentStock = this.inventory[commodity.name] || 0;
      let existingGoodEntry = this.goods.find(g => g.name === commodity.name);
      let stationBaseSellPrice, stationBaseBuyPrice;
      if (existingGoodEntry) {
        stationBaseSellPrice = existingGoodEntry.stationBaseSellPrice;
        stationBaseBuyPrice = existingGoodEntry.stationBaseBuyPrice;
      } else {
        // Good wasn't in the original market list, means it had 0 initial stock and wasn't a focus.
        // Calculate a neutral price for it if it's now in stock.
        const P_base = commodity.basePrice;
        stationBaseSellPrice = Math.floor(P_base * (1.0 + Math.random() * 0.2));
        stationBaseBuyPrice = Math.floor(P_base * (0.8 + Math.random() * 0.15));
        if (stationBaseBuyPrice >= stationBaseSellPrice) {
          stationBaseBuyPrice = Math.floor(stationBaseSellPrice * 0.9);
        }
        stationBaseSellPrice = Math.max(1, stationBaseSellPrice);
        stationBaseBuyPrice = Math.max(1, stationBaseBuyPrice);
      }
      if (currentStock > 0) {
        newGoodsForSale.push({
          name: commodity.name,
          type: commodity.type,
          stationBaseSellPrice: stationBaseSellPrice,
          stationBaseBuyPrice: stationBaseBuyPrice,
          basePrice: commodity.basePrice,
          // quantity: currentStock // Could be useful for UI
        });
      }
    });
    this.goods = newGoodsForSale;
  }

  // Economic simulation update cycle (called every 30 seconds)
  updateEconomy(currentTime, game) {
    if (currentTime - this.lastUpdateTime < this.updateInterval) return;
    
    // 1. Calculate consumption (30 seconds = 1/2880 of a day)
    const timeRatio = this.updateInterval / (24 * 60 * 60 * 1000);
    const foodConsumed = this.population * this.consumptionRate.food * timeRatio;
    const waterConsumed = this.population * this.consumptionRate.water * timeRatio;
    
    // 2. Consume resources
    this.foodStock = Math.max(0, this.foodStock - foodConsumed);
    this.waterStock = Math.max(0, this.waterStock - waterConsumed);
    
    // 3. Update happiness based on supply levels
    this.updateHappiness();
    
    // 4. Handle population changes
    this.updatePopulation();
    
    // 5. Check for faction changes or pirate takeovers
    this.checkStationControl(game);
    
    // 6. Happiness-based pirate spawning
    this.checkPirateSpawning(game);
    
    this.lastUpdateTime = currentTime;
  }

  updateHappiness() {
    let happiness = 50; // Base happiness
    
    // Food supply (0-30 points) - based on days of supply remaining
    const foodDays = this.foodStock / (this.population * this.consumptionRate.food);
    happiness += Math.min(30, foodDays * 3); // 10 days = full points
    
    // Water supply (0-20 points)
    const waterDays = this.waterStock / (this.population * this.consumptionRate.water);
    happiness += Math.min(20, waterDays * 2); // 10 days = full points
    
    this.happiness = Math.max(0, Math.min(100, happiness));
    
    // Update health status and visual appearance
    if (this.happiness >= 70) {
      this.stationHealth = 'healthy';
      this.setStationColor(0x00ff00); // Green
      this.productivityMultiplier = 1.0;
    } else if (this.happiness >= 40) {
      this.stationHealth = 'struggling';
      this.setStationColor(0xffff00); // Yellow
      this.productivityMultiplier = 0.7;
    } else if (this.happiness >= 10) {
      this.stationHealth = 'crisis';
      this.setStationColor(0xff0000); // Red
      this.productivityMultiplier = 0.3;
    } else {
      this.stationHealth = 'abandoned';
      this.setStationColor(0x666666); // Gray
      this.productivityMultiplier = 0.1;
    }
  }

  updatePopulation() {
    if (this.stationHealth === 'abandoned') {
      this.population = Math.max(1, this.population * 0.99); // Slow decline to minimum
      return;
    }
    
    // Population growth/decline based on happiness
    if (this.happiness > 60) {
      // Growth when happy (max 1% per 30 seconds = ~50% per day)
      const growthRate = (this.happiness - 60) / 40 * 0.01;
      this.population = Math.min(this.maxPopulation, this.population * (1 + growthRate));
    } else if (this.happiness < 30) {
      // Decline when unhappy
      const declineRate = (30 - this.happiness) / 30 * 0.005;
      this.population = Math.max(1, this.population * (1 - declineRate));
    }
  }

  checkStationControl(game) {
    // Pirate takeover when resources hit zero
    if (this.foodStock <= 0 || this.waterStock <= 0) {
      if (this.controllingFaction !== 'Pirates') {
        this.controllingFaction = 'Pirates';
        this.faction = 'Pirates'; // Update displayed faction
        this.stationHealth = 'abandoned';
        this.spawnExtraPirates(game); // Spawn 2-3 extra pirates near this station
        this.updateLabel(); // Update label to show pirate control
        // Show message to player
        if (game && game.ui) {
          game.ui.showMessage(`${this.name} has been overrun by pirates!`, 'combat');
        }
      }
      return;
    }
    
    // Faction revolt chance when in crisis
    if (this.stationHealth === 'crisis' && Math.random() < 0.1) { // 10% chance per update
      const currentZone = game.gameState.currentZoneId;
      const opposingFaction = this.controllingFaction === 'Federated Commerce Guild' 
        ? 'Outer Rim Prospectors' 
        : 'Federated Commerce Guild';
      
      // Only revolt if opposing faction controls this zone
      if (game.zones[currentZone].factionControl === opposingFaction) {
        this.controllingFaction = opposingFaction;
        this.faction = opposingFaction; // Update displayed faction
        // Give resource boon to reset station
        this.foodStock += 200;
        this.waterStock += 150;
        this.happiness = 60; // Reset to stable
        this.updateLabel(); // Update label to show new faction
        if (game && game.ui) {
          game.ui.showMessage(`${this.name} has been taken over by ${opposingFaction}!`, 'warning');
        }
      }
    }
  }

  checkPirateSpawning(game) {
    // Happiness-based pirate spawning - lower happiness = higher chance of pirates
    let spawnChance = 0;
    
    if (this.happiness < 30) {
      spawnChance = 0.02; // 2% chance per update when unhappy
    } else if (this.happiness < 50) {
      spawnChance = 0.005; // 0.5% chance when struggling
    }
    
    // Additional chance if station is in crisis or abandoned
    if (this.stationHealth === 'crisis') {
      spawnChance += 0.01; // Extra 1% chance
    } else if (this.stationHealth === 'abandoned') {
      spawnChance += 0.02; // Extra 2% chance
    }
    
    // Don't spawn too many pirates in one area
    const nearbyPirates = game.entities.pirates.filter(pirate => {
      const distance = pirate.mesh.position.distanceTo(this.mesh.position);
      return distance < 100; // Within 100 units of station
    });
    
    if (nearbyPirates.length >= 5) {
      spawnChance = 0; // Cap at 5 pirates per station area
    }
    
    if (Math.random() < spawnChance) {
      this.spawnSinglePirate(game);
    }
  }

  spawnSinglePirate(game) {
    // Spawn a single pirate near this station
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 50; // Spawn further out than takeover pirates
    const x = this.mesh.position.x + Math.cos(angle) * distance;
    const y = this.mesh.position.y + Math.sin(angle) * distance;
    
    const pirate = new Pirate(x, y);
    game.entities.pirates.push(pirate);
    game.scene.add(pirate.mesh);
    
    if (game && game.ui) {
      game.ui.showMessage(`Pirates spotted near ${this.name}!`, 'warning');
    }
  }

  spawnExtraPirates(game) {
    // Spawn 2-3 extra pirates near this station
    const pirateCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < pirateCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      const x = this.mesh.position.x + Math.cos(angle) * distance;
      const y = this.mesh.position.y + Math.sin(angle) * distance;
      
      const pirate = new Pirate(x, y);
      game.entities.pirates.push(pirate);
      game.scene.add(pirate.mesh);
    }
  }

  setStationColor(color) {
    // Update the station's light colors to reflect health
    this.mesh.children.forEach(child => {
      if (child.geometry && child.geometry.type === 'SphereGeometry') {
        child.material.color.setHex(color);
      }
    });
  }

  updateLabel() {
    // Update the station label to reflect current faction
    if (this.label && this.label.element) {
      const factionColorHex = this.factionColors[this.faction] ? `#${this.factionColors[this.faction].getHexString()}` : '#00ff88';
      this.label.element.innerHTML = `${this.name}<br><span style="font-size: 0.8em; color: ${factionColorHex};">${this.faction}</span>`;
    }
  }

  // Get adjusted prices based on station health
  getAdjustedPrice(basePrice, isBuying) {
    let multiplier = 1.0;
    
    switch(this.stationHealth) {
      case 'healthy':
        multiplier = 1.0; // Normal prices
        break;
      case 'struggling':
        multiplier = isBuying ? 1.2 : 0.8; // 20% worse for player
        break;
      case 'crisis':
        multiplier = isBuying ? 1.5 : 0.5; // 50% worse for player
        break;
      case 'abandoned':
        return null; // No trading with abandoned stations
    }
    
    return Math.floor(basePrice * multiplier);
  }
}

export class Pirate {
  constructor(x, y) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 15;
    this.health = 20;
    this.detectionRange = 80; // How close player needs to be for pirate to notice
    this.attackRange = 60;    // How close pirate needs to be to start shooting
    this.isAggro = false;     // Has the pirate been angered?
    this.patrolTarget = null; // For non-aggro movement
    this.patrolTimer = 0;     // Time until new patrol target
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Main hull - more angular/aggressive
    const hullGeometry = new THREE.ConeGeometry(0.8, 2.5, 3);
    const hullMaterial = new THREE.MeshBasicMaterial({ color: 0xaa2222 });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI / 2;
    group.add(hull);
    
    // Weapon pods
    const weaponGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.2);
    const weaponMaterial = new THREE.MeshBasicMaterial({ color: 0x881111 });
    
    const leftWeapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    leftWeapon.position.set(1, 0.6, 0);
    group.add(leftWeapon);
    
    const rightWeapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    rightWeapon.position.set(1, -0.6, 0);
    group.add(rightWeapon);
    
    return group;
  }

  update(deltaTime, playerPosition, game) { // Added game argument
    const dxPlayer = playerPosition.x - this.mesh.position.x;
    const dyPlayer = playerPosition.y - this.mesh.position.y;
    const distanceToPlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);
    if (!this.isAggro && distanceToPlayer < this.detectionRange) {
      this.isAggro = true; // Player came too close
      game.ui.showMessage('Pirate has spotted you!');
    }
    if (this.isAggro) {
      // Aggro behavior: chase and attack player
      let targetX = playerPosition.x;
      let targetY = playerPosition.y;
      
      // Try to maintain some distance while attacking
      if (distanceToPlayer < this.attackRange * 0.7) {
        targetX = this.mesh.position.x - dxPlayer; // Move away slightly
        targetY = this.mesh.position.y - dyPlayer;
      }
      const dx = targetX - this.mesh.position.x;
      const dy = targetY - this.mesh.position.y;
      const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
      if (distanceToTarget > 1) { // Avoid jittering when close
          this.velocity.x += (dx / distanceToTarget) * (this.maxSpeed * 1.2) * deltaTime; // Slightly faster when aggro
          this.velocity.y += (dy / distanceToTarget) * (this.maxSpeed * 1.2) * deltaTime;
      }
      // Pirate shooting logic (moved from game.js to pirate entity)
      if (distanceToPlayer < this.attackRange && Math.random() < 0.01) { // Increased fire rate when in range
        const angleToPlayer = Math.atan2(dyPlayer, dxPlayer);
        const projectile = new Projectile(
          this.mesh.position.x,
          this.mesh.position.y,
          angleToPlayer,
          false // isPlayerProjectile = false
        );
        game.entities.projectiles.push(projectile);
        game.scene.add(projectile.mesh);
      }
    } else {
      // Non-aggro behavior: patrol
      this.patrolTimer -= deltaTime;
      if (!this.patrolTarget || this.patrolTimer <= 0) {
        this.patrolTarget = new THREE.Vector2(
          this.mesh.position.x + (Math.random() - 0.5) * 100,
          this.mesh.position.y + (Math.random() - 0.5) * 100
        );
        this.patrolTimer = 5 + Math.random() * 5; // New target every 5-10 seconds
      }
      const dx = this.patrolTarget.x - this.mesh.position.x;
      const dy = this.patrolTarget.y - this.mesh.position.y;
      const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
      if (distanceToTarget > 5) { // Move towards patrol point
        this.velocity.x += (dx / distanceToTarget) * (this.maxSpeed * 0.5) * deltaTime; // Slower when patrolling
        this.velocity.y += (dy / distanceToTarget) * (this.maxSpeed * 0.5) * deltaTime;
      } else {
        this.patrolTarget = null; // Reached target
      }
    }
    
    // Apply drag and speed limit
    this.velocity.multiplyScalar(this.isAggro ? 0.96 : 0.93); // Slightly less drag when aggro
    const currentMaxSpeed = this.isAggro ? this.maxSpeed * 1.1 : this.maxSpeed * 0.7;
    if (this.velocity.length() > currentMaxSpeed) {
      this.velocity.normalize().multiplyScalar(currentMaxSpeed);
    }
    
    // Update position
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
    
    // Face movement direction or player if aggro
    if (this.isAggro && distanceToPlayer > 1) {
        const angleToPlayer = Math.atan2(dyPlayer, dxPlayer);
        this.mesh.rotation.z = angleToPlayer + Math.PI / 2;
    } else if (this.velocity.length() > 0.1) {
      const angle = Math.atan2(this.velocity.y, this.velocity.x);
      this.mesh.rotation.z = angle + Math.PI / 2;
    }
  }
  takeDamage(amount, game) { // Added game argument
    this.health -= amount;
    this.isAggro = true; // Getting shot makes them aggro
    if (this.health <= 0) {
      return true; // Pirate is destroyed
    }
    return false; // Pirate still alive
  }
}

export class Projectile {
  constructor(x, y, angle, isPlayerProjectile, weaponLevel = 1, isMainShot = true) {
    this.mesh = this.createMesh(isPlayerProjectile, weaponLevel, isMainShot);
    this.mesh.position.set(x, y, 0);
    const baseSpeed = 60;
    // Higher level projectiles might be faster or have different properties
    const speed = baseSpeed + (weaponLevel - 1) * 5; 
    this.velocity = new THREE.Vector2(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    this.life = 2.0 + (weaponLevel - 1) * 0.2; // Slightly longer life for higher levels
    this.isPlayerProjectile = isPlayerProjectile;
    this.weaponLevel = weaponLevel;
  }
  createMesh(isPlayerProjectile, weaponLevel, isMainShot) {
    let size = 0.2;
    let color = 0x00ff44; // Default player projectile color
    if (isPlayerProjectile) {
      size = 0.2 + (weaponLevel -1) * 0.05; // Main shot gets slightly bigger
      if (!isMainShot) size *= 0.7; // Side shots are smaller
      if (weaponLevel === 1) color = 0x00dd88; // Bright Green
      else if (weaponLevel === 2) color = 0x00ffff; // Cyan
      else if (weaponLevel === 3) color = 0xffee00; // Yellow
      else color = 0xff8800; // Orange for level 4+
    } else {
      // Enemy projectile
      color = 0xff4400; // Red
      size = 0.25; // Enemy projectiles slightly larger for visibility
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
    this.health = size * 20; // Health based on size
    this.resourceType = this.getRandomResourceType();
    this.resourceValue = this.getResourceValue(this.resourceType);
    
    // Make asteroids slowly rotate
    this.rotationSpeed = (Math.random() - 0.5) * 0.01;
    this.mesh.rotation.x = Math.random() * Math.PI * 2;
    this.mesh.rotation.y = Math.random() * Math.PI * 2;
  }
  createMesh() {
    const geometry = new THREE.IcosahedronGeometry(this.size, 0); // Low poly
    
    // Deform vertices for a more asteroid-like shape
    const positionAttribute = geometry.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
      const displacement = Math.random() * this.size * 0.3; // Adjust displacement factor
      vertex.normalize().multiplyScalar(this.size + displacement);
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals(); // Recalculate normals after deformation
    
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
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.targetZoneId = targetZoneId;
    this.destinationName = destinationName;
    this.label = this.createLabel(CSS2DObjectConstructor);
    this.mesh.add(this.label);
    this.interactionRadius = 15; // How close player needs to be to interact
  }
  createMesh() {
    const group = new THREE.Group();
    const geometry = new THREE.TorusGeometry(8, 1, 8, 24); // Larger ring
    const material = new THREE.MeshBasicMaterial({ color: 0xaa00ff, wireframe: true });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2; // Lay it flat
    group.add(ring);
    // Central pulsating light (visual effect)
    const lightCoreGeometry = new THREE.SphereGeometry(1, 8, 8);
    const lightCoreMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.5 });
    this.lightCore = new THREE.Mesh(lightCoreGeometry, lightCoreMaterial);
    group.add(this.lightCore);
    
    return group;
  }
  createLabel(CSS2DObjectConstructor) {
    const div = document.createElement('div');
    div.className = 'jumpgate-label'; // Use a different class if specific styling needed
    div.innerHTML = `Jump to: <span style="color: #ff00ff;">${this.destinationName}</span>`;
    div.style.fontFamily = "'Lucida Console', 'Courier New', monospace";
    div.style.color = '#00ffff'; // Cyan text
    div.style.fontSize = '14px';
    div.style.textAlign = 'center';
    div.style.textShadow = '1px 1px 2px black';
    div.style.backgroundColor = 'rgba(20, 0, 30, 0.7)'; // Dark purple background
    div.style.padding = '3px 7px';
    div.style.border = '1px solid rgba(255,0,255,0.5)';
    div.style.borderRadius = '3px';
    const label = new CSS2DObjectConstructor(div);
    label.position.set(0, 10, 0); // Position label above the gate
    return label;
  }
  update(deltaTime) {
    // Pulsate the light core for a simple visual effect
    if (this.lightCore) {
        this.lightCore.material.opacity = 0.5 + Math.sin(Date.now() * 0.002) * 0.2;
        const scale = 1 + Math.sin(Date.now() * 0.002) * 0.1;
        this.lightCore.scale.set(scale,scale,scale);
    }
    this.mesh.rotation.z += deltaTime * 0.05; // Slow rotation
  }
}
