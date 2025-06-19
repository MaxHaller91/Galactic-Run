/**
 * Component for managing an entity's cargo.
 */
export class CargoComponent {
  /**
   * Constructs a new CargoComponent.
   * @param {number} maxCapacity - The maximum cargo capacity (default is 1000).
   */
  constructor(maxCapacity = 1000) {
    this.maxCapacity = maxCapacity;
    this.currentCargo = 0;
    this.inventory = new Map(); // Map of item name to quantity
  }

  /**
   * Adds cargo to the inventory.
   * @param {string} item - The item to add.
   * @param {number} quantity - The quantity to add.
   * @returns {boolean} True if the cargo was added successfully, false if over capacity.
   */
  addCargo(item, quantity) {
    const newTotal = this.currentCargo + quantity;
    if (newTotal > this.maxCapacity) {
      return false;
    }
    
    this.currentCargo = newTotal;
    const currentQuantity = this.inventory.get(item) || 0;
    this.inventory.set(item, currentQuantity + quantity);
    return true;
  }

  /**
   * Removes cargo from the inventory.
   * @param {string} item - The item to remove.
   * @param {number} quantity - The quantity to remove.
   * @returns {boolean} True if the cargo was removed successfully, false if insufficient quantity.
   */
  removeCargo(item, quantity) {
    const currentQuantity = this.inventory.get(item) || 0;
    if (currentQuantity < quantity) {
      return false;
    }
    
    this.currentCargo -= quantity;
    this.inventory.set(item, currentQuantity - quantity);
    if (currentQuantity - quantity === 0) {
      this.inventory.delete(item);
    }
    return true;
  }

  /**
   * Gets the current inventory.
   * @returns {Map} The inventory map of item names to quantities.
   */
  getInventory() {
    return new Map(this.inventory);
  }

  /**
   * Checks if the entity has space for more cargo.
   * @param {number} quantity - The quantity to check for space.
   * @returns {boolean} True if there is space, false otherwise.
   */
  hasSpace(quantity) {
    return (this.currentCargo + quantity) <= this.maxCapacity;
  }
}
