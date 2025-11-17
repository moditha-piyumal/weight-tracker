// =============================================
// ⚖️ Weight Tracker - Renderer.js (Clean Version)
// =============================================

// ✅ Electron's IPC for communicating with main.js
const { ipcRenderer } = require("electron");

// =============================================
// 🎯 GOAL WEIGHTS (top → bottom)
// =============================================
const GOAL_WEIGHTS = [
	83.0, 80.0, 76.7, 75.0, 73.5, 71.7, 69.0, 65.0, 63.7, 61.2, 59.9, 58.5, 57.0,
	56.0, 55.0,
];

// =============================================
// 🧩 HELPER FUNCTION: Create Goal Line Datasets
// =============================================
// Creates one dataset per goal weight — each a faint dashed horizontal line
function makeGoalDatasets(labels) {
	return GOAL_WEIGHTS.map((kg) => ({
		label: null, // keeps legend clean
		data: labels.map(() => kg), // flat horizontal line
		borderColor: "rgba(255,255,255,0.25)",
		borderWidth: 1,
		borderDash: [4, 4],
		pointRadius: 0,
		fill: false,
		order: 0, // draw below other lines
	}));
}

// =============================================
// 📉 HELPER FUNCTION: Simple Moving Average
// =============================================
// Returns a smoothed array for 7-day or 20-day averages
function simpleMovingAverage(data, windowSize) {
	const out = new Array(data.length).fill(null);
	let sum = 0;

	for (let i = 0; i < data.length; i++) {
		sum += data[i];
		if (i >= windowSize) sum -= data[i - windowSize];
		out[i] = i >= windowSize - 1 ? +(sum / windowSize).toFixed(2) : null;
	}

	return out;
}

// ===============================
// 🎯 Ask main process to check goals for this weight
//    - Calls ipcMain.handle("check-goals") in main.js
//    - If a goal was unlocked, shows the reward popup (for now: alert)
// ===============================
async function checkGoalUnlock(currentWeight) {
	try {
		const res = await ipcRenderer.invoke("check-goals", currentWeight);
		if (res && res.unlocked && res.message) {
			const modal = document.getElementById("goalModal");
			const emojiEl = document.getElementById("goalModalEmoji");
			const messageEl = document.getElementById("goalModalMessage");
			const closeBtn = document.getElementById("goalModalClose");

			// 🧠 Separate the emoji at the start (if any)
			const match = res.message.match(
				/^([\p{Emoji_Presentation}\p{Extended_Pictographic}])\s*(.*)$/u
			);
			if (match) {
				emojiEl.textContent = match[1];
				messageEl.textContent = match[2];
			} else {
				emojiEl.textContent = "🏆";
				messageEl.textContent = res.message;
			}

			// Show the modal
			modal.classList.add("visible");

			// 🖱️ Close when the × is clicked
			closeBtn.onclick = () => {
				modal.classList.remove("visible");
			};

			// 🖱️ Optional: also close when clicking the dark background
			modal.onclick = (e) => {
				if (e.target === modal) modal.classList.remove("visible");
			};
		}
	} catch (err) {
		console.error("Failed to check goals:", err);
	}
}
document.getElementById("backupBtn").addEventListener("click", async () => {
	const res = await ipcRenderer.invoke("backup-database");
	if (res.ok) {
		alert("✅ Database backup created successfully!");
	} else {
		alert("❌ Backup failed: " + res.message);
	}
});

// =============================================
// 🚀 MAIN ENTRY POINT
// =============================================
window.addEventListener("DOMContentLoaded", () => {
	console.log("Renderer is running!");

	// Pre-fill today's date
	const dateField = document.getElementById("date");
	dateField.value = new Date().toLocaleDateString("en-CA");

	// Handle form submission (save entry)
	const form = document.getElementById("entryForm");
	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const weight = parseFloat(document.getElementById("weight").value);
		const workout = parseInt(document.getElementById("workout").value);

		// ✅ Input validation
		if (isNaN(weight) || isNaN(workout) || weight <= 0 || workout < 0) {
			alert("Please enter valid positive numbers!");
			return;
		}

		try {
			const date = new Date().toLocaleDateString("en-CA");
			const result = await ipcRenderer.invoke("save-entry", {
				date,
				weight,
				workout,
			});
			console.log("Result from main:", result);
			alert(`✅ Entry ${result.status}!`);
			// 👇 ADD THIS LINE — check if a goal was unlocked at this weight
			await checkGoalUnlock(weight);

			// Refresh the charts afterwards so you see the new point immediately
			await loadAndRenderCharts();
		} catch (err) {
			console.error("❌ Failed to save entry:", err);
			alert("Error saving entry!");
		}
	});

	// Load charts after startup
	loadAndRenderCharts();
});

// =============================================
// 📊 FUNCTION: Load + Render Charts
// =============================================
async function loadAndRenderCharts() {
	console.log("🎨 Chart Render Triggered:", new Date().toLocaleTimeString());

	try {
		const entries = await ipcRenderer.invoke("get-entries");
		console.log("Fetched entries:", entries);

		if (!entries || entries.length === 0) {
			console.log("No entries found yet — waiting for first entry.");
			return;
		}

		// Extract data arrays
		const labels = entries.map((e) => e.date_local);
		const weights = entries.map((e) => e.weight_kg_1dp);
		const workouts = entries.map((e) => e.workout_minutes);
		const sma7 = simpleMovingAverage(weights, 7);
		const sma20 = simpleMovingAverage(weights, 20);

		// 🔍 Decide colors based on the latest weight vs SMA-20
		let weightBorderColor = "#ffcc70"; // default line color (fallback)
		let weightFillColor = "rgba(255, 204, 112, 0.2)"; // default area fill

		// Find the last data point index
		const lastIndex = weights.length - 1;

		// Last recorded weight
		const lastWeight = weights[lastIndex];

		// Last SMA-20 value (may be null if < 20 entries)
		const lastSMA20 = sma20[lastIndex];

		if (lastSMA20 != null) {
			// ✅ We have a valid SMA-20 value to compare with

			if (lastWeight <= lastSMA20) {
				// 🟢 Current weight is BELOW or equal to SMA-20 → good trend
				weightBorderColor = "#00e676"; // bright green line
				weightFillColor = "rgba(0, 230, 118, 0.25)"; // soft green glow
			} else {
				// 🔴 Current weight is ABOVE SMA-20 → warning trend
				weightBorderColor = "#ff5252"; // red line
				weightFillColor = "rgba(255, 82, 82, 0.25)"; // soft red glow
			}
		}
		// If lastSMA20 is null (not enough days yet), the default colors are used.

		// Prevent chart duplication by destroying existing instances
		if (window.weightChart?.destroy) window.weightChart.destroy();
		if (window.workoutChart?.destroy) window.workoutChart.destroy();

		// Contexts
		const weightCtx = document.getElementById("weightChart").getContext("2d");
		const workoutCtx = document.getElementById("workoutChart").getContext("2d");

		// Add horizontal goal lines
		const goalLineDatasets = makeGoalDatasets(labels);

		// =============================================
		// 🟡 WEIGHT CHART
		// =============================================
		window.weightChart = new Chart(weightCtx, {
			type: "line",
			data: {
				labels,
				datasets: [
					...goalLineDatasets, // faint dashed goal lines
					{
						label: "Weight (kg)",
						data: weights,
						// 🎨 Dynamic colors based on latest weight vs SMA-20
						borderColor: weightBorderColor, // picked above
						backgroundColor: weightFillColor, // picked above
						borderWidth: 3,
						tension: 0.3,
						fill: true,
						pointRadius: 3,
						pointBackgroundColor: "#ffe6a7",
						order: 2,
					},
					{
						label: "SMA-7 (trend)",
						data: sma7,
						borderColor: "#7FDBFF",
						borderWidth: 2,
						tension: 0.3,
						pointRadius: 0,
						spanGaps: true,
						order: 1,
					},
					{
						label: "SMA-20 (trend)",
						data: sma20,
						borderColor: "#B10DC9",
						borderWidth: 1,
						borderDash: [6, 1],
						tension: 0.3,
						pointRadius: 1,
						spanGaps: true,
						order: 1,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						labels: {
							color: "#fff",
							// Hide legend entries for null labels
							filter: (legendItem, chartData) =>
								!!chartData.datasets[legendItem.datasetIndex].label,
						},
					},
					tooltip: {
						// Disable tooltip for goal lines
						filter: (ctx) => !!ctx.dataset.label,
					},
				},
				scales: {
					x: {
						offset: false,
						ticks: { color: "#fff" },
						grid: { offset: false },
						bounds: "data",
					},

					y: {
						min: 55,
						max: 90,
						ticks: {
							color: "#fff",
							callback: (v) => v.toFixed(1) + " kg",
						},
						// 🔹 Force Y-axis to show only the goal weights
						afterBuildTicks: (axis) => {
							axis.ticks = GOAL_WEIGHTS.slice()
								.sort((a, b) => b - a)
								.map((v) => ({ value: v }));
							return axis.ticks;
						},
						grid: {
							color: (ctx) =>
								GOAL_WEIGHTS.includes(ctx.tick.value)
									? "rgba(255,255,255,0.35)" // brighter for goal lines
									: "rgba(255,255,255,0.1)",
						},
					},
				},
			},
		});

		// =============================================
		// 🟣 WORKOUT CHART
		// =============================================
		window.workoutChart = new Chart(workoutCtx, {
			type: "bar",
			data: {
				labels,
				datasets: [
					{
						label: "Workout (minutes)",
						data: workouts,
						backgroundColor: "#461212ff",
						borderColor: "#c28585ff",
						borderWidth: 2,
					},
				],
			},
			options: {
				plugins: { legend: { labels: { color: "#fff" } } },
				scales: {
					x: { ticks: { color: "#fff" } },
					y: { ticks: { color: "#fff" } },
				},
			},
		});
	} catch (err) {
		console.error("❌ Failed to load charts:", err);
	}
}
