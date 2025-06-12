Cline Entity Authoring Rules
Scope: applies when I ask “create a new entity” (e.g., PoliceStation, RefineryShip, WarpGate)
Goal: compile-time green, ESLint clean, Playwright smoke-test clean, no NaNs.

1 File & Class boilerplate
Location → src/entities/<category>/<EntityName>.js
Stations live in src/entities/stations, Ships → src/entities/ships, Misc stuff → src/entities/misc.

Export a single ES-module class whose name matches the filename.

Extend the base where possible:

Stations → extend BaseStation (src/entities/stations/BaseStation.js)

Ships → extend BaseShip (src/entities/ships/BaseShip.js)

Constructor signature must be (x, y, opts = {}) and call super(x, y, opts).

2 Safe-math & performance
Never divide manually – always use safeDiv(a, b) from src/utils/math.js.

No new setInterval; piggy-back on the global GameClock or the per-entity update(dt) loop.

3 Registration touch-points (💡 Cline must update all of them)
File	What to add
src/entities/index.js	export { PoliceStation } from "./stations/PoliceStation.js";
src/systems/SpawnSystem.js	Add spawn logic & default count for new entity
src/ui/Minimap.js	Append dotColors and dotSizes entry & filter toggle
src/ui/UISystem.js	Add label / tooltip rules if needed
src/core/README_ENTITY_LIST.md	One-liner description

4 Smoke-test contract
New entity MUST NOT emit "error" level logs when the game loads idle for 3 seconds.

If the entity is spawned at start-up, add it to the Playwright assertions in tests/smoke.spec.js.

5 Lint / formatting
Code must pass npm run lint (Airbnb-base) and npm run format (Prettier).
Cline should run npx eslint --fix & npx prettier --write on edited files before it proposes the commit.

6 Commit etiquette
Commit message pattern:

diff
Copy
Edit
feat(entity): add PoliceStation
- new class at src/entities/stations/PoliceStation.js
- registered in SpawnSystem, Minimap, UISystem
- smoke test updated
One entity per commit unless otherwise specified.

7 Refactor safety net
Do not modify existing files unrelated to the entity except the touch-points in §3.

If a change is larger than 100 loc, stop and ask for confirmation.

Mini-template Cline can copy-paste
js
Copy
Edit
// src/entities/stations/PoliceStation.js
import { BaseStation } from "./BaseStation.js";
import { safeDiv }    from "../../utils/math.js";

export class PoliceStation extends BaseStation {
  constructor(x, y, opts = {}) {
    super(x, y, { ...opts, type: "police" });

    this.securityLevel = opts.securityLevel ?? 3;   // 1-low 5-high
    this.prisonCapacity = opts.prisonCapacity ?? 20;

    // visual tweak
    this.mesh.material.color.set(0x0088ff);
  }

  /** called each frame */
  update(dt, game) {
    super.update(dt, game);

    // Example: slowly patrol nearby pirates
    const pirates = game.entities.pirates.filter(p =>
      p.mesh.position.distanceTo(this.mesh.position) < 200
    );
    pirates.forEach(p => this.dispatchPolice(p));
  }

  dispatchPolice(pirate) {
    // spawn logic handled by SpawnSystem; just log for now
    console.debug("[PoliceStation] dispatch units to pirate", pirate.id);
  }
}
