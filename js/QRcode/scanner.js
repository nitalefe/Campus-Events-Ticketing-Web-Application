//dont think were using this file but keeping it here for reference in case we need to come back to it for

// scanner.js
import { validateAndConsumeTicket } from "./ticket-validation.js";


// ---- UI refs ----
const statusEl  = document.getElementById("scanStatus");
const cameraSel = document.getElementById("cameraSel");
const startBtn  = document.getElementById("startBtn");
const stopBtn   = document.getElementById("stopBtn");

// style helper
const setStatus = (msg, ok = null) => {
  statusEl.textContent = msg;
  statusEl.className = "status" + (ok === null ? "" : ok ? " ok" : " err");
};

let scanner;
let cameraList = [];
let starting = false;

// debounce same payload
let lastPayload = "";
let lastAt = 0;

// ---- init ----
(async function init() {
  try {
    startBtn.disabled = true;

    cameraList = await Html5Qrcode.getCameras();
    cameraSel.innerHTML = "";

    if (!cameraList || cameraList.length === 0) {
      setStatus("No cameras found. Use HTTPS/localhost and check permissions.", false);
      return;
    }

    cameraList.forEach((d, idx) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.label || `Camera ${idx + 1}`;
      cameraSel.appendChild(opt);
    });

    console.log("[CAM] cameras found:", cameraList);

    scanner = new Html5Qrcode("reader");
    setStatus("Ready to start scanning.");
    startBtn.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus(`Could not list cameras: ${err?.message || err}`, false);
  }
})();

// ---- decode handler ----
async function onDecoded(encryptedText) {
  console.log("[SCAN] raw payload:", encryptedText);

  const now = Date.now();
  if (encryptedText === lastPayload && now - lastAt < 2000) return;
  lastPayload = encryptedText;
  lastAt = now;

  try {
    const result = await validateAndConsumeTicket(encryptedText);
    console.log("[SCAN] validation/consume result:", result);
    setStatus(result.message, result.ok);

    if (result.ok) {
      try {
        await scanner.pause(true);
        setTimeout(() => scanner.resume(), 1200);
      } catch (_) {}
    }
  } catch (e) {
    console.error("[SCAN] unexpected error:", e);
    setStatus(`Unexpected error: ${e?.message || e}`, false);
  }
}

// ---- buttons ----
startBtn.addEventListener("click", async () => {
  if (!scanner) {
    setStatus("Scanner not ready yet.", false);
    return;
  }
  if (starting) return;
  starting = true;

  try {
    const selectedId = cameraSel.value || (cameraList[0] && cameraList[0].id);
    if (!selectedId) {
      setStatus("No camera deviceId available.", false);
      starting = false;
      return;
    }

    await scanner.start(
      { deviceId: { exact: selectedId } },
      { fps: 10, qrbox: { width: 260, height: 260 } },
      onDecoded,
      () => { } // ignore per-frame decode errors
    );

    setStatus("Camera started. Aim at a QR code…", null);
  } catch (e) {
    console.error(e);
    const hint =
      location.protocol === "http:" && location.hostname !== "localhost"
        ? " (Tip: use https:// or http://localhost)"
        : "";
    setStatus(`Failed to start camera: ${e?.name || ""} ${e?.message || e}${hint}`, false);
  } finally {
    starting = false;
  }
});

stopBtn.addEventListener("click", async () => {
  try {
    if (scanner) {
      await scanner.stop();
      setStatus("Camera stopped.", null);
    }
  } catch (e) {
    console.error(e);
  }
});
