// Temporary debug guard for StateMachine.add
import * as YUKA from 'yuka';

const origAdd = YUKA.StateMachine.prototype.add;
YUKA.StateMachine.prototype.add = function (name, state) {
  if (!(state instanceof YUKA.State)) {
    console.error('[BAD-ADD]', name, state, 'module id =', import.meta.url);
  }
  return origAdd.call(this, name, state);
};

import * as THREE from 'three';
import { aiManager, updateAI } from './ai/aiManager.js';
import { Game } from './core/Game.js';
import world from './core/World.js';
import { EntityFactory } from './factory/EntityFactory.js';
import { loadAll } from './factory/BlueprintLoader.js';

// Make libraries accessible globally if needed
window.THREE = THREE;
window.YUKA = YUKA;

import { addArriveDebugMarker, updateDebugLine, syncDebugVisuals } from './debug/debugEnhancer.js';


// Initialize Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
camera.position.z = 1000;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Define paths for blueprints to load
const paths = [
  '/blueprints/station-basic.json',
  '/blueprints/ship-cargo-runner.json',
  '/blueprints/ship-pirate-raider.json'
];

// Function to initialize the game after loading blueprints
async function initializeGame() {
  try {
    // Load all blueprints asynchronously
    await loadAll(paths);

    // Create entities using EntityFactory with blueprint IDs
    const stationA = EntityFactory.createFromId('station-basic', new THREE.Vector3(-300, 0, 0));
    const stationB = EntityFactory.createFromId('station-basic', new THREE.Vector3(300, 0, 0));
    const trader = EntityFactory.createFromId('cargo-runner');

    // show the trader's mesh
    scene.add(trader.mesh);
    
    // Add debug marker for trader's arrive target
    addArriveDebugMarker(trader, scene);

    // Add entities to AI manager
    aiManager.add(stationA);
    aiManager.add(stationB);
    aiManager.add(trader);
    
    // IMPORTANT: Also add entities to the world
    world.addEntity(stationA);
    world.addEntity(stationB);
    world.addEntity(trader);
    
    console.log('=== ENTITIES ADDED TO WORLD ===');
    console.log('Station A added:', stationA.name, 'type:', stationA.constructor.name);
    console.log('Station B added:', stationB.name, 'type:', stationB.constructor.name);
    console.log('Trader added:', trader.name, 'type:', trader.constructor.name);
    
    // Debug station count issue
    setTimeout(() => {
      const stations = world.getStations();
      const ships = world.getShips();
      console.log('[DEBUG] Post-creation station count:', stations.length);
      console.log('[DEBUG] Station names:', stations.map(s => s.name || 'unnamed'));
      console.log('[DEBUG] Station types:', stations.map(s => s.constructor.name));
      console.log('[DEBUG] Ship count:', ships.length);
      console.log('[DEBUG] Ship names:', ships.map(s => s.name || 'unnamed'));
    }, 100);

    // Create simple visual representations for entities
    // Station A as a blue sphere
    const stationAGeometry = new THREE.SphereGeometry(50, 32, 32);
    const stationAMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const stationAMesh = new THREE.Mesh(stationAGeometry, stationAMaterial);
    stationAMesh.position.copy(stationA.position);
    scene.add(stationAMesh);

    // Station B as a green sphere
    const stationBGeometry = new THREE.SphereGeometry(50, 32, 32);
    const stationBMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const stationBMesh = new THREE.Mesh(stationBGeometry, stationBMaterial);
    stationBMesh.position.copy(stationB.position);
    scene.add(stationBMesh);


    // Extend Game class to integrate Three.js and World updates
    class GalacticGame extends Game {
      constructor() {
        super();
        this.frameCount = 0;
        this.deltaTimeSum = 0;
      }
      
      update(deltaTime) {
        this.frameCount++;
        this.deltaTimeSum += deltaTime;
        
        // Log timing info every 60 frames
        if (this.frameCount % 60 === 0) {
          const avgDeltaTime = this.deltaTimeSum / 60;
          const fps = 1 / avgDeltaTime;
          console.log('=== GAME TIMING ===');
          console.log('deltaTime:', deltaTime.toFixed(6), 'avg:', avgDeltaTime.toFixed(6));
          console.log('FPS:', fps.toFixed(1));
          this.deltaTimeSum = 0;
        }
        
        // Update the world and its entities
        world.update(deltaTime);
        // Sync debug visuals for traders
        syncDebugVisuals([trader]);
        updateDebugLine(trader, scene); // optional: shows line to target
        // no manual sync needed - Vehicle.setRenderComponent handles it
        renderer.render(scene, camera);
      }
    }

    // Start the game only after all blueprints are loaded and entities are created
    const game = new GalacticGame();
    game.start();

    console.log('World initialized with:', {
      stations: world.getStations().length,
      ships: world.getShips().length,
      totalEntities: world.entityManager.entities.length
    });
    console.log('[DEBUG] All entity names:', world.entityManager.entities.map(e => `${e.name || 'unnamed'}(${e.constructor.name})`));
  } catch (error) {
    console.error(error.message);
    // Do not start the game if blueprint loading fails
  }
}

// Start the initialization process
initializeGame();
