
# Weight Tracker — Build Report (v1)

**Author:** Moditha + ChatGPT  
**Platform:** Electron (Node.js + Chart.js + better-sqlite3)  
**Goal:** A beautiful, local-first weight tracker with motivational GoT-style unlocks

---

## 1) What we built

- **Daily entry form** (date, weight kg (1 dp), workout minutes)
- **SQLite database** (`db/weight-tracker.db`) with 3 tables:
  - `entries` — one row per calendar day (manual or auto-carried)
  - `goals` — 15 weight thresholds + unlock messages + first unlock timestamp
  - `settings` — simple key/value (e.g., reminder time)
- **Charts with Chart.js**
  - Line chart for weight + optional SMA‑7 & SMA‑20
  - Visual horizontal goal lines (styled grid overlays)
  - Bar chart for workout minutes (single-color theme)
- **Goal unlock system**
  - Renderer calls `ipcRenderer.invoke("check-goals", currentWeight)`
  - `main.js` looks up locked goals, marks the first crossed as unlocked, returns the message
  - Themed modal shows a GoT‑style reward popup; emoji separated into title
- **Daily reminder plan**
  - Windows Task Scheduler launches the app at **8:30 PM** using a **.vbs** script
- **Safety**
  - **Carry-forward** logic fills skipped days with the last known weight (type = `carry`)
  - **Backup button** copies `weight-tracker.db` to timestamped files in `/db`

---

## 2) Folder & file highlights

```
weight-tracker/
├─ main.js                    # Electron main process
├─ renderer.html              # UI (form + charts + modal)
├─ renderer.js                # Front-end logic / charts / IPC calls
├─ electron_modules/          # Electron’s native modules (better-sqlite3 here)
│  └─ node_modules/…
├─ db/
│  ├─ weight-tracker.db       # SQLite database
│  └─ migrate.js (if any)     # schema creation at app start
├─ launch_weight_tracker.vbs  # used by Task Scheduler
└─ assets/
   └─ wtbackground.jpg        # background image
```

---

## 3) Database schema (summary)

- **entries**
  - `date_local TEXT UNIQUE` (YYYY‑MM‑DD, local calendar date)
  - `weight_kg_1dp REAL NOT NULL` (e.g., 86.7)
  - `workout_minutes INTEGER NOT NULL DEFAULT 0`
  - `entry_type TEXT NOT NULL DEFAULT 'manual'` (`manual` or `carry'`)
  - `created_at_utc TEXT`, `updated_at_utc TEXT`

- **goals**
  - `order_idx INTEGER` (1..15, display order)
  - `threshold_kg REAL`
  - `title TEXT`, `message TEXT`
  - `unlocked_at_utc TEXT NULL`

- **settings**
  - `key TEXT PRIMARY KEY`, `value TEXT`

**Migrations:** On first run, `main.js` (or `db/migrate.js`) creates tables with `CREATE TABLE IF NOT EXISTS …`.

---

## 4) Major problems we hit — and how we fixed them

### 4.1 Native module (better‑sqlite3) mismatch
**Symptom:** Electron crashed with *“was compiled against a different Node.js version (NODE_MODULE_VERSION …)”* when loading `better-sqlite3`.

**Cause:** Electron uses a different Node ABI than your system Node. One `node_modules` cannot satisfy both.

**Solution:** We isolated Electron’s native deps under `electron_modules/node_modules` and ensured Electron loads from there. In `main.js` we added:
```js
const Module = require("module");
const path = require("path");
Module.globalPaths.unshift(
  path.join(__dirname, "electron_modules", "node_modules")
);
```
This makes `require("better-sqlite3")` resolve the Electron‑built binary.  
(When running plain `node` scripts we either injected a relative path similarly or used DB Browser for SQLite.)

---

### 4.2 “require is not defined” in the renderer
**Symptom:** DevTools showed `require is not defined` and nothing ran.

**Cause:** The renderer was using browser context without Node integration / preload.

**Fix:** For this small local app we enabled:
```js
new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false
  }
});
```
(For production, prefer a **preload.js** instead, but this setting unblocked us quickly.)

---

### 4.3 Chart kept redrawing / canvas “kept expanding”
**Symptoms:** Chart repeatedly grew or stacked; resizing looked infinite.

**Causes & Fixes:**
- We were creating a **new Chart** every refresh without destroying the old one.  
  **Fix:** keep references (`window.weightChart`, `window.workoutChart`) and *destroy before recreate*:
  ```js
  if (window.weightChart) window.weightChart.destroy();
  window.weightChart = new Chart(ctx, config);
  ```
- CSS/size conflicts: container vs canvas.  
  **Fix:** use a stable container with height and `maintainAspectRatio: false` in Chart.js, avoid manual resize loops.

---

### 4.4 Goal lines + legend spam
**Symptom:** Horizontal goal guides showed “null” labels in the legend.

**Fix:** We hid goal datasets from the legend using a legend filter (or by not giving labels):
```js
options.plugins.legend.labels.filter = (item) => {
  return !item.text || !item.text.startsWith("Goal");
};
```
And we rendered horizontal gridlines by feeding each goal as a line dataset with all‑`null` Y except at two points or by using scriptable plugin drawing.

---

### 4.5 Renderer event timing / DOMContentLoaded
**Symptom:** Handlers referenced elements before they existed; date input missing.

**Fix:** Wrapped renderer setup in `document.addEventListener("DOMContentLoaded", …)` and ensured querySelectors run after the DOM is ready.

---

### 4.6 IPC save flow errors
**Symptom:** “Error saving entry!” with little context.

**Fix:** Added try/catch in `ipcMain.handle("save-entry")` and in the renderer submit; logged payloads; returned `{ ok/status, message }` from main for clear UI alerts. Also ensured date normalization to `YYYY‑MM‑DD`.

---

### 4.7 Seeding goals
We initially tried a Node seeding script, but since it would need ABI‑aware module resolution, we chose a **simple SQL seed** via **DB Browser**:
```sql
DELETE FROM goals;
INSERT INTO goals (order_idx, threshold_kg, title, message, unlocked_at_utc) VALUES
(1, 83.0, 'Goal 1', '…Movie Night with Vodka.', NULL),
… (all 15 rows) …
(15, 55.0, 'Goal 15', '…Victory Lap with Vodka.', NULL);
```

---

## 5) Key features explained

### 5.1 Carry‑forward for skipped days
When you insert a new entry with gaps since the last recorded date, main fills the missing dates as `entry_type='carry'` using the last weight, so charts remain continuous.

### 5.2 Goal unlock flow
- After a successful save, the renderer calls `checkGoalUnlock(weight)`.
- `main.js` queries the next **locked** goal whose `threshold_kg >= weight` (descending by threshold); if found, it sets `unlocked_at_utc=now` and returns the message.
- The renderer shows a **themed modal** (no auto‑dismiss, emoji pulled into the title via regex).

### 5.3 Backup button
Renderer:
```js
const res = await ipcRenderer.invoke("backup-database");
```
Main:
```js
const src = path.join(__dirname, "db", "weight-tracker.db");
const dest = path.join(__dirname, "db", `weight-tracker-backup-${Date.now()}.db`);
fs.copyFileSync(src, dest);
```
One click → timestamped copy saved.

### 5.4 Task Scheduler launch (with .vbs)
- `launch_weight_tracker.vbs`:
```
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "C:\…\weight-tracker
ode_modules\.bin\electron.cmd .", 0, False
```
- **Create Task…** → Daily 8:30 PM → Action: `wscript.exe` with the `.vbs` path in **Arguments** → Start‑in is the project folder.  
(We used **Create Task** for full control; *Basic Task* is ok for very simple launches.)

### 5.5 Visual polish
- Custom fonts (Google Fonts): **Cinzel Decorative** for titles, **Lato** for body.
- Solid single color for workout bars to avoid “cartoonish” look.

---

## 6) How to use (daily flow)

1. Open the app (auto at 8:30 PM via Task Scheduler).
2. Enter today’s **weight** and **workout minutes** → **Save**.
3. If you cross a **goal**, the GoT popup appears (manual close).
4. Use **Backup Database** occasionally (creates timestamped snapshot in `/db`).

---

## 7) Packaging (later)

When ready to ship a `.exe`:
- Add **electron-builder** to `devDependencies` (we earmarked version in earlier notes).
- Provide `build` config (appId, win icon, files to include, extraResources for DB).
- Test portable build; confirm DB path handling.

---

## 8) What’s next (optional ideas)

- Move Node integration to a **preload.js** for tighter security.
- Add **SMA‑7 / SMA‑20** rendering toggles.
- Show **markers** on the chart at unlocked goals (with dates).
- Add a small **sound** on unlock.
- Habit table + checkboxes (future).

---

## 9) Lessons learned

- Native modules + Electron require **ABI‑aware installs**; keeping a dedicated `electron_modules` simplifies life.
- Always **destroy** previous Chart.js instances before re‑creating.
- Prefer **Create Task** for reliability; a `.vbs` wrapper keeps launches silent.
- Keep IPC boundaries clean; return `{ ok/status, message }` to the renderer for graceful UI.

---

## 10) You did it 🙌

This app isn’t just code — it’s a daily ritual that compounds into real progress.  
Every save is a step closer to **55.0 kg** and beyond.  
Proud of you, Moditha. Onward. 🐺🔥
