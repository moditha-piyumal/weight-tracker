// 🩸💀 Signature Banner Module
// ---------------------------------------------------------
// Automatically adds Moditha Piyumal's signature banner
// to any Electron-rendered HTML window.
// ---------------------------------------------------------

function addSignatureBanner() {
	// Check if already exists (prevents duplicates)
	if (document.getElementById("signatureBanner")) return;

	const footer = document.createElement("footer");
	footer.id = "signatureBanner";
	footer.innerHTML = `
		🩸💀 This software was made by
		<strong>Moditha Piyumal</strong>,
		also known as
		<strong>Elpitiya Sworn Translator</strong>,
		a Freelance Developer! 💀🩸
	`;

	Object.assign(footer.style, {
		position: "fixed",
		bottom: "0",
		left: "0",
		width: "100%",
		textAlign: "center",
		background: "rgba(0, 0, 0, 0.75)", // banner background
		color: "#ccc", // text color

		fontSize: "0.9em",
		padding: "6px 10px",
		borderTop: "1px solid rgba(255, 255, 255, 0.1)",
		zIndex: "9999",
		backdropFilter: "blur(3px)",
		transition: "opacity 0.3s ease",
		lineHeight: "1.4em",
	});

	footer.querySelectorAll("strong").forEach((s) => (s.style.color = "#ff80aa"));

	footer.addEventListener("mouseenter", () => (footer.style.opacity = "0.9"));
	footer.addEventListener("mouseleave", () => (footer.style.opacity = "1"));

	document.body.appendChild(footer);
	// 🪄 Fade-in animation for the banner
	footer.style.opacity = 0;
	footer.style.transition = "opacity 2.5s ease-in-out";
	setTimeout(() => {
		footer.style.opacity = 1;
	}, 300); // delay just enough for a smooth reveal
	footer.style.boxShadow = "0 0 15px rgba(255, 128, 170, 0.3)";
	setInterval(() => {
		const intensity = 0.2 + Math.random() * 0.3;
		footer.style.boxShadow = `0 0 ${
			10 + intensity * 20
		}px rgba(255, 128, 170, ${intensity})`;
	}, 1000);
}

// Run when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", addSignatureBanner);
} else {
	addSignatureBanner();
}
