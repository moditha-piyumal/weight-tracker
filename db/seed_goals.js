// db/seed_goals.js
// ==========================================
// ⚙️ One-time seeding script for weight goals
// ==========================================
const path = require("path");
const Module = require("module");

// 👇 Let Node look inside electron_modules for native modules
Module.globalPaths.unshift(
	path.join(__dirname, "..", "..", "electron_modules", "node_modules")
);

const Database = require("better-sqlite3");

// point to your main database file
const dbPath = path.join(__dirname, "weight-tracker.db");
const db = new Database(dbPath);

const goalEntries = [
	{
		kg: 83.0,
		msg: "The Watch has stood firm; a stone of discipline has fallen. Tonight you claim your reward — a Movie Night with Vodka.",
	},
	{
		kg: 80.0,
		msg: "The realm whispers of your steadiness. Once more you hold the line, and your reward is another Movie Night with Vodka.",
	},
	{
		kg: 76.7,
		msg: "A lord of true resolve deserves treasures rare. Your banner now flies higher, and your reward is a Luxury Perfume Bottle.",
	},
	{
		kg: 75.0,
		msg: "The march continues, the enemy retreats. Raise your glass, for your reward is a Movie Night with Vodka.",
	},
	{
		kg: 73.5,
		msg: "Even when the night is long, the fire still burns. You endure, and your reward is a Movie Night with Vodka.",
	},
	{
		kg: 71.7,
		msg: "The North remembers, and so does your body. Victory grows near, and your reward is a Movie Night with Vodka.",
	},
	{
		kg: 69.0,
		msg: "Songs will be sung of this triumph; Winterfell itself would echo your name. Your reward is a New Audio System.",
	},
	{
		kg: 65.0,
		msg: "Allies gather at your side, for you are no longer walking alone. Your reward is to Meet Friends in Town.",
	},
	{
		kg: 63.7,
		msg: "Every king requires his war table. Yours shall be worthy — your reward is a New Customized Computer Table.",
	},
	{
		kg: 61.2,
		msg: "You strike as the warrior you are, unyielding in the fight. Your reward is a Punching Bag.",
	},
	{
		kg: 59.9,
		msg: "You have thinned the enemy ranks. Tonight you feast and drink, for your reward is a Movie Night with Beer.",
	},
	{
		kg: 58.5,
		msg: "Even kings seek peace in gardens scented sweet. Your reward is a Spa Ceylon Treat.",
	},
	{
		kg: 57.0,
		msg: "The fortress rises stone by stone. Your hand strengthens your House, and your reward is the Wall Plaster of the House.",
	},
	{
		kg: 56.0,
		msg: "The banners are raised, the hall echoes with laughter. Your reward is a Party for Friends.",
	},
	{
		kg: 55.0,
		msg: "The realm bends the knee, the throne is yours, and history will speak of your triumph. Your reward is the Victory Lap with Vodka.",
	},
];

const insertGoal = db.prepare(`
  INSERT OR IGNORE INTO goals (order_idx, threshold_kg, title, message, unlocked_at_utc)
  VALUES (?, ?, ?, ?, NULL)
`);

db.transaction(() => {
	goalEntries.forEach((g, idx) => {
		insertGoal.run(idx + 1, g.kg, `Goal ${idx + 1}`, g.msg);
	});
})();

console.log("✅ Goal table successfully seeded with all GoT unlock messages!");
db.close();
