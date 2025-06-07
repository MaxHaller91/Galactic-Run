import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/renderers/CSS2DRenderer.js';
// Removed duplicate imports
import { PlayerShip } from 'ship';
import { UIManager } from 'ui';
import { SimpleStationWithTrading, SimplePirate, Projectile, Asteroid, JumpGate, SimplePolice, MiningShip, PirateStation, DistressBeacon, SimpleFriendlyShip, SimpleTrader, SimplePlayerCargo } from 'entities';
// REMOVED: Complex COMMODITIES_LIST - using simple materials/goods system
// REMOVED: MiningLaser - conflicts with AI mining system
import { Minimap } from 'minimap'; // Import the Minimap class
import { WeaponSystem, WEAPON_TYPES } from 'weapons'; // Import the new weapon system
import { EconomyDebugPanel } from 'economyDebug'; // Import the economy debug panel
import { DebugSystem } from 'debug'; // Import the debug system
import { ZoneEventLogger } from 'zoneEventLogger'; // Import the event logger
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
      cargo: [],
      maxCargo: 10,
      engineLevel: 1,
      weaponLevel: 1,
      isPaused: false,
      mouseWorldPosition: new THREE.Vector2(), // Add mouse position to gameState
      factionStandings: {
        'Federated Commerce Guild': 0,
        'Outer Rim Prospectors': 0
      },
      // Day counter system - 3 minutes = 1 game day
      currentDay: 1,
      dayStartTime: Date.now(),
      dayLength: 180000 // 3 minutes in milliseconds
    };
    
    this.zones = {
      'alpha-sector': {
        name: 'Alpha Sector',
        factionControl: 'Federated Commerce Guild',
        description: 'A bustling core sector, well-policed.',
        stations: [], // Will hold station names/IDs specific to this zone
        asteroids: [], // Asteroid fields specific to this zone
        pirateActivity: 'low',
        bgColor: 0x000011 // Default dark blue
      },
      'outer-wilds': {
        name: 'Outer Wilds',
        factionControl: 'Outer Rim Prospectors',
        description: 'A lawless frontier, rich in resources but dangerous.',
        stations: [],
        asteroids: [],
        pirateActivity: 'high',
        bgColor: 0x110000 // Dark red hue
      }
      // More zones can be added here
    };
    this.gameState.currentZoneId = 'alpha-sector'; // Player starts in Alpha Sector
    this.entities = { // Entities will now be managed per-zone or globally if they can travel
      stations: [],   // For now, these are global, will be associated with zones
      pirates: [],    // These will be zone-specific
      projectiles: [],
      asteroids: [],
      jumpGates: [],
      friendlyShips: [], // Add friendlyShips array
      police: [], // Add police array
      pirateStations: [], // Add pirate stations array
      distressBeacons: [], // Add distress beacons array for MVP system
      traders: [] // Add traders array for SimpleTrader ships
    };
    // REMOVED: MiningLaser - conflicts with AI mining system  
    this.minimap = null; // Initialize minimap reference
    this.weaponSystem = null; // Initialize weapon system reference
    this.eventLogger = null; // Initialize event logger reference
    this.timeScale = 1.0; // Add time scale property
    
    this.keys = {};
    this.mouseScreenPosition = new THREE.Vector2();
    this.setupInput();
  }
  init() {
    this.setupRenderer();
    // Initialize simple player cargo system
    SimplePlayerCargo.initializePlayerCargo(this.gameState);
    this.loadZone(this.gameState.currentZoneId);
    this.ui = new UIManager(this.gameState, this.zones, this); 
    // REMOVED: MiningLaser - conflicts with AI mining system
    this.weaponSystem = new WeaponSystem(this); // Initialize weapon system
    this.economyDebug = new EconomyDebugPanel(this); // Initialize economy debug panel
    this.debugSystem = new DebugSystem(this); // Initialize debug system
    this.eventLogger = new ZoneEventLogger(this); // Initialize event logger
    this.eventLogger.logPlayer('Game initialized', { version: '2.4.0' });
    // Player ship is created in loadZone, ensure it exists before minimap init uses it
    // For now, minimap constructor handles if playerShip is null initially.
    // A safer approach would be to initialize minimap after playerShip is guaranteed.
    // Let's assume loadZone creates playerShip before this.minimap is used in update loop.
    this.minimap = new Minimap('minimapContainer', this.entities, this.playerShip, this.camera, 150, 2000);
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
    
    window.addEventListener('resize', () => {
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.left = -50 * aspect;
      this.camera.right = 50 * aspect;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.labelRenderer.setSize(window.innerWidth, window.innerHeight); // Resize label renderer too
    });
  }

  setupSceneParameters(zoneConfig) {
    this.renderer.setClearColor(zoneConfig.bgColor || 0x000011);
    // Potentially add zone-specific lighting, fog, etc. here later
    
    // Re-create or update starfield based on zone if desired
    // For now, let's keep a generic starfield but clear old one if any
    if (this.stars) this.scene.remove(this.stars);
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 800 + Math.random() * 400; // Vary star density per zone
    const positions = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * (1000 + Math.random() * 500); // Vary spread
      positions[i + 1] = (Math.random() - 0.5) * (1000 + Math.random() * 500);
      positions[i + 2] = -50 - Math.random() * 50; // Vary depth
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({ 
        color: 0xffffff, 
        size: 0.8 + Math.random() * 0.4 // Vary star size
    });
    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
    
    // Camera setup (remains largely the same unless zones have different scales)
    this.camera.position.z = 10;
  }
  clearZoneEntities() {
    // Remove all zone-specific entities from the scene and arrays
    this.entities.stations.forEach(s => {
        this.scene.remove(s.mesh);
        if (s.label) this.scene.remove(s.label); // CSS2DObject is added directly to scene
    });
    this.entities.pirates.forEach(p => this.scene.remove(p.mesh));
    this.entities.asteroids.forEach(a => this.scene.remove(a.mesh));
    this.entities.jumpGates.forEach(jg => {
        this.scene.remove(jg.mesh);
        // Note: CSS2DObjects are added to the mesh, so removing mesh removes label.
    });
    // Remove derelicts if they exist
    if (this.entities.derelicts) {
      this.entities.derelicts.forEach(d => this.scene.remove(d.mesh));
      this.entities.derelicts = [];
    }
    // Remove pirate stations
    this.entities.pirateStations.forEach(ps => this.scene.remove(ps.mesh));
    this.entities.pirateStations = [];
    // Projectiles are short-lived and managed separately, but good to clear any stragglers
    this.entities.projectiles.forEach(p => this.scene.remove(p.mesh));
    this.entities.stations = [];
    this.entities.pirates = [];
    this.entities.asteroids = [];
    this.entities.projectiles = [];
    this.entities.jumpGates = [];
    this.entities.friendlyShips.forEach(fs => this.scene.remove(fs.mesh)); // Remove friendly ships
    this.entities.friendlyShips = [];                                     // Clear array
    this.entities.police.forEach(p => this.scene.remove(p.mesh)); // Remove police
    this.entities.police = [];                                     // Clear array
    if (this.entities.miningShips) {
      this.entities.miningShips.forEach(ms => this.scene.remove(ms.mesh)); // Remove mining ships
      this.entities.miningShips = [];                                      // Clear array
    }
    if (this.ui) { // Check if UI is initialized
      this.ui.clearAllIndicators(); // Use new UI method
    }
  }
  loadZone(zoneId) {
    const zoneConfig = this.zones[zoneId];
    if (!zoneConfig) {
      console.error(`Zone ${zoneId} not found!`);
      return;
    }
    // Jump flash effect
    const flashOverlay = document.getElementById('jumpFlashOverlay');
    if (flashOverlay) {
        flashOverlay.style.opacity = '1';
        setTimeout(() => {
            flashOverlay.style.opacity = '0';
        }, 250); // Flash duration
    }
    // Delay zone loading slightly to let flash effect be visible
    setTimeout(() => {
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
            // Stations spread much further apart for epic scale
            const stationPositions = [
                { x: -400, y: 300, name: 'Alpha Station Prime' },
                { x: 450, y: 350, name: 'Trade Hub Alpha' },
                { x: -200, y: -400, name: 'Commerce Central' }
            ];
            stationPositions.forEach(pos => {
                const station = new SimpleStationWithTrading(pos.x, pos.y, pos.name, CSS2DObject);
                station.game = this; // Add game reference for event logging
                this.entities.stations.push(station);
                this.scene.add(station.mesh);
                zoneConfig.stations.push(station.name);
            });
            this.spawnPirates(zoneConfig.pirateActivity === 'low' ? 3 : 2);
            this.spawnAsteroids(12); // More asteroids for larger space
            this.spawnDerelicts(3); // Add derelict ships to discover
            
            // Add pirate station in Alpha Sector (low threat)
            const pirateStation1 = new PirateStation(-700, -300, CSS2DObject);
            this.entities.pirateStations.push(pirateStation1);
            this.scene.add(pirateStation1.mesh);
            
            // Jump gate positioned at zone edge
            const gateToOuterWilds = new JumpGate(800, 0, 'outer-wilds', this.zones['outer-wilds'].name, CSS2DObject);
            this.entities.jumpGates.push(gateToOuterWilds);
            this.scene.add(gateToOuterWilds.mesh);
        } else if (zoneId === 'outer-wilds') {
            // Fewer, more spread out stations in the frontier
            const stationPositions = [
                { x: 0, y: 0, name: 'Prospector Deep' },
                { x: -600, y: 400, name: 'Mining Outpost Zeta' }
            ];
            stationPositions.forEach(pos => {
                const station = new SimpleStationWithTrading(pos.x, pos.y, pos.name, CSS2DObject);
                station.game = this; // Add game reference for event logging
                this.entities.stations.push(station);
                this.scene.add(station.mesh);
                zoneConfig.stations.push(station.name);
            });
            this.spawnPirates(zoneConfig.pirateActivity === 'high' ? 8 : 4);
            this.spawnAsteroids(25); // Rich in resources
            this.spawnDerelicts(5); // More derelicts in dangerous space
            
            // Add multiple pirate stations in Outer Wilds (high threat)
            const pirateStation2 = new PirateStation(400, -500, CSS2DObject);
            const pirateStation3 = new PirateStation(-300, 600, CSS2DObject);
            this.entities.pirateStations.push(pirateStation2);
            this.entities.pirateStations.push(pirateStation3);
            this.scene.add(pirateStation2.mesh);
            this.scene.add(pirateStation3.mesh);
            
            // Jump gate back to alpha sector
            const gateToAlphaSector = new JumpGate(-800, 0, 'alpha-sector', this.zones['alpha-sector'].name, CSS2DObject);
            this.entities.jumpGates.push(gateToAlphaSector);
            this.scene.add(gateToAlphaSector.mesh);
        }
        this.spawnFriendlyShips(zoneId === 'alpha-sector' ? 2 : 1);
        this.spawnPolice(zoneId, zoneConfig.factionControl);
        this.spawnTraders(zoneId === 'alpha-sector' ? 3 : 2); // Spawn trader ships for economy
        if (this.ui) {
            this.ui.initializeStationIndicators(this.entities.stations);
            this.ui.initializeJumpGateIndicators(this.entities.jumpGates); // Initialize jump gate indicators
        }
        if (this.ui) this.ui.showMessage(`Entered ${zoneConfig.name}`);
    }, 150); // Delay slightly less than flash duration for smoother transition
  }
  // The spawnPirates function and others should be outside the loadZone method.
  // The extra closing brace for loadZone was also removed.
  spawnPirates(count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 100;
      const x = this.playerShip.mesh.position.x + Math.cos(angle) * distance;
      const y = this.playerShip.mesh.position.y + Math.sin(angle) * distance;
      
      const pirate = new SimplePirate(x, y);
      this.entities.pirates.push(pirate);
      this.scene.add(pirate.mesh);
    }
  }
  spawnFriendlyShips(count) {
    for (let i = 0; i < count; i++) {
      // Spawn near a random station in the current zone
      let spawnX, spawnY;
      if (this.entities.stations.length > 0) {
        const randomStation = this.entities.stations[Math.floor(Math.random() * this.entities.stations.length)];
        spawnX = randomStation.mesh.position.x + (Math.random() - 0.5) * 20;
        spawnY = randomStation.mesh.position.y + (Math.random() - 0.5) * 20;
      } else { // Fallback if no stations
        spawnX = (Math.random() - 0.5) * 100;
        spawnY = (Math.random() - 0.5) * 100;
      }
      // Pass all stations (global for now) to the friendly ship for decision making.
      // If stations become zone-specific, this will need adjustment.
      const friendlyShip = new SimpleFriendlyShip(spawnX, spawnY, this.entities.stations, this);
      this.entities.friendlyShips.push(friendlyShip);
      this.scene.add(friendlyShip.mesh);
    }
  }

  spawnPolice(zoneId, factionControl) {
    // MVP police spawning - simple individual units
    const policeCount = zoneId === 'alpha-sector' ? 4 : 2; // Number of police ships
    
    for (let i = 0; i < policeCount; i++) {
      // Spawn police near a random station
      let spawnX, spawnY;
      if (this.entities.stations.length > 0) {
        const randomStation = this.entities.stations[Math.floor(Math.random() * this.entities.stations.length)];
        spawnX = randomStation.mesh.position.x + (Math.random() - 0.5) * 40;
        spawnY = randomStation.mesh.position.y + (Math.random() - 0.5) * 40;
      } else {
        spawnX = (Math.random() - 0.5) * 200;
        spawnY = (Math.random() - 0.5) * 200;
      }
      
      // Create simple police
      const police = new SimplePolice(spawnX, spawnY, this.entities.stations, factionControl);
      
      this.entities.police.push(police);
      this.scene.add(police.mesh);
      
      if (this.ui) {
        this.ui.showMessage(`Police patrol deployed in ${zoneId}`, 'system-neutral');
      }
    }
  }

  spawnTraders(count) {
    for (let i = 0; i < count; i++) {
      // Spawn traders between stations for economy circulation
      let spawnX, spawnY;
      if (this.entities.stations.length > 0) {
        const randomStation = this.entities.stations[Math.floor(Math.random() * this.entities.stations.length)];
        spawnX = randomStation.mesh.position.x + (Math.random() - 0.5) * 60;
        spawnY = randomStation.mesh.position.y + (Math.random() - 0.5) * 60;
      } else {
        spawnX = (Math.random() - 0.5) * 200;
        spawnY = (Math.random() - 0.5) * 200;
      }
      
      // Create trader with access to all stations for trading AI
      const trader = new SimpleTrader(spawnX, spawnY, this.entities.stations, this);
      
      this.entities.traders.push(trader);
      this.scene.add(trader.mesh);
    }
  }

  spawnConstructedShip(station, shipType) {
    // Spawn a ship near the station that built it
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 10;
    const x = station.mesh.position.x + Math.cos(angle) * distance;
    const y = station.mesh.position.y + Math.sin(angle) * distance;
    
    let newShip;
    
    switch(shipType) {
      case 'police':
        newShip = new Police(x, y, this.entities.stations, station.controllingFaction);
        this.entities.police.push(newShip);
        break;
      case 'miner':
        // We'll create MiningShip class in Phase 2
        newShip = new MiningShip(x, y, this.entities.asteroids, station);
        if (!this.entities.miningShips) this.entities.miningShips = [];
        this.entities.miningShips.push(newShip);
        break;
      case 'trader':
        newShip = new FriendlyShip(x, y, this.entities.stations, this);
        this.entities.friendlyShips.push(newShip);
        break;
    }
    
    if (newShip) {
      this.scene.add(newShip.mesh);
      station.ownedShips.push(newShip);
      
      if (this.ui) {
        this.ui.showMessage(`${station.name} deployed new ${shipType}!`, 'system-neutral');
      }
    }
  }
  spawnAsteroids(count) {
    // 4x asteroid count with expanded distribution
    const expandedCount = count * 4; 
    
    for (let i = 0; i < expandedCount; i++) {
      // Expanded from 1600 to 2000 for better coverage
      const x = (Math.random() - 0.5) * 2000; 
      const y = (Math.random() - 0.5) * 2000;
      
      const size = 2 + Math.random() * 4;
      const asteroid = new Asteroid(x, y, size);
      this.entities.asteroids.push(asteroid);
      this.scene.add(asteroid.mesh);
    }
  }

  spawnDerelicts(count) {
    // Add derelicts array to entities if it doesn't exist
    if (!this.entities.derelicts) {
      this.entities.derelicts = [];
    }
    
    for (let i = 0; i < count; i++) {
      // Spread derelicts across the zone, avoiding too close to stations
      let x, y, tooClose;
      do {
        x = (Math.random() - 0.5) * 1400; // Slightly smaller range than asteroids
        y = (Math.random() - 0.5) * 1400;
        
        // Check if too close to any station
        tooClose = this.entities.stations.some(station => {
          const distance = Math.sqrt((x - station.mesh.position.x) ** 2 + (y - station.mesh.position.y) ** 2);
          return distance < 100; // Keep derelicts at least 100 units from stations
        });
      } while (tooClose);
      
      const derelict = this.createDerelict(x, y);
      this.entities.derelicts.push(derelict);
      this.scene.add(derelict.mesh);
    }
  }

  createDerelict(x, y) {
    // Create a derelict ship object
    const derelict = {
      mesh: this.createDerelictMesh(),
      salvaged: false,
      cargoValue: 50 + Math.random() * 200, // Random salvage value
      cargoType: this.getRandomSalvageType()
    };
    
    derelict.mesh.position.set(x, y, 0);
    
    // Add a subtle rotation for visual variety
    derelict.mesh.rotation.z = Math.random() * Math.PI * 2;
    
    return derelict;
  }

  createDerelictMesh() {
    const group = new THREE.Group();
    
    // Main hull - damaged looking
    const hullGeometry = new THREE.BoxGeometry(4, 2, 1);
    const hullMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    group.add(hull);
    
    // Broken engine section
    const engineGeometry = new THREE.CylinderGeometry(0.5, 0.8, 1.5, 6);
    const engineMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const engine = new THREE.Mesh(engineGeometry, engineMaterial);
    engine.position.set(-2, 0, 0);
    engine.rotation.z = Math.PI / 2;
    group.add(engine);
    
    // Debris pieces
    for (let i = 0; i < 3; i++) {
      const debrisGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const debrisMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      debris.position.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 2
      );
      group.add(debris);
    }
    
    return group;
  }

  getRandomSalvageType() {
    const salvageTypes = [
      'Scrap Metal',
      'Electronic Components',
      'Rare Alloys',
      'Data Cores',
      'Power Cells'
    ];
    return salvageTypes[Math.floor(Math.random() * salvageTypes.length)];
  }

  setupInput() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      // Spacebar no longer fires weapon
      if (e.code === 'KeyE') {
        this.keys['KeyE_pressed_once'] = true; // Set a flag for one-time press
        this.checkInteractions(); 
      }
      // REMOVED: Player mining system - conflicts with AI mining
      if (e.code === 'KeyY') {
        this.toggleShipInfoPanel();
      }
      if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
        // Switch weapons with number keys
        if (this.weaponSystem) {
          const weaponSlot = parseInt(e.code.slice(-1)) - 1;
          if (this.weaponSystem.weapons[weaponSlot]) {
            this.weaponSystem.currentWeapon = weaponSlot;
            this.ui.showMessage(`Switched to ${this.weaponSystem.weapons[weaponSlot].type.name}`, 'system-neutral');
          }
        }
      }
      if (e.code === 'KeyQ') {
        // Cycle weapons with Q key
        if (this.weaponSystem) {
          this.weaponSystem.switchWeapon();
        }
      }
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyE') {
        this.keys['KeyE_pressed_once'] = false; // Reset flag on key up
      }
      // REMOVED: Player mining keyup handling - conflicts with AI mining
    });
    document.addEventListener('mousemove', (e) => {
      this.mouseScreenPosition.x = e.clientX;
      this.mouseScreenPosition.y = e.clientY;
    });
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left mouse button
        // Check if the click is on the game canvas and not on a UI element
        const gameContainer = document.getElementById('gameContainer');
        if (e.target === gameContainer || gameContainer.contains(e.target) && e.target.closest('.ui-panel') === null) {
          this.fireWeapon();
        }
      }
    });
  }
  toggleShipInfoPanel() {
    const panel = document.getElementById('shipInfoPanel');
    if (panel) {
      const isCurrentlyVisible = panel.classList.contains('visible');
      panel.classList.toggle('visible');
      if (!isCurrentlyVisible && this.ui) { // If it wasn't visible and is now being opened
        this.ui.updateShipInfoPanel();
      }
    }
  }
  fireWeapon() {
    if (this.weaponSystem) {
      const playerPos = this.playerShip.mesh.position;
      const playerRot = this.playerShip.rotation;
      this.weaponSystem.fireWeapon(playerPos, playerRot);
    }
  }

  checkInteractions() {
    const playerPos = this.playerShip.mesh.position;
    
    this.entities.stations.forEach(station => {
      const distance = playerPos.distanceTo(station.mesh.position);
      if (distance < 15) {
        this.ui.showTradePanel(station);
      }
    });
    
    // Check derelict interactions
    if (this.entities.derelicts) {
      this.entities.derelicts.forEach((derelict, index) => {
        const distance = playerPos.distanceTo(derelict.mesh.position);
        if (distance < 12 && !derelict.salvaged) {
          this.ui.showMessage(`Derelict ship detected. Press E to salvage.`);
          if (this.keys['KeyE_pressed_once']) {
            this.salvageDerelict(derelict, index);
            this.keys['KeyE_pressed_once'] = false;
            return;
          }
        }
      });
    }
    
    // Check Jump Gate interactions (interaction logic will be expanded later)
    this.entities.jumpGates.forEach(gate => {
      const distance = playerPos.distanceTo(gate.mesh.position);
      if (distance < gate.interactionRadius) {
        this.ui.showMessage(`Approaching Jump Gate to ${gate.destinationName}. Press E to jump.`);
        // Actual jump logic:
        if (this.keys['KeyE_pressed_once']) { // Use a flag that's reset after use
            this.loadZone(gate.targetZoneId);
            this.keys['KeyE_pressed_once'] = false; // Reset flag
            return; // Exit checkInteractions early to prevent multiple jumps or interactions
        }
      }
    });
  }

  salvageDerelict(derelict, index) {
    if (this.gameState.cargo.length < this.gameState.maxCargo) {
      this.gameState.cargo.push({
        name: derelict.cargoType,
        type: 'salvage',
        paidPrice: 0,
        basePrice: derelict.cargoValue
      });
      this.gameState.credits += Math.floor(derelict.cargoValue * 0.5); // Immediate partial value
      this.ui.showMessage(`Salvaged ${derelict.cargoType}! +$${Math.floor(derelict.cargoValue * 0.5)}`, 'player-trade');
      
      // Mark as salvaged and change appearance
      derelict.salvaged = true;
      derelict.mesh.children.forEach(child => {
        if (child.material) {
          child.material.color.multiplyScalar(0.5); // Darken the derelict
        }
      });
    } else {
      this.ui.showMessage('Cargo hold full! Cannot salvage derelict.', 'warning');
    }
  }
  attemptMining() {
    // This will be implemented in a future step
    // For now, it could log or show a message
    const playerPos = this.playerShip.mesh.position;
    let minedSomething = false;
    for (let i = this.entities.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.entities.asteroids[i];
      const distance = playerPos.distanceTo(asteroid.mesh.position);
      const miningRange = asteroid.size + 15; // Increased range for laser
      if (distance < miningRange) { // Check if close enough to mine
        minedSomething = true;
        if (!this.miningLaser.isActive) {
          this.miningLaser.activate(playerPos, asteroid.mesh.position);
        }
        this.miningLaser.updatePositions(playerPos, asteroid.mesh.position);
        // Simulate continuous mining: reduce health over time
        // For simplicity, let's make it so holding 'M' damages it over time.
        // A more robust solution would involve a timer or mining progress bar.
        // Assuming deltaTime is available or a fixed mining rate.
        // For now, let's use a simple damage per "M" press.
        asteroid.health -= 2; // Reduced damage per press, needs to be held
        this.ui.showMessage(`Mining ${asteroid.resourceType}... Health: ${Math.max(0, asteroid.health)}`, 'system-neutral');
        if (asteroid.health <= 0) {
          this.ui.showMessage(`${asteroid.resourceType} collected! +$${asteroid.resourceValue}`, 'player-trade');
          if (this.gameState.cargo.length < this.gameState.maxCargo) {
            this.gameState.cargo.push({ 
              name: asteroid.resourceType, 
              type: 'raw', // Assume mined resources are raw type
              paidPrice: 0, // Acquired, not bought
              basePrice: asteroid.resourceValue // Store its base value for potential sale
            });
            this.gameState.credits += asteroid.resourceValue; // Give credits for mined ore directly for now
          } else {
            this.ui.showMessage(`Cargo full! ${asteroid.resourceType} lost.`, 'warning');
          }
          this.scene.remove(asteroid.mesh);
          this.entities.asteroids.splice(i, 1);
          this.miningLaser.deactivate(); // Stop laser when asteroid is destroyed
        }
        break; // Mine one at a time
      }
    }
    if (!minedSomething) {
      this.ui.showMessage('No asteroids in range to mine.', 'info');
    }
    if (!minedSomething && this.miningLaser.isActive) {
      this.miningLaser.deactivate(); // If M is pressed but no target, deactivate
    }
     // Reset KeyM_released after processing
    this.keys['KeyM_released'] = false;
  }

  update(deltaTime) {
    if (this.gameState.isPaused) return;
    
    // Apply time scale to delta time
    const scaledDeltaTime = deltaTime * this.timeScale;
    
    // Update day counter (3 minutes = 1 game day)
    const currentTime = Date.now();
    const timeSinceLastDay = currentTime - this.gameState.dayStartTime;
    if (timeSinceLastDay >= this.gameState.dayLength) {
      this.gameState.currentDay++;
      this.gameState.dayStartTime = currentTime;
      if (this.ui) {
        this.ui.showMessage(`Day ${this.gameState.currentDay} begins`, 'system-neutral');
      }
    }
    
    // Convert mouse screen coordinates to world coordinates for ship aiming
    const vec = new THREE.Vector3();
    const pos = new THREE.Vector3();
    vec.set(
        (this.mouseScreenPosition.x / window.innerWidth) * 2 - 1,
        - (this.mouseScreenPosition.y / window.innerHeight) * 2 + 1,
        0.5 ); // z = 0.5 important for orthographic unproject
    vec.unproject( this.camera );
    vec.sub( this.camera.position ).normalize(); // This part is more for perspective, but let's keep it general
    const distance = -this.camera.position.z / vec.z; // For ortho, this should work out
    pos.copy( this.camera.position ).add( vec.multiplyScalar( distance ) );
    this.gameState.mouseWorldPosition.set(pos.x, pos.y);
    // Update player ship
    if (this.playerShip) {
      this.playerShip.update(scaledDeltaTime, this.keys, this.gameState, this);
    }
    
    // Update camera to follow player
    if (this.playerShip) {
      this.camera.position.x = this.playerShip.mesh.position.x;
      this.camera.position.y = this.playerShip.mesh.position.y;
    }
    
    // Update distress beacons (MVP system)
    if (this.entities.distressBeacons) {
      this.entities.distressBeacons = this.entities.distressBeacons.filter(beacon => {
        const stillActive = beacon.update(scaledDeltaTime);
        if (!stillActive) {
          this.scene.remove(beacon.mesh);
          return false;
        }
        return true;
      });
    }

    // Update pirates - filter out undefined/null values first
    this.entities.pirates = this.entities.pirates.filter(pirate => pirate && pirate.mesh);
    this.entities.pirates.forEach(pirate => {
      pirate.update(scaledDeltaTime, this); // Use new Simple class signature
    });
    
    // Update projectiles
    this.entities.projectiles = this.entities.projectiles.filter(projectile => {
      // Update projectile with game reference for enhanced features
      if (projectile.update) {
        projectile.update(scaledDeltaTime, this);
      } else {
        // Fallback for old projectiles
        projectile.update(scaledDeltaTime);
      }
      
      if (projectile.life <= 0) {
        this.scene.remove(projectile.mesh);
        return false;
      }
      
      // Check collisions
      if (projectile.isPlayerProjectile) {
        // Check pirate hits
        for (let i = this.entities.pirates.length - 1; i >= 0; i--) {
          const pirate = this.entities.pirates[i];
          let hit = false;
          
          // Use enhanced collision detection if available
          if (projectile.checkCollision) {
            hit = projectile.checkCollision(pirate, this);
          } else {
            // Fallback collision detection
            const distance = projectile.mesh.position.distanceTo(pirate.mesh.position);
            hit = distance < 3;
          }
          
          if (hit) {
            // Use projectile damage if available, otherwise use weapon level
            const damage = projectile.damage || (10 * this.gameState.weaponLevel);
            const destroyed = pirate.takeDamage(damage, this);
            this.scene.remove(projectile.mesh);
            
            if (destroyed) {
              this.scene.remove(pirate.mesh);
              this.entities.pirates.splice(i, 1);
              this.gameState.credits += 50;
              this.ui.showMessage('Pirate destroyed! +$50');
              if (this.entities.pirates.length < 3) {
                  setTimeout(() => this.spawnPirates(1), 5000);
              }
            } else {
              this.ui.showMessage('Pirate hit!');
            }
            return false;
          }
        }
      } else {
        // Check player hits
        const distance = projectile.mesh.position.distanceTo(this.playerShip.mesh.position);
        if (distance < 3) {
          this.gameState.shields -= 10;
          if (this.gameState.shields <= 0) {
            this.gameState.hull -= 5;
            this.gameState.shields = 0;
          }
          this.scene.remove(projectile.mesh);
          
          // Check if player ship is destroyed
          if (this.gameState.hull <= 0) {
            this.ui.showMessage('SHIP DESTROYED! Game Over!', 'combat');
            // Could add game over logic here
          }
          return false;
        }
        
        // Check friendly ship hits
        for (let i = this.entities.friendlyShips.length - 1; i >= 0; i--) {
          const friendlyShip = this.entities.friendlyShips[i];
          const distance = projectile.mesh.position.distanceTo(friendlyShip.mesh.position);
          if (distance < 3) {
            const destroyed = friendlyShip.takeDamage(10);
            this.scene.remove(projectile.mesh);
            
            if (destroyed) {
              this.scene.remove(friendlyShip.mesh);
              this.entities.friendlyShips.splice(i, 1);
              this.ui.showMessage('Friendly ship destroyed!', 'warning');
            }
            return false;
          }
        }
        
        // Check police hits
        for (let i = this.entities.police.length - 1; i >= 0; i--) {
          const police = this.entities.police[i];
          const distance = projectile.mesh.position.distanceTo(police.mesh.position);
          if (distance < 3) {
            const destroyed = police.takeDamage(10);
            this.scene.remove(projectile.mesh);
            
            if (destroyed) {
              this.scene.remove(police.mesh);
              this.entities.police.splice(i, 1);
              this.ui.showMessage('Police ship destroyed!', 'warning');
            }
            return false;
          }
        }
      }
      
      return true;
    });
    // Update asteroids
    this.entities.asteroids.forEach(asteroid => asteroid.update(scaledDeltaTime));
    // Update Jump Gates (for animations, etc.)
    this.entities.jumpGates.forEach(gate => gate.update(scaledDeltaTime));
    // Update friendly ships - filter out undefined/null values first
    this.entities.friendlyShips = this.entities.friendlyShips.filter(ship => ship && ship.mesh);
    this.entities.friendlyShips.forEach(ship => ship.update(scaledDeltaTime));
    
    // Update police - filter out undefined/null values first
    this.entities.police = this.entities.police.filter(police => police && police.mesh);
    this.entities.police.forEach(police => police.update(scaledDeltaTime, this));
    
    // Update mining ships
    if (this.entities.miningShips) {
      this.entities.miningShips.forEach(miner => miner.update(scaledDeltaTime));
    }
    
    // Update pirate stations
    this.entities.pirateStations.forEach(pirateStation => {
      pirateStation.update(scaledDeltaTime, this);
    });
    
    // Update stations with new SimpleStation system
    this.entities.stations.forEach(station => {
      station.update(scaledDeltaTime, this);
    });
    
    // Update traders for economy circulation
    if (this.entities.traders) {
      this.entities.traders = this.entities.traders.filter(trader => trader && trader.mesh);
      this.entities.traders.forEach(trader => trader.update(scaledDeltaTime));
    }
    
    // Update miners for material supply
    if (this.entities.miners) {
      this.entities.miners = this.entities.miners.filter(miner => miner && miner.mesh);
      this.entities.miners.forEach(miner => miner.update(scaledDeltaTime));
    }
    
    // Update weapon system
    if (this.weaponSystem) {
      this.weaponSystem.update(deltaTime);
    }
    
    // Update economy debug panel
    if (this.economyDebug) {
      this.economyDebug.update(deltaTime);
    }
    if (this.miningLaser && this.miningLaser.isActive) {
      // If player or asteroid moves, laser needs to be updated
      // For simplicity, we re-check the closest asteroid if laser is active.
      // A more robust way would be to store the target asteroid.
      let targetAsteroid = null;
      let minDist = Infinity;
      this.entities.asteroids.forEach(ast => {
        const dist = this.playerShip.mesh.position.distanceTo(ast.mesh.position);
        if (dist < (ast.size + 15) && dist < minDist) {
            minDist = dist;
            targetAsteroid = ast;
        }
      });
      if (targetAsteroid) {
        this.miningLaser.updatePositions(this.playerShip.mesh.position, targetAsteroid.mesh.position);
        // Continue mining logic (damage, collection) could also be here if M is held
      } else {
        this.miningLaser.deactivate(); // Target lost
      }
      this.miningLaser.update(); // For animation like pulsing
    }
    
    // Spawn more pirates occasionally if player ventures out or time passes
    // This random spawn is now less critical as pirates respawn upon destruction.
    // We can make this conditional on player distance from start or game time.
    // For now, reducing its frequency.
    if (Math.random() < 0.0001 && this.entities.pirates.length < 5) {
        const playerPos = this.playerShip.mesh.position;
        const distFromStart = playerPos.distanceTo(new THREE.Vector3(-80, 50, 0));
        if (distFromStart > 150) { // Only spawn new pirates if player is far from start
             this.spawnPirates(1);
        }
    }
    
    // Shield regeneration
    if (this.gameState.shields < 100) {
      this.gameState.shields = Math.min(100, this.gameState.shields + deltaTime * 5);
    }
    
    this.ui.update();
    if (this.minimap) {
        this.minimap.update();
    }
    // Update station indicators
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const screenCenter = new THREE.Vector2(screenWidth / 2, screenHeight / 2);
    const padding = 30; // Padding from screen edge for indicators
    this.entities.stations.forEach(station => {
      const stationWorldPos = station.mesh.position.clone();
      const stationScreenPos = new THREE.Vector3();
      stationScreenPos.copy(stationWorldPos).project(this.camera);
      // Convert normalized device coordinates to screen pixels
      const screenX = (stationScreenPos.x * 0.5 + 0.5) * screenWidth;
      const screenY = (-stationScreenPos.y * 0.5 + 0.5) * screenHeight;
      
      let visible = false;
      let indicatorX = screenX;
      let indicatorY = screenY;
      let angleRad = 0;
      // Check if station is on-screen (station labels handle on-screen, so hide indicator)
      // station.label.visible handles the text label. We want the arrow indicator for off-screen.
      const isOnScreen = screenX > padding && screenX < screenWidth - padding &&
                         screenY > padding && screenY < screenHeight - padding &&
                         stationScreenPos.z < 1; // Ensure it's in front of the camera's near plane
      if (isOnScreen) {
        visible = false; // Hide indicator if station's main label is likely visible
        station.label.visible = true;
      } else {
        visible = true; // Show indicator because station is off-screen
        station.label.visible = false;
        // Clamp indicator to screen edges
        indicatorX = Math.max(padding, Math.min(screenX, screenWidth - padding));
        indicatorY = Math.max(padding, Math.min(screenY, screenHeight - padding));
        
        // If the original screenX/Y was outside, it means we clamped.
        // We need to ensure it's on the *actual* edge if it was truly off-screen.
        // This logic pushes it to the true edge if it was clamped *within* the padded area
        // but was originally much further out.
        if (screenX < padding || screenX > screenWidth - padding || screenY < padding || screenY > screenHeight - padding) {
            // Calculate intersection with screen bounds
            const dx = screenX - screenCenter.x;
            const dy = screenY - screenCenter.y;
            let t = Infinity;
            if (Math.abs(dx) > 0) { // Check intersection with vertical edges
                if (dx > 0) t = Math.min(t, (screenWidth - padding - screenCenter.x) / dx); // Right edge
                else t = Math.min(t, (padding - screenCenter.x) / dx); // Left edge
            }
            if (Math.abs(dy) > 0) { // Check intersection with horizontal edges
                 if (dy > 0) t = Math.min(t, (screenHeight - padding - screenCenter.y) / dy); // Bottom edge
                 else t = Math.min(t, (padding - screenCenter.y) / dy); // Top edge
            }
            indicatorX = screenCenter.x + dx * t;
            indicatorY = screenCenter.y + dy * t;
        }
        
        // Calculate angle for indicator rotation
        // The indicator's tip should point from its position (indicatorX, indicatorY) towards the station's direction from screen center
        const dxIndicatorToCenter = indicatorX - screenCenter.x;
        const dyIndicatorToCenter = indicatorY - screenCenter.y;
        angleRad = Math.atan2(dyIndicatorToCenter, dxIndicatorToCenter);
      }
      this.ui.updateStationIndicator(station.name, indicatorX, indicatorY, angleRad, visible);
    });
    // Update Jump Gate indicators
    this.entities.jumpGates.forEach(gate => {
      const gateWorldPos = gate.mesh.position.clone();
      const gateScreenPos = new THREE.Vector3();
      gateScreenPos.copy(gateWorldPos).project(this.camera);
      const screenX = (gateScreenPos.x * 0.5 + 0.5) * screenWidth;
      const screenY = (-gateScreenPos.y * 0.5 + 0.5) * screenHeight;
      let visible = false;
      let indicatorX = screenX;
      let indicatorY = screenY;
      let angleRad = 0;
      const isOnScreen = screenX > padding && screenX < screenWidth - padding &&
                         screenY > padding && screenY < screenHeight - padding &&
                         gateScreenPos.z < 1; 
      if (isOnScreen) {
        visible = false; 
        gate.label.visible = true;
      } else {
        visible = true; 
        gate.label.visible = false;
        indicatorX = Math.max(padding, Math.min(screenX, screenWidth - padding));
        indicatorY = Math.max(padding, Math.min(screenY, screenHeight - padding));
        if (screenX < padding || screenX > screenWidth - padding || screenY < padding || screenY > screenHeight - padding) {
            const dx = screenX - screenCenter.x;
            const dy = screenY - screenCenter.y;
            let t = Infinity;
            if (Math.abs(dx) > 0) {
                if (dx > 0) t = Math.min(t, (screenWidth - padding - screenCenter.x) / dx);
                else t = Math.min(t, (padding - screenCenter.x) / dx);
            }
            if (Math.abs(dy) > 0) {
                 if (dy > 0) t = Math.min(t, (screenHeight - padding - screenCenter.y) / dy);
                 else t = Math.min(t, (padding - screenCenter.y) / dy);
            }
            indicatorX = screenCenter.x + dx * t;
            indicatorY = screenCenter.y + dy * t;
        }
        
        const dxIndicatorToCenter = indicatorX - screenCenter.x;
        const dyIndicatorToCenter = indicatorY - screenCenter.y;
        angleRad = Math.atan2(dyIndicatorToCenter, dxIndicatorToCenter);
      }
      if (this.ui) {
        this.ui.updateJumpGateIndicator(gate.mesh.uuid, indicatorX, indicatorY, angleRad, visible);
      }
    });
  }
  animate() {
    requestAnimationFrame(() => this.animate());
    const deltaTime = this.clock.getDelta();
    this.update(deltaTime); // This will call minimap.update() if minimap exists
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera); 
  }
  // Ensure playerShip is passed to minimap if it's created after minimap instance
  // (This is a bit of a patch; ideally, minimap gets playerShip ref once available)
  // For now, the minimap's update method checks for playerShip's existence.
  // A better way in loadZone, after playerShip is created:
  // if (this.minimap && !this.minimap.playerShip) this.minimap.playerShip = this.playerShip;
  // And in minimap constructor: this.playerShip = playerShip (can be initially null)
  // And then in minimap.update(): if (!this.playerShip || !this.playerShip.mesh) return; -> this is already handled.
  // Also when loadZone creates playerShip:
  // if (this.minimap) this.minimap.playerShip = this.playerShip;
  // We need to assign this.playerShip in minimap if it's re-assigned/created in game.
  // Add this to loadZone, after this.playerShip = new PlayerShip();
  // if (this.minimap) { this.minimap.playerShip = this.playerShip; }
  // This is already handled as this.playerShip is a reference that minimap holds.
  // The SpaceCargoGame's `this.playerShip` is what the minimap gets a reference to.
  // If `this.playerShip` instance changes, the minimap needs the new reference.
  // It's passed in the constructor for now.
  // To ensure Minimap has the latest playerShip if it's recreated:
  // In loadZone, after this.playerShip = new PlayerShip(), add:
  // if (this.minimap) { this.minimap.playerShip = this.playerShip; }
  // This makes sure minimap points to the current player object.
  // Let's modify loadZone slightly.
}
