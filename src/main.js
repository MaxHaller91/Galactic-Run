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
import { PirateShip } from './agents/PirateShip.js';
import { PoliceShip } from './agents/PoliceShip.js';
import { dispatcher } from './core/dispatcher.js';

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

    // Enable spatial partitioning for performance
    world.entityManager.spatialIndex = new YUKA.CellSpacePartitioning(4000, 4000, 4000, 10, 1, 10);

    // Create pirates and police
    const pirates = [];
    const police = [];
    
    // Spawn 3 pirates at safe distances from stations
    console.log('=== SPAWNING PIRATES ===');
    for (let i = 0; i < 3; i++) {
      console.log(`Creating pirate ${i + 1}...`);
      
      let position;
      let attempts = 0;
      do {
        position = new THREE.Vector3(
          (Math.random() - 0.5) * 2000,
          0,
          (Math.random() - 0.5) * 2000
        );
        attempts++;
      } while (attempts < 50 && (
        position.distanceTo(stationA.position) < 400 ||
        position.distanceTo(stationB.position) < 400
      ));
      
      console.log(`Pirate ${i + 1} position selected: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}) after ${attempts} attempts`);
      
      const pirate = new PirateShip(`Pirate-${i + 1}`, world);
      console.log(`Pirate created: ${pirate.name}, mesh exists: ${!!pirate.mesh}`);
      
      pirate.position.copy(position);
      // Random orientation
      pirate.rotation.fromEuler(0, Math.random() * Math.PI * 2, 0);
      
      // Compute bounding radius for collision detection
      pirate.mesh.geometry.computeBoundingSphere();
      pirate.boundingRadius = pirate.mesh.geometry.boundingSphere.radius;
      
      console.log(`Adding pirate ${pirate.name} to scene and world...`);
      scene.add(pirate.mesh);
      world.addEntity(pirate);
      pirates.push(pirate);
      
      console.log(`Pirate ${pirate.name} mesh material color:`, pirate.mesh.material.color.getHex().toString(16));
    }
    console.log(`=== PIRATES SPAWNED: ${pirates.length} ===`);
    
    // Spawn 2 police ships (1 leader + 1 wingman)
    const policeLeader = new PoliceShip('Police-Alpha', world);
    policeLeader.position.set(0, 0, -500);
    policeLeader.rotation.fromEuler(0, Math.random() * Math.PI * 2, 0);
    policeLeader.mesh.geometry.computeBoundingSphere();
    policeLeader.boundingRadius = policeLeader.mesh.geometry.boundingSphere.radius;
    scene.add(policeLeader.mesh);
    world.addEntity(policeLeader);
    police.push(policeLeader);
    
    const policeWingman = new PoliceShip('Police-Beta', world, policeLeader);
    policeWingman.position.set(100, 0, -500);
    policeWingman.rotation.fromEuler(0, Math.random() * Math.PI * 2, 0);
    policeWingman.mesh.geometry.computeBoundingSphere();
    policeWingman.boundingRadius = policeWingman.mesh.geometry.boundingSphere.radius;
    scene.add(policeWingman.mesh);
    world.addEntity(policeWingman);
    police.push(policeWingman);

    // Add bounding radius to trader for collision detection
    trader.mesh.geometry.computeBoundingSphere();
    trader.boundingRadius = trader.mesh.geometry.boundingSphere.radius;

    // show the trader's mesh
    scene.add(trader.mesh);
    
    // Add debug marker for trader's arrive target
    addArriveDebugMarker(trader, scene);

    // Add entities to AI manager
    aiManager.add(stationA);
    aiManager.add(stationB);
    aiManager.add(trader);
    
    // NOTE: Entities are already added to world by EntityFactory
    console.log('=== ENTITIES CREATED ===');
    console.log('Station A created:', stationA.name, 'type:', stationA.constructor.name);
    console.log('Station B created:', stationB.name, 'type:', stationB.constructor.name);
    console.log('Trader created:', trader.name, 'type:', trader.constructor.name);
    
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

    // Add docking range circle for Station A
    const dockingRangeAGeometry = new THREE.RingGeometry(100, 110, 32);
    const dockingRangeAMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, depthTest: false });
    const dockingRangeAMesh = new THREE.Mesh(dockingRangeAGeometry, dockingRangeAMaterial);
    dockingRangeAMesh.position.copy(stationA.position);
    dockingRangeAMesh.position.y += 5; // Slight elevation to avoid depth conflicts
    dockingRangeAMesh.rotation.x = -Math.PI / 2; // Lay flat on XZ plane
    scene.add(dockingRangeAMesh);
    console.log('Docking range circle added for Station A at position:', dockingRangeAMesh.position);

    // Station B as a green sphere
    const stationBGeometry = new THREE.SphereGeometry(50, 32, 32);
    const stationBMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const stationBMesh = new THREE.Mesh(stationBGeometry, stationBMaterial);
    stationBMesh.position.copy(stationB.position);
    scene.add(stationBMesh);

    // Add docking range circle for Station B
    const dockingRangeBGeometry = new THREE.RingGeometry(100, 110, 32);
    const dockingRangeBMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, depthTest: false });
    const dockingRangeBMesh = new THREE.Mesh(dockingRangeBGeometry, dockingRangeBMaterial);
    dockingRangeBMesh.position.copy(stationB.position);
    dockingRangeBMesh.position.y += 5; // Slight elevation to avoid depth conflicts
    dockingRangeBMesh.rotation.x = -Math.PI / 2; // Lay flat on XZ plane
    scene.add(dockingRangeBMesh);
    console.log('Docking range circle added for Station B at position:', dockingRangeBMesh.position);


    // Extend Game class to integrate Three.js and World updates
    // Create UI overlay for ship debug info
    const debugUI = document.createElement('div');
    debugUI.style.position = 'absolute';
    debugUI.style.bottom = '10px';
    debugUI.style.left = '10px';
    debugUI.style.color = 'white';
    debugUI.style.fontFamily = 'Arial, sans-serif';
    debugUI.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    debugUI.style.padding = '10px';
    debugUI.id = 'shipDebugUI';
    document.body.appendChild(debugUI);

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
        
        // Critical: Dispatch messages after entity updates
        dispatcher.dispatchDelayedMessages();
        
        // Sync debug visuals for traders
        syncDebugVisuals([trader]);
        updateDebugLine(trader, scene); // optional: shows line to target
        // Update UI with ship info
        const speed = trader.velocity.length().toFixed(2);
        const state = trader.stateMachine.currentState ? trader.stateMachine.currentState.constructor.name : 'Unknown';
        const distanceToTarget = trader.arrive && trader.arrive.target ? trader.position.distanceTo(trader.arrive.target).toFixed(2) : 'N/A';
        document.getElementById('shipDebugUI').innerText = `Cargo Runner\nSpeed: ${speed}\nState: ${state}\nDistance to Target: ${distanceToTarget}`;
        // no manual sync needed - Vehicle.setRenderComponent handles it
        renderer.render(scene, camera);
      }
    }

    // Add debug helper function
    window.dumpEntities = () => {
      console.log('=== ENTITY DUMP ===');
      world.entityManager.entities.forEach(e => 
        console.log(`${e.name || 'unnamed'} (${e.constructor.name}) at (${e.position.x.toFixed(1)}, ${e.position.z.toFixed(1)})`)
      );
      console.log(`Total entities: ${world.entityManager.entities.length}`);
    };
    
    // Debug YUKA imports
    console.log('=== YUKA DEBUG ===');
    console.log('YUKA.MessageDispatcher:', typeof YUKA.MessageDispatcher);
    console.log('YUKA.MessageDispatcher.instance:', YUKA.MessageDispatcher.instance);
    console.log('YUKA.Regulator:', typeof YUKA.Regulator);

    // Start the game only after all blueprints are loaded and entities are created
    const game = new GalacticGame();
    game.start();

    console.log('World initialized with:', {
      stations: world.getStations().length,
      ships: world.getShips().length,
      pirates: pirates.length,
      police: police.length,
      totalEntities: world.entityManager.entities.length
    });
    console.log('[DEBUG] All entity names:', world.entityManager.entities.map(e => `${e.name || 'unnamed'}(${e.constructor.name})`));
    
    // Auto-run debug dump
    setTimeout(() => {
      console.log('=== AUTO DEBUG DUMP (after 1 second) ===');
      window.dumpEntities();
    }, 1000);
    
    // Add camera teleport function for debugging
    window.tp = (entityName = 'Pirate-1') => {
      const entity = world.entityManager.entities.find(e => e.name === entityName);
      if (entity) {
        camera.position.copy(entity.position.clone().add(new THREE.Vector3(0, 200, 300)));
        camera.lookAt(entity.position);
        console.log(`Teleported camera to ${entityName} at position:`, entity.position);
      } else {
        console.log(`Entity ${entityName} not found`);
      }
    };
    
    // Add function to zoom out and see all entities
    window.zoomOut = () => {
      camera.position.set(0, 2000, 2000);
      camera.lookAt(0, 0, 0);
      console.log('Camera zoomed out to overview position');
    };
  } catch (error) {
    console.error(error.message);
    // Do not start the game if blueprint loading fails
  }
}

// Start the initialization process
initializeGame();
