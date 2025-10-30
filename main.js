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
		height: 700,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
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
