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
  ```js
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
