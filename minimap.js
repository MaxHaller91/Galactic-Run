import * as THREE from 'three';

export class Minimap {
    constructor(containerId, entities, playerShip, camera, mapSize = 150, worldScale = 800) {
        this.entities = entities;
        this.playerShip = playerShip;
        this.camera = camera; 
        this.mapSize = mapSize; 
        this.worldScale = worldScale; // World units diameter shown on map

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Minimap container not found:', containerId);
            return;
        }

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.mapSize;
        this.canvas.height = this.mapSize;
        this.canvas.style.backgroundColor = 'rgba(0, 5, 10, 0.85)'; // Darker, more opaque than container
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.dotColors = {
            player: '#00FF00',       // Green
            station: '#00FFFF',      // Cyan
            pirate: '#FF0000',       // Red
            asteroid: '#808080',     // Grey (for future use)
            jumpGate: '#FF00FF',     // Magenta
            friendlyShip: '#FFFF00', // Yellow
            police: '#0088FF',       // Blue
            miningShip: '#FF8800'    // Orange
        };
        this.dotSizes = { // Radius in pixels
            player: 3,
            station: 4,
            pirate: 2,
            asteroid: 1,
            jumpGate: 4,
            friendlyShip: 2,
            police: 2,
            miningShip: 2
        };
        this.filters = {
            asteroids: true, // Default to true as checkbox is checked initially
            stations: true,
            pirates: true
        };
        this.setupFilterListeners();
    }
    setupFilterListeners() {
        const asteroidFilterCheckbox = document.getElementById('filterMinimapAsteroids');
        if (asteroidFilterCheckbox) {
            asteroidFilterCheckbox.addEventListener('change', (event) => {
                this.filters.asteroids = event.target.checked;
                this.update(); 
            });
        }
        const stationFilterCheckbox = document.getElementById('filterMinimapStations');
        if (stationFilterCheckbox) {
            stationFilterCheckbox.addEventListener('change', (event) => {
                this.filters.stations = event.target.checked;
                this.update();
            });
        }
        const pirateFilterCheckbox = document.getElementById('filterMinimapPirates');
        if (pirateFilterCheckbox) {
            pirateFilterCheckbox.addEventListener('change', (event) => {
                this.filters.pirates = event.target.checked;
                this.update();
            });
        }
    }
    update() {
        if (!this.ctx || !this.playerShip || !this.playerShip.mesh) return;
        this.ctx.clearRect(0, 0, this.mapSize, this.mapSize);
        const playerMapX = this.mapSize / 2;
        const playerMapY = this.mapSize / 2;
        // Draw player
        this.drawDot(playerMapX, playerMapY, this.dotColors.player, this.dotSizes.player);
        // Draw stations (conditionally)
        if (this.filters.stations && this.entities.stations) {
            this.entities.stations.forEach(station => {
                this.drawEntityDot(station, this.dotColors.station, this.dotSizes.station);
            });
        }
        // Draw jump gates (always draw these for now, or add a filter J)
        this.entities.jumpGates.forEach(gate => {
            this.drawEntityDot(gate, this.dotColors.jumpGate, this.dotSizes.jumpGate);
        });
        
        // Draw pirates (conditionally)
        if (this.filters.pirates && this.entities.pirates) {
            this.entities.pirates.forEach(pirate => {
                this.drawEntityDot(pirate, this.dotColors.pirate, this.dotSizes.pirate);
            });
        }
        // Draw friendly ships (always draw these for now, or add a filter F)
        this.entities.friendlyShips.forEach(ship => {
            this.drawEntityDot(ship, this.dotColors.friendlyShip, this.dotSizes.friendlyShip);
        });
        // Draw police (always draw these for now, or add a filter)
        if (this.entities.police) {
            this.entities.police.forEach(police => {
                this.drawEntityDot(police, this.dotColors.police, this.dotSizes.police);
            });
        }
        // Draw mining ships (always draw these for now, or add a filter)
        if (this.entities.miningShips) {
            this.entities.miningShips.forEach(miner => {
                this.drawEntityDot(miner, this.dotColors.miningShip, this.dotSizes.miningShip);
            });
        }
        // Draw asteroids (conditionally)
        if (this.filters.asteroids && this.entities.asteroids) {
            this.entities.asteroids.forEach(asteroid => {
                this.drawEntityDot(asteroid, this.dotColors.asteroid, this.dotSizes.asteroid);
            });
        }
    }
    drawEntityDot(entity, color, size) {
        if (!this.playerShip || !this.playerShip.mesh || !entity.mesh) return;

        const playerPos = this.playerShip.mesh.position;
        const entityPos = entity.mesh.position;

        const dx = entityPos.x - playerPos.x;
        const dy = entityPos.y - playerPos.y;

        const mapRadiusPixels = this.mapSize / 2;
        const worldRadiusUnits = this.worldScale / 2;

        // Game world Y is up, Canvas Y is down.
        const mapX = (this.mapSize / 2) + (dx / worldRadiusUnits) * mapRadiusPixels;
        const mapY = (this.mapSize / 2) - (dy / worldRadiusUnits) * mapRadiusPixels;

        const distToCenterSq = Math.pow(mapX - this.mapSize / 2, 2) + Math.pow(mapY - this.mapSize / 2, 2);
        const maxDistSq = Math.pow(mapRadiusPixels - size - 1, 2); // -1 to keep it inside border

        if (distToCenterSq < maxDistSq) {
             this.drawDot(mapX, mapY, color, size);
        } else {
            const angle = Math.atan2(mapY - this.mapSize / 2, mapX - this.mapSize / 2);
            const clampedX = (this.mapSize / 2) + (mapRadiusPixels - size - 1) * Math.cos(angle);
            const clampedY = (this.mapSize / 2) + (mapRadiusPixels - size - 1) * Math.sin(angle);
            this.drawDot(clampedX, clampedY, color, size);
        }
    }

    drawDot(x, y, color, radius) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }
}
