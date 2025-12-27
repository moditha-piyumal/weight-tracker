// db/migrate.js
// PURPOSE: Create the tables we need if they don't exist yet.
//          Safe to run at startup; it won't destroy existing data.

const { db } = require("./connection");

// CREATE TABLE statements are wrapped in IF NOT EXISTS,
// so running this multiple times is safe (idempotent).
function runMigrations() {
	// 1) Daily entries table: one row per calendar day
	db.prepare(
		`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      -- Local calendar date in 'YYYY-MM-DD' format (Asia/Colombo)
      date_local TEXT NOT NULL UNIQUE,

      -- Your daily data
      weight_kg_1dp REAL NOT NULL,               -- e.g., 86.7 (one decimal)
      workout_minutes INTEGER NOT NULL DEFAULT 0, -- integer minutes (>= 0)

      -- 'manual' = you typed it; 'carry' = auto-filled for missed days
      entry_type TEXT NOT NULL DEFAULT 'manual',

      -- Audit timestamps in UTC
      created_at_utc TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL
    );
  `
	).run();

	// 2) Goals table: your 15 GoT rewards; unlock once
	db.prepare(
		`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_idx INTEGER NOT NULL,         -- 1..15 in display order
      threshold_kg REAL NOT NULL,         -- e.g., 83.0
      title TEXT NOT NULL,                -- short label (optional)
      message TEXT NOT NULL,              -- full GoT unlock text
      unlocked_at_utc TEXT                -- null until first unlock
    );
  `
	).run();

	// 3) Weight goal trajectory (single active goal)
	db.prepare(
		`
  CREATE TABLE IF NOT EXISTS weight_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    start_date TEXT NOT NULL,     -- YYYY-MM-DD (must exist in entries)
    start_weight REAL NOT NULL,   -- kg at start_date

    target_date TEXT NOT NULL,    -- future YYYY-MM-DD
    target_weight REAL NOT NULL,  -- desired kg at target_date

    created_at_utc TEXT NOT NULL,
    updated_at_utc TEXT NOT NULL
  );
`
	).run();

	// 4) Settings table: tiny key/value store (e.g., reminder time)
	db.prepare(
		`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `
	).run();

	// Seed default reminder time if missing
	const existing = db
		.prepare(`SELECT value FROM settings WHERE key = 'reminder_time'`)
		.get();
	if (!existing) {
		db.prepare(
			`INSERT INTO settings (key, value) VALUES ('reminder_time', '20:30')`
		).run();
	}
}

module.exports = { runMigrations };
