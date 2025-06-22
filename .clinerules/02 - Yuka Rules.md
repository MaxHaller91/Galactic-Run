Below is a “Yuka Gameplay Checklist” distilled from every tutorial transcript in your project folder. Treat each item as a rule you (or Cline) should verify any time you touch AI code in Galactic Run. Citations point back to the exact tutorial that motivated the rule.

1 Core Integration (applies to every Vehicle)
#	Rule	Why
1	Always link the Three.js mesh with vehicle.setRenderComponent(mesh, sync) and set mesh.matrixAutoUpdate = false.	Ensures Yuka owns position + rotation updates, preventing double-transforms.
2	Update delta-time via const delta = yukaTime.update().getDelta() — never roll your own “delta” helper.	Keeps motion frame-rate independent and matches tutorial practice. 2025-06-22 17_52_29_536…
3	If a Vehicle jitters during fast obstacle checks, attach vehicle.smoother = new YUKA.Smoother(≈30).	Reduces micro-steering oscillations shown in the obstacle-avoidance demo. 2025-06-22 17_49_45_363…
4	Call geometry.computeBoundingSphere() and copy the radius to every vehicle.boundingRadius (and to each obstacle’s boundingRadius).	ObstacleAvoidance only works when both agent and obstacles report their true size. 2025-06-22 17_49_45_363…

2 Per-Behavior Checks
Behavior	What to verify before you ship
Seek	Target must be a live GameEntity or a Vector3; if it’s a mesh, wrap it in a GameEntity first. 2025-06-22 17_52_29_536…
Arrive	Tune (deceleration, stopDistance) → constructor signature is (target, deceleration=3, stopDist=0); use a small stopDist (≤0.1) when clicking close to the ship so it still moves.
Flee	Provide a panic distance as 2nd arg; without it the agent will react at any range and look wrong. 2025-06-22 17_44_13_442…
Pursuit	Pass optional maxPrediction value if your evader turns sharply; larger prediction = earlier cutoff. 2025-06-22 17_51_59_243…
Offset Pursuit	follower.maxSpeed must be higher than the leader to maintain spacing; test multiple speeds. 2025-06-22 17_50_10_242…
Interpose	Constructor expects two Vehicles; don’t pass meshes or positions directly. 2025-06-22 17_46_16_696…
Obstacle Avoidance	Both the vehicle and each obstacle entity need valid boundingRadius. Add vehicle.smoother (≈30 frames) if you see shaking. 2025-06-22 17_49_45_363…
Wander	Random-start orientation: call vehicle.rotation.fromEuler(randX, randY, randZ) and randomize initial position so every wanderer looks unique. 2025-06-22 17_52_51_805…
Path Follow	• Use path.loop = true for circuits  • Change checkpoints when distanceToCurrent ≤ arrivalThreshold (second constructor arg)  • For strict adherence stack OnPathBehavior on top of FollowPathBehavior. 2025-06-22 17_51_29_016…
Flocking trio	Before adding Alignment / Cohesion / Separation, set vehicle.updateNeighborhood = true and vehicle.neighborhoodRadius ≥ the flock’s diameter; then tweak alignment.weight up, wander.weight down for less chaos. 2025-06-22 17_44_45_535…

3 Clicks, Targets & UI Helpers
Click-to-Move
Cast a Raycaster against an invisible plane and feed the hit-point into an ArriveBehavior target entity. Keep arrive.stopDist very small so the ship pivots even at short hops. 2025-06-22 17_47_07_457…

On-screen HTML
When overlaying CSS2D labels, set renderer.domElement.style.pointerEvents = 'none' so OrbitControls still work. 2025-06-22 17_45_43_803…

4 Nav-Mesh / Path-Finding Rules
#	Rule
1	Load the nav-mesh with new NavMeshLoader().load(url) before spawning agents; keep a reference for path queries. 2025-06-22 17_49_07_586…
2	Derive each move-to target via navMesh.findPath(start, goal) and push the returned waypoints into FollowPathBehavior.path.clear().add(…). 2025-06-22 17_49_07_586…
3	If an agent can leave the mesh (e.g., vertical flight), subclass Vehicle and clamp Y-offset back toward navMesh.getRegionForPoint() as shown in the video. 2025-06-22 17_49_07_586…

5 Finite State Machines (high-level AI)
Checklist	Source
Register all states once (fsm.add('PATROL', new Patrol())) and switch with fsm.changeTo(name).	2025-06-22 17_43_46_780…
Each state must implement enter, execute, exit; put only behavior switches (activate/deactivate steering) inside them—do not move positions by hand.	2025-06-22 17_43_46_780…
Global logic goes into a dedicated global state or Vehicle.update. Don’t bury cross-cutting checks in every state.	2025-06-22 17_43_46_780…

6 Performance & Scaling
For > ~100 agents, create a CellSpacePartitioning grid that fully encloses the playable volume before calling entityManager.update(). (This massively speeds neighbor searches for flocking & avoidance.) 2025-06-22 17_44_45_535…

Gate heavy sensory or strategic logic behind a Regulator so it runs at e.g. 4–10 Hz instead of every frame. (Demonstrated verbally across several tutorials.) 2025-06-22 17_44_45_535…

How to use this list
Code review: Add each rule as an item in your Cline lint script or your pull-request checklist.

Unit tests: For things like boundingRadius presence or setRenderComponent, write Jest tests that assert the property exists on every spawned agent.

Gameplay QA: During play-tests, keep an eye on rules flagged “Why” above—if you see the symptom, you’ve violated the rule.

With these checks in place you’ll stay aligned with the official tutorials and eliminate the runtime glitches we’ve been chasing.

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
