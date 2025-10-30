// renderer.js
console.log("Renderer is running!");

(async () => {
	try {
		const rows = await window.api.listEntries();
		console.log("Entries in DB (should be empty on first run):", rows);
	} catch (err) {
		console.error("Failed to list entries:", err);
	}
})();
