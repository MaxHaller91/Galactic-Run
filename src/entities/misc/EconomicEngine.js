export class EconomicEngine {
  constructor() {
    this.priceMultipliers = {
      food: 1.0,
      materials: 1.0,
    };
  }

  update() {}

  updatePrices() {}

  getPrice(resource, basePrice) {
    return basePrice * (this.priceMultipliers[resource] || 1.0);
  }
}
