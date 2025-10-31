// ===============================
// 🧠 Weight Tracker - Renderer.js
// ===============================

// Wait until the DOM (HTML) is fully loaded
window.addEventListener("DOMContentLoaded", () => {
	console.log("Renderer is running!");

	// 1️⃣ Auto-fill today's date
	const dateField = document.getElementById("date");
	const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format
	dateField.value = today;

	// 2️⃣ Handle form submission
	const form = document.getElementById("entryForm");
	form.addEventListener("submit", (e) => {
		e.preventDefault(); // Stop the form from refreshing the page

		const weight = parseFloat(document.getElementById("weight").value);
		const workout = parseInt(document.getElementById("workout").value);

		if (isNaN(weight) || isNaN(workout)) {
			alert("Please enter valid numbers for both weight and workout!");
			return;
		}

		// For now, just log them (we'll send them to the main process later)
		console.log(
			`💾 Saved entry: ${today}, Weight: ${weight}kg, Workout: ${workout}min`
		);
		alert("✅ Entry saved (demo mode). Database integration coming soon!");
	});

	// 3️⃣ Chart.js setup with colorful example data
	const weightCtx = document.getElementById("weightChart").getContext("2d");
	const workoutCtx = document.getElementById("workoutChart").getContext("2d");

	// Example dates (past week)
	const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

	// Randomized example data (just for visuals)
	const sampleWeights = [88.0, 87.7, 87.4, 87.3, 87.0, 86.8, 86.6];
	const sampleWorkouts = [30, 45, 0, 50, 20, 60, 40];

	// 🎨 Weight Chart
	new Chart(weightCtx, {
		type: "line",
		data: {
			labels: labels,
			datasets: [
				{
					label: "Weight (kg)",
					data: sampleWeights,
					borderColor: "#ffcc70",
					backgroundColor: "rgba(255, 204, 112, 0.2)",
					borderWidth: 3,
					tension: 0.3,
					fill: true,
					pointRadius: 5,
					pointBackgroundColor: "#ffe6a7",
				},
			],
		},
		options: {
			plugins: {
				legend: {
					labels: { color: "#fff" },
				},
			},
			scales: {
				x: { ticks: { color: "#fff" } },
				y: { ticks: { color: "#fff" } },
			},
		},
	});

	// 🎨 Workout Chart
	new Chart(workoutCtx, {
		type: "bar",
		data: {
			labels: labels,
			datasets: [
				{
					label: "Workout (minutes)",
					data: sampleWorkouts,
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
				legend: {
					labels: { color: "#fff" },
				},
			},
			scales: {
				x: { ticks: { color: "#fff" } },
				y: { ticks: { color: "#fff" } },
			},
		},
	});
});
