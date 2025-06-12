Below is a **ready-to-paste “Cline playbook”** that tells your local AI *exactly* what to do, in what order, and how to keep you safe while it’s hacking on the project.

---

## ✨ Galactic Run Refactor Road-Map (v0.1)

> **Target:** turn the current spaghetti into a well-layered code-base **without breaking the live game**
> **Tools assumed:** plain Git, Node 16+, npm, Playwright, Husky, a shell with `bash`, `sed`, `grep` & `python3`

---

### 0  Bootstrapping safety nets ( *15 min* )

1. **Create a new branch**

   ```bash
   git switch -c refactor/structure
   ```

2. **Install quick smoke-test + pre-commit guard** (no GUI, ≈ 2 s run-time)

   ```bash
   npm i -D @playwright/test husky
   npx playwright install
   npx husky install
   npx husky add .husky/pre-commit "npm run test:smoke"
   ```

   `package.json`

   ```json
   "scripts": {
     "test:smoke": "playwright test --config=playwright.config.js"
   }
   ```

   `playwright.config.js`

   ```js
   export default {
     webServer: {
       command: "python3 -m http.server 8000 --bind 127.0.0.1",
       port: 8000,
       reuseExistingServer: true,
       timeout: 10000
     },
     testDir: "tests",
     use: { baseURL: "http://127.0.0.1:8000", headless: true }
   };
   ```

   `tests/smoke.spec.js`

   ```js
   import { test, expect } from "@playwright/test";
   test("boot w/o console errors", async ({ page }) => {
     const logs = [];
     page.on("console", m => logs.push([m.type(), m.text()]));
     await page.goto("/index.html");
     await expect(page.locator("#gameContainer")).toBeVisible();
     await page.waitForTimeout(1000);
     expect(logs.filter(l => l[0] === "error")).toHaveLength(0);
   });
   ```

   ✅ Now **every `git commit` aborts if the game fails to boot**.

---

### 1  Prepare ignore list ( *2 min* )

```bash
echo -e "Backups/\n*.zip\n.DS_Store" >> .gitignore
git add .gitignore
git commit -m "chore: ignore backups & artefacts"
```

---

### 2  Phase-1 Structural split ( *≈ 30 min* )

> **Goal:** move code, DO NOT rewrite logic.

| Step | Result                                                                                                                                        | Smoke-test?         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 2-1  | `mkdir -p src/{entities/{ships,stations,misc},systems,ui,core}`                                                                               |                     |
| 2-2  | Copy **unchanged** classes from the current monoliths:<br> `entities.js → src/entities/...` exactly as shown below                            | ✅ after each folder |
| 2-3  | Build re-export barrels:<br> `src/entities/ships/index.js` … etc.                                                                             | ✅                   |
| 2-4  | Replace old imports (`import { Station } from 'entities';`) with<br>`import { Station } from '../entities/stations/index.js';` (use `sed -i`) | ✅                   |
| 2-5  | Update `index.html importmap` → `"entities": "./src/entities/index.js"`                                                                       | ✅ (final)           |

**Cline-snippet (example for Simple move)**

```bash
### MOVE: Asteroid #############################################
mkdir -p src/entities/misc
grep -nA3 -B3 "class Asteroid" entities.js  # show lines to copy
# ⌛ (human sanity check)
sed -n '/class Asteroid/,/export class/ p' entities.js > src/entities/misc/Asteroid.js
```

Repeat for:

* **/misc/** – `Asteroid`, `JumpGate`, `Projectile`, `DistressBeacon`, `EconomicEngine`
* **/stations/** – `Station`, `PirateStation`
* **/ships/** – `TradingShip`, `SimplePirate`, `SimplePolice`, `SimpleFriendlyShip`, `PlayerShip`

After each group:

```bash
npm run test:smoke && git add -A && git commit -m "feat: move <group> to src"
```

---

### 3  Phase-2 Logic islands ( *1–2 h* )

Break the 2 000-line `game.js` loop into **systems**:

| New file                       | Responsibility                                    | How to cut                                                    |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------- |
| `src/systems/PhysicsSystem.js` | move & update positions, velocity maths           | copy the `update()` sections for player, pirates, projectiles |
| `src/systems/EconomySystem.js` | station production/consumption + `EconomicEngine` | everything touching `resources.*`, `credits`                  |
| `src/systems/AISystem.js`      | pirate AI, trader state-machines                  | current `update()`s                                           |
| `src/systems/UISystem.js`      | wrapper around existing `UIManager` calls         | de-splice from `game.update`                                  |

**Pattern**

```js
export class PhysicsSystem {
  constructor(entities) { this.entities = entities; }
  update(dt) {
    this.entities.pirates.forEach(p => p.updatePhysics(dt));
    ...
  }
}
```

`game.js` becomes a thin scheduler:

```js
this.systems = {
  physics: new PhysicsSystem(this.entities),
  economy: new EconomySystem(this.entities, this.availableOrders),
  ai: new AISystem(this.entities, this),
  ui: new UISystem(this.ui, this.entities)
};

update(dt) {
  for (const s of Object.values(this.systems)) s.update(dt);
}
```

Smoke-test & commit after each extracted system.

---

### 4  Phase-3 Quality sweep ( \_1 h )

1. `npm i -D eslint prettier`
2. Add **airbnb-base** ESLint config, run `npx eslint --fix src`.
3. Attach `lint-staged` to the same Husky hook so only staged files are auto-formatted.

---

### 5  Optional upgrades

* Convert to **TypeScript** (rename `.js → .ts`, let tsc find the bugs Cline missed).
* Switch Playwright smoke-test to run a **real gameplay frame-count check** (e.g. pirates spawn & die).
* Add **Vitest + jsdom** for pure unit tests (no browser needed).
* Bundle with **Vite** – import-maps no longer necessary.

---

## Hand-off paragraph you can paste to *Cline*

```
# === GALACTIC RUN STRUCTURAL REFACTOR ===
# Follow each numbered PHASE exactly. Never change logic,
# only move code + rewrite imports. After *EVERY* bullet:
#   1) npm run test:smoke
#   2) if green → git add -A && git commit -m "<step>"
#   3) if red   → git restore . && echo "ABORT. Ask human."
# Phases:
# 0 backup+smoke  | 1 folder move | 2 systems extraction | 3 eslint/prettier
# (details in README_REFACTOR.md committed with this message)
#
# STRICT TIME-OUT: stop after 25 consecutive commits or any failing test.
```