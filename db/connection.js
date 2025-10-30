// db/connection.js
// PURPOSE: Open a single connection to a local SQLite database file
//          and share it with the rest of the app.

const path = require("path");
const Database = require("better-sqlite3");

// We keep the database file inside the db/ folder for now.
// You can move it later to AppData or a custom folder if you want.
const DB_PATH = path.join(__dirname, "weight-tracker.db");

// Create one shared connection. better-sqlite3 is synchronous and fast.
const db = new Database(DB_PATH, {
	verbose: console.log, // <- uncomment to log every SQL statement to console
});

// Turn on foreign key support (good habit even if we don't use them yet).
db.pragma("foreign_keys = ON");

module.exports = { db, DB_PATH };
