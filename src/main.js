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

    // Add entities to AI manager
    aiManager.add(stationA);
    aiManager.add(stationB);
    aiManager.add(trader);

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
      update(deltaTime) {
        // Update the world and its entities
        world.update(deltaTime);
        // no manual sync needed - Vehicle.setRenderComponent handles it
        renderer.render(scene, camera);
      }
    }

    // Start the game only after all blueprints are loaded and entities are created
    const game = new GalacticGame();
    game.start();

    console.log('World initialized with:', {
      stations: world.getStations().length,
      ships: world.getShips().length
    });
    console.log(world.entityManager.entities.map(e => e.name));
  } catch (error) {
    console.error(error.message);
    // Do not start the game if blueprint loading fails
  }
}

// Start the initialization process
initializeGame();
