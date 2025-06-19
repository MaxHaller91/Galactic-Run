/**
 * Component for managing an entity's weapons.
 */
export class WeaponComponent {
  /**
   * Constructs a new WeaponComponent.
   * @param {number} damage - The damage per shot (default is 10).
   * @param {number} range - The range of the weapon (default is 500).
   * @param {number} cooldown - The cooldown time in milliseconds (default is 1000).
   */
  constructor(damage = 10, range = 500, cooldown = 1000) {
    this.damage = damage;
    this.range = range;
    this.cooldown = cooldown;
    this.lastFired = 0;
  }

  /**
   * Attempts to fire the weapon at a target.
   * @param {Object} target - The target entity to fire at.
   * @param {Object} owner - The entity owning this weapon.
   * @returns {boolean} True if the weapon was fired, false if on cooldown or out of range.
   */
  fire(target, owner) {
    const now = performance.now();
    if (now - this.lastFired < this.cooldown) {
      return false; // Still on cooldown
    }

    const distance = owner.position.distanceTo(target.position);
    if (distance > this.range) {
      return false; // Target out of range
    }

    this.lastFired = now;
    // Apply damage to target if it has a HealthComponent
    if (target.healthComponent) {
      target.healthComponent.takeDamage(this.damage);
    }
    return true;
  }

  /**
   * Checks if the weapon is ready to fire.
   * @returns {boolean} True if the weapon is off cooldown, false otherwise.
   */
  isReady() {
    return (performance.now() - this.lastFired) >= this.cooldown;
  }

  /**
   * Updates the weapon's properties.
   * @param {number} damage - New damage value.
   * @param {number} range - New range value.
   * @param {number} cooldown - New cooldown value.
   */
  upgrade(damage, range, cooldown) {
    this.damage = damage;
    this.range = range;
    this.cooldown = cooldown;
  }
}
