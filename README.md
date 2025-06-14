# Galactic Run

A browser‑based space sandbox where you pilot your own ship, explore procedurally generated sectors, trade resources, and build your influence among emerging factions.

## Current State (v0.1)

| Area            | Details                                                  |
|-----------------|----------------------------------------------------------|
| Core gameplay   | Real‑time movement with inertia, rotation & thrust.      |
| Entities        | • Player ship (upgradeable hull & thrusters)<br>• Asteroids (mineable ore)<br>• Basic civilian stations (buy/sell ore & fuel)<br>• Jump Gates (sector‑to‑sector travel) |
| Economy         | Dynamic commodity prices driven by supply/demand tick.   |
| Combat          | Prototype laser projectile system (no AI combatants yet).|
| UI              | Minimap, resource counters, and debug overlay.           |
| Tech            | ES Module codebase, Three.js rendering, pure client‑side— deployable as static files (e.g., GitHub Pages). |

## Roadmap – Next Milestones

- **NPC Factions & AI Ships**  
  - Police patrols maintain order in core sectors.  
  - Pirate raiders attack freighters and stations for loot.

- **Expanded Station Types**  
  - Refineries, trade hubs, repair docks with unique services & visuals.

- **Resource Diversity**  
  - Add rare minerals (titanium, iridium) and volatile gases.  
  - Cargo hold management & market price curves per material.

- **Full Mining Loop**  
  - Equip mining lasers / drones.  
  - Ore extraction, refining mini‑game, sell or craft.

- **Player‑Buildable Stations**  
  - Place modules, attract NPC traffic, earn docking fees.

- **Faction Control & Zone Wars**  
  - Territory map, influence scores, periodic conflict events.  
  - Players choose allegiance or stay neutral; wars reshape prices and security levels.

## Playing the Prototype

1. Clone or download the repo.  
2. Serve the / folder locally (e.g. `npx serve -l 5000 .`).  
3. Or play the latest build at [https://maxhaller91.github.io/Galactic-Run/](https://maxhaller91.github.io/Galactic-Run/).

This project is pre‑alpha; expect breaking changes. Feedback & PRs welcome!
