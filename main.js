// 🔧 Force Node to search our electron_modules first
const path = require("path");
const Module = require("module");

// Set NODE_PATH and re-initialize Node's resolver
process.env.NODE_PATH = path.join(
	__dirname,
	"electron_modules",
	"node_modules"
);
Module._initPaths(); // <— important!

// (Optional debug)
console.log("🔍 Module search paths:", Module.globalPaths);
try {
	require("better-sqlite3");
	console.log("✅ test: better-sqlite3 is resolvable at bootstrap");
} catch (e) {
	console.error(
		"❌ test: better-sqlite3 NOT resolvable at bootstrap:",
		e.message
	);
}

// ✅ STEP 2: Load Electron only after module paths are fixed
const { app, BrowserWindow, ipcMain } = require("electron");

// ✅ STEP 3: Create the main window
function createWindow() {
	const win = new BrowserWindow({
		width: 900,
		height: 1000,
		webPreferences: {
			nodeIntegration: true, // ✅ allows require() in renderer
			contextIsolation: false, // ✅ allows direct ipcRenderer access
		},
	});
	win.loadFile("renderer.html");
}

// ✅ STEP 4: Wait for Electron to be ready, THEN import DB logic
app.whenReady().then(() => {
	console.log("🚀 App is ready. Loading database modules...");

	// Import and run migrations *after* path fix is active
	const { runMigrations } = require("./db/migrate");
	runMigrations();

	// Load DB connection safely
	const { db } = require("./db/connection");

	// Handle DB queries (e.g. list entries)
	ipcMain.handle("entries:list", () => {
		const rows = db
			.prepare(
				`
      SELECT id, date_local, weight_kg_1dp, workout_minutes, entry_type
      FROM entries
      ORDER BY date_local DESC
    `
			)
			.all();
		return rows;
	});

	// Create main window after DB is initialized
	createWindow();
});

// ✅ STEP 5: Handle window close
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

// ===============================
// 💾 Save New Weight Entry
// ===============================
const Database = require("better-sqlite3");
const dbPath = path.join(__dirname, "db", "weight-tracker.db");
const db = new Database(dbPath);

ipcMain.handle("save-entry", (event, data) => {
	try {
		const { date, weight, workout } = data;
		console.log("📥 Received entry:", data);

		// Check if entry for this date already exists
		const existing = db
			.prepare("SELECT id FROM entries WHERE date_local = ?")
			.get(date);

		if (existing) {
			db.prepare(
				`
        UPDATE entries
        SET weight_kg_1dp = ?, workout_minutes = ?, updated_at_utc = ?
        WHERE date_local = ?
      `
			).run(weight, workout, new Date().toISOString(), date);

			console.log("✅ Entry updated for date:", date);
			return { status: "updated" };
		}

		// Get last recorded weight for carry logic
		const last = db
			.prepare(
				"SELECT date_local, weight_kg_1dp FROM entries ORDER BY date_local DESC LIMIT 1"
			)
			.get();

		// Find any skipped days and carry the weight
		const lastDate = last ? new Date(last.date_local) : null;
		const todayDate = new Date(date);
		if (lastDate && todayDate - lastDate > 86400000) {
			let d = new Date(lastDate);
			while (d < todayDate) {
				d.setDate(d.getDate() + 1);
				const carryDate = d.toISOString().slice(0, 10);
				if (carryDate !== date)
					db.prepare(
						`
            INSERT OR IGNORE INTO entries (date_local, weight_kg_1dp, workout_minutes, entry_type, created_at_utc, updated_at_utc)
            VALUES (?, ?, 0, 'carry', ?, ?)
          `
					).run(
						carryDate,
						last.weight_kg_1dp,
						new Date().toISOString(),
						new Date().toISOString()
					);
			}
		}

		// Insert today's entry
		db.prepare(
			`
      INSERT INTO entries (date_local, weight_kg_1dp, workout_minutes, entry_type, created_at_utc, updated_at_utc)
      VALUES (?, ?, ?, 'manual', ?, ?)
    `
		).run(
			date,
			weight,
			workout,
			new Date().toISOString(),
			new Date().toISOString()
		);

		console.log("✅ Entry inserted successfully for:", date);
		return { status: "inserted" };
	} catch (err) {
		console.error("❌ Error saving entry:", err.message);
		console.error(err.stack);
		return { status: "error", message: err.message };
	}
});

// ===============================
// 📊 Fetch All Entries
// ===============================
ipcMain.handle("get-entries", () => {
	const rows = db
		.prepare(
			`
    SELECT date_local, weight_kg_1dp, workout_minutes
    FROM entries
    ORDER BY date_local ASC
  `
		)
		.all();
	return rows;
});
