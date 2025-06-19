import { SteeringBehavior, Vector3 } from 'yuka';

/**
 * Steering behavior to keep an entity within specified bounds.
 */
export class KeepInBoundsBehavior extends SteeringBehavior {
  /**
   * Constructs a new KeepInBoundsBehavior.
   * @param {number} boundary - The boundary limit for the entity's position (default is 1800).
   */
  constructor(boundary = 1800) {
    super();
    this.boundary = boundary;
    this.weight = 0.5; // Adjust weight to balance with other behaviors
  }

  /**
   * Calculates the steering force for the behavior.
   * @param {Object} entity - The entity to calculate the steering force for.
   * @param {Vector3} force - The force vector to be updated.
   * @returns {Vector3} The calculated steering force.
   */
  calculate(entity, force) {
    const position = entity.position;
    const boundary = this.boundary;
    const magnitude = position.length();

    if (magnitude > boundary) {
      // Calculate a force to push the entity back towards the origin
      const direction = new Vector3().copy(position).normalize().multiplyScalar(-1);
      const distanceOverBoundary = magnitude - boundary;
      // Scale the force based on how far over the boundary the entity is
      force.copy(direction).multiplyScalar(distanceOverBoundary * 0.1);
    } else {
      // No force if within bounds
      force.set(0, 0, 0);
    }

    return force;
  }
}
