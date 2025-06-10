import { TradingShip } from './entities.js';

/**
 * Debug System for Space Cargo Commander
 * 
 * Features:
 * - Instant teleportation to stations, asteroids, jump gates
 * - Time scale controls for accelerated testing
 * - Quick scenario buttons for testing specific features
 * - Economy manipulation tools
 */
export class DebugSystem {
  constructor(game) {
    this.game = game;
    this.isVisible = false;
    this.timeScale = 1.0;
    this.originalUpdateInterval = null;
    this.createDebugPanel();
    this.setupEventListeners();
  }

  createDebugPanel() {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debugPanel';
    debugPanel.innerHTML = `
      <div class="debug-header">
        <h3>Debug Panel</h3>
        <button id="closeDebug">×</button>
      </div>
      <div class="debug-tabs">
        <button class="debug-tab active" data-tab="teleport">Teleport</button>
        <button class="debug-tab" data-tab="time">Time</button>
        <button class="debug-tab" data-tab="scenarios">Scenarios</button>
      </div>
      <div class="debug-content">
        <div id="teleportTab" class="debug-tab-content active">
          <h4>Quick Teleport</h4>
          <div class="debug-section">
            <h5>Stations</h5>
            <div id="stationTeleports"></div>
          </div>
          <div class="debug-section">
            <h5>Other Objects</h5>
            <button class="debug-btn" id="teleportToAsteroid">Nearest Asteroid</button>
            <button class="debug-btn" id="teleportToJumpGate">Jump Gate</button>
            <button class="debug-btn" id="teleportToCenter">Zone Center</button>
          </div>
          <div class="debug-section">
            <h5>Custom Position</h5>
            <input type="number" id="teleportX" placeholder="X" style="width: 60px;">
            <input type="number" id="teleportY" placeholder="Y" style="width: 60px;">
            <button class="debug-btn" id="teleportCustom">Go</button>
          </div>
        </div>
        
        <div id="timeTab" class="debug-tab-content">
          <h4>Time Controls</h4>
          <div class="debug-section">
            <label>Time Scale: <span id="timeScaleValue">1.0x</span></label>
            <input type="range" id="timeScaleSlider" min="0.1" max="10" step="0.1" value="1.0">
            <div class="time-presets">
              <button class="debug-btn" data-scale="0.5">0.5x</button>
              <button class="debug-btn" data-scale="1">1x</button>
              <button class="debug-btn" data-scale="2">2x</button>
              <button class="debug-btn" data-scale="5">5x</button>
              <button class="debug-btn" data-scale="10">10x</button>
            </div>
          </div>
          <div class="debug-section">
            <h5>Economy Speed</h5>
            <button class="debug-btn" id="fastEconomy">Fast Economy (5s updates)</button>
            <button class="debug-btn" id="normalEconomy">Normal Economy (30s updates)</button>
            <button class="debug-btn" id="instantEconomy">Instant Update</button>
          </div>
        </div>
        
        <div id="scenariosTab" class="debug-tab-content">
          <h4>Test Scenarios</h4>
          <div class="debug-section">
            <h5>Economy Tests</h5>
            <button class="debug-btn" id="drainStationResources">Drain Station Resources</button>
            <button class="debug-btn" id="boostStationResources">Boost Station Resources</button>
            <button class="debug-btn" id="triggerPirateTakeover">Force Pirate Takeover</button>
            <button class="debug-btn" id="triggerFactionRevolt">Force Faction Revolt</button>
          </div>
          <div class="debug-section">
            <h5>Player Tests</h5>
            <button class="debug-btn" id="addCredits">+10,000 Credits</button>
            <button class="debug-btn" id="fillCargo">Fill Cargo Hold</button>
            <button class="debug-btn" id="upgradeAll">Max Upgrades</button>
          </div>
          <div class="debug-section">
            <h5>Combat Tests</h5>
            <button class="debug-btn" id="spawnPirates">Spawn Pirates Here</button>
            <button class="debug-btn" id="clearPirates">Clear All Pirates</button>
          </div>
          <div class="debug-section">
            <h5>Trading Ships</h5>
            <button class="debug-btn" id="spawnTradingShips">Spawn 2 Trading Ships</button>
          </div>
        </div>
      </div>
    `;

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      #debugPanel {
        position: fixed;
        top: 20px;
        left: 20px;
        width: 350px;
        max-height: 80vh;
        background: rgba(20, 20, 40, 0.95);
        border: 2px solid #ff6600;
        border-radius: 8px;
        color: #ffcc00;
        font-family: 'Lucida Console', monospace;
        font-size: 12px;
        z-index: 3000;
        display: none;
        overflow: hidden;
      }

      .debug-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(40, 20, 0, 0.8);
        border-bottom: 1px solid #ff6600;
      }

      .debug-header h3 {
        margin: 0;
        font-size: 14px;
        color: #ffcc00;
      }

      #closeDebug {
        background: none;
        border: none;
        color: #ff6666;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
      }

      .debug-tabs {
        display: flex;
        background: rgba(20, 10, 0, 0.8);
      }

      .debug-tab {
        flex: 1;
        padding: 8px;
        background: none;
        border: none;
        color: #ffcc00;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        font-family: inherit;
        font-size: 11px;
      }

      .debug-tab.active {
        color: #ffffff;
        border-bottom-color: #ff6600;
      }

      .debug-content {
        padding: 12px;
        max-height: 60vh;
        overflow-y: auto;
      }

      .debug-tab-content {
        display: none;
      }

      .debug-tab-content.active {
        display: block;
      }

      .debug-section {
        margin: 12px 0;
        padding: 8px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        border-left: 3px solid #ff6600;
      }

      .debug-section h4, .debug-section h5 {
        margin: 0 0 8px 0;
        color: #ffffff;
        font-size: 12px;
      }

      .debug-btn {
        background: rgba(40, 20, 0, 0.8);
        border: 1px solid #ff6600;
        color: #ffcc00;
        padding: 4px 8px;
        margin: 2px;
        border-radius: 3px;
        font-family: inherit;
        font-size: 11px;
        cursor: pointer;
      }

      .debug-btn:hover {
        background: rgba(60, 30, 0, 0.8);
        color: #ffffff;
      }

      .time-presets {
        margin-top: 8px;
      }

      .debug-section input {
        background: rgba(40, 20, 0, 0.8);
        border: 1px solid #ff6600;
        color: #ffcc00;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: inherit;
        font-size: 11px;
        margin: 2px;
      }

      .debug-section label {
        display: block;
        margin-bottom: 4px;
        color: #ffffff;
        font-size: 11px;
      }

      #timeScaleSlider {
        width: 100%;
        margin: 4px 0;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(debugPanel);
    
    // Add a visible debug button for easier access
    this.createDebugButton();
  }

  createDebugButton() {
    const debugButton = document.createElement('button');
    debugButton.id = 'debugToggleButton';
    debugButton.textContent = 'DEBUG';
    debugButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(255, 102, 0, 0.8);
      border: 1px solid #ff6600;
      color: #ffcc00;
      padding: 5px 10px;
      font-family: 'Lucida Console', monospace;
      font-size: 11px;
      cursor: pointer;
      z-index: 2999;
      border-radius: 3px;
    `;
    
    debugButton.addEventListener('click', () => {
      this.toggle();
    });
    
    document.body.appendChild(debugButton);
  }

  setupEventListeners() {
    // Close button
    document.getElementById('closeDebug').addEventListener('click', () => {
      this.hide();
    });

    // Tab switching
    document.querySelectorAll('.debug-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = e.target.dataset.tab;
        this.switchTab(targetTab);
      });
    });

    // Time scale controls
    const timeScaleSlider = document.getElementById('timeScaleSlider');
    timeScaleSlider.addEventListener('input', (e) => {
      this.setTimeScale(parseFloat(e.target.value));
    });

    // Time scale presets
    document.querySelectorAll('[data-scale]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const scale = parseFloat(e.target.dataset.scale);
        this.setTimeScale(scale);
        timeScaleSlider.value = scale;
      });
    });

    // Economy speed controls
    document.getElementById('fastEconomy').addEventListener('click', () => {
      this.setEconomySpeed(5000); // 5 seconds
    });

    document.getElementById('normalEconomy').addEventListener('click', () => {
      this.setEconomySpeed(30000); // 30 seconds
    });

    document.getElementById('instantEconomy').addEventListener('click', () => {
      this.triggerInstantEconomyUpdate();
    });

    // Teleport controls
    document.getElementById('teleportToAsteroid').addEventListener('click', () => {
      this.teleportToNearestAsteroid();
    });

    document.getElementById('teleportToJumpGate').addEventListener('click', () => {
      this.teleportToJumpGate();
    });

    document.getElementById('teleportToCenter').addEventListener('click', () => {
      this.teleportToPosition(0, 0);
    });

    document.getElementById('teleportCustom').addEventListener('click', () => {
      const x = parseFloat(document.getElementById('teleportX').value) || 0;
      const y = parseFloat(document.getElementById('teleportY').value) || 0;
      this.teleportToPosition(x, y);
    });

    // Scenario buttons
    document.getElementById('drainStationResources').addEventListener('click', () => {
      this.drainNearestStationResources();
    });

    document.getElementById('boostStationResources').addEventListener('click', () => {
      this.boostNearestStationResources();
    });

    document.getElementById('triggerPirateTakeover').addEventListener('click', () => {
      this.forcePirateTakeover();
    });

    document.getElementById('triggerFactionRevolt').addEventListener('click', () => {
      this.forceFactionRevolt();
    });

    document.getElementById('addCredits').addEventListener('click', () => {
      this.game.gameState.credits += 10000;
      this.game.ui.showMessage('Added 10,000 credits!', 'system-neutral');
    });

    document.getElementById('fillCargo').addEventListener('click', () => {
      this.fillCargoHold();
    });

    document.getElementById('upgradeAll').addEventListener('click', () => {
      this.maxUpgrades();
    });

    document.getElementById('spawnPirates').addEventListener('click', () => {
      this.spawnPiratesAtPlayer();
    });

    document.getElementById('clearPirates').addEventListener('click', () => {
      this.clearAllPirates();
    });
    
    // Add spawn trading ships button
    document.getElementById('spawnTradingShips').addEventListener('click', () => {
      this.spawnTradingShips();
    });

    // Keyboard shortcut to toggle debug panel (Ctrl+Shift+D)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    document.getElementById('debugPanel').style.display = 'block';
    this.isVisible = true;
    this.updateStationTeleports();
  }

  hide() {
    document.getElementById('debugPanel').style.display = 'none';
    this.isVisible = false;
  }

  switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.debug-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.debug-tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Update content based on tab
    if (tabName === 'teleport') {
      this.updateStationTeleports();
    }
  }

  updateStationTeleports() {
    const container = document.getElementById('stationTeleports');
    if (!container) return;

    container.innerHTML = '';
    this.game.entities.stations.forEach(station => {
      const btn = document.createElement('button');
      btn.className = 'debug-btn';
      btn.textContent = station.name;
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.marginBottom = '2px';
      
      // Color code by health
      if (station.stationHealth === 'healthy') btn.style.borderColor = '#4CAF50';
      else if (station.stationHealth === 'struggling') btn.style.borderColor = '#FF9800';
      else if (station.stationHealth === 'crisis') btn.style.borderColor = '#F44336';
      else btn.style.borderColor = '#666666';

      btn.addEventListener('click', () => {
        this.teleportToStation(station);
      });
      container.appendChild(btn);
    });
  }

  setTimeScale(scale) {
    this.timeScale = scale;
    document.getElementById('timeScaleValue').textContent = scale.toFixed(1) + 'x';
    
    // Update game clock if it exists
    if (this.game.clock) {
      // Note: Three.js Clock doesn't have a direct time scale, 
      // so we'll modify the delta time in the game loop
      this.game.timeScale = scale;
    }
    
    this.game.ui.showMessage(`Time scale set to ${scale.toFixed(1)}x`, 'system-neutral');
  }

  setEconomySpeed(intervalMs) {
    this.game.entities.stations.forEach(station => {
      station.updateInterval = intervalMs;
    });
    this.game.ui.showMessage(`Economy update interval set to ${intervalMs/1000}s`, 'system-neutral');
  }

  triggerInstantEconomyUpdate() {
    const currentTime = Date.now();
    this.game.entities.stations.forEach(station => {
      station.updateEconomy(currentTime, this.game);
    });
    this.game.ui.showMessage('Triggered instant economy update', 'system-neutral');
  }

  teleportToPosition(x, y) {
    if (this.game.playerShip) {
      this.game.playerShip.mesh.position.set(x, y, 0);
      this.game.ui.showMessage(`Teleported to (${x}, ${y})`, 'system-neutral');
    }
  }

  teleportToStation(station) {
    const offset = 20; // Stay a bit away from the station
    const x = station.mesh.position.x + offset;
    const y = station.mesh.position.y + offset;
    this.teleportToPosition(x, y);
    this.game.ui.showMessage(`Teleported to ${station.name}`, 'system-neutral');
  }

  teleportToNearestAsteroid() {
    if (this.game.entities.asteroids.length > 0) {
      const asteroid = this.game.entities.asteroids[0];
      const x = asteroid.mesh.position.x + 15;
      const y = asteroid.mesh.position.y + 15;
      this.teleportToPosition(x, y);
      this.game.ui.showMessage('Teleported to nearest asteroid', 'system-neutral');
    } else {
      this.game.ui.showMessage('No asteroids found', 'warning');
    }
  }

  teleportToJumpGate() {
    if (this.game.entities.jumpGates.length > 0) {
      const gate = this.game.entities.jumpGates[0];
      const x = gate.mesh.position.x + 20;
      const y = gate.mesh.position.y + 20;
      this.teleportToPosition(x, y);
      this.game.ui.showMessage('Teleported to jump gate', 'system-neutral');
    } else {
      this.game.ui.showMessage('No jump gates found', 'warning');
    }
  }

  drainNearestStationResources() {
    const nearestStation = this.findNearestStation();
    if (nearestStation) {
      nearestStation.foodStock = 0;
      nearestStation.waterStock = 0;
      this.game.ui.showMessage(`Drained resources from ${nearestStation.name}`, 'warning');
    }
  }

  boostNearestStationResources() {
    const nearestStation = this.findNearestStation();
    if (nearestStation) {
      nearestStation.foodStock += 1000;
      nearestStation.waterStock += 1000;
      nearestStation.happiness = 90;
      this.game.ui.showMessage(`Boosted resources for ${nearestStation.name}`, 'player-trade');
    }
  }

  forcePirateTakeover() {
    const nearestStation = this.findNearestStation();
    if (nearestStation) {
      nearestStation.foodStock = 0;
      nearestStation.waterStock = 0;
      nearestStation.checkStationControl(this.game);
      this.game.ui.showMessage(`Forced pirate takeover of ${nearestStation.name}`, 'combat');
    }
  }

  forceFactionRevolt() {
    const nearestStation = this.findNearestStation();
    if (nearestStation) {
      nearestStation.stationHealth = 'crisis';
      nearestStation.happiness = 5;
      // Force a revolt by calling checkStationControl multiple times
      for (let i = 0; i < 10; i++) {
        nearestStation.checkStationControl(this.game);
      }
      this.game.ui.showMessage(`Triggered faction revolt at ${nearestStation.name}`, 'warning');
    }
  }

  fillCargoHold() {
    this.game.gameState.cargo = [];
    const commodities = ['Iron Ore', 'Food Rations', 'Electronics Components', 'Quantum Processors'];
    for (let i = 0; i < this.game.gameState.maxCargo; i++) {
      const commodity = commodities[i % commodities.length];
      this.game.gameState.cargo.push({
        name: commodity,
        type: 'test',
        paidPrice: 0,
        basePrice: 100
      });
    }
    this.game.ui.showMessage('Filled cargo hold with test items', 'player-trade');
  }

  maxUpgrades() {
    this.game.gameState.engineLevel = 5;
    this.game.gameState.weaponLevel = 5;
    this.game.gameState.maxCargo = 50;
    this.game.ui.showMessage('Maxed all upgrades!', 'player-trade');
  }

  spawnPiratesAtPlayer() {
    const playerPos = this.game.playerShip.mesh.position;
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      const x = playerPos.x + Math.cos(angle) * distance;
      const y = playerPos.y + Math.sin(angle) * distance;
      
      const pirate = new (this.game.entities.pirates[0].constructor)(x, y);
      this.game.entities.pirates.push(pirate);
      this.game.scene.add(pirate.mesh);
    }
    this.game.ui.showMessage('Spawned pirates at player location', 'combat');
  }

  clearAllPirates() {
    this.game.entities.pirates.forEach(pirate => {
      this.game.scene.remove(pirate.mesh);
    });
    this.game.entities.pirates = [];
    this.game.ui.showMessage('Cleared all pirates', 'system-neutral');
  }

  spawnTradingShips() {
    const playerPos = this.game.playerShip.mesh.position;
    
    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI * 2;
      const distance = 50 + Math.random() * 30;
      const x = playerPos.x + Math.cos(angle) * distance;
      const y = playerPos.y + Math.sin(angle) * distance;
      
      const spawnPos = new THREE.Vector3(x, y, 0);
      const trader = new TradingShip(spawnPos, this.game.entities.stations);
      
      if (!this.game.entities.tradingShips) this.game.entities.tradingShips = [];
      this.game.entities.tradingShips.push(trader);
      this.game.scene.add(trader.mesh);
    }
    
    this.game.ui.showMessage('Spawned 2 trading ships near player', 'system-neutral');
  }

  findNearestStation() {
    if (!this.game.playerShip || this.game.entities.stations.length === 0) return null;
    
    const playerPos = this.game.playerShip.mesh.position;
    let nearest = this.game.entities.stations[0];
    let minDistance = playerPos.distanceTo(nearest.mesh.position);
    
    this.game.entities.stations.forEach(station => {
      const distance = playerPos.distanceTo(station.mesh.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = station;
      }
    });
    
    return nearest;
  }
}
