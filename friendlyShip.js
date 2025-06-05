import * as THREE from 'three';
import { SpaceStation } from 'entities'; // For type hinting, though not strictly needed for JS

const AI_STATE = {
  IDLE: 'IDLE',
  SEEKING_GOOD_TO_BUY: 'SEEKING_GOOD_TO_BUY',
  MOVING_TO_BUY_STATION: 'MOVING_TO_BUY_STATION',
  BUYING: 'BUYING',
  SEEKING_GOOD_TO_SELL: 'SEEKING_GOOD_TO_SELL',
  MOVING_TO_SELL_STATION: 'MOVING_TO_SELL_STATION',
  SELLING: 'SELLING',
};

export class FriendlyShip {
  constructor(x, y, allStations, game) {
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.maxSpeed = 20; // Slower than player for now
    this.credits = 500 + Math.floor(Math.random() * 1500); // Start with some credits
    this.cargoHold = [];
    this.maxCargo = 5 + Math.floor(Math.random() * 6); // Cargo capacity 5-10
    this.allStations = allStations; // Reference to all stations for decision making
    this.game = game; // Reference to the game instance for UI messages etc.

    this.state = AI_STATE.IDLE;
    this.currentTargetStation = null;
    this.commodityToTrade = null; // { name, type, basePrice, paidPrice (if buying from station) }
    this.targetBuyStation = null;
    this.targetSellStation = null;
    
    this.decisionCooldown = 0; // Prevent rapid state changes
    this.actionCooldown = 0; // Cooldown for buying/selling
  }

  createMesh() {
    const group = new THREE.Group();
    // Different, simpler geometry for friendly traders
    const hullGeometry = new THREE.CapsuleGeometry(0.8, 2.5, 4, 8);
    const hullMaterial = new THREE.MeshBasicMaterial({ color: 0x00cc44 }); // Distinct green
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI / 2;
    group.add(hull);

    // Small "wings" or cargo pods
    const podGeometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
    const podMaterial = new THREE.MeshBasicMaterial({ color: 0x00aa33 });
    
    const leftPod = new THREE.Mesh(podGeometry, podMaterial);
    leftPod.position.set(0, 0.8, 0);
    group.add(leftPod);

    const rightPod = new THREE.Mesh(podGeometry, podMaterial);
    rightPod.position.set(0, -0.8, 0);
    group.add(rightPod);
    
    return group;
  }

  update(deltaTime) {
    if (this.decisionCooldown > 0) this.decisionCooldown -= deltaTime;
    if (this.actionCooldown > 0) this.actionCooldown -= deltaTime;

    switch (this.state) {
      case AI_STATE.IDLE:
        if (this.decisionCooldown <= 0) this.decideNextAction();
        break;
      case AI_STATE.SEEKING_GOOD_TO_BUY:
        this.findGoodToBuy();
        break;
      case AI_STATE.MOVING_TO_BUY_STATION:
        this.moveToTarget(deltaTime, this.targetBuyStation, AI_STATE.BUYING);
        break;
      case AI_STATE.BUYING:
        this.performBuyTransaction();
        break;
      case AI_STATE.SEEKING_GOOD_TO_SELL:
        this.findStationToSell();
        break;
      case AI_STATE.MOVING_TO_SELL_STATION:
        this.moveToTarget(deltaTime, this.targetSellStation, AI_STATE.SELLING);
        break;
      case AI_STATE.SELLING:
        this.performSellTransaction();
        break;
    }

    // Apply drag and speed limit
    this.velocity.multiplyScalar(0.95);
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }

    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;

    if (this.velocity.length() > 0.1) {
      this.mesh.rotation.z = Math.atan2(this.velocity.y, this.velocity.x) + Math.PI / 2;
    }
  }

  decideNextAction() {
    this.decisionCooldown = 2 + Math.random() * 3; // Cooldown 2-5 seconds
    if (this.cargoHold.length < this.maxCargo && this.credits > 50) { // Arbitrary minimum credits
      this.state = AI_STATE.SEEKING_GOOD_TO_BUY;
    } else if (this.cargoHold.length > 0) {
      this.state = AI_STATE.SEEKING_GOOD_TO_SELL;
    } else {
      this.state = AI_STATE.IDLE; // Can't do anything, wait.
    }
  }

  findGoodToBuy() {
    if (this.allStations.length === 0) {
      this.state = AI_STATE.IDLE;
      return;
    }

    let potentialBuys = [];
    this.allStations.forEach(station => {
      station.goods.forEach(good => {
        // AI considers buying goods station produces (cheaper) or generally available goods
        if (station.inventory[good.name] > 0 && this.credits >= good.stationBaseSellPrice) {
            let desirability = 1.0 / (good.stationBaseSellPrice + 1); // Prefer cheaper goods
            if (good.name === station.productionFocus) desirability *= 2; // Highly prefer produced goods

            potentialBuys.push({
                station: station,
                good: good,
                desirability: desirability
            });
        }
      });
    });

    if (potentialBuys.length > 0) {
      potentialBuys.sort((a, b) => b.desirability - a.desirability); // Sort by most desirable
      this.targetBuyStation = potentialBuys[0].station;
      this.commodityToTrade = potentialBuys[0].good;
      this.state = AI_STATE.MOVING_TO_BUY_STATION;
      // console.log(`${this.mesh.uuid.slice(0,4)}: Decided to buy ${this.commodityToTrade.name} from ${this.targetBuyStation.name}`);
    } else {
      this.state = AI_STATE.IDLE; // No suitable goods to buy
      // console.log(`${this.mesh.uuid.slice(0,4)}: No suitable goods to buy.`);
    }
  }
  
  performBuyTransaction() {
    if (this.actionCooldown > 0 || !this.targetBuyStation || !this.commodityToTrade) {
        this.state = AI_STATE.IDLE; // Something went wrong
        return;
    }
    const station = this.targetBuyStation;
    const goodToBuy = this.commodityToTrade;

    // Re-check if station still has the good and AI can afford it (prices might change)
    const marketGoodMatch = station.goods.find(g => g.name === goodToBuy.name);
    if (marketGoodMatch && station.inventory[goodToBuy.name] > 0 && this.credits >= marketGoodMatch.stationBaseSellPrice && this.cargoHold.length < this.maxCargo) {
      this.credits -= marketGoodMatch.stationBaseSellPrice;
      this.cargoHold.push({
        name: marketGoodMatch.name,
        type: marketGoodMatch.type,
        paidPrice: marketGoodMatch.stationBaseSellPrice, // AI "pays" station's sell price
        basePrice: marketGoodMatch.basePrice
      });
      station.buyCommodity(marketGoodMatch.name, 1); // Station sells one unit
      // console.log(`${this.mesh.uuid.slice(0,4)}: Bought ${marketGoodMatch.name} from ${station.name}. Stock left: ${station.inventory[marketGoodMatch.name]}`);
      this.game.ui.showMessage(`Friendly trader bought ${marketGoodMatch.name} at ${station.name}.`, 'ai-trade');

      this.commodityToTrade = this.cargoHold[this.cargoHold.length - 1]; // Reference the item in cargo for selling
      this.state = AI_STATE.SEEKING_GOOD_TO_SELL;
    } else {
      // console.log(`${this.mesh.uuid.slice(0,4)}: Failed to buy ${goodToBuy.name} from ${station.name}. Conditions changed.`);
      this.state = AI_STATE.IDLE; // Conditions changed, re-evaluate
    }
    this.targetBuyStation = null;
    // this.commodityToTrade = null; // Keep commodityToTrade if sale was successful, for selling phase
    this.actionCooldown = 1 + Math.random(); // Short cooldown
  }

  findStationToSell() {
     if (this.allStations.length === 0 || this.cargoHold.length === 0) {
      this.state = AI_STATE.IDLE;
      return;
    }
    
    // For now, just pick the first item in cargo to sell
    const itemToSell = this.cargoHold[0]; 
    this.commodityToTrade = itemToSell;

    let potentialSells = [];
    this.allStations.forEach(station => {
      if (station === this.targetBuyStation && this.allStations.length > 1) return; // Don't sell back to the same station immediately if others exist

      // AI looks for stations that consume the good or generally pay well
      // Find the commodity in the station's general goods list (even if not actively selling)
      // to get its buy price. If not listed, station might still buy if it's its consumptionFocus.
      let stationGoodInfo = station.goods.find(g => g.name === itemToSell.name);
      let buyPrice;

      if (stationGoodInfo) {
        buyPrice = stationGoodInfo.stationBaseBuyPrice;
      } else {
        // Station doesn't list this good for sale. Will it buy?
        // If it's the station's consumptionFocus, it will offer a good price.
        // Otherwise, it might offer a low default. For AI, let's assume it looks for explicit demand.
        const globalCommodity = this.game.COMMODITIES_LIST.find(c => c.name === itemToSell.name); // Access global commodities via game instance's COMMODITIES_LIST
        if (globalCommodity && itemToSell.name === station.consumptionFocus) {
             buyPrice = Math.floor(globalCommodity.basePrice * (1.1 + Math.random() * 0.15)); // Similar to station's own calculation
        } else {
            buyPrice = Math.floor(itemToSell.basePrice * 0.6); // Default low price if not consumed and not listed
        }
      }
      
      if (buyPrice > itemToSell.paidPrice) { // Only consider profitable sales
        let desirability = buyPrice - itemToSell.paidPrice;
        if (itemToSell.name === station.consumptionFocus) desirability *= 2; // Highly prefer selling consumed goods

        potentialSells.push({
            station: station,
            goodName: itemToSell.name, // Just need name for selling
            sellPrice: buyPrice,
            desirability: desirability
        });
      }
    });

    if (potentialSells.length > 0) {
      potentialSells.sort((a, b) => b.desirability - a.desirability);
      this.targetSellStation = potentialSells[0].station;
      // this.commodityToTrade is already set to the item from cargo
      this.state = AI_STATE.MOVING_TO_SELL_STATION;
      // console.log(`${this.mesh.uuid.slice(0,4)}: Decided to sell ${this.commodityToTrade.name} to ${this.targetSellStation.name} for ${potentialSells[0].sellPrice}`);
    } else {
      this.state = AI_STATE.IDLE; // No profitable place to sell
      // console.log(`${this.mesh.uuid.slice(0,4)}: No profitable station to sell ${this.commodityToTrade.name}.`);
    }
  }
  
  performSellTransaction() {
    if (this.actionCooldown > 0 || !this.targetSellStation || !this.commodityToTrade) {
        this.state = AI_STATE.IDLE;
        return;
    }
    const station = this.targetSellStation;
    const itemToSell = this.commodityToTrade;

    // Find the actual current buy price at the station
    let stationGoodInfo = station.goods.find(g => g.name === itemToSell.name);
    let actualBuyPrice;
    if (stationGoodInfo) {
      actualBuyPrice = stationGoodInfo.stationBaseBuyPrice;
    } else {
      const globalCommodity = this.game.COMMODITIES_LIST.find(c => c.name === itemToSell.name); // Access global commodities via game instance's COMMODITIES_LIST
      if (globalCommodity && itemToSell.name === station.consumptionFocus) {
           actualBuyPrice = Math.floor(globalCommodity.basePrice * (1.1 + Math.random() * 0.15));
      } else {
          actualBuyPrice = Math.floor(itemToSell.basePrice * 0.6); // Low default
      }
    }

    if (actualBuyPrice > itemToSell.paidPrice) { // Re-confirm profitability
      this.credits += actualBuyPrice;
      station.sellCommodity(itemToSell.name, 1); // Station buys one unit
      
      const cargoIndex = this.cargoHold.findIndex(item => item.name === itemToSell.name && item.paidPrice === itemToSell.paidPrice); // Find specific item instance
      if (cargoIndex > -1) {
        this.cargoHold.splice(cargoIndex, 1);
      }
      // console.log(`${this.mesh.uuid.slice(0,4)}: Sold ${itemToSell.name} to ${station.name}. Stock there: ${station.inventory[itemToSell.name]}`);
      this.game.ui.showMessage(`Friendly trader sold ${itemToSell.name} at ${station.name}.`, 'ai-trade');
      
      this.state = AI_STATE.IDLE; // Sold, now idle to decide next move
    } else {
      // console.log(`${this.mesh.uuid.slice(0,4)}: Failed to sell ${itemToSell.name} to ${station.name}. Price no longer profitable.`);
      this.state = AI_STATE.IDLE; // Price changed, re-evaluate
    }
    this.targetSellStation = null;
    this.commodityToTrade = null;
    this.actionCooldown = 1 + Math.random();
  }

  moveToTarget(deltaTime, targetStation, nextState) {
    if (!targetStation) {
      this.state = AI_STATE.IDLE;
      return;
    }
    const dx = targetStation.mesh.position.x - this.mesh.position.x;
    const dy = targetStation.mesh.position.y - this.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 10) { // Close enough to interact
      this.velocity.set(0, 0); // Stop
      this.state = nextState;
      this.actionCooldown = 0.5; // Small delay before action
    } else {
      this.velocity.x += (dx / distance) * (this.maxSpeed * 2) * deltaTime; // Move faster towards target
      this.velocity.y += (dy / distance) * (this.maxSpeed * 2) * deltaTime;
    }
  }
}