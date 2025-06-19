/**
 * Component for managing an entity's health.
 */
export class HealthComponent {
  /**
   * Constructs a new HealthComponent.
   * @param {number} maxHealth - The maximum health value (default is 100).
   */
  constructor(maxHealth = 100) {
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
  }

  /**
   * Reduces the entity's health by the specified amount.
   * @param {number} amount - The amount of damage to apply.
   * @returns {boolean} True if the entity is still alive, false if health reaches 0.
   */
  takeDamage(amount) {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    return this.currentHealth > 0;
  }

  /**
   * Increases the entity's health by the specified amount, up to maxHealth.
   * @param {number} amount - The amount of health to restore.
   */
  heal(amount) {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }

  /**
   * Checks if the entity is alive.
   * @returns {boolean} True if health is greater than 0, false otherwise.
   */
  isAlive() {
    return this.currentHealth > 0;
  }
}
