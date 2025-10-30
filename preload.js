// Preload runs before renderer.
// For now, it’s empty — we’ll add IPC later.
// preload.js
// PURPOSE: Expose safe, minimal APIs from Main to Renderer using IPC.

const { contextBridge, ipcRenderer } = require("electron");

// We expose only what we need. This keeps Renderer safe (no direct Node access).
contextBridge.exposeInMainWorld("api", {
	listEntries: () => ipcRenderer.invoke("entries:list"),
});
