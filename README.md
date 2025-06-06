# Space Cargo Commander - Project README

## Project Overview

Space Cargo Commander is a 2D top-down space trading and combat simulation game. Players pilot a spaceship, trade commodities between stations, mine asteroids, engage in combat with pirates, and navigate different star systems (zones) connected by jump gates. The game features a dynamic economy, faction standings, ship upgrades, and a real-time minimap.

## Tech Stack

*   **HTML5**: Structure of the game page.
*   **CSS3**: Styling for UI elements, including on-screen indicators and panels.
*   **JavaScript (ESM Modules)**: Core game logic, rendering, and interactivity.
*   **Importmaps**: Used for managing JavaScript module dependencies without a build step (e.g., Three.js).
*   **Three.js**: For 2D rendering in an orthographic view, managing game objects (meshes), and scene graph.
*   **CSS2DRenderer (Three.js addon)**: Used for displaying HTML-based labels (e.g., station names) in the 3D/2D world space.

## File Structure

Here's a breakdown of the key files and their roles:

*   `index.html`: The main entry point of the application. Contains the HTML structure, importmap configuration, and CSS styles.
*   `main.js`: Initializes the `SpaceCargoGame` instance and starts the game.
*   `game.js` (`SpaceCargoGame` class): The core game class. Manages the game loop, scene setup, entity management, player ship, game state, zone loading, input handling, UI updates, and interactions.
*   `ship.js` (`PlayerShip` class): Defines the player's spaceship, including its movement, rotation, and weapon firing logic. (Content currently hidden from Rosie).
*   `entities.js`: Contains classes for various game entities:
    *   `SimpleStationWithTrading`: New simple stations with Materials/Goods economy and player trading.
    *   `SimplePirate`: Enemy ships with 3-state AI (Hunt, Attack, Flee).
    *   `SimplePolice`: Faction police that respond to distress beacons and patrol stations.
    *   `SimpleFriendlyShip`: Civilian traders that drop distress beacons when attacked.
    *   `SimpleTrader`: AI ships that automatically balance resources between stations.
    *   `DistressBeacon`: Emergency signals that attract police response.
    *   `PirateStation`: Hostile stations that spawn pirate raiders.
    *   `Projectile`: Represents weapon projectiles fired by player and AI ships.
    *   `Asteroid`: Defines mineable asteroids with resources.
    *   `JumpGate`: Represents jump gates connecting different game zones.
*   `friendlyShip.js` (`FriendlyShip` class): Defines non-hostile AI ships that trade and navigate the game world. (Content currently hidden from Rosie).
*   `ui.js` (`UIManager` class): Manages all user interface elements, including displaying game state (credits, hull, shields, cargo), handling trade panels, upgrade panels, messages, off-screen entity indicators, and the ship information panel.
*   `minimap.js` (`Minimap` class): Manages the rendering and updating of the minimap, displaying player position and various entity types. Includes filter controls.
*   `constants.js`: Stores constant data, such as the `COMMODITIES_LIST` used for the economy.
*   `miningLaser.js` (`MiningLaser` class): Handles the visual representation and logic for the player's mining laser. (Content currently hidden from Rosie).

## Running the Game

This project is designed to be **buildless**.
Simply open the `index.html` file in a modern web browser that supports ESM modules and importmaps (e.g., Chrome, Firefox, Edge). No compilation or build steps are required.

## Player Trading & Economy Gameplay

The game features a simple but engaging 2-resource trading system:

### **Trading Interface**
*   **Press E near stations** to open the trading panel
*   **Buy from stations**: Materials ($50 base) and Goods ($120 base)  
*   **Sell to stations**: Materials (80% of station price) and Goods (90% of station price)
*   **Dynamic pricing**: Low station stock = higher prices, surplus stock = lower prices
*   **Station info displayed**: Population, Materials, Goods, Credits, Cargo capacity

### **Player Cargo System**
*   **Simple inventory**: Just Materials and Goods (no complex item lists)
*   **Cargo capacity**: Default 10 items, expandable with upgrades
*   **Real-time display**: Top-right UI shows current cargo count

### **Economic Gameplay Loop**
1. **Buy Materials cheap** from stations with surplus
2. **Watch stations produce** (2 Materials → 1 Good every 5 seconds)
3. **Sell Goods for profit** to stations with high demand
4. **Observe daily cycles** (3 minutes = 1 game day)
5. **Trade with AI circulation** - SimpleTrader ships balance the economy

### **Station Labels & Information**
*   **Population count** - affects consumption rate
*   **Materials stock** - raw resources for production
*   **Goods stock** - manufactured items
*   **Station credits** - available for trading
*   **Cargo percentage** - visual capacity indicator

## Key Concepts & Architecture

*   **Game Loop**: Managed in `game.js` within the `animate()` method, which calls `update()` at each frame. `update()` is responsible for updating all game entities, checking collisions, and handling game logic based on `deltaTime`.
*   **Entity Management**: Game entities (stations, pirates, projectiles, etc.) are stored in the `this.entities` object within the `SpaceCargoGame` class. They are typically created during zone loading or dynamically during gameplay.
*   **State Management**: The primary game state (credits, player ship stats, cargo, current zone, faction standings) is managed in `this.gameState` within the `SpaceCargoGame` class. The `UIManager` reads from this state to update the UI.
*   **Zone System**: The game world is divided into zones (e.g., 'alpha-sector', 'outer-wilds'). The `loadZone(zoneId)` method in `game.js` handles clearing old entities and populating the scene with entities specific to the new zone.
*   **Input Handling**: Keyboard and mouse inputs are captured in `game.js` (`setupInput()`). Key presses update the `this.keys` object, which is used by the `PlayerShip` and other game systems for actions. Mouse clicks are used for firing weapons.
*   **Rendering**:
    *   Primary rendering is done by `THREE.WebGLRenderer`.
    *   In-world text labels (like station names) are rendered using `THREE.CSS2DRenderer`, allowing HTML elements to be positioned in the 2D game space.
*   **UI**:
    *   Managed by `UIManager` in `ui.js`.
    *   UI panels are standard HTML elements styled with CSS.
    *   Off-screen indicators for stations and jump gates are dynamically created and positioned HTML elements.
*   **Minimap**:
    *   Implemented in `minimap.js` using a 2D HTML Canvas.
    *   Displays entities relative to the player.
    *   Includes UI filters to toggle visibility of different entity types.
*   **Simple Economy System**:
    *   **2-Resource Economy**: Stations use only Materials and Goods (no complex commodities).
    *   **Production**: Stations automatically convert 2 Materials → 1 Produced Good every 5 seconds.
    *   **Consumption**: Station population consumes 1 Good per 1000 people per day.
    *   **Day Counter**: 3 minutes = 1 game day for observable economic cycles.
    *   **Dynamic Pricing**: Prices fluctuate based on station scarcity (low stock = higher prices).
    *   **SimpleTrader AI**: Autonomous trader ships balance resources between stations.
    *   **Station Credits**: Each station has 1000-3000 credits for player trading.

## Development Workflow

*   **ESM Modules**: All JavaScript code is organized into ES Modules. Use `import` and `export` statements.
*   **Importmaps**: Third-party libraries (like Three.js) and local modules are mapped in `index.html`. Project files are typically mapped by their filename without the `.js` extension (e.g., `import { PlayerShip } from 'ship';`).
*   **Incremental Changes**: Focus on making small, logical, and incremental changes.
*   **No Build Step**: Changes to JS/CSS/HTML are reflected immediately upon browser refresh.
*   **Code Style**: Strive for clean, readable, and well-commented code.
## Areas for Future Development & Notes for Cline
*   **"Thinking in Code" Commenting Style**: To help with clarity and maintainability, try to follow these commenting guidelines:
    1.  **Explain the "Why," Not Just the "What":** Provide context beyond the literal code.
        *   *Instead of:* `// Increment counter`
        *   *Think:* `// Increment counter to track active users for session management.`
    2.  **Document Assumptions and Trade-offs:** Note any choices made for simplicity or due to current limitations.
        *   *Example:* `// Using a simple array for now. Consider a more performant Set if duplicates become an issue.`
    3.  **Acknowledge "Good Enough for Now" Solutions:** If it's a temporary fix, state it.
        *   *Example:* `// Quick fix for rendering glitch. Shader refactor needed.`
    4.  **Seed Future Improvements (Micro-Roadmapping):** Jot down potential enhancements.
        *   *Example:* `// TODO: Refactor this into a reusable utility function.`
    5.  **Clarify Complex Logic:** If code is intricate, leave breadcrumbs.
        *   *Example:* `// Order of these operations is critical due to X, Y, Z dependencies.`
    6.  **Note Interdependencies:** Warn about potential side effects if code changes.
        *   *Example:* `// This function is also called by analytics, careful with signature changes.`
    7.  **Think Out Loud (Briefly):** Show your thought process if alternatives were considered.
        *   *Example:* `// Considered a Map, but Object is sufficient here.`
    8.  **Use "TODO:", "FIXME:", "NOTE:" Prefixes:** Categorize comments for easy searching.
*   **Asteroid Minimap Filter**: The last requested feature was to add asteroids to the minimap and include a filter for them. This involves:
    1.  Adding an "Asteroids" checkbox to `index.html`'s minimap filter UI.
    2.  Updating `minimap.js` to:
        *   Add an `asteroids` property to `this.filters`.
        *   Set up an event listener for the new checkbox.
        *   In the `update()` method, conditionally draw asteroids based on `this.filters.asteroids`.
        *   Ensure `this.entities.asteroids` is accessible and iterated over.
*   **Advanced AI**:
    *   More complex pirate tactics (e.g., flanking, retreating).
    *   Friendly ships could have more diverse goals (e.g., mining, patrolling, specific trade routes).
    *   Faction-based AI interactions (e.g., factions attacking each other).
*   **Combat Mechanics**:
    *   Different weapon types (missiles, lasers with different properties).
    *   Ship abilities (e.g., temporary speed boost, EMP).
    *   More detailed damage models (e.g., subsystem targeting).
*   **Missions & Quests**: Introduce a storyline or procedural missions (e.g., delivery quests, bounty hunting).
*   **Economy Deepening**:
    *   Dynamic price fluctuations based on global supply/demand across zones.
    *   Crafting or refining raw materials.
*   **Saving & Loading**: Implement a system to save and load game progress (e.g., using `localStorage`).
*   **Audio**: Add sound effects for weapons, engines, explosions, UI interactions, and background music.
*   **Mobile Responsiveness & Controls**: While some effort has been made for a responsive layout, dedicated mobile controls (e.g., on-screen joystick, buttons) and further UI scaling would be beneficial.
*   **Visual Enhancements**: Particle effects for explosions, engine trails, improved ship/station models.
*   **Hidden Files**: Note that `ship.js`, `friendlyShip.js`, and `miningLaser.js` are part of the project but their contents were not visible to Rosie. Their specific implementations will need to be reviewed.
Cline, I hope this helps you get up to speed! The project has a solid foundation. Good luck!
