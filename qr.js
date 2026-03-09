function showError(msg) {
  const el = document.getElementById("error");
  el.hidden = !msg;
  el.textContent = msg || "";
}

function getQrDataUrl(qrBoxEl) {
  const canvas = qrBoxEl.querySelector("canvas");
  if (canvas) return canvas.toDataURL("image/png");
  const img = qrBoxEl.querySelector("img");
  if (img && img.src) return img.src;
  return null;
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

const params = new URLSearchParams(location.search);
const url = params.get("u") || "";

const qrBox = document.getElementById("qrBox");
const urlText = document.getElementById("urlText");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

urlText.textContent = url;

if (!url) {
  showError("No URL provided.");
} else if (typeof QRCode === "undefined") {
  showError("QRCode library not loaded.");
} else {
  new QRCode(qrBox, {
    text: url,
    width: 280,
    height: 280,
    correctLevel: QRCode.CorrectLevel.M,
  });
}

copyBtn.addEventListener("click", async () => {
  if (!url) return;
  await navigator.clipboard.writeText(url);
});

downloadBtn.addEventListener("click", () => {
  const dataUrl = getQrDataUrl(qrBox);
  if (!dataUrl) {
    showError("Could not extract QR image for download.");
    return;
  }
  downloadDataUrl(dataUrl, "qr.png");
});