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
    
    // NEW CARGO SYSTEM
    this.tier = Math.max(1, Math.floor(this.population / 1000)); // Tier based on population
    this.maxCargo = 100 + (this.tier * 100); // 100-500 based on tier
    this.cargoHold = new Map(); // Real cargo storage
    this.credits = 2000 + Math.floor(Math.random() * 3000); // 2k-5k starting credits
    
    // Station types
    const stationTypes = ['mining', 'agricultural', 'industrial', 'commercial', 'research'];
    this.stationType = stationTypes[Math.floor(Math.random() * stationTypes.length)];
    
    // Defense systems (unlocked by tier)
    this.defenseLevel = this.tier >= 3 ? Math.min(this.tier - 2, 3) : 0; // Tier 3+ get defenses
    this.defenseRange = this.defenseLevel > 0 ? 40 + (this.defenseLevel * 20) : 0;
    this.defenseDamage = this.defenseLevel > 0 ? 15 + (this.defenseLevel * 10) : 0;
    this.defenseFireRate = this.defenseLevel > 0 ? 0.5 - (this.defenseLevel * 0.1) : 0;
    this.lastDefenseShot = 0;
    
    // Governor AI
    this.governor = new StationGovernor(this);
    
    // Ship construction
    this.constructionQueue = [];
    this.ownedShips = [];
    
    // Assign production/consumption focus from the COMMODITIES_LIST
    const availableForProduction = COMMODITIES_LIST.filter(c => c.type === 'industrial' || c.type === 'consumer' || c.type === 'tech');
    this.productionFocus = availableForProduction[Math.floor(Math.random() * availableForProduction.length)].name;
    const availableForConsumption = COMMODITIES_LIST.filter(c => c.name !== this.productionFocus);
    this.consumptionFocus = availableForConsumption[Math.floor(Math.random() * availableForConsumption.length)].name;
    
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    
    // Initialize cargo hold with starting resources
    this.initializeCargo();
    
    // Legacy inventory system (will be phased out)
    this.inventory = {}; // Keep for compatibility during transition
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
    const stationTypeColors = {
      'mining': '#ffaa00',
      'agricultural': '#00ff00', 
      'industrial': '#ff6600',
      'commercial': '#00ffff',
      'research': '#aa00ff'
    };
    const typeColor = stationTypeColors[this.stationType] || '#ffffff';
    
    div.innerHTML = `${this.name}<br><span style="font-size: 0.7em; color: ${typeColor};">${this.stationType.toUpperCase()} STATION</span><br><span style="font-size: 0.8em; color: ${factionColorHex};">${this.faction}</span><br><span style="font-size: 0.6em; color: #888888;">Tier ${this.tier} | ${this.credits}cr</span>`;
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

  // Initialize cargo hold with starting resources based on station type
  initializeCargo() {
    const cargoByType = {
      mining: {
        'Iron Ore': 150,
        'Copper Ore': 100,
        'Food Rations': 100,
        'Water': 100,
        'Basic Tools': 50
      },
      agricultural: {
        'Food Rations': 300,
        'Seeds': 100,
        'Water': 200,
        'Basic Tools': 50,
        'Fertilizer': 75
      },
      industrial: {
        'Manufactured Goods': 200,
        'Iron Ore': 150,
        'Electronics': 100,
        'Basic Tools': 100,
        'Energy Cells': 50
      },
      commercial: {
        'Food Rations': 100,
        'Water': 100,
        'Electronics': 100,
        'Manufactured Goods': 100,
        'Luxury Items': 50
      },
      research: {
        'Advanced Tech': 50,
        'Rare Crystals': 75,
        'Electronics': 150,
        'Data Cores': 100,
        'Research Equipment': 25
      }
    };

    const startingCargo = cargoByType[this.stationType] || cargoByType.commercial;
    
    for (const [commodity, quantity] of Object.entries(startingCargo)) {
      this.cargoHold.set(commodity, quantity);
    }
  }

  // Calculate total wealth (credits + cargo value)
  calculateWealth() {
    let cargoValue = 0;
    for (const [commodity, quantity] of this.cargoHold.entries()) {
      const commodityData = COMMODITIES_LIST.find(c => c.name === commodity);
      if (commodityData) {
        cargoValue += quantity * commodityData.basePrice;
      }
    }
    return this.credits + cargoValue;
  }

  // Update station tier based on population
  updateTier() {
    const newTier = Math.max(1, Math.floor(this.population / 1000));
    if (newTier !== this.tier) {
      this.tier = newTier;
      this.maxCargo = 100 + (this.tier * 100);
      
      // Update defense systems
      this.defenseLevel = this.tier >= 3 ? Math.min(this.tier - 2, 3) : 0;
      this.defenseRange = this.defenseLevel > 0 ? 40 + (this.defenseLevel * 20) : 0;
      this.defenseDamage = this.defenseLevel > 0 ? 15 + (this.defenseLevel * 10) : 0;
      this.defenseFireRate = this.defenseLevel > 0 ? 0.5 - (this.defenseLevel * 0.1) : 0;
      
      // Add defense turrets to mesh if tier 3+
      if (this.defenseLevel > 0 && !this.defenseTurrets) {
        this.addDefenseTurrets();
      }
    }
  }

  // Add visual defense turrets to station
  addDefenseTurrets() {
    this.defenseTurrets = [];
    const turretCount = this.defenseLevel;
    
    for (let i = 0; i < turretCount; i++) {
      const angle = (i / turretCount) * Math.PI * 2;
      const turretGroup = new THREE.Group();
      
      // Turret base
      const baseGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 6);
      const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      turretGroup.add(base);
      
      // Turret barrel
      const barrelGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 6);
      const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
      const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(0.5, 0, 0.3);
      turretGroup.add(barrel);
      
      turretGroup.position.set(
        Math.cos(angle) * 5,
        Math.sin(angle) * 5,
        1
      );
      
      this.mesh.add(turretGroup);
      this.defenseTurrets.push(turretGroup);
    }
  }

  // Station defense system
  defendAgainstPirates(game, deltaTime) {
    if (this.defenseLevel === 0) return;
    
    const currentTime = Date.now();
    if (currentTime - this.lastDefenseShot < (this.defenseFireRate * 1000)) return;
    
    // Find pirates within range
    const nearbyPirates = game.entities.pirates.filter(pirate => {
      const distance = pirate.mesh.position.distanceTo(this.mesh.position);
      return distance < this.defenseRange;
    });
    
    if (nearbyPirates.length > 0) {
      // Target nearest pirate
      const target = nearbyPirates.reduce((nearest, pirate) => {
        const distanceToNearest = nearest.mesh.position.distanceTo(this.mesh.position);
        const distanceToPirate = pirate.mesh.position.distanceTo(this.mesh.position);
        return distanceToPirate < distanceToNearest ? pirate : nearest;
      });
      
      // Fire at target
      const dx = target.mesh.position.x - this.mesh.position.x;
      const dy = target.mesh.position.y - this.mesh.position.y;
      const angle = Math.atan2(dy, dx);
      
      const projectile = new Projectile(
        this.mesh.position.x,
        this.mesh.position.y,
        angle,
        false, // Not player projectile
        this.defenseLevel, // Weapon level based on defense level
        true
      );
      projectile.isStationDefense = true;
      projectile.damage = this.defenseDamage;
      
      game.entities.projectiles.push(projectile);
      game.scene.add(projectile.mesh);
      
      this.lastDefenseShot = currentTime;
      
      // Call for police backup if overwhelmed
      if (nearbyPirates.length >= 3) {
        this.callPoliceBackup(game);
      }
    }
  }

  // Call for police backup
  callPoliceBackup(game) {
    // Find friendly stations that can spawn police
    const friendlyStations = game.entities.stations.filter(station => 
      station.controllingFaction === this.controllingFaction &&
      station.happiness > 60 &&
      station.credits > 1000
    );
    
    friendlyStations.forEach(station => {
      if (Math.random() < 0.3) { // 30% chance each station responds
        station.spawnEmergencyPolice(game);
      }
    });
  }

  // Spawn emergency police
  spawnEmergencyPolice(game) {
    if (this.credits < 1000) return; // Can't afford
    
    this.credits -= 1000; // Cost to deploy emergency police
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 10;
    const x = this.mesh.position.x + Math.cos(angle) * distance;
    const y = this.mesh.position.y + Math.sin(angle) * distance;
    
    const police = new Police(x, y, game.entities.stations, this.controllingFaction);
    game.entities.police.push(police);
    game.scene.add(police.mesh);
    
    if (game.ui) {
      game.ui.showMessage(`${this.name} deployed emergency police!`, 'system-neutral');
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

// Station Governor AI System
export class StationGovernor {
  constructor(station) {
    this.station = station;
    this.lastDecisionTime = Date.now();
    this.decisionInterval = 60000; // Make decisions every 60 seconds
    this.priorities = [];
    this.recentPirateAttacks = 0;
    this.attackDecayTimer = 0;
  }

  update(deltaTime, game) {
    const currentTime = Date.now();
    
    // Decay recent pirate attacks over time
    this.attackDecayTimer -= deltaTime;
    if (this.attackDecayTimer <= 0) {
      this.recentPirateAttacks = Math.max(0, this.recentPirateAttacks - 1);
      this.attackDecayTimer = 30000; // Decay every 30 seconds
    }
    
    // Make decisions every 60 seconds
    if (currentTime - this.lastDecisionTime >= this.decisionInterval) {
      this.evaluateAndAct(game);
      this.lastDecisionTime = currentTime;
    }
  }

  evaluateAndAct(game) {
    this.priorities = this.evaluatePriorities(game);
    
    if (this.priorities.length > 0) {
      const topPriority = this.priorities[0];
      this.executeDecision(topPriority, game);
    }
  }

  evaluatePriorities(game) {
    const priorities = [];
    
    // CRITICAL: Survival needs (weight: 100)
    if (this.station.foodStock < 50) {
      priorities.push({type: 'EMERGENCY_FOOD', weight: 100, data: {needed: 200}});
    }
    if (this.station.waterStock < 30) {
      priorities.push({type: 'EMERGENCY_WATER', weight: 100, data: {needed: 150}});
    }
    
    // HIGH: Security threats (weight: 80)
    if (this.station.happiness < 40) {
      priorities.push({type: 'BUILD_POLICE', weight: 80, data: {cost: 1200}});
    }
    if (this.recentPirateAttacks > 2) {
      priorities.push({type: 'UPGRADE_DEFENSE', weight: 80, data: {cost: 2000}});
    }
    
    // MEDIUM: Economic opportunities (weight: 60)
    if (game) {
      const nearbyAsteroids = this.findNearbyAsteroids(game);
      if (nearbyAsteroids.length > 0 && this.station.credits > 800) {
        priorities.push({type: 'BUILD_MINER', weight: 60, data: {cost: 800, targets: nearbyAsteroids}});
      }
      
      const profitableRoutes = this.findProfitableTradeRoutes(game);
      if (profitableRoutes.length > 0 && this.station.credits > 600) {
        priorities.push({type: 'BUILD_TRADER', weight: 60, data: {cost: 600, routes: profitableRoutes}});
      }
    }
    
    // LOW: Growth investments (weight: 40)
    if (this.station.credits > 5000) {
      priorities.push({type: 'EXPAND_CARGO', weight: 40, data: {cost: 1000}});
    }
    if (this.station.tier >= 3 && this.station.defenseLevel === 0) {
      priorities.push({type: 'BUILD_DEFENSE', weight: 40, data: {cost: 2500}});
    }
    
    return priorities.sort((a, b) => b.weight - a.weight);
  }

  executeDecision(priority, game) {
    switch(priority.type) {
      case 'EMERGENCY_FOOD':
        this.requestEmergencySupplies(game, 'Food Rations', priority.data.needed);
        break;
      case 'EMERGENCY_WATER':
        this.requestEmergencySupplies(game, 'Water', priority.data.needed);
        break;
      case 'BUILD_POLICE':
        this.buildShip(game, 'police');
        break;
      case 'BUILD_MINER':
        this.buildShip(game, 'miner');
        break;
      case 'BUILD_TRADER':
        this.buildShip(game, 'trader');
        break;
      case 'BUILD_DEFENSE':
        this.upgradeDefenses();
        break;
    }
  }

  findNearbyAsteroids(gameInstance) {
    return gameInstance.entities.asteroids.filter(asteroid => {
      const distance = asteroid.mesh.position.distanceTo(this.station.mesh.position);
      return distance < 200; // Within 200 units
    });
  }

  findProfitableTradeRoutes(gameInstance) {
    // Simplified: just check if other stations need what we produce
    return gameInstance.entities.stations.filter(station => 
      station !== this.station &&
      station.consumptionFocus === this.station.productionFocus
    );
  }

  requestEmergencySupplies(game, commodity, amount) {
    // Try to buy from other stations
    const suppliers = game.entities.stations.filter(station => 
      station !== this.station &&
      station.cargoHold.has(commodity) &&
      station.cargoHold.get(commodity) > amount
    );
    
    if (suppliers.length > 0) {
      const supplier = suppliers[0];
      const cost = amount * 10; // Emergency pricing
      
      if (this.station.credits >= cost) {
        this.station.credits -= cost;
        supplier.credits += cost;
        supplier.cargoHold.set(commodity, supplier.cargoHold.get(commodity) - amount);
        
        if (commodity === 'Food Rations') {
          this.station.foodStock += amount;
        } else if (commodity === 'Water') {
          this.station.waterStock += amount;
        }
        
        if (game.ui) {
          game.ui.showMessage(`${this.station.name} purchased emergency ${commodity}`, 'ai-trade');
        }
      }
    }
  }

  buildShip(game, shipType) {
    const shipCosts = {
      police: { cost: 1200, materials: {'Weapons': 40, 'Armor': 35, 'Electronics': 25} },
      miner: { cost: 800, materials: {'Iron Ore': 50, 'Electronics': 25} },
      trader: { cost: 600, materials: {'Electronics': 30, 'Energy Cells': 20} }
    };
    
    const shipData = shipCosts[shipType];
    if (!shipData || this.station.credits < shipData.cost) return;
    
    // Check if we have required materials
    let canBuild = true;
    for (const [material, needed] of Object.entries(shipData.materials)) {
      if (!this.station.cargoHold.has(material) || this.station.cargoHold.get(material) < needed) {
        canBuild = false;
        break;
      }
    }
    
    if (canBuild) {
      // Deduct costs
      this.station.credits -= shipData.cost;
      for (const [material, needed] of Object.entries(shipData.materials)) {
        const current = this.station.cargoHold.get(material);
        this.station.cargoHold.set(material, current - needed);
      }
      
      // Add to construction queue
      this.station.constructionQueue.push({
        type: shipType,
        timeRemaining: shipType === 'police' ? 180 : shipType === 'miner' ? 120 : 90,
        totalTime: shipType === 'police' ? 180 : shipType === 'miner' ? 120 : 90
      });
      
      if (game.ui) {
        game.ui.showMessage(`${this.station.name} started building ${shipType}`, 'system-neutral');
      }
    }
  }

  upgradeDefenses() {
    if (this.station.credits >= 2500 && this.station.tier >= 3) {
      this.station.credits -= 2500;
      this.station.defenseLevel = Math.min(this.station.defenseLevel + 1, 3);
      this.station.defenseRange = 40 + (this.station.defenseLevel * 20);
      this.station.defenseDamage = 15 + (this.station.defenseLevel * 10);
      this.station.defenseFireRate = 0.5 - (this.station.defenseLevel * 0.1);
      
      if (!this.station.defenseTurrets) {
        this.station.addDefenseTurrets();
      }
    }
  }

  recordPirateAttack() {
    this.recentPirateAttacks++;
    this.attackDecayTimer = 30000; // Reset decay timer
  }
}

export class Police {
  constructor(x, y, stations, faction, squadMate = null) {
    this.mesh = this.createMesh(faction);
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 22; // Faster than enhanced pirates
    this.health = 40; // More health for survivability
    this.faction = faction;
    this.stations = stations;
    this.currentTargetStation = null;
    this.patrolState = 'traveling'; // 'traveling', 'circling'
    this.circleCount = 0;
    this.maxCircles = 2 + Math.floor(Math.random() * 2); // 2-3 circles
    this.circleAngle = 0;
    this.circleRadius = 25;
    this.detectionRange = 120; // Better detection than pirates
    this.attackRange = 80; // Longer attack range
    this.squadMate = squadMate; // Reference to partner
    this.formationOffset = squadMate ? new THREE.Vector2(15, 0) : new THREE.Vector2(-15, 0);
    this.lastShotTime = 0;
    this.fireRate = 600; // Faster firing than pirates
    this.pursuitTarget = null; // Current combat target
    this.selectNextStation();
  }

  createMesh(faction) {
    const group = new THREE.Group();
    
    // Main hull - sleek police design
    const hullGeometry = new THREE.ConeGeometry(0.6, 3, 4);
    const factionColors = {
      'Federated Commerce Guild': 0x0088ff, // Blue
      'Outer Rim Prospectors': 0xffaa00,   // Orange
    };
    const hullColor = factionColors[faction] || 0x00aaff;
    const hullMaterial = new THREE.MeshBasicMaterial({ color: hullColor });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI / 2;
    group.add(hull);
    
    // Police lights
    const lightGeometry = new THREE.SphereGeometry(0.15, 6, 6);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const leftLight = new THREE.Mesh(lightGeometry, lightMaterial);
    leftLight.position.set(0.5, 0.4, 0);
    group.add(leftLight);
    
    const rightLight = new THREE.Mesh(lightGeometry, lightMaterial);
    rightLight.position.set(0.5, -0.4, 0);
    group.add(rightLight);
    
    // Weapon mount
    const weaponGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.2);
    const weaponMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapon.position.set(1.2, 0, 0);
    group.add(weapon);
    
    return group;
  }

  selectNextStation() {
    if (this.stations.length === 0) return;
    
    // Filter stations controlled by the same faction
    const friendlyStations = this.stations.filter(station => 
      station.controllingFaction === this.faction
    );
    
    if (friendlyStations.length === 0) {
      // No friendly stations, pick any station
      this.currentTargetStation = this.stations[Math.floor(Math.random() * this.stations.length)];
    } else {
      // Pick a random friendly station, but not the current one
      const availableStations = friendlyStations.filter(station => 
        station !== this.currentTargetStation
      );
      if (availableStations.length > 0) {
        this.currentTargetStation = availableStations[Math.floor(Math.random() * availableStations.length)];
      } else {
        this.currentTargetStation = friendlyStations[0];
      }
    }
    
    this.patrolState = 'traveling';
    this.circleCount = 0;
    this.maxCircles = 2 + Math.floor(Math.random() * 2);
  }

  update(deltaTime, game) {
    // Enhanced pirate detection with priority targeting
    const nearbyPirates = this.findNearbyThreats(game);
    
    if (nearbyPirates.length > 0) {
      // Always engage in combat when pirates are detected
      const target = this.selectBestTarget(nearbyPirates);
      this.attackPirate(target, game, deltaTime);
      return; // Skip normal patrol behavior when in combat
    }

    // Normal patrol behavior - simplified and more reliable
    if (!this.currentTargetStation) {
      this.selectNextStation();
      return;
    }

    const stationPos = this.currentTargetStation.mesh.position;
    const distanceToStation = this.mesh.position.distanceTo(stationPos);

    if (this.patrolState === 'traveling') {
      if (distanceToStation < this.circleRadius + 10) {
        // Arrived at station, start circling
        this.patrolState = 'circling';
        this.circleAngle = Math.atan2(
          this.mesh.position.y - stationPos.y,
          this.mesh.position.x - stationPos.x
        );
      } else {
        // Travel directly to station
        const dx = stationPos.x - this.mesh.position.x;
        const dy = stationPos.y - this.mesh.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.velocity.x += (dx / distance) * this.maxSpeed * deltaTime * 2;
        this.velocity.y += (dy / distance) * this.maxSpeed * deltaTime * 2;
      }
    } else if (this.patrolState === 'circling') {
      // Circle around the station
      this.circleAngle += deltaTime * 1.2; // Faster circling
      
      const targetX = stationPos.x + Math.cos(this.circleAngle) * this.circleRadius;
      const targetY = stationPos.y + Math.sin(this.circleAngle) * this.circleRadius;
      
      const dx = targetX - this.mesh.position.x;
      const dy = targetY - this.mesh.position.y;
      
      this.velocity.x += dx * deltaTime * 4;
      this.velocity.y += dy * deltaTime * 4;
      
      // Check if completed a circle
      if (this.circleAngle > Math.PI * 2 * (this.circleCount + 1)) {
        this.circleCount++;
        if (this.circleCount >= this.maxCircles) {
          // Done circling, select next station
          this.selectNextStation();
        }
      }
    }

    // Apply drag and speed limit
    this.velocity.multiplyScalar(0.92);
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }
    
    // Update position
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
    
    // Face movement direction
    if (this.velocity.length() > 0.1) {
      const angle = Math.atan2(this.velocity.y, this.velocity.x);
      this.mesh.rotation.z = angle + Math.PI / 2;
    }
  }

  findNearbyThreats(game) {
    return game.entities.pirates.filter(pirate => {
      const distance = pirate.mesh.position.distanceTo(this.mesh.position);
      return distance < this.detectionRange;
    }).map(pirate => ({
      pirate: pirate,
      distance: pirate.mesh.position.distanceTo(this.mesh.position),
      threatLevel: pirate.threatLevel || 1,
      health: pirate.health
    }));
  }

  selectBestTarget(threats) {
    // Prioritize: 1. Closest high-threat, 2. Lowest health, 3. Closest
    return threats.reduce((best, current) => {
      const bestScore = (best.threatLevel * 2) + (1 / best.distance) + (1 / best.health);
      const currentScore = (current.threatLevel * 2) + (1 / current.distance) + (1 / current.health);
      return currentScore > bestScore ? current : best;
    }).pirate;
  }

  coordinatedAttack(threats, game, deltaTime) {
    // Coordinate target selection with squad mate
    const target = this.selectBestTarget(threats);
    
    // Check if squad mate is targeting the same pirate
    if (this.squadMate.pursuitTarget === target) {
      // Both targeting same pirate - use flanking maneuvers
      this.flankingAttack(target, game, deltaTime);
    } else {
      // Different targets or squad mate not in combat
      this.pursuitTarget = target;
      this.attackPirate(target, game, deltaTime);
    }
  }

  flankingAttack(target, game, deltaTime) {
    const dx = target.mesh.position.x - this.mesh.position.x;
    const dy = target.mesh.position.y - this.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate flanking position (90 degrees from squad mate's approach)
    const squadMateAngle = Math.atan2(
      target.mesh.position.y - this.squadMate.mesh.position.y,
      target.mesh.position.x - this.squadMate.mesh.position.x
    );
    const flankAngle = squadMateAngle + (this.formationOffset.x > 0 ? Math.PI / 2 : -Math.PI / 2);
    
    // Move to flanking position
    const flankDistance = this.attackRange * 0.8;
    const flankX = target.mesh.position.x + Math.cos(flankAngle) * flankDistance;
    const flankY = target.mesh.position.y + Math.sin(flankAngle) * flankDistance;
    
    const flankDx = flankX - this.mesh.position.x;
    const flankDy = flankY - this.mesh.position.y;
    const flankDistanceToPos = Math.sqrt(flankDx * flankDx + flankDy * flankDy);
    
    if (flankDistanceToPos > 5) {
      // Move to flanking position
      this.velocity.x += (flankDx / flankDistanceToPos) * this.maxSpeed * 1.2 * deltaTime;
      this.velocity.y += (flankDy / flankDistanceToPos) * this.maxSpeed * 1.2 * deltaTime;
    }
    
    // Fire when in position and in range
    if (distance < this.attackRange && flankDistanceToPos < 10) {
      this.fireAtTarget(target, game);
    }
    
    // Face the target
    const angleToTarget = Math.atan2(dy, dx);
    this.mesh.rotation.z = angleToTarget + Math.PI / 2;
  }

  maintainFormation(deltaTime) {
    if (!this.squadMate) return;
    
    const desiredX = this.squadMate.mesh.position.x + this.formationOffset.x;
    const desiredY = this.squadMate.mesh.position.y + this.formationOffset.y;
    
    const dx = desiredX - this.mesh.position.x;
    const dy = desiredY - this.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only adjust if too far from formation position
    if (distance > 20) {
      this.velocity.x += (dx / distance) * this.maxSpeed * 0.3 * deltaTime;
      this.velocity.y += (dy / distance) * this.maxSpeed * 0.3 * deltaTime;
    }
  }

  fireAtTarget(target, game) {
    const currentTime = Date.now();
    if (currentTime - this.lastShotTime < this.fireRate) return;
    
    const dx = target.mesh.position.x - this.mesh.position.x;
    const dy = target.mesh.position.y - this.mesh.position.y;
    const angleToTarget = Math.atan2(dy, dx);
    
    // Police fire more accurate, powerful shots
    const projectile = new Projectile(
      this.mesh.position.x,
      this.mesh.position.y,
      angleToTarget,
      false, // Not player projectile
      3, // High weapon level
      true
    );
    projectile.isPoliceProjectile = true;
    projectile.damage = 20; // High damage
    projectile.targetPirate = target; // Track target for hit confirmation
    
    game.entities.projectiles.push(projectile);
    game.scene.add(projectile.mesh);
    
    this.lastShotTime = currentTime;
  }

  attackPirate(pirate, game, deltaTime) {
    const dx = pirate.mesh.position.x - this.mesh.position.x;
    const dy = pirate.mesh.position.y - this.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Aggressive pursuit - move directly towards pirate
    this.velocity.x += (dx / distance) * this.maxSpeed * 1.5 * deltaTime;
    this.velocity.y += (dy / distance) * this.maxSpeed * 1.5 * deltaTime;
    
    // Enhanced shooting with time-based firing
    const currentTime = Date.now();
    if (distance < this.attackRange && currentTime - this.lastShotTime >= this.fireRate) {
      const angleToTarget = Math.atan2(dy, dx);
      
      // Fire multiple shots for better hit chance
      for (let i = 0; i < 2; i++) {
        const spreadAngle = (i - 0.5) * 0.1; // Small spread
        const projectile = new Projectile(
          this.mesh.position.x,
          this.mesh.position.y,
          angleToTarget + spreadAngle,
          false, // Not player projectile
          3, // High weapon level
          true
        );
        projectile.isPoliceProjectile = true;
        projectile.damage = 25; // High damage to ensure kills
        game.entities.projectiles.push(projectile);
        game.scene.add(projectile.mesh);
      }
      
      this.lastShotTime = currentTime;
    }
    
    // Face the target
    const angleToTarget = Math.atan2(dy, dx);
    this.mesh.rotation.z = angleToTarget + Math.PI / 2;
  }

  takeDamage(amount) {
    this.health -= amount;
    return this.health <= 0;
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
    
    // Check for nearby friendly ships to attack
    let nearestTarget = null;
    let nearestDistance = Infinity;
    
    // Check player
    if (distanceToPlayer < this.detectionRange) {
      nearestTarget = { position: playerPosition, type: 'player' };
      nearestDistance = distanceToPlayer;
    }
    
    // Check friendly ships
    if (game.entities.friendlyShips) {
      game.entities.friendlyShips.forEach(friendlyShip => {
        const dx = friendlyShip.mesh.position.x - this.mesh.position.x;
        const dy = friendlyShip.mesh.position.y - this.mesh.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.detectionRange && distance < nearestDistance) {
          nearestTarget = { position: friendlyShip.mesh.position, type: 'friendly', ship: friendlyShip };
          nearestDistance = distance;
        }
      });
    }
    
    if (nearestTarget && !this.isAggro) {
      this.isAggro = true; // Target detected
      if (nearestTarget.type === 'player') {
        game.ui.showMessage('Pirate has spotted you!');
      } else {
        game.ui.showMessage('Pirate attacking friendly ship!', 'warning');
      }
    }
    if (this.isAggro && nearestTarget) {
      // Aggro behavior: chase and attack nearest target
      let targetX = nearestTarget.position.x;
      let targetY = nearestTarget.position.y;
      const targetDistance = nearestDistance;
      
      // Try to maintain some distance while attacking
      if (targetDistance < this.attackRange * 0.7) {
        const dx = nearestTarget.position.x - this.mesh.position.x;
        const dy = nearestTarget.position.y - this.mesh.position.y;
        targetX = this.mesh.position.x - dx; // Move away slightly
        targetY = this.mesh.position.y - dy;
      }
      const dx = targetX - this.mesh.position.x;
      const dy = targetY - this.mesh.position.y;
      const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
      if (distanceToTarget > 1) { // Avoid jittering when close
          this.velocity.x += (dx / distanceToTarget) * (this.maxSpeed * 1.2) * deltaTime; // Slightly faster when aggro
          this.velocity.y += (dy / distanceToTarget) * (this.maxSpeed * 1.2) * deltaTime;
      }
      
      // Pirate shooting logic - shoot at nearest target
      if (targetDistance < this.attackRange && Math.random() < 0.01) { // Increased fire rate when in range
        const angleToTarget = Math.atan2(nearestTarget.position.y - this.mesh.position.y, nearestTarget.position.x - this.mesh.position.x);
        const projectile = new Projectile(
          this.mesh.position.x,
          this.mesh.position.y,
          angleToTarget,
          false // isPlayerProjectile = false
        );
        projectile.targetType = nearestTarget.type; // Mark what type of target this projectile is aimed at
        game.entities.projectiles.push(projectile);
        game.scene.add(projectile.mesh);
      }
      
      // Face the target
      if (targetDistance > 1) {
        const angleToTarget = Math.atan2(nearestTarget.position.y - this.mesh.position.y, nearestTarget.position.x - this.mesh.position.x);
        this.mesh.rotation.z = angleToTarget + Math.PI / 2;
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
export class MiningShip {
  constructor(x, y, asteroids, homeStation) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 15;
    this.health = 20;
    this.cargoHold = [];
    this.maxCargo = 15;
    this.homeStation = homeStation;
    this.asteroids = asteroids;
    this.currentTarget = null;
    this.state = 'seeking'; // 'seeking', 'mining', 'returning'
    this.miningTimer = 0;
    this.miningDuration = 3; // 3 seconds to mine an asteroid
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Main hull - industrial design
    const hullGeometry = new THREE.BoxGeometry(2.5, 1.5, 0.8);
    const hullMaterial = new THREE.MeshBasicMaterial({ color: 0xaa6600 }); // Orange/brown
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    group.add(hull);
    
    // Mining equipment
    const drillGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6);
    const drillMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const drill = new THREE.Mesh(drillGeometry, drillMaterial);
    drill.rotation.z = Math.PI / 2;
    drill.position.set(1.5, 0, 0);
    group.add(drill);
    
    // Cargo containers
    const cargoGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.6);
    const cargoMaterial = new THREE.MeshBasicMaterial({ color: 0x884400 });
    
    const leftCargo = new THREE.Mesh(cargoGeometry, cargoMaterial);
    leftCargo.position.set(-0.8, 0.6, 0);
    group.add(leftCargo);
    
    const rightCargo = new THREE.Mesh(cargoGeometry, cargoMaterial);
    rightCargo.position.set(-0.8, -0.6, 0);
    group.add(rightCargo);
    
    return group;
  }

  update(deltaTime) {
    switch(this.state) {
      case 'seeking':
        this.seekAsteroid();
        break;
      case 'mining':
        this.mineAsteroid(deltaTime);
        break;
      case 'returning':
        this.returnToStation(deltaTime);
        break;
    }
    
    // Apply movement
    this.velocity.multiplyScalar(0.95);
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }
    
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
    
    // Face movement direction
    if (this.velocity.length() > 0.1) {
      const angle = Math.atan2(this.velocity.y, this.velocity.x);
      this.mesh.rotation.z = angle + Math.PI / 2;
    }
  }

  seekAsteroid() {
    // Find nearest asteroid
    let nearestAsteroid = null;
    let nearestDistance = Infinity;
    
    this.asteroids.forEach(asteroid => {
      const distance = asteroid.mesh.position.distanceTo(this.mesh.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestAsteroid = asteroid;
      }
    });
    
    if (nearestAsteroid) {
      this.currentTarget = nearestAsteroid;
      
      // Move towards asteroid
      const dx = nearestAsteroid.mesh.position.x - this.mesh.position.x;
      const dy = nearestAsteroid.mesh.position.y - this.mesh.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 8) {
        // Close enough to start mining
        this.state = 'mining';
        this.miningTimer = 0;
        this.velocity.set(0, 0);
      } else {
        // Move towards asteroid
        this.velocity.x += (dx / distance) * this.maxSpeed * 0.02;
        this.velocity.y += (dy / distance) * this.maxSpeed * 0.02;
      }
    } else if (this.cargoHold.length > 0) {
      // No asteroids left, return to station
      this.state = 'returning';
    }
  }

  mineAsteroid(deltaTime) {
    if (!this.currentTarget) {
      this.state = 'seeking';
      return;
    }
    
    this.miningTimer += deltaTime;
    
    if (this.miningTimer >= this.miningDuration) {
      // Mining complete
      if (this.cargoHold.length < this.maxCargo) {
        this.cargoHold.push({
          name: this.currentTarget.resourceType,
          quantity: 1,
          value: this.currentTarget.resourceValue
        });
      }
      
      // Damage the asteroid
      this.currentTarget.health -= 30;
      
      if (this.currentTarget.health <= 0) {
        // Asteroid destroyed, remove from asteroids array
        const index = this.asteroids.indexOf(this.currentTarget);
        if (index > -1) {
          this.asteroids.splice(index, 1);
        }
      }
      
      this.currentTarget = null;
      
      if (this.cargoHold.length >= this.maxCargo) {
        this.state = 'returning';
      } else {
        this.state = 'seeking';
      }
    }
  }

  returnToStation(deltaTime) {
    if (!this.homeStation) {
      this.state = 'seeking';
      return;
    }
    
    const dx = this.homeStation.mesh.position.x - this.mesh.position.x;
    const dy = this.homeStation.mesh.position.y - this.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 15) {
      // Reached station, unload cargo
      this.cargoHold.forEach(cargo => {
        if (this.homeStation.cargoHold.has(cargo.name)) {
          const current = this.homeStation.cargoHold.get(cargo.name);
          this.homeStation.cargoHold.set(cargo.name, current + cargo.quantity);
        } else {
          this.homeStation.cargoHold.set(cargo.name, cargo.quantity);
        }
        this.homeStation.credits += Math.floor(cargo.value * 0.8); // Station gets 80% of value
      });
      
      this.cargoHold = [];
      this.state = 'seeking';
    } else {
      // Move towards station
      this.velocity.x += (dx / distance) * this.maxSpeed * 0.02;
      this.velocity.y += (dy / distance) * this.maxSpeed * 0.02;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    return this.health <= 0;
  }
}

export class PirateStation {
  constructor(x, y, CSS2DObjectConstructor) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.credits = 500 + Math.floor(Math.random() * 1000); // 500-1500 starting credits
    this.spawnCost = 200; // Cost to spawn a pirate
    this.killReward = 100; // Credits earned per kill
    this.lastSpawnTime = Date.now();
    this.spawnInterval = 30000; // Spawn every 30 seconds if affordable
    this.threatLevel = 1; // Escalates based on success
    this.totalKills = 0; // Track total kills for threat escalation
    this.label = this.createLabel(CSS2DObjectConstructor);
    this.mesh.add(this.label);
    this.maxPirates = 8; // Maximum pirates this station can support
    this.ownedPirates = []; // Track pirates spawned by this station
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Main structure - more menacing than regular stations
    const coreGeometry = new THREE.CylinderGeometry(4, 4, 1.5, 6);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x440000 });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);
    
    // Weapon platforms
    const weaponGeometry = new THREE.BoxGeometry(1, 1, 0.5);
    const weaponMaterial = new THREE.MeshBasicMaterial({ color: 0x660000 });
    
    for (let i = 0; i < 6; i++) {
      const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
      const angle = (i / 6) * Math.PI * 2;
      weapon.position.set(Math.cos(angle) * 5, Math.sin(angle) * 5, 0.5);
      group.add(weapon);
    }
    
    // Pirate lights - red and menacing
    const lightGeometry = new THREE.SphereGeometry(0.3, 6, 6);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    for (let i = 0; i < 8; i++) {
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      const angle = (i / 8) * Math.PI * 2;
      light.position.set(Math.cos(angle) * 4.5, Math.sin(angle) * 4.5, 1);
      group.add(light);
    }
    
    return group;
  }

  createLabel(CSS2DObjectConstructor) {
    const div = document.createElement('div');
    div.className = 'pirate-station-label';
    div.innerHTML = `PIRATE OUTPOST<br><span style="font-size: 0.7em; color: #ff4444;">Threat Level ${this.threatLevel}</span><br><span style="font-size: 0.6em; color: #ff8888;">${this.credits}cr | Kills: ${this.totalKills}</span>`;
    div.style.fontFamily = "'Lucida Console', 'Courier New', monospace";
    div.style.color = '#ff0000';
    div.style.fontSize = '12px';
    div.style.textAlign = 'center';
    div.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
    div.style.backgroundColor = 'rgba(60, 0, 0, 0.7)';
    div.style.padding = '2px 4px';
    div.style.border = '1px solid rgba(255,0,0,0.5)';
    div.style.borderRadius = '2px';
    
    const label = new CSS2DObjectConstructor(div);
    label.position.set(0, 6, 0);
    return label;
  }

  update(deltaTime, game) {
    const currentTime = Date.now();
    
    // Clean up destroyed pirates from owned list
    this.ownedPirates = this.ownedPirates.filter(pirate => 
      game.entities.pirates.includes(pirate) && pirate.health > 0
    );
    
    // Spawn new pirates if we can afford it and have capacity
    if (currentTime - this.lastSpawnTime >= this.spawnInterval && 
        this.credits >= this.spawnCost && 
        this.ownedPirates.length < this.maxPirates) {
      this.spawnPirate(game);
      this.lastSpawnTime = currentTime;
    }
    
    // Update label with current stats
    this.updateLabel();
  }

  spawnPirate(game) {
    this.credits -= this.spawnCost;
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 30;
    const x = this.mesh.position.x + Math.cos(angle) * distance;
    const y = this.mesh.position.y + Math.sin(angle) * distance;
    
    // Create enhanced pirate based on threat level
    const pirate = new EnhancedPirate(x, y, this.threatLevel, this);
    this.ownedPirates.push(pirate);
    game.entities.pirates.push(pirate);
    game.scene.add(pirate.mesh);
    
    if (game.ui) {
      game.ui.showMessage(`Pirate station deployed raider!`, 'combat');
    }
  }

  recordKill(credits) {
    this.credits += credits;
    this.totalKills++;
    
    // Escalate threat level based on kills
    const newThreatLevel = Math.min(5, Math.floor(this.totalKills / 10) + 1);
    if (newThreatLevel > this.threatLevel) {
      this.threatLevel = newThreatLevel;
      this.maxPirates += 2; // More pirates per threat level
      this.spawnInterval = Math.max(15000, this.spawnInterval - 3000); // Faster spawning
    }
  }

  updateLabel() {
    if (this.label && this.label.element) {
      this.label.element.innerHTML = `PIRATE OUTPOST<br><span style="font-size: 0.7em; color: #ff4444;">Threat Level ${this.threatLevel}</span><br><span style="font-size: 0.6em; color: #ff8888;">${this.credits}cr | Kills: ${this.totalKills}</span>`;
    }
  }

  takeDamage(amount) {
    // Pirate stations are tough but can be destroyed
    if (!this.health) this.health = 200 + (this.threatLevel * 100);
    this.health -= amount;
    return this.health <= 0;
  }
}

export class EnhancedPirate {
  constructor(x, y, threatLevel = 1, homeStation = null) {
    this.mesh = this.createMesh(threatLevel);
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 12 + (threatLevel * 2); // Faster at higher threat levels
    this.health = 12 + (threatLevel * 3); // More health at higher threat levels
    this.detectionRange = 80 + (threatLevel * 10);
    this.attackRange = 55 + (threatLevel * 5);
    this.isAggro = false;
    this.patrolTarget = null;
    this.patrolTimer = 0;
    this.threatLevel = threatLevel;
    this.homeStation = homeStation;
    this.squadMates = []; // For group coordination
    this.retreatThreshold = 0.3; // Retreat when health drops below 30%
    this.isRetreating = false;
    this.lastShotTime = 0;
    this.fireRate = Math.max(800, 1200 - (threatLevel * 100)); // Faster firing at higher levels
  }

  createMesh(threatLevel) {
    const group = new THREE.Group();
    
    // Hull gets more aggressive looking with threat level
    const hullSize = 0.6 + (threatLevel * 0.1);
    const hullGeometry = new THREE.ConeGeometry(hullSize, 2.5 + (threatLevel * 0.3), 3);
    const hullColor = threatLevel >= 3 ? 0xaa1111 : 0xaa2222; // Darker red for higher threat
    const hullMaterial = new THREE.MeshBasicMaterial({ color: hullColor });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI / 2;
    group.add(hull);
    
    // More weapons for higher threat levels
    const weaponCount = Math.min(4, 2 + Math.floor(threatLevel / 2));
    const weaponGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.2);
    const weaponMaterial = new THREE.MeshBasicMaterial({ color: 0x881111 });
    
    for (let i = 0; i < weaponCount; i++) {
      const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
      const side = i % 2 === 0 ? 1 : -1;
      const offset = Math.floor(i / 2) * 0.3;
      weapon.position.set(1 + offset, side * (0.6 + offset), 0);
      group.add(weapon);
    }
    
    // Elite pirates get special markings
    if (threatLevel >= 4) {
      const eliteGeometry = new THREE.SphereGeometry(0.2, 6, 6);
      const eliteMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const eliteMarker = new THREE.Mesh(eliteGeometry, eliteMaterial);
      eliteMarker.position.set(0, 0, 0.5);
      group.add(eliteMarker);
    }
    
    return group;
  }

  update(deltaTime, playerPosition, game) {
    // Check if we should retreat
    if (!this.isRetreating && this.health < (12 + (this.threatLevel * 3)) * this.retreatThreshold) {
      this.isRetreating = true;
      if (game.ui) {
        game.ui.showMessage('Pirate retreating!', 'combat');
      }
    }

    // Retreat behavior
    if (this.isRetreating && this.homeStation) {
      const dx = this.homeStation.mesh.position.x - this.mesh.position.x;
      const dy = this.homeStation.mesh.position.y - this.mesh.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 30) {
        // Reached home station - remove this pirate
        const index = game.entities.pirates.indexOf(this);
        if (index > -1) {
          game.entities.pirates.splice(index, 1);
          game.scene.remove(this.mesh);
        }
        return;
      }
      
      this.velocity.x += (dx / distance) * this.maxSpeed * deltaTime;
      this.velocity.y += (dy / distance) * this.maxSpeed * deltaTime;
      this.applyMovement(deltaTime);
      return;
    }

    // Enhanced target detection
    const targets = this.findTargets(game, playerPosition);
    let nearestTarget = null;
    let nearestDistance = Infinity;

    targets.forEach(target => {
      if (target.distance < this.detectionRange && target.distance < nearestDistance) {
        nearestTarget = target;
        nearestDistance = target.distance;
      }
    });

    if (nearestTarget && !this.isAggro) {
      this.isAggro = true;
      if (nearestTarget.type === 'player') {
        game.ui.showMessage('Elite pirate has spotted you!', 'combat');
      }
    }

    if (this.isAggro && nearestTarget) {
      this.combatBehavior(nearestTarget, game, deltaTime);
    } else {
      this.patrolBehavior(deltaTime);
    }

    this.applyMovement(deltaTime);
  }

  findTargets(game, playerPosition) {
    const targets = [];
    
    // Check player
    const playerDistance = this.mesh.position.distanceTo(new THREE.Vector3(playerPosition.x, playerPosition.y, 0));
    targets.push({ position: playerPosition, type: 'player', distance: playerDistance });
    
    // Check friendly ships
    game.entities.friendlyShips.forEach(ship => {
      const distance = this.mesh.position.distanceTo(ship.mesh.position);
      targets.push({ position: ship.mesh.position, type: 'friendly', ship: ship, distance: distance });
    });
    
    // Check police
    game.entities.police.forEach(police => {
      const distance = this.mesh.position.distanceTo(police.mesh.position);
      targets.push({ position: police.mesh.position, type: 'police', ship: police, distance: distance });
    });
    
    return targets;
  }

  combatBehavior(target, game, deltaTime) {
    const dx = target.position.x - this.mesh.position.x;
    const dy = target.position.y - this.mesh.position.y;
    const distance = target.distance;
    
    // Advanced combat maneuvering
    if (distance < this.attackRange * 0.6) {
      // Too close - back away while shooting
      this.velocity.x -= (dx / distance) * this.maxSpeed * 0.5 * deltaTime;
      this.velocity.y -= (dy / distance) * this.maxSpeed * 0.5 * deltaTime;
    } else if (distance > this.attackRange) {
      // Too far - close in
      this.velocity.x += (dx / distance) * this.maxSpeed * 1.2 * deltaTime;
      this.velocity.y += (dy / distance) * this.maxSpeed * 1.2 * deltaTime;
    } else {
      // Optimal range - strafe
      const strafeAngle = Math.atan2(dy, dx) + Math.PI / 2;
      this.velocity.x += Math.cos(strafeAngle) * this.maxSpeed * 0.8 * deltaTime;
      this.velocity.y += Math.sin(strafeAngle) * this.maxSpeed * 0.8 * deltaTime;
    }
    
    // Enhanced shooting
    const currentTime = Date.now();
    if (distance < this.attackRange && currentTime - this.lastShotTime >= this.fireRate) {
      this.fireWeapon(target, game);
      this.lastShotTime = currentTime;
    }
    
    // Face the target
    const angleToTarget = Math.atan2(dy, dx);
    this.mesh.rotation.z = angleToTarget + Math.PI / 2;
  }

  fireWeapon(target, game) {
    const angleToTarget = Math.atan2(
      target.position.y - this.mesh.position.y,
      target.position.x - this.mesh.position.x
    );
    
    // Higher threat level pirates fire multiple shots
    const shotCount = Math.min(3, Math.floor(this.threatLevel / 2) + 1);
    
    for (let i = 0; i < shotCount; i++) {
      const spreadAngle = (i - Math.floor(shotCount / 2)) * 0.2; // Spread shots
      const projectile = new Projectile(
        this.mesh.position.x,
        this.mesh.position.y,
        angleToTarget + spreadAngle,
        false,
        this.threatLevel
      );
      projectile.targetType = target.type;
      projectile.damage = 8 + (this.threatLevel * 2);
      projectile.pirateOwner = this; // Track which pirate fired this
      game.entities.projectiles.push(projectile);
      game.scene.add(projectile.mesh);
    }
  }

  patrolBehavior(deltaTime) {
    this.patrolTimer -= deltaTime;
    if (!this.patrolTarget || this.patrolTimer <= 0) {
      this.patrolTarget = new THREE.Vector2(
        this.mesh.position.x + (Math.random() - 0.5) * 150,
        this.mesh.position.y + (Math.random() - 0.5) * 150
      );
      this.patrolTimer = 8 + Math.random() * 4;
    }
    
    const dx = this.patrolTarget.x - this.mesh.position.x;
    const dy = this.patrolTarget.y - this.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      this.velocity.x += (dx / distance) * (this.maxSpeed * 0.4) * deltaTime;
      this.velocity.y += (dy / distance) * (this.maxSpeed * 0.4) * deltaTime;
    } else {
      this.patrolTarget = null;
    }
  }

  applyMovement(deltaTime) {
    // Apply drag and speed limit
    this.velocity.multiplyScalar(this.isAggro ? 0.96 : 0.93);
    const currentMaxSpeed = this.isAggro ? this.maxSpeed * 1.1 : this.maxSpeed * 0.6;
    if (this.velocity.length() > currentMaxSpeed) {
      this.velocity.normalize().multiplyScalar(currentMaxSpeed);
    }
    
    // Update position
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
    
    // Face movement direction when not in combat
    if (!this.isAggro && this.velocity.length() > 0.1) {
      const angle = Math.atan2(this.velocity.y, this.velocity.x);
      this.mesh.rotation.z = angle + Math.PI / 2;
    }
  }

  takeDamage(amount, game) {
    this.health -= amount;
    this.isAggro = true;
    
    if (this.health <= 0) {
      // Award credits to pirate station
      if (this.homeStation) {
        this.homeStation.recordKill(100);
      }
      return true;
    }
    return false;
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
