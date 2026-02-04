const URLS = {
  dev: "https://onboarding-dev-fitify.vercel.app/",
  staging: "https://onboarding-staging-fitify.vercel.app/",
};

const DEFAULTS = {
  env: "staging",
  variantCount: 3,
  qrSize: 220,
};

const els = {
  gbexp: document.getElementById("gbexp"),
  gen: document.getElementById("gen"),
  env: document.getElementById("env"),
  variantCount: document.getElementById("variantCount"),
  grid: document.getElementById("grid"),
  error: document.getElementById("error"),
  copyAll: document.getElementById("copyAll"),
  reset: document.getElementById("reset"),
  baseUrlText: document.getElementById("baseUrlText"),
  urlInput: document.getElementById("urlInput"),
  genUrl: document.getElementById("genUrl"),

  // mode switch
  modeExp: document.getElementById("modeExp"),
  modeUrl: document.getElementById("modeUrl"),
  sectionExp: document.getElementById("sectionExp"),
  sectionUrl: document.getElementById("sectionUrl"),
  errorUrl: document.getElementById("errorUrl"),
};

function getBaseUrl() {
  const key = els.env.value === "dev" ? "dev" : "staging";
  return URLS[key];
}

function updateBaseUrlLabel() {
  els.baseUrlText.textContent = getBaseUrl();
}

function buildUrl(baseUrl, gbexp, gbvar) {
  const u = new URL(baseUrl);
  u.searchParams.set("gbexp", String(gbexp));
  u.searchParams.set("gbvar", String(gbvar));
  return u.toString();
}

function isValidExp(value) {
  return /^[0-9]+$/.test(value);
}

function parseVariantCount(value) {
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n)) return null;
  if (n < 1) return null;
  if (n > 50) return 50; // hard cap to keep popup usable
  return n;
}

function showError(msg) {
  els.error.hidden = !msg;
  els.error.textContent = msg || "";
}

function showErrorUrl(msg) {
  if (!els.errorUrl) return;
  els.errorUrl.hidden = !msg;
  els.errorUrl.textContent = msg || "";
}

function setMode(mode) {
  const isExp = mode === "exp";

  if (els.sectionExp) els.sectionExp.hidden = !isExp;
  if (els.sectionUrl) els.sectionUrl.hidden = isExp;

  if (els.modeExp) els.modeExp.classList.toggle("modeBtnActive", isExp);
  if (els.modeUrl) els.modeUrl.classList.toggle("modeBtnActive", !isExp);

  // Clear errors so you don't see stale messages when switching modes
  showError("");
  showErrorUrl("");

  // Button label matches current mode
  els.copyAll.textContent = isExp ? "Copy all URLs" : "Copy URL";
}

async function saveMode(mode) {
  await chrome.storage.local.set({ mode });
}

async function loadMode() {
  const data = await chrome.storage.local.get(["mode"]);
  const mode = data.mode === "url" ? "url" : "exp";
  setMode(mode);
}

function clearGrid() {
  els.grid.innerHTML = "";
  els.copyAll.disabled = true;
  els.copyAll.onclick = null;

  const isExp = !els.sectionExp?.hidden;
  els.copyAll.textContent = isExp ? "Copy all URLs" : "Copy URL";
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

// qrcodejs renders either canvas or img depending on environment.
function getQrDataUrl(qrBoxEl) {
  const canvas = qrBoxEl.querySelector("canvas");
  if (canvas) return canvas.toDataURL("image/png");

  const img = qrBoxEl.querySelector("img");
  if (img && img.src) return img.src; // usually data:image/png;base64,...
  return null;
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function variantLabel(i) {
  if (i === 0) return "Control (0)";
  if (i === 1) return "A (1)";
  if (i === 2) return "B (2)";
  return `Variant (${i})`;
}

function renderCards({ exp, envKey, variantCount }) {
  clearGrid();
  showError("");
  showErrorUrl("");

  if (typeof QRCode === "undefined") {
    showError(
      "QRCode is not defined. Check that vendor/qrcode.js is loaded before popup.js in popup.html."
    );
    return;
  }

  const baseUrl = URLS[envKey];
  els.baseUrlText.textContent = baseUrl;

  const urls = [];

  for (let i = 0; i < variantCount; i++) {
    const url = buildUrl(baseUrl, exp, i);
    urls.push(url);

    const card = document.createElement("div");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "cardHeader";

    const title = document.createElement("div");
    title.innerHTML = `<strong>gbvar: ${i}</strong> <span class="badge">${variantLabel(i)}</span>`;
    header.appendChild(title);

    const qrWrap = document.createElement("div");
    qrWrap.className = "qr";

    const qrBox = document.createElement("div");
    qrBox.className = "qrBox";
    qrWrap.appendChild(qrBox);

    try {
      qrBox.innerHTML = "";
      new QRCode(qrBox, {
        text: url,
        width: DEFAULTS.qrSize,
        height: DEFAULTS.qrSize,
        correctLevel: QRCode.CorrectLevel.M,
      });
    } catch (err) {
      showError("QR generation failed: " + (err?.message || String(err)));
    }

    const urlEl = document.createElement("div");
    urlEl.className = "url";
    urlEl.textContent = url;

    const actions = document.createElement("div");
    actions.className = "actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn btn-secondary";
    copyBtn.textContent = "Copy URL";
    copyBtn.addEventListener("click", async () => {
      await copyText(url);
    });

    const dlBtn = document.createElement("button");
    dlBtn.className = "btn btn-secondary";
    dlBtn.textContent = "Download QR";
    dlBtn.addEventListener("click", () => {
      const dataUrl = getQrDataUrl(qrBox);
      if (!dataUrl) {
        showError("Could not extract QR image for download.");
        return;
      }
      downloadDataUrl(dataUrl, `gbexp-${exp}_gbvar-${i}_${envKey}.png`);
    });

    actions.appendChild(copyBtn);
    actions.appendChild(dlBtn);

    card.appendChild(header);
    card.appendChild(qrWrap);
    card.appendChild(urlEl);
    card.appendChild(actions);

    els.grid.appendChild(card);
  }

  els.copyAll.disabled = false;
  els.copyAll.textContent = "Copy all URLs";
  els.copyAll.onclick = async () => {
    await copyText(urls.join("\n"));
  };
}

async function saveState(state) {
  await chrome.storage.local.set(state);
}

async function loadState() {
  const data = await chrome.storage.local.get([
    "gbexp",
    "env",
    "variantCount",
    "lastUrl",
  ]);

  if (data.gbexp) els.gbexp.value = String(data.gbexp);
  els.env.value = data.env === "dev" ? "dev" : DEFAULTS.env;

  const vc = parseVariantCount(data.variantCount ?? DEFAULTS.variantCount);
  els.variantCount.value = String(vc ?? DEFAULTS.variantCount);

  if (data.lastUrl && els.urlInput) els.urlInput.value = String(data.lastUrl);

  updateBaseUrlLabel();

  // auto-render if we have a valid exp
  const exp = String(els.gbexp.value || "").trim();
  const count = parseVariantCount(els.variantCount.value);
  if (exp && isValidExp(exp) && count) {
    renderCards({ exp, envKey: els.env.value, variantCount: count });
  }
}

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

function renderSingleUrlCard(url) {
  clearGrid();
  showError("");
  showErrorUrl("");

  if (typeof QRCode === "undefined") {
    showErrorUrl("QRCode is not defined. Check vendor/qrcode.js is loaded before popup.js.");
    return;
  }

  const card = document.createElement("div");
  card.className = "card";

  const header = document.createElement("div");
  header.className = "cardHeader";

  const title = document.createElement("div");
  title.innerHTML = `<strong>URL QR</strong> <span class="badge">Single</span>`;
  header.appendChild(title);

  const qrWrap = document.createElement("div");
  qrWrap.className = "qr";

  const qrBox = document.createElement("div");
  qrBox.className = "qrBox";
  qrWrap.appendChild(qrBox);

  try {
    qrBox.innerHTML = "";
    new QRCode(qrBox, {
      text: url,
      width: DEFAULTS.qrSize,
      height: DEFAULTS.qrSize,
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (err) {
    showErrorUrl("QR generation failed: " + (err?.message || String(err)));
  }

  const urlEl = document.createElement("div");
  urlEl.className = "url";
  urlEl.textContent = url;

  const actions = document.createElement("div");
  actions.className = "actions";

  const copyBtn = document.createElement("button");
  copyBtn.className = "btn btn-secondary";
  copyBtn.textContent = "Copy URL";
  copyBtn.addEventListener("click", async () => {
    await copyText(url);
  });

  const dlBtn = document.createElement("button");
  dlBtn.className = "btn btn-secondary";
  dlBtn.textContent = "Download QR";
  dlBtn.addEventListener("click", () => {
    const dataUrl = getQrDataUrl(qrBox);
    if (!dataUrl) {
      showErrorUrl("Could not extract QR image for download.");
      return;
    }
    downloadDataUrl(dataUrl, `qr.png`);
  });

  actions.appendChild(copyBtn);
  actions.appendChild(dlBtn);

  card.appendChild(header);
  card.appendChild(qrWrap);
  card.appendChild(urlEl);
  card.appendChild(actions);

  els.grid.appendChild(card);

  els.copyAll.disabled = false;
  els.copyAll.textContent = "Copy URL";
  els.copyAll.onclick = async () => copyText(url);
}

// Mode buttons
els.modeExp?.addEventListener("click", async () => {
  setMode("exp");
  await saveMode("exp");
});

els.modeUrl?.addEventListener("click", async () => {
  setMode("url");
  await saveMode("url");
});

// Env dropdown
els.env.addEventListener("change", () => {
  updateBaseUrlLabel();
});

// Experiment generate
els.gen.addEventListener("click", async () => {
  setMode("exp");
  await saveMode("exp");

  const exp = String(els.gbexp.value || "").trim();
  if (!isValidExp(exp)) {
    showError("Please enter a numeric gbexp (experiment id).");
    clearGrid();
    return;
  }

  const count = parseVariantCount(els.variantCount.value);
  if (!count) {
    showError("Please enter a valid variants count (1–50).");
    clearGrid();
    return;
  }

  const envKey = els.env.value === "dev" ? "dev" : "staging";

  await saveState({ gbexp: exp, env: envKey, variantCount: count });

  renderCards({ exp, envKey, variantCount: count });
});

els.gbexp.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.gen.click();
});

// Reset
els.reset.addEventListener("click", async () => {
  await chrome.storage.local.remove(["gbexp", "env", "variantCount", "lastUrl", "mode"]);
  els.gbexp.value = "";
  els.env.value = DEFAULTS.env;
  els.variantCount.value = String(DEFAULTS.variantCount);
  if (els.urlInput) els.urlInput.value = "";

  updateBaseUrlLabel();
  clearGrid();
  showError("");
  showErrorUrl("");
  setMode("exp");
});

// One-page URL generate
els.genUrl.addEventListener("click", async () => {
  setMode("url");
  await saveMode("url");

  const url = normalizeUrl(els.urlInput.value);
  if (!url) {
    showErrorUrl("Please paste a valid URL.");
    clearGrid();
    return;
  }

  await chrome.storage.local.set({ lastUrl: url });

  renderSingleUrlCard(url);
});

els.urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.genUrl.click();
});

// Init
updateBaseUrlLabel();
loadMode();
loadState();