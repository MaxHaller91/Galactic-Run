import * as THREE from 'three';

// Import simple trading classes
class SimpleTradeUI {
  static showSimpleTradePanel(station, gameState, ui) {
    const tradePanel = document.getElementById('tradePanel');
    const tradeList = document.getElementById('tradeList');
    const tradePanelHeader = document.querySelector('#tradePanel h3');
    
    if (tradePanelHeader) {
      // Use the new station properties
      const efficiency = Math.floor((station.efficiency || 0) * 100);
      const materials = Math.floor(station.resources.materials || 0);
      const food = Math.floor(station.resources.food || 0);
      
      // Get trade info if available
      let tradeInfo = { sells: { name: 'N/A', price: 0 }, buys: { name: 'N/A', price: 0 } };
      if (station.getTradeInfo) {
        tradeInfo = station.getTradeInfo();
      }
      
      tradePanelHeader.innerHTML = `${station.name || station.type || 'Station'}<br>
        <span style="font-size: 0.8em; color: #77aaff;">Efficiency: ${efficiency}%</span><br>
        <span style="font-size: 0.7em; color: #00ffff;">Materials: ${materials}</span><br>
        <span style="font-size: 0.7em; color: #ff88ff;">Food: ${food}</span><br>
        <span style="font-size: 0.6em; color: #ffff00;">Sells: ${tradeInfo.sells.name} @ ${tradeInfo.sells.price}cr</span><br>
        <span style="font-size: 0.6em; color: #ffaa00;">Buys: ${tradeInfo.buys.name} @ ${tradeInfo.buys.price}cr</span>`;
    }

    tradeList.innerHTML = '<div style="padding: 10px; color: #aaaaaa;">AI traders handle resource circulation automatically.<br><br>Watch the economy panel to see trade activity!</div>';
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'upgrade-btn';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      tradePanel.style.display = 'none';
    });
    tradeList.appendChild(closeBtn);

    tradePanel.style.display = 'block';
  }
}

class SimplePlayerCargo {
  static initializePlayerCargo(gameState) {
    // Initialize simple cargo system with food
    gameState.materials = gameState.materials || 0;
    gameState.goods = gameState.goods || 0;
    gameState.food = gameState.food || 0;
    gameState.cargo = gameState.cargo || []; // Keep old cargo for backwards compatibility
    gameState.maxCargo = gameState.maxCargo || 10;
  }

  static getPlayerCargoStatus(gameState) {
    return {
      materials: gameState.materials || 0,
      goods: gameState.goods || 0,
      food: gameState.food || 0,
      totalCargo: (gameState.materials || 0) + (gameState.goods || 0) + (gameState.food || 0),
      maxCargo: gameState.maxCargo,
      cargoSpace: gameState.maxCargo - ((gameState.materials || 0) + (gameState.goods || 0) + (gameState.food || 0))
    };
  }

  static canCarryMore(gameState, quantity = 1) {
    const current = (gameState.materials || 0) + (gameState.goods || 0) + (gameState.food || 0);
    return current + quantity <= gameState.maxCargo;
  }
}

export class UIManager {
  constructor(gameState, gameZones, gameInstance) { // Add gameInstance
    this.gameState = gameState;
    this.gameZones = gameZones;
    this.game = gameInstance; // Store game instance for accessing e.g. COMMODITIES for UI
    this.stationIndicators = {};
    this.jumpGateIndicators = {}; // For jump gate indicators
    this.indicatorContainer = document.getElementById('indicatorContainer');
    this.setupEventListeners();
    this.setupDraggablePanels();
  }

  setupEventListeners() {
    document.getElementById('upgradeEngine').addEventListener('click', () => {
      if (this.gameState.credits >= 500) {
        this.gameState.credits -= 500;
        this.gameState.engineLevel++;
        this.showMessage('Engine upgraded!');
      }
    });
    
    document.getElementById('upgradeWeapons').addEventListener('click', () => {
      if (this.gameState.credits >= 800) {
        this.gameState.credits -= 800;
        this.gameState.weaponLevel++;
        this.showMessage('Weapons upgraded!');
      }
    });
    
    document.getElementById('upgradeCargo').addEventListener('click', () => {
      if (this.gameState.credits >= 300) {
        this.gameState.credits -= 300;
        this.gameState.maxCargo += 5;
        this.showMessage('Cargo hold expanded!');
      }
    });
    
    document.getElementById('closeUpgrade').addEventListener('click', () => {
      this.hideUpgradePanel();
    });
    
    document.getElementById('closeTrade').addEventListener('click', () => {
      this.hideTradePanel();
    });
    document.getElementById('closeShipInfo').addEventListener('click', () => {
        this.hideShipInfoPanel();
    });
    
    // Economy panel event listeners
    const economyToggle = document.getElementById('economyToggle');
    const closeEconomyPanel = document.getElementById('closeEconomyPanel');
    
    if (economyToggle) {
      console.log('Economy toggle button found, attaching listener');
      economyToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Economy toggle clicked!');
        console.log('Panel element:', document.getElementById('economyPanel'));
        this.toggleEconomyPanel();
      });
    } else {
      console.error('Economy toggle button NOT FOUND');
    }

    if (closeEconomyPanel) {
      closeEconomyPanel.addEventListener('click', () => {
        this.hideEconomyPanel();
      });
    } else {
      console.error('Close economy panel button NOT FOUND');
    }
  }

  setupDraggablePanels() {
    const draggablePanels = document.querySelectorAll('.ui-panel.draggable');
    
    draggablePanels.forEach(panel => {
      let isDragging = false;
      let startX, startY, initialX, initialY;
      
      panel.addEventListener('mousedown', (e) => {
        // Only start drag if clicking on panel header or empty space (not buttons)
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
          return;
        }
        
        isDragging = true;
        panel.classList.add('dragging');
        
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = panel.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newX = initialX + deltaX;
        const newY = initialY + deltaY;
        
        // Keep panel within viewport
        const maxX = window.innerWidth - panel.offsetWidth;
        const maxY = window.innerHeight - panel.offsetHeight;
        
        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));
        
        panel.style.left = clampedX + 'px';
        panel.style.top = clampedY + 'px';
        panel.style.transform = 'none'; // Remove any existing transforms
      });
      
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          panel.classList.remove('dragging');
        }
      });
    });
  }
  update() {
    // Update UI elements
    document.getElementById('credits').textContent = this.gameState.credits;
    document.getElementById('hull').textContent = Math.ceil(this.gameState.hull);
    document.getElementById('shields').textContent = Math.ceil(this.gameState.shields);
    
    // Update cargo display to use simple cargo system
    const playerCargo = SimplePlayerCargo.getPlayerCargoStatus(this.gameState);
    document.getElementById('cargoCount').textContent = playerCargo.totalCargo;
    document.getElementById('cargoMax').textContent = playerCargo.maxCargo;
    
    // Update health bars
    document.getElementById('healthFill').style.width = `${this.gameState.hull}%`;
    document.getElementById('shieldFill').style.width = `${this.gameState.shields}%`;
    
    // Update weapon system display
    if (this.game.weaponSystem) {
      const currentWeapon = this.game.weaponSystem.getCurrentWeapon();
      if (currentWeapon) {
        document.getElementById('currentWeapon').textContent = currentWeapon.type.name;
      }
      const energyPercent = Math.ceil((this.game.weaponSystem.energy / this.game.weaponSystem.maxEnergy) * 100);
      document.getElementById('energy').textContent = energyPercent;
      document.getElementById('energyFill').style.width = `${energyPercent}%`;
      
      // Change energy bar color based on status
      const energyFill = document.getElementById('energyFill');
      if (this.game.weaponSystem.overheated) {
        energyFill.style.background = '#ff4444'; // Red when overheated
      } else if (energyPercent < 30) {
        energyFill.style.background = '#ffaa00'; // Orange when low
      } else {
        energyFill.style.background = '#ffaa00'; // Normal orange
      }
    }
    
    // Update throttle display
    if (this.game.playerShip) {
      const throttlePercent = Math.round(Math.abs(this.game.playerShip.throttle) * 100);
      document.getElementById('throttlePercent').textContent = throttlePercent;
      const throttleFill = document.getElementById('throttleFill');
      if (throttleFill) {
        throttleFill.style.width = `${throttlePercent}%`;
        
        // Change color based on throttle direction
        if (this.game.playerShip.throttle < 0) {
          throttleFill.style.background = '#ff8800'; // Orange for reverse
        } else {
          throttleFill.style.background = '#00ff88'; // Green for forward
        }
      }
    }
    
    // Cargo list in the main HUD is removed. Detailed list will be in shipInfoPanel.
    
    // Update upgrade button states
    document.getElementById('upgradeEngine').disabled = this.gameState.credits < 500;
    document.getElementById('upgradeWeapons').disabled = this.gameState.credits < 800;
    document.getElementById('upgradeCargo').disabled = this.gameState.credits < 300;
    // Update faction standings display
    const standingsList = document.getElementById('standingsList');
    if (standingsList) {
      standingsList.innerHTML = ''; // Clear previous standings
      for (const factionName in this.gameState.factionStandings) {
        const standingValue = this.gameState.factionStandings[factionName];
        const div = document.createElement('div');
        div.className = 'faction-standing-item';
        div.innerHTML = `<span>${factionName}:</span><span>${standingValue}</span>`;
        standingsList.appendChild(div);
      }
    }
    // Update current zone display
    const currentZoneDisplay = document.getElementById('currentZoneDisplay');
    if (currentZoneDisplay && this.gameZones && this.gameZones[this.gameState.currentZoneId]) {
      currentZoneDisplay.textContent = this.gameZones[this.gameState.currentZoneId].name;
    }
    
    // Update economy panel if visible
    if (document.getElementById('economyPanel').style.display !== 'none') {
      this.updateEconomyPanel();
    }
  }

  toggleEconomyPanel() {
    const panel = document.getElementById('economyPanel');
    const isHidden = panel.style.display === 'none' || getComputedStyle(panel).display === 'none';
    if (isHidden) {
      this.showEconomyPanel();
    } else {
      this.hideEconomyPanel();
    }
  }

  showEconomyPanel() {
    const panel = document.getElementById('economyPanel');
    panel.style.display = 'block';
    this.updateEconomyPanel();
  }

  hideEconomyPanel() {
    const panel = document.getElementById('economyPanel');
    panel.style.display = 'none';
  }

  updateEconomyPanel() {
    const economyData = document.getElementById('economyData');
    if (!economyData || !this.game || !this.game.entities || !this.game.entities.stations) return;
    
    // Calculate zone totals
    const totals = {
      materials: 0,
      goods: 0,
      food: 0,
      population: 0,
      credits: 0,
      stationCount: 0
    };
    
    const stationBreakdown = [];
    const traderActivity = [];
    
    this.game.entities.stations.forEach(station => {
      const status = {
        materials: Math.floor(station.resources.materials || 0),
        goods: Math.floor(station.resources.goods || 0),
        food: Math.floor(station.resources.food || 0),
        efficiency: Math.floor((station.efficiency || 0) * 100),
        maxMaterials: station.resources.maxMaterials || 0,
        maxFood: station.resources.maxFood || 0,
        needsFood: (station.resources.food || 0) < (station.resources.maxFood || 0) * 0.3,
        needsMaterials: (station.resources.materials || 0) < (station.resources.maxMaterials || 0) * 0.3,
        hasFoodSurplus: (station.resources.food || 0) > (station.resources.maxFood || 0) * 0.8,
        hasMaterialsSurplus: (station.resources.materials || 0) > (station.resources.maxMaterials || 0) * 0.8
      };
      
      totals.materials += status.materials;
      totals.goods += status.goods;
      totals.food += status.food;
      totals.population += 1000; // Default population
      totals.credits += Math.floor(station.credits || 0); // Add station credits
      totals.stationCount++;
      
      // Get resource requests (premium pricing opportunities)
      const requests = [];
      const requestsText = 'Dynamic pricing active';
      
      // Determine production planning
      let productionPlan = 'Idle';
      if (station.type === 'mining' && status.food >= 1) {
        productionPlan = '⛏️ Mining materials';
      } else if (station.type === 'agricultural' && status.materials >= 1) {
        productionPlan = '🌾 Growing food';
      } else if (station.type === 'manufacturing' && status.materials >= 2 && status.food >= 1) {
        productionPlan = '🏭 Making goods';
      } else if (station.type === 'trade_hub') {
        productionPlan = '🏪 Facilitating trade';
      } else {
        productionPlan = '⚠️ Lacking resources';
      }
      
      stationBreakdown.push({
        name: station.name || `${station.type} Station`,
        type: station.type || 'unknown',
        materials: Math.floor(station.resources.materials || 0),
        food: Math.floor(station.resources.food || 0),
        efficiency: Math.floor((station.efficiency || 0) * 100),
        maxMaterials: station.resources.maxMaterials || 0,
        maxFood: station.resources.maxFood || 0,
        productionRate: station.resources.productionRate || 0,
        // Get current prices
        sellPrice: station.currentPrices?.sell?.price || 0,
        buyPrice: station.currentPrices?.buy?.price || 0,
        sellResource: station.currentPrices?.sell?.name || 'N/A',
        buyResource: station.currentPrices?.buy?.name || 'N/A',
        status: status,
        requests: requestsText,
        productionPlan: productionPlan,
        credits: Math.floor(station.credits || 0)
      });
    });
    
    // Get trader activity from ROSEBUD TRADING SHIPS
    if (this.game.entities.tradingShips) {
      this.game.entities.tradingShips.forEach((trader, index) => {
        if (trader.targetStation || trader.mission) {
          const cargoString = trader.getCargoString ? trader.getCargoString() : `M:${trader.cargo?.materials || 0} F:${trader.cargo?.food || 0}`;
          traderActivity.push({
            id: trader.mesh.uuid.slice(0, 4),
            route: trader.mission || `${trader.state} → ${trader.targetStation?.name || 'Unknown'}`,
            cargo: cargoString,
            credits: trader.credits || 0
          });
        }
      });
    }
    
    // Calculate consumption vs production
    const dailyConsumption = {
      food: Math.floor(totals.population / 1000),
      goods: Math.floor(totals.population / 1000)
    };
    
    economyData.innerHTML = `
      <div style="margin-bottom: 8px;">
        <h4 style="margin: 0 0 3px 0; color: #ffffff; font-size: 13px;">Zone Overview:</h4>
        <div style="font-size: 11px;">
          <div>🏭 ${totals.stationCount} Stations | 👥 ${Math.floor(totals.population)} People</div>
          <div>📦 Materials: ${totals.materials} | 🏭 Goods: ${totals.goods} | 🍞 Food: ${totals.food}</div>
          <div>💰 Total Credits: ${totals.credits}</div>
          <div style="color: ${totals.food < dailyConsumption.food * 2 ? '#ff6666' : '#88ff88'};">
            Food Supply: ${Math.floor(totals.food / Math.max(1, dailyConsumption.food))} days
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 8px;">
        <h4 style="margin: 0 0 3px 0; color: #ffffff; font-size: 13px;">Station Planning:</h4>
        <div style="font-size: 10px; max-height: 150px; overflow-y: auto;">
          ${stationBreakdown.map(station => {
            const needsColor = (station.status.needsFood || station.status.needsGoods || station.status.needsMaterials) ? '#ffaa00' : '#88ff88';
            const surplusItems = [];
            if (station.status.hasFoodSurplus) surplusItems.push('Food');
            if (station.status.hasGoodsSurplus) surplusItems.push('Goods');  
            if (station.status.hasMaterialsSurplus) surplusItems.push('Materials');
            const surplusText = surplusItems.length > 0 ? ` | Selling: ${surplusItems.join(', ')}` : '';
            
            return `
            <div style="margin: 1px 0; padding: 3px; background: rgba(0,0,0,0.3); border-radius: 2px; border-left: 2px solid ${needsColor};">
              <div style="font-weight: bold; font-size: 10px;">${station.name}</div>
              <div style="font-size: 9px; color: #aaaaaa;">${station.type} | ${station.productionPlan}</div>
              <div style="font-size: 9px;">M:${station.status.materials} G:${station.status.goods} F:${station.status.food} | $${station.credits}</div>
              <div style="font-size: 9px; color: #ffaa00;">Requests: ${station.requests}</div>
              ${surplusText ? `<div style="font-size: 9px; color: #88ff88;">${surplusText}</div>` : ''}
            </div>
          `}).join('')}
        </div>
      </div>
      
      <div>
        <h4 style="margin: 0 0 3px 0; color: #ffffff; font-size: 13px;">Active Traders (${traderActivity.length}):</h4>
        <div style="font-size: 10px; max-height: 100px; overflow-y: auto;">
          ${traderActivity.length > 0 ? traderActivity.map(trader => `
            <div style="margin: 1px 0; padding: 2px; background: rgba(0,40,80,0.3); border-radius: 2px;">
              <div style="font-size: 9px;">🚢 ${trader.id}: ${trader.route}</div>
              <div style="font-size: 9px; color: #aaaaaa;">Cargo: ${trader.cargo} | Credits: $${trader.credits}</div>
            </div>
          `).join('') : '<div style="color: #888888; font-size: 9px;">No active trade routes</div>'}
        </div>
      </div>
    `;
  }
  showMessage(text, type = 'default') { // Added type parameter
    const messagePanel = document.getElementById('messagePanel');
    const messageText = document.getElementById('messageText');
    messageText.textContent = text;
    
    // Style based on message type (existing code)
    if (type === 'ai-trade') {
      messagePanel.style.background = 'rgba(0, 80, 150, 0.85)'; // Blueish for AI trades
      messagePanel.style.borderColor = '#00aaff';
      messageText.style.color = '#ccddff';
    } else if (type === 'combat') {
      messagePanel.style.background = 'rgba(150, 20, 0, 0.85)'; // Reddish for combat
      messagePanel.style.borderColor = '#ff5533'; // Red
      messageText.style.color = '#ffddcc';
    } else if (type === 'system-neutral' || type === 'info') {
      messagePanel.style.background = 'rgba(50, 50, 70, 0.85)'; // Neutral dark purple/blue
      messagePanel.style.borderColor = '#aaaaff';
      messageText.style.color = '#ddeeff';
    } else if (type === 'player-trade') { // Player buy/sell
      messagePanel.style.background = 'rgba(0, 80, 0, 0.85)'; // Greenish for player gains
      messagePanel.style.borderColor = '#4CAF50';
      messageText.style.color = '#ccffcc';
    } else if (type === 'warning') {
      messagePanel.style.background = 'rgba(180, 80, 0, 0.9)'; // Orange/Yellow for warnings
      messagePanel.style.borderColor = '#FF9800';
      messageText.style.color = '#ffffcc';
    } else { // Default (player actions, general info, fallback)
      messagePanel.style.background = 'rgba(0, 30, 60, 0.8)'; // Default blue
      messagePanel.style.borderColor = '#00aaff';
      messageText.style.color = '#00ccff';
    }
    
    messagePanel.style.display = 'block';
    
    // NEW: Also send to event logger if it exists
    if (this.game && this.game.eventLogger) {
      this.sendToEventLogger(text, type);
    }
    
    setTimeout(() => {
      messagePanel.style.display = 'none';
    }, 3000);
  }

  // NEW: Add this method to UIManager class
  sendToEventLogger(text, messageType) {
    // Map UI message types to event logger categories
    switch (messageType) {
      case 'ai-trade':
        this.game.eventLogger.logEconomic(text);
        break;
      case 'combat':
        this.game.eventLogger.logCombat(text);
        break;
      case 'player-trade':
        this.game.eventLogger.logPlayer(text);
        break;
      case 'system-neutral':
      case 'info':
        this.game.eventLogger.logStation(text);
        break;
      case 'warning':
        this.game.eventLogger.logSecurity(text);
        break;
      default:
        this.game.eventLogger.logPlayer(text); // Default to player category
        break;
    }
  }

  showUpgradePanel() {
    document.getElementById('upgradePanel').style.display = 'block';
  }

  hideUpgradePanel() {
    document.getElementById('upgradePanel').style.display = 'none';
  }

  showTradePanel(station) {
    // Use the new simple trade interface
    SimpleTradeUI.showSimpleTradePanel(station, this.gameState, this);
  }

  hideTradePanel() {
    document.getElementById('tradePanel').style.display = 'none';
  }
  showShipInfoPanel() {
    const panel = document.getElementById('shipInfoPanel');
    if (panel) {
        panel.classList.add('visible');
        this.updateShipInfoPanel(); // Ensure content is fresh when shown
    }
  }
  hideShipInfoPanel() {
    const panel = document.getElementById('shipInfoPanel');
    if (panel) panel.classList.remove('visible');
  }
  updateShipInfoPanel() {
    const cargoCountEl = document.getElementById('shipInfoCargoCount');
    const cargoMaxEl = document.getElementById('shipInfoCargoMax');
    const cargoListEl = document.getElementById('shipInfoCargoList');
    if (!cargoCountEl || !cargoMaxEl || !cargoListEl) return;
    
    // Use simple cargo system
    const playerCargo = SimplePlayerCargo.getPlayerCargoStatus(this.gameState);
    cargoCountEl.textContent = playerCargo.totalCargo;
    cargoMaxEl.textContent = playerCargo.maxCargo;
    cargoListEl.innerHTML = ''; // Clear previous items
    
    if (playerCargo.totalCargo === 0) {
        const div = document.createElement('div');
        div.textContent = 'Cargo hold is empty.';
        div.style.fontStyle = 'italic';
        div.style.color = '#77aaff';
        cargoListEl.appendChild(div);
    } else {
        // Show Materials
        if (playerCargo.materials > 0) {
            const div = document.createElement('div');
            div.className = 'cargo-item';
            div.innerHTML = `<span>Materials</span><span>Qty: ${playerCargo.materials}</span>`;
            cargoListEl.appendChild(div);
        }
        
        // Show Goods
        if (playerCargo.goods > 0) {
            const div = document.createElement('div');
            div.className = 'cargo-item';
            div.innerHTML = `<span>Produced Goods</span><span>Qty: ${playerCargo.goods}</span>`;
            cargoListEl.appendChild(div);
        }
    }
    
    // Populate ship system details
    const engineLevelEl = document.getElementById('shipInfoEngineLevel');
    const weaponLevelEl = document.getElementById('shipInfoWeaponLevel');
    if (engineLevelEl) engineLevelEl.textContent = this.gameState.engineLevel;
    if (weaponLevelEl) weaponLevelEl.textContent = this.gameState.weaponLevel;
    // Populate other details as they are added
  }
  // --- Indicator Methods ---
  clearAllIndicators() {
    if (this.indicatorContainer) {
      this.indicatorContainer.innerHTML = '';
    }
    this.stationIndicators = {};
    this.jumpGateIndicators = {};
  }
  initializeStationIndicators(stations) {
    stations.forEach(station => {
      const indicatorElement = document.createElement('div');
      indicatorElement.className = 'station-indicator';
      this.indicatorContainer.appendChild(indicatorElement);
      this.stationIndicators[station.name] = indicatorElement;
    });
  }
  initializeJumpGateIndicators(jumpGates) {
    jumpGates.forEach(gate => {
      const indicatorElement = document.createElement('div');
      indicatorElement.className = 'jumpgate-indicator';
      this.indicatorContainer.appendChild(indicatorElement);
      this.jumpGateIndicators[gate.mesh.uuid] = indicatorElement; // Use UUID for unique key
    });
  }
  updateStationIndicator(stationName, x, y, angleRad, visible) {
    const indicator = this.stationIndicators[stationName];
    if (!indicator) return;
    indicator.style.display = visible ? 'block' : 'none';
    if (visible) {
      indicator.style.left = `${x}px`;
      indicator.style.top = `${y}px`;
      indicator.style.setProperty('--indicator-rotation', `${angleRad + Math.PI / 2}rad`);
    }
  }
  updateJumpGateIndicator(gateUUID, x, y, angleRad, visible) {
    const indicator = this.jumpGateIndicators[gateUUID];
    if (!indicator) return;
    indicator.style.display = visible ? 'block' : 'none';
    if (visible) {
      indicator.style.left = `${x}px`;
      indicator.style.top = `${y}px`;
      indicator.style.setProperty('--indicator-rotation', `${angleRad + Math.PI / 2}rad`);
    }
  }

  // Helper method to get governor AI status
  getGovernorStatus(station) {
    if (!station.governor) return 'No Governor';
    
    const governor = station.governor;
    let status = '';
    
    // Check construction queue
    if (station.constructionQueue && station.constructionQueue.length > 0) {
      const construction = station.constructionQueue[0];
      const timeLeft = Math.ceil(construction.timeRemaining);
      status += `Building ${construction.type} (${timeLeft}s)`;
    } else if (governor.priorities && governor.priorities.length > 0) {
      const topPriority = governor.priorities[0];
      switch(topPriority.type) {
        case 'EMERGENCY_FOOD':
          status += 'CRISIS: Need Food!';
          break;
        case 'EMERGENCY_WATER':
          status += 'CRISIS: Need Water!';
          break;
        case 'BUILD_POLICE':
          status += 'Planning: Security Forces';
          break;
        case 'BUILD_MINER':
          status += 'Planning: Mining Operations';
          break;
        case 'BUILD_TRADER':
          status += 'Planning: Trade Routes';
          break;
        case 'UPGRADE_DEFENSE':
          status += 'Planning: Defense Upgrade';
          break;
        default:
          status += 'Evaluating Options';
      }
    } else {
      status += 'Monitoring Station';
    }
    
    // Add recent pirate attacks info
    if (governor.recentPirateAttacks > 0) {
      status += ` | Pirates: ${governor.recentPirateAttacks}`;
    }
    
    return status;
  }

  // Helper method to get station cargo information
  getStationCargoInfo(station) {
    if (!station.inventory) return 'Legacy System';
    
    // Use inventory system (which is what the trade system actually uses)
    const inventory = station.inventory || {};
    const totalCargo = Object.values(inventory).reduce((sum, qty) => sum + qty, 0);
    const cargoPercent = Math.round((totalCargo / station.maxCargo) * 100);
    
    let info = `${totalCargo}/${station.maxCargo} (${cargoPercent}%)`;
    
    // Show top 5 cargo items with quantities
    const sortedCargo = Object.entries(inventory)
      .filter(([name, qty]) => qty > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    if (sortedCargo.length > 0) {
      const topItems = sortedCargo.map(([name, qty]) => `${name}: ${qty}`).join(' | ');
      info = `${totalCargo}/${station.maxCargo} (${cargoPercent}%) - ${topItems}`;
    }
    
    return info;
  }
}
