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

// =============================================
// 📐 GOAL LINE GENERATOR (timezone-safe)
// =============================================
function generateGoalLine(labels, weights, goal) {
	if (!goal) return null;

	// Find the index of the chosen start date
	const startIndex = labels.indexOf(goal.start_date);
	if (startIndex === -1) return null;

	// ✅ Use date-strings only (no time-of-day bugs)
	const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

	// Helper: convert YYYY-MM-DD → day number (UTC-safe)
	function dayNumber(dateStr) {
		const [y, m, d] = dateStr.split("-").map(Number);
		return Date.UTC(y, m - 1, d) / 86400000;
	}

	const startDay = dayNumber(goal.start_date);
	const targetDay = dayNumber(goal.target_date);
	const totalDays = targetDay - startDay;

	// ❌ Invalid goal (same day or backwards)
	if (totalDays <= 0) return null;

	return labels.map((labelDate, i) => {
		// ❌ Before start date
		if (i < startIndex) return null;

		// ❌ Future dates (string compare is safe for ISO dates)
		if (labelDate > todayStr) return null;

		const currentDay = dayNumber(labelDate);
		const elapsedDays = currentDay - startDay;
		const progress = elapsedDays / totalDays;

		return (
			goal.start_weight + progress * (goal.target_weight - goal.start_weight)
		);
	});
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

	// =============================================
	// 🎯 GOAL FORM HANDLER
	// =============================================
	const goalForm = document.getElementById("goalForm");

	goalForm.addEventListener("submit", async (e) => {
		e.preventDefault();

		const startDateInput = document.getElementById("goalStartDate").value;
		const targetDate = document.getElementById("goalTargetDate").value;
		const targetWeight = parseFloat(
			document.getElementById("goalTargetWeight").value
		);

		if (!targetDate || isNaN(targetWeight)) {
			alert("Please enter a valid target date and weight.");
			return;
		}

		// 📌 Fetch entries to resolve start weight
		const entries = await ipcRenderer.invoke("get-entries");

		if (!entries.length) {
			alert("You must have at least one weight entry first.");
			return;
		}

		let startDate = startDateInput;
		let startWeight;

		if (startDate) {
			const match = entries.find((e) => e.date_local === startDate);
			if (!match) {
				alert("No weight entry exists on the selected start date.");
				return;
			}
			startWeight = match.weight_kg_1dp;
		} else {
			// Default: latest real entry
			const last = entries[entries.length - 1];
			startDate = last.date_local;
			startWeight = last.weight_kg_1dp;
		}

		// 🧠 Save goal
		const res = await ipcRenderer.invoke("goal:save", {
			start_date: startDate,
			start_weight: startWeight,
			target_date: targetDate,
			target_weight: targetWeight,
		});

		if (res.ok) {
			alert("🎯 Goal saved!");
			await loadAndRenderCharts(); // redraw with goal line
		} else {
			alert("Failed to save goal.");
		}
	});

	// Load charts after startup
	loadAndRenderCharts();

	const limitWeightChart = document.getElementById("limitWeightChart");
	if (limitWeightChart) {
		limitWeightChart.addEventListener("change", () => {
			loadAndRenderCharts();
		});
	}
});

// =============================================
// 📊 FUNCTION: Load + Render Charts
// =============================================
async function loadAndRenderCharts() {
	console.log("🎨 Chart Render Triggered:", new Date().toLocaleTimeString());

	try {
		const entries = await ipcRenderer.invoke("get-entries");
		console.log("Fetched entries:", entries);

		// 🎯 Fetch active goal (if any)
		const goal = await ipcRenderer.invoke("goal:get");

		if (!entries || entries.length === 0) {
			console.log("No entries found yet — waiting for first entry.");
			return;
		}

		const limitWeightChart = document.getElementById("limitWeightChart");
		const shouldLimitWeightChart = Boolean(limitWeightChart?.checked);

		const weightEntries = shouldLimitWeightChart
			? entries.slice(-30)
			: entries;

		// Extract data arrays
		const labels = entries.map((e) => e.date_local);
		const weights = entries.map((e) => e.weight_kg_1dp);
		const weightLabels = weightEntries.map((e) => e.date_local);
		const weightValues = weightEntries.map((e) => e.weight_kg_1dp);
		// 📐 Generate goal trajectory line (partial, time-revealed)
		const goalLine = generateGoalLine(weightLabels, weightValues, goal);

		const workouts = entries.map((e) => e.workout_minutes);
		const sma10 = simpleMovingAverage(weightValues, 10);
		const sma20 = simpleMovingAverage(weightValues, 20);

		// 🔍 Decide colors based on the latest weight vs SMA-20
		let weightBorderColor = "#ffcc70"; // default line color (fallback)
		let weightFillColor = "rgba(255, 204, 112, 0.2)"; // default area fill

		// Find the last data point index
		const lastIndex = weightValues.length - 1;

		// Last recorded weight
		const lastWeight = weightValues[lastIndex];

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
		const goalLineDatasets = makeGoalDatasets(weightLabels);

		// =============================================
		// 🟡 WEIGHT CHART
		// ===============================
		// 📦 Build datasets safely
		// ===============================
		const weightDatasets = [...goalLineDatasets];

		// 🎯 Add goal trajectory ONLY if it exists
		if (goalLine) {
			weightDatasets.push({
				label: "Goal trajectory",
				data: goalLine,
				borderColor: "#00b0ff",
				borderWidth: 1,
				pointRadius: 0,
				tension: 0,
				spanGaps: true,
				order: 1,
			});
		}

		// ✅ Real weight data (always present)
		weightDatasets.push(
			{
				label: "Weight (kg)",
				data: weightValues,
				borderColor: weightBorderColor,
				backgroundColor: weightFillColor,
				borderWidth: 2,
				tension: 0.2,
				fill: true,
				pointRadius: 2,
				pointBackgroundColor: "#ffe6a7",
				order: 2,
			},
			{
				label: "SMA-10 (trend)",
				data: sma10,
				borderColor: "#ec3db2ff",
				borderWidth: 2,
				tension: 0.3,
				borderDash: [6, 1],
				pointRadius: 0,
				spanGaps: true,
				order: 1,
			},
			{
				label: "SMA-20 (trend)",
				data: sma20,
				borderColor: "#ece7e5ff",
				borderWidth: 1,
				tension: 0.3,
				pointRadius: 2,
				spanGaps: true,
				order: 1,
			}
		);

		// =============================================
		window.weightChart = new Chart(weightCtx, {
			type: "line",
			data: {
				labels: weightLabels,
				datasets: weightDatasets,
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
