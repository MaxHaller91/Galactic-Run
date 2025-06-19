import { TradeShip } from '../agents/TradeShip.js';
import { TradeStation } from '../agents/TradeStation.js';
import world from '../core/World.js';
import { TraderPack, PiratePack, PolicePack } from '../behaviours/behaviourPacks.js';
import { HealthComponent } from '../components/HealthComponent.js';
import { CargoComponent } from '../components/CargoComponent.js';
import { WeaponComponent } from '../components/WeaponComponent.js';
import { get as getBlueprint } from './BlueprintLoader.js';
import * as THREE from 'three';

/**
 * Factory class for creating entities based on blueprint objects.
 */
export class EntityFactory {
  /**
   * Creates an entity from a blueprint and registers it with the World.
   * @param {Object} blueprint - The blueprint object defining the entity properties.
   * @returns {Object} The created entity.
   */
  static createFromBlueprint(blueprint) {
    if (!blueprint || !blueprint.class) {
      throw new Error('Blueprint must have a class property');
    }

    let entity;

    switch (blueprint.class) {
      case 'TradeShip':
        entity = new TradeShip(blueprint.name, world);
        if (blueprint.stats && blueprint.stats.maxSpeed) entity.maxSpeed = blueprint.stats.maxSpeed;
        if (blueprint.stats && blueprint.stats.mass) entity.mass = blueprint.stats.mass;
        if (blueprint.position) entity.position.copy(blueprint.position);
        
        // ----- TEMPORARY VISUAL --------------------------------------------------
        // create a simple box mesh so the ship is visible
        const geom = new THREE.BoxGeometry(20, 20, 40);
        const mat  = new THREE.MeshNormalMaterial();
        entity.mesh  = new THREE.Mesh(geom, mat);
        // Note: scene.add() will be handled in main.js since scene isn't accessible here
        // ------------------------------------------------------------------------
        break;
      case 'TradeStation':
        entity = new TradeStation(blueprint.name, blueprint.position || new THREE.Vector3());
        if (blueprint.stats && blueprint.stats.maxSpeed) entity.maxSpeed = blueprint.stats.maxSpeed;
        if (blueprint.stats && blueprint.stats.mass) entity.mass = blueprint.stats.mass;
        break;
      default:
        throw new Error(`Unsupported entity class: ${blueprint.class}`);
    }

    // Attach behaviors from blueprint
    if (blueprint.behaviours && Array.isArray(blueprint.behaviours)) {
      blueprint.behaviours.forEach(behavior => {
        switch (behavior) {
          case 'Trader':
          case 'TraderPack':
            TraderPack(entity);
            break;
          case 'Pirate':
          case 'PiratePack':
            PiratePack(entity);
            break;
          case 'Police':
          case 'PolicePack':
            PolicePack(entity);
            break;
          default:
            console.warn(`Unsupported behavior: ${behavior} for ${entity.name}`);
        }
      });
    }

    // Attach components from blueprint
    if (blueprint.components && Array.isArray(blueprint.components)) {
      blueprint.components.forEach(componentStr => {
        const [type, ...params] = componentStr.split(':');
        switch (type) {
          case 'Health':
            entity.healthComponent = new HealthComponent(params.length ? parseInt(params[0], 10) : 100);
            break;
          case 'Cargo':
            entity.cargoComponent = new CargoComponent(params.length ? parseInt(params[0], 10) : 1000);
            break;
          case 'Weapon':
            entity.weaponComponent = new WeaponComponent(
              params.length > 0 ? parseInt(params[0], 10) : 10,
              params.length > 1 ? parseInt(params[1], 10) : 500,
              params.length > 2 ? parseInt(params[2], 10) : 1000
            );
            break;
          default:
            console.warn(`Unsupported component: ${type} for ${entity.name}`);
        }
      });
    }

    // Register the entity with the world
    world.addEntity(entity);
    return entity;
  }

  /**
   * Creates an entity from a blueprint ID, optionally overriding the position.
   * @param {string} id - The ID of the blueprint to use.
   * @param {THREE.Vector3} position - Optional position to override the blueprint's position.
   * @returns {Object} The created entity.
   */
  static createFromId(id, position = null) {
    const blueprint = getBlueprint(id);
    if (!blueprint) {
      throw new Error(`Blueprint with ID ${id} not found`);
    }
    if (position) {
      blueprint.position = position;
    }
    return this.createFromBlueprint(blueprint);
  }
}
