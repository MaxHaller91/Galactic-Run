import * as THREE from 'three';

// Import simple trading classes
class SimpleTradeUI {
  static showSimpleTradePanel(station, gameState, ui) {
    const tradePanel = document.getElementById('tradePanel');
    const tradeList = document.getElementById('tradeList');
    const tradePanelHeader = document.querySelector('#tradePanel h3');
    
    if (tradePanelHeader) {
      const status = station.getEconomicStatus();
      tradePanelHeader.innerHTML = `${station.name}<br>
        <span style="font-size: 0.8em; color: #77aaff;">Population: ${status.population}</span><br>
        <span style="font-size: 0.7em; color: #00ffff;">Materials: ${status.materials} | Goods: ${status.goods}</span><br>
        <span style="font-size: 0.7em; color: #ffff00;">Station Credits: ${station.credits}</span><br>
        <span style="font-size: 0.6em; color: #aaaaaa;">Cargo: ${status.totalCargo}/${station.maxCargo}</span>`;
    }

    tradeList.innerHTML = '';
    
    const tradeOptions = station.getTradeOptions();
    const playerCargo = SimplePlayerCargo.getPlayerCargoStatus(gameState);

    // PLAYER BUYS FROM STATION
    if (tradeOptions.selling.materials.canSell) {
      const buyMaterialsBtn = document.createElement('button');
      buyMaterialsBtn.className = 'upgrade-btn';
      buyMaterialsBtn.innerHTML = `Buy Materials ($${tradeOptions.selling.materials.price}) [${tradeOptions.selling.materials.available}]`;
      buyMaterialsBtn.disabled = gameState.credits < tradeOptions.selling.materials.price || !SimplePlayerCargo.canCarryMore(gameState);
      
      buyMaterialsBtn.addEventListener('click', () => {
        const result = station.playerBuyMaterials(1, gameState.credits);
        if (result.success) {
          gameState.credits -= result.cost;
          gameState.materials = (gameState.materials || 0) + 1;
          ui.showMessage(`Bought 1 Materials for $${result.cost}`, 'player-trade');
          SimpleTradeUI.showSimpleTradePanel(station, gameState, ui); // Refresh
        } else {
          ui.showMessage(`Cannot buy: ${result.reason}`, 'warning');
        }
      });
      tradeList.appendChild(buyMaterialsBtn);
    }

    if (tradeOptions.selling.goods.canSell) {
      const buyGoodsBtn = document.createElement('button');
      buyGoodsBtn.className = 'upgrade-btn';
      buyGoodsBtn.innerHTML = `Buy Goods ($${tradeOptions.selling.goods.price}) [${tradeOptions.selling.goods.available}]`;
      buyGoodsBtn.disabled = gameState.credits < tradeOptions.selling.goods.price || !SimplePlayerCargo.canCarryMore(gameState);
      
      buyGoodsBtn.addEventListener('click', () => {
        const result = station.playerBuyGoods(1, gameState.credits);
        if (result.success) {
          gameState.credits -= result.cost;
          gameState.goods = (gameState.goods || 0) + 1;
          ui.showMessage(`Bought 1 Goods for $${result.cost}`, 'player-trade');
          SimpleTradeUI.showSimpleTradePanel(station, gameState, ui); // Refresh
        } else {
          ui.showMessage(`Cannot buy: ${result.reason}`, 'warning');
        }
      });
      tradeList.appendChild(buyGoodsBtn);
    }

    // PLAYER SELLS TO STATION
    if (playerCargo.materials > 0 && tradeOptions.buying.materials.canBuy) {
      const sellMaterialsBtn = document.createElement('button');
      sellMaterialsBtn.className = 'upgrade-btn';
      sellMaterialsBtn.innerHTML = `Sell Materials ($${tradeOptions.buying.materials.price}) [You have: ${playerCargo.materials}]`;
      sellMaterialsBtn.style.borderColor = '#4CAF50';
      
      sellMaterialsBtn.addEventListener('click', () => {
        const result = station.playerSellMaterials(1, gameState.materials);
        if (result.success) {
          gameState.credits += result.value;
          gameState.materials -= 1;
          ui.showMessage(`Sold 1 Materials for $${result.value}`, 'player-trade');
          SimpleTradeUI.showSimpleTradePanel(station, gameState, ui); // Refresh
        } else {
          ui.showMessage(`Cannot sell: ${result.reason}`, 'warning');
        }
      });
      tradeList.appendChild(sellMaterialsBtn);
    }

    if (playerCargo.goods > 0 && tradeOptions.buying.goods.canBuy) {
      const sellGoodsBtn = document.createElement('button');
      sellGoodsBtn.className = 'upgrade-btn';
      sellGoodsBtn.innerHTML = `Sell Goods ($${tradeOptions.buying.goods.price}) [You have: ${playerCargo.goods}]`;
      sellGoodsBtn.style.borderColor = '#4CAF50';
      
      sellGoodsBtn.addEventListener('click', () => {
        const result = station.playerSellGoods(1, gameState.goods);
        if (result.success) {
          gameState.credits += result.value;
          gameState.goods -= 1;
          ui.showMessage(`Sold 1 Goods for $${result.value}`, 'player-trade');
          SimpleTradeUI.showSimpleTradePanel(station, gameState, ui); // Refresh
        } else {
          ui.showMessage(`Cannot sell: ${result.reason}`, 'warning');
        }
      });
      tradeList.appendChild(sellGoodsBtn);
    }

    // Add upgrade option
    const upgradeBtn = document.createElement('button');
    upgradeBtn.className = 'upgrade-btn';
    upgradeBtn.textContent = 'Ship Upgrades';
    upgradeBtn.addEventListener('click', () => {
      ui.hideTradePanel();
      ui.showUpgradePanel();
    });
    tradeList.appendChild(upgradeBtn);

    // CLOSE BUTTON
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
  static getPlayerCargoStatus(gameState) {
    return {
      materials: gameState.materials || 0,
      goods: gameState.goods || 0,
      totalCargo: (gameState.materials || 0) + (gameState.goods || 0),
      maxCargo: gameState.maxCargo,
      cargoSpace: gameState.maxCargo - ((gameState.materials || 0) + (gameState.goods || 0))
    };
  }

  static canCarryMore(gameState, quantity = 1) {
    const current = (gameState.materials || 0) + (gameState.goods || 0);
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
  }
  showMessage(text, type = 'default') { // Added type parameter
    const messagePanel = document.getElementById('messagePanel');
    const messageText = document.getElementById('messageText');
    messageText.textContent = text;
    // Style based on message type
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
    
    setTimeout(() => {
      messagePanel.style.display = 'none';
    }, 3000);
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
