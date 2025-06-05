import * as THREE from 'three';
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
    document.getElementById('cargoCount').textContent = this.gameState.cargo.length;
    document.getElementById('cargoMax').textContent = this.gameState.maxCargo;
    
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
    const tradePanel = document.getElementById('tradePanel');
    const tradeList = document.getElementById('tradeList');
    const tradePanelHeader = document.querySelector('#tradePanel h3'); // Get the h3 inside tradePanel
    if (tradePanelHeader) {
      tradePanelHeader.innerHTML = `${station.name}<br><span style="font-size: 0.8em; color: #77aaff;">Produces: ${station.productionFocus} | Consumes: ${station.consumptionFocus}</span>`;
    }
    tradeList.innerHTML = ''; // Clear previous list items, but not the header we just set
    // Determine faction standing modifier
    let priceModifier = 1.0; // Neutral
    const standing = this.gameState.factionStandings[station.faction] || 0;
    let standingText = "";
    if (standing > 10) { // Friendly
      priceModifier = 0.9; // 10% discount on buys, 10% bonus on sells
      standingText = ` <span style="color: #4CAF50;">(Friendly Discount)</span>`;
    } else if (standing < -10) { // Unfriendly (placeholder for now)
      priceModifier = 1.1; // 10% markup on buys, 10% penalty on sells
      standingText = ` <span style="color: #F44336;">(Unfriendly Markup)</span>`;
    }
    // Add buy options
    station.goods.forEach(marketGood => {
      // Player Buys from Station
      if (this.gameState.cargo.length < this.gameState.maxCargo) {
        const buyBtn = document.createElement('button');
        buyBtn.className = 'upgrade-btn';
        
        // Player buys at station's sell price, adjusted by faction standing
        const actualSellPrice = Math.floor(marketGood.stationBaseSellPrice * (standing > 10 ? 0.9 : (standing < -10 ? 1.1 : 1.0)));
        
        let buyText = `Buy ${marketGood.name} ($${actualSellPrice})`;
        if (marketGood.name === station.productionFocus) {
          buyText += ` <span style="color: #4CAF50;">(Surplus)</span>`;
          buyBtn.style.borderColor = '#4CAF50';
        } else if (marketGood.name === station.consumptionFocus) {
           buyBtn.style.borderColor = '#FF9800'; // Orange if it's a consumed good (rarer to find for sale)
        }
        if (standing > 10) buyText += ` <span style="font-size:0.9em; color: lightgreen;">Friendly Price!</span>`;
        else if (standing < -10) buyText += ` <span style="font-size:0.9em; color: salmon;">Unfriendly Price!</span>`;
        buyBtn.innerHTML = buyText; // Use innerHTML for span
        buyBtn.disabled = this.gameState.credits < actualSellPrice;
        buyBtn.addEventListener('click', () => {
          if (this.gameState.credits >= actualSellPrice && this.gameState.cargo.length < this.gameState.maxCargo) {
            this.gameState.credits -= actualSellPrice;
            this.gameState.cargo.push({
              name: marketGood.name,
              type: marketGood.type,
              paidPrice: actualSellPrice,
              basePrice: marketGood.basePrice
            });
            // Station's inventory decreases
            station.buyCommodity(marketGood.name, 1);
            let buyMessage = `Bought ${marketGood.name} for $${actualSellPrice}`;
            if (station.faction && this.gameState.factionStandings.hasOwnProperty(station.faction)) {
              this.gameState.factionStandings[station.faction] += 1;
              buyMessage += `. +1 Standing with ${station.faction}`;
            }
            this.showMessage(buyMessage, 'player-trade');
            this.showTradePanel(station); // Refresh panel
          }
        });
        tradeList.appendChild(buyBtn);
      }
    });
    
    // Add sell options (Player Sells to Station)
    this.gameState.cargo.forEach((cargoItem, index) => {
      // Find if the current station is interested in this cargo item
      const stationGoodMatch = station.goods.find(sg => sg.name === cargoItem.name);
      let actualBuyPrice; // Price station pays player, adjusted by faction standing
      if (stationGoodMatch) {
        actualBuyPrice = Math.floor(stationGoodMatch.stationBaseBuyPrice * (standing > 10 ? 1.1 : (standing < -10 ? 0.9 : 1.0)));
      } else {
        // Station doesn't normally trade this, offer a very low price
        actualBuyPrice = Math.floor(cargoItem.basePrice * 0.5 * (standing > 10 ? 1.1 : (standing < -10 ? 0.9 : 1.0))); // Low base, still affected by standing
      }
      
      const sellBtn = document.createElement('button');
      sellBtn.className = 'upgrade-btn';
      let sellText = `Sell ${cargoItem.name} ($${actualBuyPrice})`;
      
      // Profit/Loss indicator
      const profit = actualBuyPrice - cargoItem.paidPrice;
      if (profit > 0) {
        sellText += ` <span style="color: #4CAF50;">(Profit: $${profit})</span>`;
        sellBtn.style.borderColor = '#4CAF50'; // Green for profit
      } else if (profit < 0) {
        sellText += ` <span style="color: #F44336;">(Loss: $${Math.abs(profit)})</span>`;
        sellBtn.style.borderColor = '#F44336'; // Red for loss
      } else {
        sellText += ` (Break Even)`;
      }
      if (standing > 10) sellText += ` <span style="font-size:0.9em; color: lightgreen;">Friendly Bonus!</span>`;
      else if (standing < -10) sellText += ` <span style="font-size:0.9em; color: salmon;">Unfriendly Penalty!</span>`;
      // Highlight if this station has high demand for the item
      if (stationGoodMatch && cargoItem.name === station.consumptionFocus) {
        sellText += ` <span style="color: #2196F3;">(High Demand!)</span>`;
        // Keep profit color for border or override if high demand is more important
        sellBtn.style.borderColor = '#2196F3';
      }
      
      sellBtn.innerHTML = sellText; // Use innerHTML for spans
      sellBtn.addEventListener('click', () => {
        this.gameState.credits += actualBuyPrice;
        // Station's inventory increases
        station.sellCommodity(cargoItem.name, 1);
        this.gameState.cargo.splice(index, 1);
        let sellMsg = `Sold ${cargoItem.name} for $${actualBuyPrice}`;
        
        // Award standing for profitable sales (original profit before faction bonus)
        const originalProfit = stationGoodMatch ? stationGoodMatch.stationBaseBuyPrice - cargoItem.paidPrice : (cargoItem.basePrice * 0.5) - cargoItem.paidPrice;
        if (originalProfit > 0 && station.faction && this.gameState.factionStandings.hasOwnProperty(station.faction)) {
            this.gameState.factionStandings[station.faction] += 1;
            sellMsg += `. +1 Standing with ${station.faction}`;
        }
        this.showMessage(sellMsg, 'player-trade');
        this.showTradePanel(station); // Refresh panel
      });
      tradeList.appendChild(sellBtn);
    });
    
    // Add upgrade option
    const upgradeBtn = document.createElement('button');
    upgradeBtn.className = 'upgrade-btn';
    upgradeBtn.textContent = 'Ship Upgrades';
    upgradeBtn.addEventListener('click', () => {
      this.hideTradePanel();
      this.showUpgradePanel();
    });
    tradeList.appendChild(upgradeBtn);
    // Add repair option
    if (this.gameState.hull < 100) {
      const repairCost = Math.floor((100 - this.gameState.hull) * 2.5); // 2.5 credits per hull point
      const repairBtn = document.createElement('button');
      repairBtn.className = 'upgrade-btn';
      repairBtn.textContent = `Repair Hull ($${repairCost})`;
      repairBtn.disabled = this.gameState.credits < repairCost || this.gameState.hull >= 100;
      repairBtn.addEventListener('click', () => {
        if (this.gameState.credits >= repairCost && this.gameState.hull < 100) {
          this.gameState.credits -= repairCost;
          this.gameState.hull = 100;
          this.showMessage('Hull repaired!', 'system');
          this.showTradePanel(station); // Refresh panel to update button state
        }
      });
      tradeList.appendChild(repairBtn);
    }
    
    tradePanel.style.display = 'block';
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
    cargoCountEl.textContent = this.gameState.cargo.length;
    cargoMaxEl.textContent = this.gameState.maxCargo;
    cargoListEl.innerHTML = ''; // Clear previous items
    if (this.gameState.cargo.length === 0) {
        const div = document.createElement('div');
        div.textContent = 'Cargo hold is empty.';
        div.style.fontStyle = 'italic';
        div.style.color = '#77aaff';
        cargoListEl.appendChild(div);
    } else {
        this.gameState.cargo.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cargo-item'; // Reuse existing style
            // Display name, paid price. Could add current market value or profit/loss later.
            div.innerHTML = `<span>${item.name}</span><span>Paid: $${item.paidPrice}</span>`;
            cargoListEl.appendChild(div);
        });
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
}
