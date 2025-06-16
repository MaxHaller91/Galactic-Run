import * as THREE from 'three';
import { aiManager, updateAI } from './ai/aiManager.js';
import { TradeStation } from './agents/TradeStation.js';
import { TradeShip } from './agents/TradeShip.js';
import { Game } from './core/Game.js';

// Initialize Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
camera.position.z = 1000;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create test entities
const station = new TradeStation("Europa Station");
const trader = new TradeShip("Cargo Runner 7");

// Add entities to AI manager
aiManager.add(station);
aiManager.add(trader);

// Extend Game class to integrate Three.js and AI updates
class GalacticGame extends Game {
  update(deltaTime) {
    updateAI(deltaTime);
    renderer.render(scene, camera);
  }
}

// Start the game
const game = new GalacticGame();
game.start();
