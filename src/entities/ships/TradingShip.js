import * as THREE from 'three';
import { safeDiv } from '../../util/Math.js';
import { ORDER_TYPE } from '../../constants/OrderType.js';

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

    switch (this.state) {
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
      case 'RETURNING_TO_ORIGIN':
        this.returnToOrigin(deltaTime);
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
    const viableOrders = game.availableOrders.filter((order) => !order.takenBy && !order.completed && this.canHandleOrder(order));

    if (viableOrders.length === 0) {
      this.moveToOtherStation();
      return;
    }

    // Pick closest order
    let bestOrder = null;
    let bestDistance = Infinity;

    viableOrders.forEach((order) => {
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
      const otherStation = this.stations.find((station) => {
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
    if (order.type === ORDER_TYPE.BUY) {
      // For buy orders, check if we already have the resource
      if (this.cargo[order.resourceType] >= order.quantity) {
        return true; // We can fulfill immediately
      }
      // If we don't have it, check if we have space to source it
      return (this.cargo.materials + this.cargo.food + order.quantity) <= this.maxCargo;
    } else if (order.type === ORDER_TYPE.FUND_POLICE) {
      // For fund police orders, we can always handle them as it's virtual credits
      return true;
    }
    // For sell orders, we need credits and cargo space
    return this.credits >= order.totalValue
             && (this.cargo.materials + this.cargo.food + order.quantity) <= this.maxCargo;
  }

  takeOrder(order) {
    this.currentOrder = order;
    order.takenBy = this;

    if (order.type === ORDER_TYPE.SELL) {
      // For sell orders, we go to pick up from the station
      this.target = order.station;
      this.state = 'TRAVELING_TO_PICKUP';
    } else if (order.type === ORDER_TYPE.FUND_POLICE) {
      // For fund police orders, load virtual credits immediately and go directly to delivery
      this.cargo = { credits: order.amount };
      this.originStation = order.station; // Store origin to potentially return later
      this.target = order.toStation; // Set destination to police HQ
      this.setState('TRAVELING_TO_DELIVERY');
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
    const sellOrders = this.stations.filter((station) => station.resources[buyOrder.resourceType] > buyOrder.quantity);

    if (sellOrders.length > 0) {
      // Find closest station with the resource
      let closestStation = null;
      let closestDistance = Infinity;

      sellOrders.forEach((station) => {
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

    if (order.type === ORDER_TYPE.SELL) {
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
    } else if (order.type === ORDER_TYPE.BUY) {
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
    const buyOrders = game.availableOrders.filter((order) => order.type === 'buy'
      && order.resourceType === this.currentOrder.resourceType
      && !order.takenBy
      && !order.completed);

    if (buyOrders.length > 0) {
      // Find the highest paying buyer
      const bestBuyer = buyOrders.reduce((best, order) => (order.price > best.price ? order : best));

      this.target = bestBuyer.station;
      bestBuyer.takenBy = this;
      this.deliveryOrder = bestBuyer;
      this.state = 'TRAVELING_TO_DELIVERY';

      console.log(`🎯 Trader found buyer: ${bestBuyer.stationName} wants ${bestBuyer.quantity} ${bestBuyer.resourceType} for $${bestBuyer.price} each`);
    } else {
      // No buyer found, find any station that might want it
      const needyStations = this.stations.filter((station) => station.resources[this.currentOrder.resourceType] < 30);

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

  returnToOrigin(deltaTime) {
    if (!this.target) {
      this.state = 'SEEKING_ORDER';
      return;
    }

    const distance = this.mesh.position.distanceTo(this.target.mesh.position);

    if (distance < 15) {
      this.state = 'SEEKING_ORDER'; // Now eligible for a fresh order
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

    if (order.type === ORDER_TYPE.BUY) {
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
    } else if (order.type === ORDER_TYPE.FUND_POLICE) {
      // Delivering credits to a police station
      if (this.cargo.credits >= order.amount) {
        order.toStation.receiveCredits(order.amount);
        this.cargo = {}; // Wipe virtual cargo
        console.log(`💰 Trader delivered $${order.amount} to ${order.toStation.name || 'Police Station'} for funding`);
        // NEW: return to origin, then ask for a new job
        this.target = this.originStation;
        this.setState('RETURNING_TO_ORIGIN');
        this.completeOrder(game, order);
        return; // Don't fall through to generic completion
      } else {
        console.log(`❌ Couldn't deliver credits to ${order.toStation.name || 'Police Station'}`);
        this.abandonOrder(game);
      }
    } else {
      // Delivering after pickup (selling to a buyer)
      const { deliveryOrder } = this;
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
      const inv = safeDiv(1, dist);
      this.velocity.x += dx * inv * this.maxSpeed * speedMod * deltaTime * 3;
      this.velocity.y += dy * inv * this.maxSpeed * speedMod * deltaTime * 3;
    }

    this.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
  }

  getCargoString() {
    return `M:${this.cargo.materials} F:${this.cargo.food}`;
  }
}
