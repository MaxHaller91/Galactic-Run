import * as THREE from 'three';
import { ORDER_TYPE } from '../../constants/OrderType.js';

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
    this.myOrders = this.myOrders.filter((order) => game.availableOrders.includes(order) && !order.completed);
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
    // Create FUND_POLICE orders if not a police station and credits are sufficient
    if (this.type !== 'police' && this.credits >= 8000) {
      const policeStation = game.entities.stations.find(s => s.type === 'police');
      if (policeStation) {
        const donationAmount = 5000;
        this.credits -= donationAmount; // Immediate deduction as escrow
        const order = {
          id: `${this.name || 'Station'}_${Date.now()}_${Math.random()}`,
          type: ORDER_TYPE.FUND_POLICE,
          amount: donationAmount,
          station: this,
          toStation: policeStation,
          stationName: this.name || 'Unknown Station',
          created: Date.now(),
          completed: false,
          takenBy: null,
        };
        game.availableOrders.push(order);
        this.myOrders.push(order);
        console.log(`📤 ${this.name || 'Station'} created FUND_POLICE order for $${donationAmount}`);
      }
    }
  }

  createBuyOrder(game, resourceType, quantity, price) {
    const order = {
      id: `${this.name || 'Station'}_${Date.now()}_${Math.random()}`,
      type: 'buy',
      resourceType,
      quantity,
      price,
      totalValue: quantity * price,
      station: this,
      stationName: this.name || 'Unknown Station',
      created: Date.now(),
      completed: false,
      takenBy: null,
    };

    game.availableOrders.push(order);
    this.myOrders.push(order);

    console.log(`📋 ${this.name || 'Station'} created BUY order: ${quantity} ${resourceType} for $${price} each`);
  }

  createSellOrder(game, resourceType, quantity, price) {
    const order = {
      id: `${this.name || 'Station'}_${Date.now()}_${Math.random()}`,
      type: 'sell',
      resourceType,
      quantity,
      price,
      totalValue: quantity * price,
      station: this,
      stationName: this.name || 'Unknown Station',
      created: Date.now(),
      completed: false,
      takenBy: null,
    };

    game.availableOrders.push(order);
    this.myOrders.push(order);

    console.log(`📋 ${this.name || 'Station'} created SELL order: ${quantity} ${resourceType} for $${price} each`);
  }

  // Handle trader interactions
  sellResourceToTrader(resourceType, quantity) {
    if (this.resources[resourceType] >= quantity) {
      this.resources[resourceType] -= quantity;
      // Check if any associated sell orders need to be closed due to depleted stock
      this.myOrders.forEach(order => {
        if (order.type === 'sell' && order.resourceType === resourceType && !order.completed && order.takenBy) {
          if (this.resources[resourceType] < order.quantity) {
            order.completed = true;
            order.takenBy = null;
            console.log(`📋 ${this.name || 'Station'} closed SELL order for ${order.quantity} ${resourceType} due to insufficient stock`);
          }
        }
      });
      return true;
    }
    return false;
  }

  buyResourceFromTrader(resourceType, quantity) {
    this.resources[resourceType] += quantity;
    return true;
  }
}
