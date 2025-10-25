//dont think were using this file but keeping it here for reference in case we need to come back to it for

// scanner.js
import { validateTicket } from "./ticket-validation.js";

// UI refs
const statusEl = document.getElementById("scanStatus");
const manualStatusEl = document.getElementById("manualStatus");
const cameraSel = document.getElementById("cameraSel");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const simulateBtn = document.getElementById("simulateBtn");
const manualEncrypted = document.getElementById("manualEncrypted");

const setStatus = (msg, state = "") => {
  statusEl.textContent = msg;
  statusEl.className = "status" + (state ? ` ${state}` : "");
};
const setManualStatus = (msg, state = "") => {
  manualStatusEl.textContent = msg;
  manualStatusEl.className = "status" + (state ? ` ${state}` : "");
};

let scanner;
let cameraList = [];
let starting = false;

(async function init() {
  try {
    // Disable start until we have cameras
    startBtn.disabled = true;

    // (Optional) Force permission prompt early; uncomment if needed.
    // if (navigator.mediaDevices?.getUserMedia) {
    //   try {
    //     const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    //     stream.getTracks().forEach(t => t.stop());
    //   } catch (e) {
    //     /* ignore; user may grant on start */
    //   }
    // }

    cameraList = await Html5Qrcode.getCameras();
    cameraSel.innerHTML = "";

    if (!cameraList || cameraList.length === 0) {
      setStatus("No cameras found. Use HTTPS/localhost and check permissions.", "err");
      return;
    }

    cameraList.forEach((d, idx) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.label || `Camera ${idx + 1}`;
      cameraSel.appendChild(opt);
    });

    // Enable start now that we have devices
    startBtn.disabled = false;

    // Prepare scanner element
    scanner = new Html5Qrcode("reader");
    setStatus("Ready to start scanning.");
  } catch (err) {
    console.error(err);
    setStatus(`Could not list cameras: ${err?.message || err}`, "err");
  }
})();

async function onDecoded(encryptedText) {
  try {
    const result = await validateTicket(encryptedText);
    setStatus(result.message, result.ok ? "ok" : "err");
  } catch (e) {
    console.error(e);
    setStatus(`Unexpected error validating ticket: ${e?.message || e}`, "err");
  }
}

startBtn.addEventListener("click", async () => {
  if (!scanner) {
    setStatus("Scanner not ready yet.", "err");
    return;
  }
  if (starting) return;
  starting = true;

  try {
    // Use the selected deviceId or fall back to the first camera
    const selectedId = cameraSel.value || (cameraList[0] && cameraList[0].id);
    if (!selectedId) {
      setStatus("No camera deviceId available.", "err");
      starting = false;
      return;
    }

    await scanner.start(
      { deviceId: { exact: selectedId } },  // desktop-safe
      { fps: 10, qrbox: { width: 260, height: 260 } },
      onDecoded,
<<<<<<< HEAD
      () => {} // ignore per-frame decode errors
=======
      () => { } // ignore per-frame decode errors
>>>>>>> main
    );

    setStatus("Camera started. Aim at a QR code…");
  } catch (e) {
    console.error(e);
    // Show the real reason to the user
    const hint =
      location.protocol === "http:" && location.hostname !== "localhost"
        ? " (Tip: use https:// or http://localhost)"
        : "";
    setStatus(`Failed to start camera: ${e?.message || e}${hint}`, "err");
  } finally {
    starting = false;
  }
});

stopBtn.addEventListener("click", async () => {
  try {
    if (scanner) {
      await scanner.stop();
      setStatus("Camera stopped.");
    }
  } catch (e) {
    console.error(e);
  }
});

simulateBtn.addEventListener("click", async () => {
  const encrypted = (manualEncrypted.value || "").trim();
  if (!encrypted) {
    setManualStatus("Please paste encrypted QR text first.", "err");
    return;
  }
  try {
    const result = await validateTicket(encrypted);
    setManualStatus(result.message, result.ok ? "ok" : "err");
  } catch (e) {
    console.error(e);
    setManualStatus(`Unexpected error validating ticket: ${e?.message || e}`, "err");
  }
});
