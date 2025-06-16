/* global THREE, YUKA */
// Initialize Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
camera.position.z = 1000;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// AI Manager (simplified for global scope)
const aiManager = {
  entities: [],
  add(entity) {
    this.entities.push(entity);
  },
  update(deltaTime) {
    this.entities.forEach(entity => {
      if (typeof entity.update === 'function') {
        entity.update(deltaTime);
      }
    });
  }
};

// TradeStation class
function TradeStation(name) {
  this.name = name;
  this.stateMachine = new YUKA.StateMachine(this);
  this.stateMachine.add('IDLE', {
    enter: () => console.log(`[${this.name}] entered IDLE`),
    execute: () => {},
    exit: () => {}
  });
  this.stateMachine.changeTo('IDLE');
  
  this.update = function(delta) {
    this.stateMachine.update();
  };
}

// TradeShip class
function TradeShip(name) {
  this.name = name;
  this.stateMachine = new YUKA.StateMachine(this);
  this.stateMachine.add('IDLE', {
    enter: () => console.log(`[${this.name}] entered IDLE`),
    execute: () => {},
    exit: () => {}
  });
  this.stateMachine.changeTo('IDLE');
  
  this.update = function(delta) {
    this.stateMachine.update();
  };
}

// Game class
function Game() {
  this.isRunning = false;
  this.lastTime = 0;
  
  this.start = function() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.animate();
      console.log('Game started');
    }
  };
  
  this.animate = function() {
    if (!this.isRunning) return;
    
    requestAnimationFrame(() => this.animate());
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // in seconds
    this.lastTime = currentTime;
    
    this.update(deltaTime);
  };
  
  this.update = function(deltaTime) {
    aiManager.update(deltaTime);
    renderer.render(scene, camera);
  };
}

// Create test entities
const station = new TradeStation("Europa Station");
const trader = new TradeShip("Cargo Runner 7");

// Add entities to AI manager
aiManager.add(station);
aiManager.add(trader);

// Start the game
const game = new Game();
game.start();
