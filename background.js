chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "gbqr-link",
    title: "Generate QR",
    contexts: ["link"],
  });

  chrome.contextMenus.create({
    id: "gbqr-selection",
    title: "Generate QR from selected text",
    contexts: ["selection"],
  });
});

function normalizeUrl(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  try {
    return new URL(t).toString();
  } catch {
    try {
      return new URL("https://" + t).toString();
    } catch {
      return null;
    }
  }
}

chrome.contextMenus.onClicked.addListener((info) => {
  const candidate = info.linkUrl || info.selectionText || "";
  const url = normalizeUrl(candidate);
  if (!url) return;

  const extPage = chrome.runtime.getURL("qr.html") + "?u=" + encodeURIComponent(url);
  chrome.tabs.create({ url: extPage });
});