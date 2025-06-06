export class ZoneEventLogger {
  constructor(game) {
    this.game = game;
    this.events = [];
    this.maxEvents = 500; // Prevent memory issues
    this.isVisible = false;
    this.filters = {
      economic: true,
      combat: true,
      station: true,
      aiDecision: true,
      security: true,
      player: true
    };
    this.setupUI();
  }

  setupUI() {
    // Create the event logger panel
    const loggerPanel = document.createElement('div');
    loggerPanel.id = 'eventLoggerPanel';
    loggerPanel.className = 'logger-panel';
    loggerPanel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      width: 450px;
      height: 600px;
      background: rgba(0, 20, 40, 0.95);
      border: 1px solid #00aaff;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #00ff88;
      z-index: 1000;
      display: none;
      flex-direction: column;
    `;

    // Header with title and controls
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 8px;
      background: rgba(0, 40, 80, 0.8);
      border-bottom: 1px solid #00aaff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span style="font-weight: bold; color: #00ddff;">🎯 Zone Event Logger</span>
      <button id="clearEventLog" style="
        background: #ff4444; 
        color: white; 
        border: none; 
        padding: 2px 6px; 
        border-radius: 3px; 
        font-size: 10px;
        cursor: pointer;
      ">Clear</button>
    `;

    // Filter controls
    const filterControls = document.createElement('div');
    filterControls.style.cssText = `
      padding: 5px 8px;
      background: rgba(0, 30, 60, 0.6);
      border-bottom: 1px solid #00aaff;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    `;

    const filterTypes = [
      { key: 'economic', label: 'Economic', color: '#00ff88' },
      { key: 'combat', label: 'Combat', color: '#ff4444' },
      { key: 'station', label: 'Station', color: '#ffaa00' },
      { key: 'aiDecision', label: 'AI', color: '#4488ff' },
      { key: 'security', label: 'Security', color: '#ffff00' },
      { key: 'player', label: 'Player', color: '#00ffff' }
    ];

    filterTypes.forEach(filter => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `filter${filter.key}`;
      checkbox.checked = this.filters[filter.key];
      checkbox.addEventListener('change', (e) => {
        this.filters[filter.key] = e.target.checked;
        this.refreshDisplay();
      });

      const label = document.createElement('label');
      label.htmlFor = `filter${filter.key}`;
      label.style.cssText = `
        color: ${filter.color};
        font-size: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 2px;
      `;
      label.innerHTML = `${filter.label}`;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display: flex; align-items: center; gap: 2px;';
      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      filterControls.appendChild(wrapper);
    });

    // Event list container
    const eventList = document.createElement('div');
    eventList.id = 'eventLogList';
    eventList.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 5px;
      background: rgba(0, 10, 20, 0.8);
    `;

    // Assemble panel
    loggerPanel.appendChild(header);
    loggerPanel.appendChild(filterControls);
    loggerPanel.appendChild(eventList);
    document.body.appendChild(loggerPanel);

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'eventLoggerToggle';
    toggleButton.textContent = 'EVENTS';
    toggleButton.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 80, 160, 0.9);
      color: white;
      border: 1px solid #00aaff;
      padding: 5px 10px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      cursor: pointer;
      z-index: 999;
    `;

    document.body.appendChild(toggleButton);

    // Event listeners
    toggleButton.addEventListener('click', () => this.toggle());
    document.getElementById('clearEventLog').addEventListener('click', () => this.clear());

    // Keyboard shortcut (Ctrl+L)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle() {
    this.isVisible = !this.isVisible;
    const panel = document.getElementById('eventLoggerPanel');
    const button = document.getElementById('eventLoggerToggle');
    
    if (this.isVisible) {
      panel.style.display = 'flex';
      button.style.background = 'rgba(0, 160, 80, 0.9)';
      button.textContent = 'HIDE';
      this.refreshDisplay();
    } else {
      panel.style.display = 'none';
      button.style.background = 'rgba(0, 80, 160, 0.9)';
      button.textContent = 'EVENTS';
    }
  }

  clear() {
    this.events = [];
    this.refreshDisplay();
  }

  logEvent(category, message, data = {}) {
    const timestamp = new Date().toLocaleTimeString();
    const event = {
      id: Date.now() + Math.random(),
      timestamp,
      category,
      message,
      data,
      time: Date.now()
    };

    this.events.unshift(event); // Add to front

    // Limit events to prevent memory issues
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Auto-refresh if visible
    if (this.isVisible) {
      this.refreshDisplay();
    }
  }

  // Specific logging methods for different event types
  logEconomic(message, data = {}) {
    this.logEvent('economic', message, data);
  }

  logCombat(message, data = {}) {
    this.logEvent('combat', message, data);
  }

  logStation(message, data = {}) {
    this.logEvent('station', message, data);
  }

  logAIDecision(message, data = {}) {
    this.logEvent('aiDecision', message, data);
  }

  logSecurity(message, data = {}) {
    this.logEvent('security', message, data);
  }

  logPlayer(message, data = {}) {
    this.logEvent('player', message, data);
  }

  refreshDisplay() {
    const eventList = document.getElementById('eventLogList');
    if (!eventList) return;

    // Filter events based on checkboxes
    const filteredEvents = this.events.filter(event => this.filters[event.category]);

    // Generate HTML
    eventList.innerHTML = filteredEvents.map(event => {
      const colors = {
        economic: '#00ff88',
        combat: '#ff4444',
        station: '#ffaa00',
        aiDecision: '#4488ff',
        security: '#ffff00',
        player: '#00ffff'
      };

      const color = colors[event.category] || '#ffffff';
      const icon = this.getCategoryIcon(event.category);

      return `
        <div style="
          margin-bottom: 3px; 
          padding: 2px 5px; 
          border-left: 3px solid ${color}; 
          background: rgba(0, 20, 40, 0.3);
          border-radius: 2px;
        ">
          <span style="color: #888; font-size: 10px;">[${event.timestamp}]</span>
          <span style="color: ${color}; margin: 0 3px;">${icon}</span>
          <span style="color: ${color};">${event.message}</span>
          ${Object.keys(event.data).length > 0 ? 
            `<div style="color: #666; font-size: 10px; margin-left: 20px;">
              ${JSON.stringify(event.data, null, 0).replace(/[{}]/g, '').replace(/"/g, '')}
            </div>` : ''
          }
        </div>
      `;
    }).join('');

    // Auto-scroll to top for newest events
    eventList.scrollTop = 0;
  }

  getCategoryIcon(category) {
    const icons = {
      economic: '💰',
      combat: '⚔️',
      station: '🏭',
      aiDecision: '🤖',
      security: '🚨',
      player: '👤'
    };
    return icons[category] || '📋';
  }

  // Analytics methods
  getEventStats() {
    const stats = {};
    this.events.forEach(event => {
      stats[event.category] = (stats[event.category] || 0) + 1;
    });
    return stats;
  }

  getRecentEvents(category, timeWindow = 60000) { // Last minute by default
    const cutoff = Date.now() - timeWindow;
    return this.events.filter(event => 
      event.category === category && event.time > cutoff
    );
  }

  // Export methods for debugging
  exportEvents() {
    return {
      events: this.events,
      stats: this.getEventStats(),
      filters: this.filters
    };
  }

  // Performance monitoring
  getPerformanceStats() {
    const recent = this.getRecentEvents('all', 300000); // Last 5 minutes
    return {
      totalEvents: this.events.length,
      recentEvents: recent.length,
      categoryCounts: this.getEventStats(),
      memoryUsage: `${this.events.length}/${this.maxEvents} events`
    };
  }
}
