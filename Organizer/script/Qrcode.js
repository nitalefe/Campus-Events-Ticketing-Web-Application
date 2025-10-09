// ----------------------
// 1. QR Code Generator
// ----------------------
function generateQRCode() {
  const qrText = "test"; // You can replace this later with ticket/event info
  const qrContainer = document.getElementById("qrcode");

  if (!qrContainer) return; // avoid errors if element missing

  new QRCode(qrContainer, {
    text: qrText,
    width: 256,
    height: 256,
    correctLevel: QRCode.CorrectLevel.H
  });
}

// ----------------------
// 2. QR Code Scanner
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  const html5QrCode = new Html5Qrcode("reader");
  const resultDiv = document.getElementById("result");

  const onScanSuccess = (decodedText) => {
    resultDiv.innerText = `Scanned: ${decodedText}`;
    html5QrCode.stop().catch(err => console.error("Error stopping scanner:", err));
  };

  Html5Qrcode.getCameras()
    .then(devices => {
      if (devices && devices.length) {
        const cameraId = devices[0].id;
        html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: function(viewfinderWidth, viewfinderHeight) {
  // make the scan area 60% of the smaller dimension of the viewport
  const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
  const boxSize = Math.floor(minEdge * 0.6);
  return { width: boxSize, height: boxSize };
}
          },
          onScanSuccess
        ).catch(err => console.error("Failed to start scanner:", err));
      } else {
        resultDiv.innerText = "No camera found.";
      }
    })
    .catch(err => {
      console.error("Camera access error:", err);
      resultDiv.innerText = "Camera access denied or unavailable.";
    });
});
