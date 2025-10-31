// =============================================
// 🧠 Weight Tracker - Renderer.js (Fixed Version)
// =============================================

// Import ipcRenderer directly since nodeIntegration is true
const { ipcRenderer } = require("electron");

// Wait until everything in the HTML is ready
window.addEventListener("DOMContentLoaded", () => {
	console.log("Renderer is running!");

	// Auto-fill today's date in YYYY-MM-DD format
	const dateField = document.getElementById("date");
	const today = new Date().toLocaleDateString("en-CA");
	dateField.value = today;
	// Pre-fill with today's date, but allow manual editing
	// const dateField = document.getElementById("date");
	// dateField.value = new Date().toLocaleDateString("en-CA");

	// Handle form submission (save entry)
	const form = document.getElementById("entryForm");
	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const weight = parseFloat(document.getElementById("weight").value);
		const workout = parseInt(document.getElementById("workout").value);

		if (isNaN(weight) || isNaN(workout)) {
			alert("Please enter valid numbers!");
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

		// 🎨 Weight Chart
		window.weightChart = new Chart(weightCtx, {
			type: "line",
			data: {
				labels,
				datasets: [
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
					},
					{
						label: "SMA-7 (trend)",
						data: sma7,
						borderColor: "#7FDBFF", // light blue
						borderWidth: 2,
						tension: 0.3,
						pointRadius: 0, // no dots
						spanGaps: true, // skip nulls cleanly
					},
					{
						label: "SMA-20 (trend)",
						data: sma20,
						borderColor: "#B10DC9", // purple
						borderWidth: 2,
						borderDash: [6, 6], // dashed
						tension: 0.3,
						pointRadius: 0,
						spanGaps: true,
					},
				],
			},
			options: {
				responsive: true, // default, but keep it explicit
				maintainAspectRatio: false,
				plugins: {
					legend: { labels: { color: "#fff" } },
				},
				scales: {
					x: { ticks: { color: "#fff" } },
					y: {
						min: 55,
						max: 90,
						ticks: { color: "#fff" },
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
