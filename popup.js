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

function clearGrid() {
  els.grid.innerHTML = "";
  els.copyAll.disabled = true;
  els.copyAll.onclick = null;
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
  // Nice labels for the first few, then generic
  if (i === 0) return "Control (0)";
  if (i === 1) return "A (1)";
  if (i === 2) return "B (2)";
  return `Variant (${i})`;
}

function renderCards({ exp, envKey, variantCount }) {
  clearGrid();
  showError("");

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

    // qrcodejs wants a container element; it will insert canvas/img into it.
    const qrBox = document.createElement("div");
    qrBox.className = "qrBox";
    qrWrap.appendChild(qrBox);

    try {
      qrBox.innerHTML = "";
      // eslint-disable-next-line no-undef
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
  els.copyAll.onclick = async () => {
    await copyText(urls.join("\n"));
  };
}

async function saveState(state) {
  await chrome.storage.local.set(state);
}

async function loadState() {
  const data = await chrome.storage.local.get(["gbexp", "env", "variantCount"]);

  // gbexp
  if (data.gbexp) els.gbexp.value = String(data.gbexp);

  // env
  els.env.value = data.env === "dev" ? "dev" : DEFAULTS.env;

  // variants
  const vc = parseVariantCount(data.variantCount ?? DEFAULTS.variantCount);
  els.variantCount.value = String(vc ?? DEFAULTS.variantCount);

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

  // If user pastes without protocol, try https://
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

  if (typeof QRCode === "undefined") {
    showError("QRCode is not defined. Check vendor/qrcode.js is loaded before popup.js.");
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
    downloadDataUrl(dataUrl, `qr.png`);
  });

  actions.appendChild(copyBtn);
  actions.appendChild(dlBtn);

  card.appendChild(header);
  card.appendChild(qrWrap);
  card.appendChild(urlEl);
  card.appendChild(actions);

  els.grid.appendChild(card);

  // CopyAll becomes "Copy URL" for this mode
  els.copyAll.disabled = false;
  els.copyAll.textContent = "Copy URL";
  els.copyAll.onclick = async () => copyText(url);
}

els.env.addEventListener("change", () => {
  updateBaseUrlLabel();
});

els.gen.addEventListener("click", async () => {
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

els.reset.addEventListener("click", async () => {
  await chrome.storage.local.remove(["gbexp", "env", "variantCount"]);
  els.gbexp.value = "";
  els.env.value = DEFAULTS.env;
  els.variantCount.value = String(DEFAULTS.variantCount);
  updateBaseUrlLabel();
  clearGrid();
  showError("");
});

els.genUrl.addEventListener("click", async () => {
  const url = normalizeUrl(els.urlInput.value);
  if (!url) {
    showError("Please paste a valid URL.");
    clearGrid();
    return;
  }

  // Save last pasted URL (optional)
  await chrome.storage.local.set({ lastUrl: url });

  renderSingleUrlCard(url);
});

els.urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.genUrl.click();
});

updateBaseUrlLabel();
loadState();