import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/renderers/CSS2DRenderer.js';
// Removed duplicate imports
import { PlayerShip } from 'ship';
import { UIManager } from 'ui';
// Entities split imports
import { Minimap } from 'minimap'; // Import the Minimap class
import { WeaponSystem as _WeaponSystem } from 'weapons'; // Import the new weapon system, prefixed to ignore unused warning
import { DebugSystem } from 'debug'; // Import the debug system
import { ZoneEventLogger } from 'zoneEventLogger'; // Import the event logger
import { Station } from './entities/stations/Station.js';
import { PirateStation } from './entities/stations/PirateStation.js';
import { PoliceStation } from './entities/stations/PoliceStation.js';
import { Asteroid } from './entities/misc/Asteroid.js';
import { JumpGate } from './entities/misc/JumpGate.js';
import { EconomicEngine } from './entities/misc/EconomicEngine.js';
// Commented out unused imports to resolve no-unused-vars errors
// import { Projectile } from './entities/misc/Projectile.js';
// import { DistressBeacon } from './entities/misc/DistressBeacon.js';
import { TradingShip as _TradingShip } from './entities/ships/TradingShip.js';
import { SimplePirate as _SimplePirate } from './entities/ships/SimplePirate.js';
import { SimplePolice } from './entities/ships/SimplePolice.js';
import { SimpleFriendlyShip as _SimpleFriendlyShip } from './entities/ships/SimpleFriendlyShip.js';
import { SimplePolice as _Police } from './entities/ships/SimplePolice.js';
import { SimpleFriendlyShip as _FriendlyShip } from './entities/ships/SimpleFriendlyShip.js';
// PlayerShip is imported from 'ship'
// REMOVED: Complex COMMODITIES_LIST - using simple materials/goods system
// REMOVED: MiningLaser - conflicts with AI mining system
import { EconomySystem } from './systems/EconomySystem.js';
import { AISystem } from './systems/AISystem.js';
import { UISystem } from './systems/UISystem.js';

export class SpaceCargoGame {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-50, 50, 37.5, -37.5, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.labelRenderer = new CSS2DRenderer();
    // REMOVED: Complex COMMODITIES system - using simple materials/goods
    this.clock = new THREE.Clock();
    this.gameState = {
      credits: 1000,
      hull: 100,
      shields: 100,
      maxCargo: 10,
      engineLevel: 1,
      weaponLevel: 1,
      isPaused: false,
      mouseWorldPosition: new THREE.Vector2(), // Add mouse position to gameState
      factionStandings: {
        'Federated Commerce Guild': 0,
        'Outer Rim Prospectors': 0,
      },
      // Day counter system - 3 minutes = 1 game day
      currentDay: 1,
      dayStartTime: Date.now(),
      dayLength: 180000, // 3 minutes in milliseconds
    };

    this.zones = {
      'alpha-sector': {
        name: 'Alpha Sector',
        factionControl: 'Federated Commerce Guild',
        description: 'A bustling core sector, well-policed.',
        stations: [], // Will hold station names/IDs specific to this zone
        asteroids: [], // Asteroid fields specific to this zone
        pirateActivity: 'low',
        bgColor: 0x000011, // Default dark blue
      },
      'outer-wilds': {
        name: 'Outer Wilds',
        factionControl: 'Outer Rim Prospectors',
        description: 'A lawless frontier, rich in resources but dangerous.',
        stations: [],
        asteroids: [],
        pirateActivity: 'high',
        bgColor: 0x110000, // Dark red hue
      },
      // More zones can be added here
    };
    this.gameState.currentZoneId = 'alpha-sector'; // Player starts in Alpha Sector
    this.entities = { // Entities will now be managed per-zone or globally if they can travel
      stations: [], // For now, these are global, will be associated with zones
      pirates: [], // These will be zone-specific
      projectiles: [],
      asteroids: [],
      jumpGates: [],
      friendlyShips: [], // Add friendlyShips array
      police: [], // Add police array
      pirateStations: [], // Add pirate stations array
      distressBeacons: [], // Add distress beacons array for MVP system
      traders: [], // Add traders array for SimpleTrader ships
      tradingShips: [], // Add Rosebud trading ships array
    };

    // Global order pool for simplified trading system
    this.availableOrders = [];
    // REMOVED: MiningLaser - conflicts with AI mining system
    this.minimap = null; // Initialize minimap reference
    // Commented out unused weaponSystem initialization
    // this.weaponSystem = null; // Initialize weapon system reference
    this.eventLogger = null; // Initialize event logger reference
    this.timeScale = 1.0; // Add time scale property
    this.economySystem = null; // Will be initialized in init()
    this.aiSystem = null; // Will be initialized in init()
    this.uiSystem = null; // Will be initialized in init()

    this.keys = {};
    this.mouseScreenPosition = new THREE.Vector2();
    this.setupInput();
  }

  init() {
    this.setupRenderer();
    // Initialize simple player cargo system
    this.gameState.materials = 0;
    this.gameState.goods = 0;
    this.gameState.food = 0;
    this.gameState.maxCargo = 10;
    this.loadZone(this.gameState.currentZoneId);
    this.ui = new UIManager(this.gameState, this.zones, this);
    // REMOVED: MiningLaser - conflicts with AI mining system
    // Commented out unused weaponSystem initialization
    // this.weaponSystem = new WeaponSystem(this); // Initialize weapon system
    // REMOVED: Old EconomyDebugPanel initialization
    this.debugSystem = new DebugSystem(this); // Initialize debug system
    this.eventLogger = new ZoneEventLogger(this); // Initialize event logger
    this.eventLogger.logPlayer('Game initialized', { version: '2.4.0' });

    // Initialize Economic Engine for Rosebud trading system
    this.economicEngine = new EconomicEngine(this.entities.stations, this.entities.tradingShips);
    this.economySystem = new EconomySystem(this.entities, this.availableOrders, this.economicEngine);
    this.aiSystem = new AISystem(this.entities, this);
    this.uiSystem = new UISystem(this.ui, this.entities);
    // Player ship is created in loadZone, ensure it exists before minimap init uses it
    // For now, minimap constructor handles if playerShip is null initially.
    // A safer approach would be to initialize minimap after playerShip is guaranteed.
    // Let's assume loadZone creates playerShip before this.minimap is used in update loop.
    this.minimap = new Minimap('minimapContainer', this.entities, this.playerShip, this.camera, 150, 2000);

    // Add zoom functionality with mouse scroll wheel
    // --- ZOOM CONSTANTS -------------------------------------------------
    var MIN_ZOOM = 0.2; // for OrthographicCamera.zoom   (default = 1)
    var MAX_ZOOM = 5;
    var MIN_Z = 50; // for PerspectiveCamera.position.z
    var MAX_Z = 2000;

    // --- WHEEL HANDLER --------------------------------------------------
    window.addEventListener(
      'wheel',
      function(e) {
        e.preventDefault(); // stop the page from scrolling

        // How much the wheel moved;  +1 = zoom out,  -1 = zoom in
        var dir = Math.sign(e.deltaY);

        if (this.camera.isOrthographicCamera) {
          // ── Ortho: tweak .zoom, then tell the camera to update itself
          this.camera.zoom = THREE.MathUtils.clamp(
            this.camera.zoom + dir * 0.25, // adjust step size to taste
            MIN_ZOOM,
            MAX_ZOOM,
          );
          this.camera.updateProjectionMatrix();
        } else {
          // ── Perspective: move the camera forward/backward along Z
          this.camera.position.z = THREE.MathUtils.clamp(
            this.camera.position.z + dir * 30, // adjust step size to taste
            MIN_Z,
            MAX_Z,
          );
        }
      }.bind(this),
      { passive: false } // required so preventDefault() works
    );

    this.animate();
  }

  setupRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Background color will be set by loadZone
    document.getElementById('gameContainer').appendChild(this.renderer.domElement);

    // Setup CSS2DRenderer
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    document.getElementById('labelContainer').appendChild(this.labelRenderer.domElement);

    window.addEventListener('resize', function() {
      var aspect = window.innerWidth / window.innerHeight;
      this.camera.left = -50 * aspect;
      this.camera.right = 50 * aspect;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.labelRenderer.setSize(window.innerWidth, window.innerHeight); // Resize label renderer too
    }.bind(this));
  }

  setupSceneParameters(zoneConfig) {
    this.renderer.setClearColor(zoneConfig.bgColor || 0x000011);
    // Potentially add zone-specific lighting, fog, etc. here later

    // Re-create or update starfield based on zone if desired
    // For now, let's keep a generic starfield but clear old one if any
    if (this.stars) this.scene.remove(this.stars);
    var starsGeometry = new THREE.BufferGeometry();
    var starsCount = 800 + Math.random() * 400; // Vary star density per zone
    var positions = new Float32Array(starsCount * 3);

    var createStarPosition = function() {
      return (Math.random() - 0.5) * (1000 + Math.random() * 500);
    };
    for (var i = 0; i < starsCount * 3; i += 3) {
      var x = createStarPosition();
      var y = createStarPosition();
      positions[i] = x; // Vary spread
      positions[i + 1] = y;
      positions[i + 2] = -50 - Math.random() * 50; // Vary depth
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8 + Math.random() * 0.4, // Vary star size
    });
    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);

    // Camera setup (remains largely the same unless zones have different scales)
    this.camera.position.z = 10;
  }

  clearZoneEntities() {
    // Remove all zone-specific entities from the scene and arrays
    this.entities.stations.forEach(function(s) {
      this.scene.remove(s.mesh);
      if (s.label) this.scene.remove(s.label); // CSS2DObject is added directly to scene
    }.bind(this));
    this.entities.pirates.forEach(function(p) { this.scene.remove(p.mesh); }.bind(this));
    this.entities.asteroids.forEach(function(a) { this.scene.remove(a.mesh); }.bind(this));
    this.entities.jumpGates.forEach(function(jg) {
      this.scene.remove(jg.mesh);
      // Note: CSS2DObjects are added to the mesh, so removing mesh removes label.
    }.bind(this));
    // Remove derelicts if they exist
    if (this.entities.derelicts) {
      this.entities.derelicts.forEach(function(d) { this.scene.remove(d.mesh); }.bind(this));
      this.entities.derelicts = [];
    }
    // Remove pirate stations
    this.entities.pirateStations.forEach(function(ps) { this.scene.remove(ps.mesh); }.bind(this));
    this.entities.pirateStations = [];
    // Projectiles are short-lived and managed separately, but good to clear any stragglers
    this.entities.projectiles.forEach(function(p) { this.scene.remove(p.mesh); }.bind(this));
    this.entities.stations = [];
    this.entities.pirates = [];
    this.entities.asteroids = [];
    this.entities.projectiles = [];
    this.entities.jumpGates = [];
    this.entities.friendlyShips.forEach(function(fs) { this.scene.remove(fs.mesh); }.bind(this)); // Remove friendly ships
    this.entities.friendlyShips = []; // Clear array
    this.entities.police.forEach(function(p) { this.scene.remove(p.mesh); }.bind(this)); // Remove police
    this.entities.police = []; // Clear array
    if (this.entities.miningShips) {
      this.entities.miningShips.forEach(function(ms) { this.scene.remove(ms.mesh); }.bind(this)); // Remove mining ships
      this.entities.miningShips = []; // Clear array
    }
    // Clear trading ships - CRITICAL FIX
    if (this.entities.tradingShips) {
      this.entities.tradingShips.forEach(function(ts) { this.scene.remove(ts.mesh); }.bind(this)); // Remove trading ships
      this.entities.tradingShips = []; // Clear array
    }
    if (this.ui) { // Check if UI is initialized
      this.ui.clearAllIndicators(); // Use new UI method
    }
  }

  loadZone(zoneId) {
    var zoneConfig = this.zones[zoneId];
    if (!zoneConfig) {
      console.error(`Zone ${zoneId} not found!`);
      return;
    }
    // Jump flash effect
    var flashOverlay = document.getElementById('jumpFlashOverlay');
    if (flashOverlay) {
      flashOverlay.style.opacity = '1';
      setTimeout(function() {
        flashOverlay.style.opacity = '0';
      }, 250); // Flash duration
    }
    // Delay zone loading slightly to let flash effect be visible
    setTimeout(function() {
      this.gameState.currentZoneId = zoneId;
      this.clearZoneEntities(); // Clear entities from previous zone
      this.setupSceneParameters(zoneConfig); // Set background, stars for the new zone
      // Create player ship if it doesn't exist (e.g., on game start)
      // Its position might be set based on entry point from a previous zone later
      if (!this.playerShip) {
        this.playerShip = new PlayerShip();
        this.scene.add(this.playerShip.mesh);
        if (this.minimap) { // Ensure minimap gets the playerShip reference if it was created before playerShip
          this.minimap.playerShip = this.playerShip;
        }
      }
      // For now, reset player to a default position in the new zone
      this.playerShip.mesh.position.set(0, 0, 0);
      // Populate entities for the current zone with expanded scale
      if (zoneId === 'alpha-sector') {
        // Create Mining Station
        var miningStation = new Station(
          'mining',
          new THREE.Vector3(-400, 300, 0),
          {
            materials: 50,
            food: 200,
            maxMaterials: 200,
            maxFood: 100,
            productionRate: 5,
            consumptionRate: 0.5,
          },
          {
            materials: { basePrice: 50 }, // Sells materials at base 50 credits
            food: { basePrice: 80 }, // Buys food at base 80 credits
          },
        );
        miningStation.name = 'Alpha Mining Complex';
        this.entities.stations.push(miningStation);
        this.scene.add(miningStation.mesh);

        // Add station label with live stats
        var miningLabel = document.createElement('div');
        miningLabel.className = 'station-label';
        miningLabel.style.cssText = `
              color: #00ffff;
              font-family: 'Lucida Console', monospace;
              font-size: 12px;
              background: rgba(0,0,0,0.8);
              padding: 4px 8px;
              border-radius: 4px;
              pointer-events: none;
              text-align: center;
              line-height: 1.2;
            `;
        var miningLabelObj = new CSS2DObject(miningLabel);
        miningLabelObj.position.set(0, 8, 0);
        miningStation.mesh.add(miningLabelObj);
        miningStation.label = miningLabelObj;
        miningStation.labelElement = miningLabel; // Store reference for updates

        // Create Agricultural Station
        var agriStation = new Station(
          'agricultural',
          new THREE.Vector3(450, 350, 0),
          {
            materials: 80,
            food: 60,
            maxMaterials: 100,
            maxFood: 200,
            productionRate: 5,
            consumptionRate: 0.3,
          },
          {
            food: { basePrice: 80 }, // Sells food at base 80 credits
            materials: { basePrice: 50 }, // Buys materials at base 50 credits
          },
        );
        agriStation.name = 'Alpha Agricultural Hub';
        this.entities.stations.push(agriStation);
        this.scene.add(agriStation.mesh);

        // Add station label with live stats
        var agriLabel = document.createElement('div');
        agriLabel.className = 'station-label';
        agriLabel.style.cssText = `
              color: #00ffff;
              font-family: 'Lucida Console', monospace;
              font-size: 12px;
              background: rgba(0,0,0,0.8);
              padding: 4px 8px;
              border-radius: 4px;
              pointer-events: none;
              text-align: center;
              line-height: 1.2;
            `;
        var agriLabelObj = new CSS2DObject(agriLabel);
        agriLabelObj.position.set(0, 8, 0);
        agriStation.mesh.add(agriLabelObj);
        agriStation.label = agriLabelObj;
        agriStation.labelElement = agriLabel; // Store reference for updates
        // REMOVED: Manual pirate spawning - pirates only spawn from pirate stations
        this.spawnAsteroids(12); // More asteroids for larger space
        this.spawnDerelicts(3); // Add derelict ships to discover

        // Add pirate station in Alpha Sector (low threat) - disabled for debugging
        if (!window.DEBUG_NO_PIRATE_STATION) {
          var pirateStation1 = new PirateStation(new THREE.Vector3(-700, -300, 0));
          this.entities.pirateStations.push(pirateStation1);
          this.scene.add(pirateStation1.mesh);
        }

        // Add police station in Alpha Sector
        var hq = new PoliceStation(new THREE.Vector3(0, -50, 0));
        this.entities.stations.push(hq);
        this.scene.add(hq.mesh);

        // Spawn 5 Police ships at game start near random stations
        console.log('🚀 SPAWNING 5 POLICE SHIPS');
        for (var i = 0; i < 5; i++) {
          var spawnX = 0;
          var spawnY = 0;
          if (this.entities.stations.length > 0) {
            var randomStation = this.entities.stations[Math.floor(Math.random() * this.entities.stations.length)];
            spawnX = randomStation.mesh.position.x + (Math.random() - 0.5) * 30;
            spawnY = randomStation.mesh.position.y + (Math.random() - 0.5) * 30;
            console.log(`📍 Police Ship ${i + 1} spawn position near ${randomStation.name || 'Station'}: x: ${spawnX}, y: ${spawnY}`);
          }
          var p = new SimplePolice(spawnX, spawnY);
          this.entities.police.push(p);
          this.scene.add(p.mesh);
        }
        console.log(`🏁 SPAWN COMPLETE. Final Police count: ${this.entities.police.length}`);

        // Jump gate positioned at zone edge
        var gateToOuterWilds = new JumpGate(800, 0, 'outer-wilds', this.zones['outer-wilds'].name);
        this.entities.jumpGates.push(gateToOuterWilds);
        this.scene.add(gateToOuterWilds.mesh);
      } else if (zoneId === 'outer-wilds') {
        // Create Mining Station (main operation)
        var mainMining = new Station(
          'mining',
          new THREE.Vector3(0, 0, 0),
          {
            materials: 80,
            food: 15,
            maxMaterials: 300,
            maxFood: 80,
            productionRate: 12,
            consumptionRate: 3,
          },
          {
            materials: { basePrice: 45 }, // Slightly cheaper materials
            food: { basePrice: 90 }, // More expensive food in frontier
          },
        );
        mainMining.name = 'Prospector Deep';
        this.entities.stations.push(mainMining);
        this.scene.add(mainMining.mesh);

        // Add station label
        var mainMiningLabel = document.createElement('div');
        mainMiningLabel.className = 'station-label';
        mainMiningLabel.textContent = mainMining.name;
        mainMiningLabel.style.cssText = `
              color: #00ffff;
              font-family: 'Lucida Console', monospace;
              font-size: 14px;
              background: rgba(0,0,0,0.7);
              padding: 2px 6px;
              border-radius: 3px;
              pointer-events: none;
            `;
        var mainMiningLabelObj = new CSS2DObject(mainMiningLabel);
        mainMiningLabelObj.position.set(0, 8, 0);
        mainMining.mesh.add(mainMiningLabelObj);
        mainMining.label = mainMiningLabelObj;

        // Create Agricultural Station (frontier farming)
        var frontierAgri = new Station(
          'agricultural',
          new THREE.Vector3(400, -300, 0),
          {
            materials: 15,
            food: 40,
            maxMaterials: 80,
            maxFood: 150,
            productionRate: 6,
            consumptionRate: 2,
          },
          {
            food: { basePrice: 90 }, // Sells food at premium
            materials: { basePrice: 45 }, // Buys materials
          },
        );
        frontierAgri.name = 'Frontier Agri-Station';
        this.entities.stations.push(frontierAgri);
        this.scene.add(frontierAgri.mesh);

        // Add station label
        var frontierAgriLabel = document.createElement('div');
        frontierAgriLabel.className = 'station-label';
        frontierAgriLabel.textContent = frontierAgri.name;
        frontierAgriLabel.style.cssText = `
              color: #00ffff;
              font-family: 'Lucida Console', monospace;
              font-size: 14px;
              background: rgba(0,0,0,0.7);
              padding: 2px 6px;
              border-radius: 3px;
              pointer-events: none;
            `;
        var frontierAgriLabelObj = new CSS2DObject(frontierAgriLabel);
        frontierAgriLabelObj.position.set(0, 8, 0);
        frontierAgri.mesh.add(frontierAgriLabelObj);
        frontierAgri.label = frontierAgriLabelObj;

        // Add pirate stations in Outer Wilds (high threat)
        var pirateStation2 = new PirateStation(new THREE.Vector3(-600, 400, 0));
        this.entities.pirateStations.push(pirateStation2);
        this.scene.add(pirateStation2.mesh);

        var pirateStation3 = new PirateStation(new THREE.Vector3(600, -400, 0));
        this.entities.pirateStations.push(pirateStation3);
        this.scene.add(pirateStation3.mesh);

        this.spawnAsteroids(20); // Many more asteroids in resource-rich zone
        this.spawnDerelicts(5); // More derelicts in dangerous zone

        // Jump gate back to Alpha Sector
        var gateToAlpha = new JumpGate(-800, 0, 'alpha-sector', this.zones['alpha-sector'].name);
        this.entities.jumpGates.push(gateToAlpha);
        this.scene.add(gateToAlpha.mesh);
      }

      // After loading zone, update UI to reflect current zone
      if (this.ui) {
        // Removed call to non-existent updateZoneInfo method
        // UI updates are handled in the game loop
      }
      // Log zone transition
      if (this.eventLogger) {
        this.eventLogger.logPlayer(`Entered zone: ${zoneConfig.name}`, { zoneId });
      }
    }.bind(this), 250); // Match flash duration
  }

  setupInput() {
    // Existing keyboard input code remains unchanged
    window.addEventListener('keydown', function(e) {
      this.keys[e.code] = true;
      if (e.code === 'KeyE' && !this.keys.KeyE_pressed_once) {
        this.keys.KeyE_pressed_once = true;
      }
      if (e.code === 'KeyP') {
        this.gameState.isPaused = !this.gameState.isPaused;
        if (this.ui) {
          this.ui.showMessage(this.gameState.isPaused ? 'Game Paused' : 'Game Resumed', 'system-neutral');
        }
      }
      // Add time scale control with + and - keys
      if (e.code === 'Equal' || e.code === 'NumpadAdd') { // + key
        this.timeScale = Math.min(this.timeScale + 0.1, 2.0);
        if (this.ui) {
          this.ui.showMessage(`Time Scale: ${this.timeScale.toFixed(1)}x`, 'system-neutral');
        }
      }
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') { // - key
        this.timeScale = Math.max(this.timeScale - 0.1, 0.1);
        if (this.ui) {
          this.ui.showMessage(`Time Scale: ${this.timeScale.toFixed(1)}x`, 'system-neutral');
        }
      }
    }.bind(this));

    window.addEventListener('keyup', function(e) {
      this.keys[e.code] = false;
    }.bind(this));

    // Update mouse position for ship aiming
    window.addEventListener('mousemove', function(e) {
      this.mouseScreenPosition.x = e.clientX;
      this.mouseScreenPosition.y = e.clientY;
    }.bind(this));

    // Add click handler for interactions with UI elements
    window.addEventListener('click', function(e) {
      var gameContainer = document.getElementById('gameContainer');
      if (e.target === gameContainer || gameContainer.contains(e.target) && e.target.closest('.ui-panel') === null) {
        // Commented out unused fireWeapon call
        // this.fireWeapon();
      }
    }.bind(this));
  }

  toggleShipInfoPanel() {
    var panel = document.getElementById('shipInfoPanel');
    if (panel) {
      var isCurrentlyVisible = panel.classList.contains('visible');
      panel.classList.toggle('visible');
      if (!isCurrentlyVisible && this.ui) { // If it wasn't visible and is now being opened
        this.ui.updateShipInfoPanel();
      }
    }
  }

  // Commented out unused fireWeapon method
  /*
  fireWeapon() {
    if (this.weaponSystem) {
      const playerPos = this.playerShip.mesh.position;
      const playerRot = this.playerShip.rotation;
      this.weaponSystem.fireWeapon(playerPos, playerRot);
    }
  }
  */

  checkInteractions() {
    var playerPos = this.playerShip.mesh.position;

    this.entities.stations.forEach(function(station) {
      var distance = playerPos.distanceTo(station.mesh.position);
      if (distance < 15) {
        this.ui.showTradePanel(station);
      }
    }.bind(this));

    // Check derelict interactions
    if (this.entities.derelicts) {
      this.entities.derelicts.forEach(function(derelict, index) {
        var derelictDistance = playerPos.distanceTo(derelict.mesh.position);
        if (derelictDistance < 12 && !derelict.salvaged) {
          this.ui.showMessage('Derelict ship detected. Press E to salvage.');
          if (this.keys.KeyE_pressed_once) {
            this.salvageDerelict(derelict, index);
            this.keys.KeyE_pressed_once = false;
          }
        }
      }.bind(this));
    }

    // Check Jump Gate interactions (interaction logic will be expanded later)
    this.entities.jumpGates.forEach(function(gate) {
      var distance = playerPos.distanceTo(gate.mesh.position);
      if (distance < gate.interactionRadius) {
        this.ui.showMessage(`Approaching Jump Gate to ${gate.destinationName}. Press E to jump.`);
        // Actual jump logic:
        if (this.keys.KeyE_pressed_once) { // Use a flag that's reset after use
          this.loadZone(gate.targetZoneId);
          this.keys.KeyE_pressed_once = false; // Reset flag
          // Exit checkInteractions early to prevent multiple jumps or interactions
        }
      }
    }.bind(this));
  }

  salvageDerelict(derelict, index) {
    if (this.gameState.cargo.length < this.gameState.maxCargo) {
      this.gameState.cargo.push({
        name: derelict.cargoType,
        type: 'salvage',
        paidPrice: 0,
        basePrice: derelict.cargoValue,
      });
      this.gameState.credits += Math.floor(derelict.cargoValue * 0.5); // Immediate partial value
      this.ui.showMessage(`Salvaged ${derelict.cargoType}! +$${Math.floor(derelict.cargoValue * 0.5)}`, 'player-trade');

      // Mark as salvaged and change appearance
      var updatedDerelict = { ...derelict, salvaged: true };
      updatedDerelict.mesh.children.forEach(function(child) {
        if (child.material) {
          child.material.color.multiplyScalar(0.5); // Darken the derelict
        }
      });
      this.entities.derelicts[index] = updatedDerelict;
    } else {
      this.ui.showMessage('Cargo hold full! Cannot salvage derelict.', 'warning');
    }
  }

  update(deltaTime) {
    if (this.gameState.isPaused) return;

    // Apply time scale to delta time
    var _scaledDeltaTime = deltaTime * this.timeScale; // Prefixed to silence unused variable warning

    // Update day counter (3 minutes = 1 game day)
    var currentTime = Date.now();
    var timeSinceLastDay = currentTime - this.gameState.dayStartTime;
    if (timeSinceLastDay >= this.gameState.dayLength) {
      this.gameState.currentDay++;
      this.gameState.dayStartTime = currentTime;
      if (this.ui) {
        this.ui.showMessage(`Day ${this.gameState.currentDay} begins`, 'system-neutral');
      }
    }

    // Convert mouse screen coordinates to world coordinates for ship aiming
    var vec = new THREE.Vector3();
    var pos = new THREE.Vector3();
    vec.set(
      (this.mouseScreenPosition.x / window.innerWidth) * 2 - 1,
      -(this.mouseScreenPosition.y / window.innerHeight) * 2 + 1,
      0.5
    );
    vec.unproject(this.camera);
    var dir = vec.sub(this.camera.position).normalize();
    var distance = -this.camera.position.z / dir.z;
    pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
    this.gameState.mouseWorldPosition.set(pos.x, pos.y);

    if (this.playerShip) {
      this.playerShip.update(this.keys, this.gameState.mouseWorldPosition, this.camera);
    }

    if (this.aiSystem) {
      this.aiSystem.update(deltaTime);
    }

    if (this.economySystem) {
      this.economySystem.update(deltaTime);
    }

    if (this.uiSystem) {
      this.uiSystem.update(deltaTime);
    }

    // Update camera to follow player
    if (this.playerShip) {
      this.camera.position.set(this.playerShip.mesh.position.x, this.playerShip.mesh.position.y, 100);
    }

    // Update minimap if it exists
    if (this.minimap) {
      this.minimap.update();
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    var deltaTime = this.clock.getDelta();
    this.update(deltaTime);
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera); // Render labels
  }

  spawnAsteroids(count) {
    // Define the asteroid creation function outside the loop to avoid no-loop-func issue
    var createAsteroid = function(x, y, size) {
      var asteroid = new Asteroid(x, y, size);
      this.entities.asteroids.push(asteroid);
      this.scene.add(asteroid.mesh);
    }.bind(this);

    var expandedCount = count * 1.5; // Increase asteroid count for larger space
    for (var i = 0; i < expandedCount; i++) {
      // Expanded from 1600 to 2000 for better coverage
      var x = (Math.random() - 0.5) * 2000;
      var y = (Math.random() - 0.5) * 2000;

      var size = 2 + Math.random() * 4;
      createAsteroid(x, y, size);
    }
  }

  spawnDerelicts(count) {
    // Initialize derelicts array if it doesn't exist
    if (!this.entities.derelicts) {
      this.entities.derelicts = [];
    }

    // Define possible cargo types for derelicts
    var cargoTypes = [
      { type: 'Scrap Metal', value: 50 },
      { type: 'Damaged Components', value: 100 },
      { type: 'Data Core', value: 200 },
      { type: 'Rare Artifact', value: 500 }
    ];

    for (var i = 0; i < count; i++) {
      // Position derelicts randomly in the zone
      var x = (Math.random() - 0.5) * 1600;
      var y = (Math.random() - 0.5) * 1600;

      // Create a simple derelict ship mesh (placeholder)
      var derelictGeometry = new THREE.BoxGeometry(5, 3, 2);
      var derelictMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
      var derelictMesh = new THREE.Mesh(derelictGeometry, derelictMaterial);
      derelictMesh.position.set(x, y, 0);
      this.scene.add(derelictMesh);

      // Randomly select cargo type and value
      var cargo = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];

      // Create derelict object
      var derelict = {
        mesh: derelictMesh,
        cargoType: cargo.type,
        cargoValue: cargo.value,
        salvaged: false,
      };

      // Add to derelicts array
      this.entities.derelicts.push(derelict);
    }
  }
}
