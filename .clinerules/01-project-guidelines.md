# Space-Cargo-Commander — Project Coding Rules
# Saved as /.clinerules/01-project-guidelines.md
# ------------------------------------------------------------------------
# Purpose: keep every Cline-generated change consistent with our core
#           architecture, economy, and debugging standards.
# ------------------------------------------------------------------------

## 1. Architecture & File-Structure
- **Reuse over Reinventing**  
  - *Never* create a new entity/base class (e.g., `PoliceStation`, `MegaShip`) unless
    the prompt explicitly says “create a brand-new class.”  
  - Extend or configure existing classes (`Station`, `TradingShip`, `SimplePirate`, etc.).
- **Entity Registration**  
  - Every entity with a `.mesh` **must** be pushed into its canonical array:  
    - Stations → `game.entities.stations`  
    - Pirates  → `game.entities.pirates`  
    - Police   → `game.entities.police`  
    - Traders  → `game.entities.tradingShips`  
  - After registration, always call `scene.add(entity.mesh)`.
- **Helper Functions**  
  - Prefer helper wrappers (`spawnStation`, `spawnPirate`, …) for repeated patterns.  
  - Helper must: create entity, set `name`, `type`, `faction`, push to array, add to scene.

## Example:
PLAN MODE:

Goal  stop 404 on PirateHunter by committing the file and wiring import map.

Steps
1. ensure src/entities/ships/PirateHunter.js exists locally (the class we wrote).

2. open index.html and in the importmap add:
     "pirateHunter": "./src/entities/ships/PirateHunter.js",

3. open game.js (or wherever you spawn hunters)
     import { PirateHunter } from 'pirateHunter';

4. git add index.html \
         src/entities/ships/PirateHunter.js \
         game.js
   git commit -m "feat: wire PirateHunter into import map and game"
   git push origin main



## 2. Station Handling
- **Station Creation**  
  - Use `new Station(type, position, resources, prices, CSS2DObject)`  
    or the `spawnStation()` helper—**no custom subclasses**.  
  - Mandatory properties set immediately after construction:  
    `station.name`, `station.type`, `station.faction`.
- **Label Logic**  
  - Label is created *once* inside the `Station` constructor (or `ensureLabel()`),  
    after `name` is assigned.  
  - All station types (mining, agricultural, police, etc.) share the same label code.
- **Push & Scene Add**  
  - Creation is incomplete until both:  
    `game.entities.stations.push(station)` **AND** `scene.add(station.mesh)`.

## 3. Order Logic
- **Single Target Field**  
  - Every order *must* use `order.toStation` (no `toPoliceStation`, `toResearchStation`, etc.).  
  - `fromStation` & `toStation` are always valid `Station` objects with `.mesh`.
- **Fund-Police Orders**  
  - Created only if `fromStation.credits ≥ amount + reserve`.  
  - Use `virtualCargo: { type: 'credits', amount }`.  
  - Trader picks up credits → `state = 'deliverCredits'` → delivers upon docking.
- **Order Lifecycle**  
  - States: `pending` → `takenBy` set → `inTransit` (ship carrying) →  
    `completed | abandoned`.  
  - Stations must not create duplicate `fundPolice` orders if one is already `pending`  
    or `inTransit`.

## 4. Trader AI
- Trader may accept an order only if:
  1. `order.type` is in `{ buy, sell, fundPolice }`
  2. Trader is **not** currently carrying another order.
- Docking & Delivery:
  - Use shared `isDockedAt(targetStation)` distance check (`< 6` units).  
  - Credits or cargo are transferred *only* after docking succeeds.
- Destruction Handling:
  - If `carryingCredits` or cargo on death → log loss and do *not* auto-recreate order.

## 5. Debug & Logging
- **Required Debug Lines**  
  - Trader: accept, pickup, delivery, abandon, destroyed (with amounts).  
  - Station: creates order (buy/sell/fundPolice).  
  - Police Station (type `'police'`): receives funding, spawns patrol.
- **Console Warnings**  
  - Warn if `findNearbyPoliceStation()` or similar returns `null`.  
  - Warn if any entity has no `.mesh` after creation.

## 6. Testing & CI
- Every zone load (`loadZone()`) must call `debugSanityCheck()` that asserts:  
  - ≥ 1 station of each intended type exists.  
  - All entities in arrays have a `.mesh`.  
  - No duplicate station names.
- A failing sanity check must log `"[FATAL] Sanity check failed"` and halt Cline-driven changes.

## 7. Git & Rollback Discipline
- Create a commit labeled `***stable***` before any multi-file Cline refactor.
- Never `git reset --hard` in scripts; manual rollback only.
- Update the game version number in `index.html` after each significant change to reflect the new version in the format "Galactic Run vX.Y.Z", incrementing the appropriate version component (major, minor, patch) based on the scope of the change.

---
# End of rules
