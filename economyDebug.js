import * as THREE from 'three';

/**
 * Economy Debug Panel - Developer tool for monitoring and balancing the trading system
 * 
 * Features:
 * - Real-time market price monitoring across all stations
 * - Supply/demand visualization
 * - Faction standing impact analysis
 * - Trade route profitability calculator
 * - Market manipulation tools for testing
 */
export class EconomyDebugPanel {
  constructor(game) {
    this.game = game;
    this.isVisible = false;
    this.updateInterval = 1000; // Update every second
    this.lastUpdate = 0;
    this.marketData = new Map(); // Store historical market data
    this.createDebugPanel();
    this.setupEventListeners();
  }

  createDebugPanel() {
    // Create the debug panel HTML structure
    const debugPanel = document.createElement('div');
    debugPanel.id = 'economyDebugPanel';
    debugPanel.innerHTML = `
      <div class="debug-header">
        <h3>Economy Debug Panel</h3>
        <button id="closeEconomyDebug">×</button>
      </div>
      <div class="debug-tabs">
        <button class="debug-tab active" data-tab="markets">Markets</button>
        <button class="debug-tab" data-tab="routes">Trade Routes</button>
        <button class="debug-tab" data-tab="tools">Tools</button>
      </div>
      <div class="debug-content">
        <div id="marketsTab" class="debug-tab-content active">
          <div class="market-overview">
            <h4>Market Overview</h4>
            <div id="marketsList"></div>
          </div>
          <div class="price-trends">
            <h4>Price Trends</h4>
            <div id="priceChart"></div>
          </div>
        </div>
        <div id="routesTab" class="debug-tab-content">
          <h4>Profitable Trade Routes</h4>
          <div id="tradeRoutesList"></div>
        </div>
        <div id="toolsTab" class="debug-tab-content">
          <h4>Market Manipulation Tools</h4>
          <div class="tool-section">
            <label>Adjust Global Price Multiplier:</label>
            <input type="range" id="globalPriceMultiplier" min="0.5" max="2.0" step="0.1" value="1.0">
            <span id="priceMultiplierValue">1.0x</span>
          </div>
          <div class="tool-section">
            <label>Simulate Market Event:</label>
            <select id="marketEventSelect">
              <option value="">Select Event</option>
              <option value="shortage">Commodity Shortage</option>
              <option value="surplus">Commodity Surplus</option>
              <option value="pirate_raid">Pirate Raid (Supply Disruption)</option>
              <option value="trade_boom">Trade Boom</option>
            </select>
            <button id="triggerMarketEvent">Trigger Event</button>
          </div>
          <div class="tool-section">
            <button id="resetMarkets">Reset All Markets</button>
            <button id="exportMarketData">Export Market Data</button>
          </div>
        </div>
      </div>
    `;

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      #economyDebugPanel {
        position: fixed;
        top: 50px;
        right: 20px;
        width: 400px;
        max-height: 80vh;
        background: rgba(10, 20, 40, 0.95);
        border: 2px solid #60A0D0;
        border-radius: 8px;
        color: #90c0e0;
        font-family: 'Lucida Console', monospace;
        font-size: 12px;
        z-index: 2000;
        display: none;
        overflow: hidden;
      }

      .debug-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(0, 40, 80, 0.8);
        border-bottom: 1px solid #60A0D0;
      }

      .debug-header h3 {
        margin: 0;
        font-size: 14px;
        color: #ffffff;
      }

      #closeEconomyDebug {
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
        background: rgba(0, 20, 40, 0.8);
      }

      .debug-tab {
        flex: 1;
        padding: 8px;
        background: none;
        border: none;
        color: #90c0e0;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        font-family: inherit;
        font-size: 11px;
      }

      .debug-tab.active {
        color: #ffffff;
        border-bottom-color: #60A0D0;
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

      .market-item {
        margin: 8px 0;
        padding: 8px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        border-left: 3px solid #60A0D0;
      }

      .market-item h5 {
        margin: 0 0 4px 0;
        color: #ffffff;
      }

      .commodity-price {
        display: flex;
        justify-content: space-between;
        margin: 2px 0;
        font-size: 11px;
      }

      .price-up { color: #4CAF50; }
      .price-down { color: #F44336; }
      .price-stable { color: #90c0e0; }

      .tool-section {
        margin: 12px 0;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }

      .tool-section label {
        display: block;
        margin-bottom: 4px;
        color: #ffffff;
      }

      .tool-section input, .tool-section select, .tool-section button {
        background: rgba(0, 40, 80, 0.8);
        border: 1px solid #60A0D0;
        color: #90c0e0;
        padding: 4px 8px;
        border-radius: 3px;
        font-family: inherit;
        font-size: 11px;
      }

      .tool-section button {
        cursor: pointer;
        margin: 2px;
      }

      .tool-section button:hover {
        background: rgba(0, 60, 120, 0.8);
      }

      .trade-route {
        margin: 6px 0;
        padding: 6px;
        background: rgba(0, 40, 0, 0.3);
        border-radius: 3px;
        border-left: 2px solid #4CAF50;
      }

      .route-profit {
        font-weight: bold;
        color: #4CAF50;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(debugPanel);
  }

  setupEventListeners() {
    // Close button
    document.getElementById('closeEconomyDebug').addEventListener('click', () => {
      this.hide();
    });

    // Tab switching
    document.querySelectorAll('.debug-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = e.target.dataset.tab;
        this.switchTab(targetTab);
      });
    });

    // Tools
    const priceMultiplier = document.getElementById('globalPriceMultiplier');
    priceMultiplier.addEventListener('input', (e) => {
      document.getElementById('priceMultiplierValue').textContent = e.target.value + 'x';
      this.applyGlobalPriceMultiplier(parseFloat(e.target.value));
    });

    document.getElementById('triggerMarketEvent').addEventListener('click', () => {
      const eventType = document.getElementById('marketEventSelect').value;
      if (eventType) {
        this.triggerMarketEvent(eventType);
      }
    });

    document.getElementById('resetMarkets').addEventListener('click', () => {
      this.resetAllMarkets();
    });

    document.getElementById('exportMarketData').addEventListener('click', () => {
      this.exportMarketData();
    });

    // Keyboard shortcut to toggle debug panel
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'd') {
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
    document.getElementById('economyDebugPanel').style.display = 'block';
    this.isVisible = true;
    this.updateMarketData();
  }

  hide() {
    document.getElementById('economyDebugPanel').style.display = 'none';
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
    if (tabName === 'routes') {
      this.updateTradeRoutes();
    }
  }

  update(deltaTime) {
    if (!this.isVisible) return;

    this.lastUpdate += deltaTime * 1000;
    if (this.lastUpdate >= this.updateInterval) {
      this.updateMarketData();
      this.lastUpdate = 0;
    }
  }

  updateMarketData() {
    const marketsList = document.getElementById('marketsList');
    if (!marketsList) return;

    marketsList.innerHTML = '';

    this.game.entities.stations.forEach(station => {
      const marketItem = document.createElement('div');
      marketItem.className = 'market-item';
      
      let commoditiesHtml = '';
      station.goods.forEach(good => {
        const buyPrice = good.stationBaseBuyPrice;
        const sellPrice = good.stationBaseSellPrice;
        const inventory = good.inventory || 0;
        
        commoditiesHtml += `
          <div class="commodity-price">
            <span>${good.name}</span>
            <span>Buy: $${buyPrice} | Sell: $${sellPrice} | Stock: ${inventory}</span>
          </div>
        `;
      });

      marketItem.innerHTML = `
        <h5>${station.name}</h5>
        <div style="font-size: 10px; color: #77aaff; margin-bottom: 4px;">
          Produces: ${station.productionFocus} | Consumes: ${station.consumptionFocus}
        </div>
        ${commoditiesHtml}
      `;

      marketsList.appendChild(marketItem);
    });
  }

  updateTradeRoutes() {
    const routesList = document.getElementById('tradeRoutesList');
    if (!routesList) return;

    const routes = this.calculateProfitableRoutes();
    routesList.innerHTML = '';

    routes.forEach(route => {
      const routeDiv = document.createElement('div');
      routeDiv.className = 'trade-route';
      routeDiv.innerHTML = `
        <div><strong>${route.commodity}</strong></div>
        <div>From: ${route.from} → To: ${route.to}</div>
        <div>Buy: $${route.buyPrice} | Sell: $${route.sellPrice}</div>
        <div class="route-profit">Profit: $${route.profit} (${route.profitPercent}%)</div>
      `;
      routesList.appendChild(routeDiv);
    });
  }

  calculateProfitableRoutes() {
    const routes = [];
    const stations = this.game.entities.stations;

    // Compare all station pairs for each commodity
    for (let i = 0; i < stations.length; i++) {
      for (let j = 0; j < stations.length; j++) {
        if (i === j) continue;

        const fromStation = stations[i];
        const toStation = stations[j];

        fromStation.goods.forEach(fromGood => {
          const toGood = toStation.goods.find(g => g.name === fromGood.name);
          if (toGood) {
            const buyPrice = fromGood.stationBaseSellPrice; // Player buys from station
            const sellPrice = toGood.stationBaseBuyPrice;   // Player sells to station
            const profit = sellPrice - buyPrice;
            
            if (profit > 0) {
              routes.push({
                commodity: fromGood.name,
                from: fromStation.name,
                to: toStation.name,
                buyPrice,
                sellPrice,
                profit,
                profitPercent: Math.round((profit / buyPrice) * 100)
              });
            }
          }
        });
      }
    }

    // Sort by profit descending
    return routes.sort((a, b) => b.profit - a.profit).slice(0, 10);
  }

  applyGlobalPriceMultiplier(multiplier) {
    this.game.entities.stations.forEach(station => {
      station.goods.forEach(good => {
        good.stationBaseBuyPrice = Math.floor(good.basePrice * 0.8 * multiplier);
        good.stationBaseSellPrice = Math.floor(good.basePrice * 1.2 * multiplier);
      });
    });
    
    this.game.ui.showMessage(`Global price multiplier set to ${multiplier}x`, 'system-neutral');
  }

  triggerMarketEvent(eventType) {
    const stations = this.game.entities.stations;
    const commodities = this.game.COMMODITIES;
    
    switch (eventType) {
      case 'shortage':
        // Randomly increase prices for a commodity
        const shortageItem = commodities[Math.floor(Math.random() * commodities.length)];
        stations.forEach(station => {
          const good = station.goods.find(g => g.name === shortageItem.name);
          if (good) {
            good.stationBaseSellPrice = Math.floor(good.stationBaseSellPrice * 1.5);
            good.stationBaseBuyPrice = Math.floor(good.stationBaseBuyPrice * 1.3);
          }
        });
        this.game.ui.showMessage(`Market shortage: ${shortageItem.name} prices increased!`, 'warning');
        break;
        
      case 'surplus':
        // Randomly decrease prices for a commodity
        const surplusItem = commodities[Math.floor(Math.random() * commodities.length)];
        stations.forEach(station => {
          const good = station.goods.find(g => g.name === surplusItem.name);
          if (good) {
            good.stationBaseSellPrice = Math.floor(good.stationBaseSellPrice * 0.7);
            good.stationBaseBuyPrice = Math.floor(good.stationBaseBuyPrice * 0.8);
          }
        });
        this.game.ui.showMessage(`Market surplus: ${surplusItem.name} prices decreased!`, 'player-trade');
        break;
        
      case 'pirate_raid':
        // Disrupt supply chains
        this.game.ui.showMessage('Pirate raids disrupt trade routes! Prices fluctuating!', 'combat');
        break;
        
      case 'trade_boom':
        // Increase all prices slightly
        stations.forEach(station => {
          station.goods.forEach(good => {
            good.stationBaseBuyPrice = Math.floor(good.stationBaseBuyPrice * 1.1);
            good.stationBaseSellPrice = Math.floor(good.stationBaseSellPrice * 1.1);
          });
        });
        this.game.ui.showMessage('Trade boom! All commodity prices increased!', 'player-trade');
        break;
    }
    
    this.updateMarketData();
  }

  resetAllMarkets() {
    // Reset all station prices to base values
    this.game.entities.stations.forEach(station => {
      station.goods.forEach(good => {
        good.stationBaseBuyPrice = Math.floor(good.basePrice * 0.8);
        good.stationBaseSellPrice = Math.floor(good.basePrice * 1.2);
      });
    });
    
    this.game.ui.showMessage('All markets reset to default prices', 'system-neutral');
    this.updateMarketData();
  }

  exportMarketData() {
    const data = {
      timestamp: new Date().toISOString(),
      stations: this.game.entities.stations.map(station => ({
        name: station.name,
        faction: station.faction,
        productionFocus: station.productionFocus,
        consumptionFocus: station.consumptionFocus,
        goods: station.goods.map(good => ({
          name: good.name,
          buyPrice: good.stationBaseBuyPrice,
          sellPrice: good.stationBaseSellPrice,
          inventory: good.inventory || 0
        }))
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.game.ui.showMessage('Market data exported', 'system-neutral');
  }
}
