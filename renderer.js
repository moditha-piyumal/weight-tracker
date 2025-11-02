// =============================================
// 🧠 Weight Tracker - Renderer.js (Fixed Version)
// =============================================

// Import ipcRenderer directly since nodeIntegration is true
const { ipcRenderer } = require("electron");
// ---- Goal Weights (top to bottom) ----
const GOAL_WEIGHTS = [
	83.0, 80.0, 76.7, 75.0, 73.5, 71.7, 69.0, 65.0, 63.7, 61.2, 59.9, 58.5, 57.0,
	56.0, 55.0,
];
// Make a faint dashed horizontal line dataset for each goal
function makeGoalDatasets(labels) {
	// one dataset per goal; each dataset is a flat array at that y-value
	return GOAL_WEIGHTS.map((kg) => ({
		label: null, // no legend text (keeps legend clean)
		data: labels.map(() => kg), // flat line across the x-range
		borderColor: "rgba(255,255,255,0.25)",
		borderWidth: 1,
		borderDash: [4, 4],
		pointRadius: 0,
		fill: false,
		order: 0, // draw under real data and MAs
	}));
}
// ===== Helper: Simple Moving Average (SMA) =====
// data: array of numbers (weights)
// windowSize: 7 or 20
function simpleMovingAverage(data, windowSize) {
	const out = new Array(data.length).fill(null); // keep length same as data
	let runningSum = 0;

	for (let i = 0; i < data.length; i++) {
		runningSum += data[i];
		// once we’ve added more than 'windowSize' items, subtract the element that falls out of the window
		if (i >= windowSize) {
			runningSum -= data[i - windowSize];
		}

		if (i >= windowSize - 1) {
			// we have at least 'windowSize' items now
			out[i] = +(runningSum / windowSize).toFixed(2); // round to 2 dp for neatness
		} else {
			// not enough history yet → keep as null so the chart leaves gaps
			out[i] = null;
		}
	}

	return out;
}
// Wait until everything in the HTML is ready
window.addEventListener("DOMContentLoaded", () => {
	console.log("Renderer is running!");

	// Auto-fill today's date in YYYY-MM-DD format
	const dateField = document.getElementById("date");
	const today = new Date().toLocaleDateString("en-CA");
	dateField.value = today;
	// Pre-fill with today's date, but allow manual editing

	// Handle form submission (save entry)
	const form = document.getElementById("entryForm");
	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const weight = parseFloat(document.getElementById("weight").value);
		const workout = parseInt(document.getElementById("workout").value);

		if (isNaN(weight) || isNaN(workout) || weight <= 0 || workout < 0) {
			alert("Please enter valid positive numbers!");
			return;
		}

		try {
			const date = today;
			// ✅ get from input field
			const result = await ipcRenderer.invoke("save-entry", {
				date,
				weight,
				workout,
			});

			console.log("Result from main:", result);
			alert(`✅ Entry ${result.status}!`);
			await loadAndRenderCharts();
		} catch (err) {
			console.error("❌ Failed to save entry:", err);
			alert("Error saving entry!");
		}
	});

	// Load charts after DOM is ready
	loadAndRenderCharts();
});

// =============================================
// 📊 Function: Load and Render Charts
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

		// Extract data for charts
		const labels = entries.map((e) => e.date_local);
		const weights = entries.map((e) => e.weight_kg_1dp);
		const sma7 = simpleMovingAverage(weights, 7);
		const sma20 = simpleMovingAverage(weights, 20);

		const workouts = entries.map((e) => e.workout_minutes);

		// Destroy existing charts to prevent overlap
		if (
			window.weightChart &&
			typeof window.weightChart.destroy === "function"
		) {
			window.weightChart.destroy();
		}
		if (
			window.workoutChart &&
			typeof window.workoutChart.destroy === "function"
		) {
			window.workoutChart.destroy();
		}

		// Define chart contexts (only now that DOM is ready)
		const weightCtx = document.getElementById("weightChart").getContext("2d");
		const workoutCtx = document.getElementById("workoutChart").getContext("2d");

		const goalLineDatasets = makeGoalDatasets(labels);

		// 🎨 Weight Chart
		window.weightChart = new Chart(weightCtx, {
			type: "line",
			data: {
				labels,
				datasets: [
					...goalLineDatasets, // ⬅️ added this
					{
						label: "Weight (kg)",
						data: weights,
						borderColor: "#ffcc70",
						backgroundColor: "rgba(255, 204, 112, 0.2)",
						borderWidth: 3,
						tension: 0.3,
						fill: true,
						pointRadius: 5,
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
						borderWidth: 2,
						borderDash: [6, 6],
						tension: 0.3,
						pointRadius: 0,
						spanGaps: true,
						order: 1,
					},
				],
			},
			options: {
				responsive: true, // default, but keep it explicit
				maintainAspectRatio: false,
				plugins: {
					legend: {
						labels: {
							color: "#fff",
							// hide legend entries with null labels
							filter: (legendItem, chartData) =>
								!!chartData.datasets[legendItem.datasetIndex].label,
						},
					},
					tooltip: { filter: (ctx) => !!ctx.dataset.label },
				},

				scales: {
					x: { ticks: { color: "#fff" } },
					y: {
						min: 55,
						max: 90,
						ticks: {
							color: "#fff",
							// Force exact goal line values as tick positions
							callback: (value) => value.toFixed(1) + " kg",
						},
						afterBuildTicks: (axis) => {
							// Replace auto ticks with our custom goal weights (sorted descending)
							axis.ticks = GOAL_WEIGHTS.slice()
								.sort((a, b) => b - a)
								.map((v) => ({ value: v }));
							return axis.ticks;
						},
						grid: {
							color: (ctx) =>
								GOAL_WEIGHTS.includes(ctx.tick.value)
									? "rgba(255,255,255,0.35)"
									: "rgba(255,255,255,0.1)",
						},
					},
				},
			},
		});

		window.workoutChart = new Chart(workoutCtx, {
			type: "bar",
			data: {
				labels,
				datasets: [
					{
						label: "Workout (minutes)",
						data: workouts,
						backgroundColor: [
							"#FFB6C1",
							"#FFD700",
							"#ADFF2F",
							"#87CEEB",
							"#FFA500",
							"#20B2AA",
							"#FF69B4",
						],
						borderColor: "#fff",
						borderWidth: 2,
					},
				],
			},
			options: {
				plugins: {
					legend: { labels: { color: "#fff" } },
				},
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
