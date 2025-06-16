/**
 * Main game class responsible for initializing and running the game loop.
 */
export class Game {
  constructor() {
    this.isRunning = false;
    this.lastTime = 0;
  }

  /**
   * Starts the game.
   */
  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.animate();
      console.log('Game started');
    }
  }

  /**
   * Stops the game.
   */
  stop() {
    this.isRunning = false;
    console.log('Game stopped');
  }

  /**
   * Main animation loop.
   */
  animate() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // in seconds
    this.lastTime = currentTime;

    this.update(deltaTime);
  }

  /**
   * Updates game state.
   * @param {number} deltaTime - Time since last update in seconds.
   */
  update(deltaTime) {
    // Placeholder for update logic
    // Will be overridden or extended with specific game systems
  }
}
