import * as YUKA from 'yuka';

/**
 * World class managing game entities and global state.
 */
class World {
  constructor() {
    this.entityManager = new YUKA.EntityManager();
    this.dispatcher = new YUKA.MessageDispatcher();
    this.time = new YUKA.Time();

    // Spatial index disabled for now; current map uses negative coordinates.
    // Re-enable once we choose a centered grid or shift entity positions.
    // this.entityManager.spatialIndex = new YUKA.CellSpacePartitioning(
    //   2000, 2000, 2000, 5, 5, 5
    // );
  }

  /**
   * Updates all entities in the world.
   * @param {number} deltaTime - Time since last update in seconds.
   */
  update(deltaTime) {
    // Debug logging every 120 frames (roughly every 2 seconds)
    if (!this.debugFrameCount) this.debugFrameCount = 0;
    this.debugFrameCount++;
    
    if (this.debugFrameCount % 120 === 0) {
      console.log('=== WORLD UPDATE DEBUG ===');
      console.log('deltaTime flow:', deltaTime?.toFixed(6) || 'undefined');
      console.log('Entities in manager:', this.entityManager.entities.length);
      console.log('Ships:', this.getShips().length);
      console.log('Stations:', this.getStations().length);
      
      // Debug station details to find duplicate issue
      const stations = this.getStations();
      console.log('[World] stations=' + stations.length + ' names=[' + stations.map(s => s.name || 'unnamed').join(', ') + ']');
      
      // Log ship details
      const ships = this.getShips();
      ships.forEach(ship => {
        console.log(`Ship ${ship.name}: state=${ship.stateMachine?.currentState?.constructor.name}, pos=(${ship.position.x.toFixed(1)}, ${ship.position.z.toFixed(1)})`);
      });
    }
    
    // Confirm stateMachine.update(deltaTime) is being called within Yuka
    this.entityManager.update(deltaTime);
    this.dispatcher.dispatchDelayedMessages();
  }

  /**
   * Adds an entity to the world.
   * @param {Object} entity - The entity to add.
   */
  addEntity(entity) {
    this.entityManager.add(entity);
  }

  /**
   * Removes an entity from the world.
   * @param {Object} entity - The entity to remove.
   */
  removeEntity(entity) {
    this.entityManager.remove(entity);
  }

  /**
   * Returns all station entities in the world.
   * @returns {Array} Array of station entities.
   */
  getStations() {
    return this.entityManager.entities.filter(e => e.constructor.name === 'TradeStation');
  }

  /**
   * Returns all ship entities in the world.
   * @returns {Array} Array of ship entities.
   */
  getShips() {
    return this.entityManager.entities.filter(e => e.constructor.name === 'TradeShip');
  }
}

// Singleton instance
const instance = new World();
export default instance;
