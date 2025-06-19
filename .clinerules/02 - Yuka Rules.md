Below is a **replacement rules file** — drop it in
`/.clinerules/01-project-guidelines.md` and delete the old version.
Every rule is concrete and tied to the exact Yuka-related errors we’ve
hit (duplicate modules, bad StateMachine adds, wrong Dispatcher call,
out-of-bounds partitioning).

````markdown
# Galactic Run  • Cline Coding Rules
# /.clinerules/01-project-guidelines.md
# ─────────────────────────────────────────
# Goal: zero Yuka runtime errors, minimal viable edits, clean git commits.
# ─────────────────────────────────────────

## 0 Single-import golden rule
* All source files **must import Yuka only like**  
  `import { State, StateMachine, GameEntity } from 'yuka';`  
  Never use relative paths, build paths, or alias files.

## 1 World singleton
* `src/core/World.js` exports **one default instance**.
* Only `world.addEntity(entity)` may push to `entityManager`, arrays,
  and `scene.add(mesh)`.

## 2 State machines
* Always pass instances:  
  ```jsBelow is the **final replacement** for
`/.clinerules/01-project-guidelines.md`.
It adds explicit Yuka‐101 requirements: every moving object **must extend `YUKA.Vehicle`**, use `setRenderComponent`, never do manual physics, and only manipulate movement via steering-behavior weights.
Copy-paste this file into your repo and delete the prior version.

````markdown
# Space-Cargo-Commander • Cline Coding Rules
# /.clinerules/01-project-guidelines.md
# ─────────────────────────────────────────
# Purpose • Stop recurring Yuka errors by hard-locking
#  module import, Vehicle usage, steering patterns, and git hygiene.
# ─────────────────────────────────────────

## 0 Single-import golden rule
* All source files **must** import Yuka exactly as  
  `import { State, StateMachine, Vehicle, GameEntity } from 'yuka';`  
  No relative paths, alias files, or compiled paths.

---

## 1 Entity base classes

### 1.1 Moving things → extend `YUKA.Vehicle`
```js
export class TradeShip extends Vehicle { … }      ✅
export class PirateRaider extends Vehicle { … }    ✅
````

* Never extend `GameEntity` for something that moves.
* Vehicles come with `.steering`, `maxSpeed`, `mass`, etc.

### 1.2 Static things → extend `YUKA.GameEntity`

Stations, asteroids, nav-buoys stay on `GameEntity`.

---

## 2 Mesh synchronisation

### 2.1 Use `setRenderComponent`

```js
this.setRenderComponent(mesh, (entity, rc) => {
  rc.position.copy(entity.position);
  rc.quaternion.copy(entity.rotation);
});
```

* No manual position / quaternion copying in the render loop.
* Never call `lookAt()` on a render mesh — the Vehicle quaternion is the source of truth.

---

## 3 Steering & Physics

### 3.1 Steering only — no manual physics

* Forbidden pattern (causes drift / duplicate physics):

  ```js
  // ⛔ do not add acceleration manually
  owner.velocity.add(acceleration.multiplyScalar(dt));
  owner.position.add(owner.velocity.multiplyScalar(dt));
  ```
* Correct pattern:

  ```js
  const seek   = new SeekBehavior(target.position);
  const arrive = new ArriveBehavior(target.position);
  this.steering.add(seek).add(arrive);
  ```
* States should **activate / deactivate** steering behaviors, not move positions.

---

## 4 Message dispatcher

* Use `dispatcher.dispatchDelayedMessages()` — never call `update()` on the dispatcher.

---

## 5 Spatial index (CellSpacePartitioning)

* Disabled by default; enable only when grid bounds cover every entity coordinate (positive *and* negative).
* If enabled and any entity spawns outside the grid → treat as fatal.

---

## 6 State machine rules

* Always pass instances:
  `fsm.add('DOCKING', new DockingState());`
* Guard duplicate adds with
  `if (!fsm.states.has('DOCKING')) …`.

---

## 7 Import hygiene check (Cline must run)

1. Search for `from 'yuka'` → should have hits.
2. Search for `/alias/yuka` or `node_modules/.vite.*yuka` → must be **zero** hits.
   If any, fail the job.

---

## 8 Minimal-viable edit workflow

1. **Plan mode**: list exact file diffs.
2. **Act mode**: apply only those lines.
3. Rebuild with cache wipe:

   ```
   npx rimraf node_modules/.vite
   npm run dev -- --force
   ```

   (`requires_approval: false` for this command.)
4. Hard-refresh browser, confirm no Yuka warnings and scene works.
5. Commit to current feature branch, **not** to `main`.

---

## 9 Git discipline

* One logical change → one commit.
* Commit message: `fix(yuka): …`, `feat(ai): …`, etc.
* Before multi-file refactor: commit a marker `***stable***`.
* Never run `git reset --hard` in automated scripts.

---

## 10 Example TradeShip skeleton (canonical pattern)

```js
import { Vehicle, SeekBehavior, ArriveBehavior, State, StateMachine } from 'yuka';
import * as THREE from 'three';

export class TradeShip extends Vehicle {
  constructor(name, world) {
    super();
    this.name  = name;
    this.world = world;

    this.maxSpeed = 60;
    this.mass     = 40;

    // steering
    this.seek   = new SeekBehavior();
    this.arrive = new ArriveBehavior();
    this.arrive.deceleration = 2;
    this.steering.add(this.seek).add(this.arrive);

    // FSM
    this.stateMachine = new StateMachine(this);
    this.stateMachine.add('IDLE',    new Idle());
    this.stateMachine.add('SEEKING', new Seeking());
    this.stateMachine.add('DOCKING', new Docking());
    this.stateMachine.changeTo('IDLE');

    // mesh & sync
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(20, 20, 40),
      new THREE.MeshNormalMaterial()
    );
    this.setRenderComponent(mesh, (e, rc) => {
      rc.position.copy(e.position);
      rc.quaternion.copy(e.rotation);
    });
  }
}
```

---

*End of rules*

```
```

  ship.stateMachine.add('SEEKING', new SeekingState());
````

* Never register the same state twice (guard with
  `if (!states.has('SEEKING')) …`).

## 3 Message dispatcher

* The only tick call is

  ```js
  this.dispatcher.dispatchDelayedMessages();
  ```

  Do **not** call a nonexistent `dispatcher.update()`.

## 4 Spatial index

* Disabled by default.
  Uncomment only when the grid bounds enclose every possible entity
  (use a centred grid if negatives appear).
  If enabled and any entity spawns outside the grid → fatal error.

## 5 Import hygiene check (Cline must run **every** time)

1. Search project for `from 'yuka'` – there must be ≥ 1 hit.
2. Search for `/alias/yuka` or `/node_modules/.*yuka` – there must be **0**
   hits after edits.
3. If any other specifier is found, the job fails.

## 6 Minimal-viable edit workflow

* **Plan mode**: list exact diffs; no “maybe/try”.
* **Act mode**: touch only those lines.
* After edits run:

  ```
  npx rimraf node_modules/.vite
  npm run dev -- --force
  ```

  (Cline uses `requires_approval: false` for that command.)

## 7 Git discipline

* One logical change → one commit.
* Commit message style: `fix(yuka): message` or `feat(ai): message`.
* Never mix code changes with “npm run dev” or cache deletion in the
  same tool call.

## 8 Example: correct StationIdleState add

```js
// TradeStation.js
import { State } from 'yuka';
class StationIdleState extends State { /* … */ }

this.stateMachine.add('IDLE', new StationIdleState());   // ✅
```

## 9 Example: correct World.update

```js
update(delta) {
  this.entityManager.update(delta);
  this.dispatcher.dispatchDelayedMessages();
}
```

*End of rules*

```
```
