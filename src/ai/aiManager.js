/**
 * Manages AI entities and their updates.
 */
export const aiManager = {
  entities: [],

  /**
   * Adds an entity to the manager.
   * @param {Object} entity - The entity to add.
   */
  add(entity) {
    this.entities.push(entity);
  },

  /**
   * Removes an entity from the manager.
   * @param {Object} entity - The entity to remove.
   */
  remove(entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
    }
  },

  /**
   * Updates all managed entities.
   * @param {number} delta - The time delta for the update.
   */
  update(delta) {
    for (const entity of this.entities) {
      if (typeof entity.update === 'function') {
        entity.update(delta);
      }
    }
  }
};

/**
 * Updates the AI for all entities in the manager.
 * @param {number} delta - The time delta for the update.
 */
export function updateAI(delta) {
  aiManager.update(delta);
}
