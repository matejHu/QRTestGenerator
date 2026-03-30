const URLS = {
  dev: "https://onboarding-dev-fitify.vercel.app/",
  staging: "https://onboarding-staging-fitify.vercel.app/",
  custom: ""
};

const DEFAULTS = {
  env: "staging",
  variantCount: 3,
  qrSize: 220,
};

const MAX_EXPERIMENTS = 5;

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
  customUrl: document.getElementById("customUrl"),
  customUrlRow: document.getElementById("customUrlRow"),

  // mode switch
  modeExp: document.getElementById("modeExp"),
  modeUrl: document.getElementById("modeUrl"),
  sectionExp: document.getElementById("sectionExp"),
  sectionUrl: document.getElementById("sectionUrl"),
  errorUrl: document.getElementById("errorUrl"),

  // multiple experiments
  multipleExperiments: document.getElementById("multipleExperiments"),
  singleExpMode: document.getElementById("singleExpMode"),
  multipleExpMode: document.getElementById("multipleExpMode"),
  experimentsContainer: document.getElementById("experimentsContainer"),
  addExperiment: document.getElementById("addExperiment"),
  genMultiple: document.getElementById("genMultiple"),

  // go to page buttons
  goToPageMultiple: document.getElementById("goToPageMultiple"),
  goToPageUrl: document.getElementById("goToPageUrl"),
};

let experimentFields = [];
let lastGeneratedUrlMultiple = null;
let lastGeneratedUrlSingle = null;
let modeSetByUser = false;

function getBaseUrl() {
  if (els.env.value === "custom") return els.customUrl?.value.trim() || "";
  return URLS[els.env.value] || URLS.staging;
}

function updateBaseUrlLabel() {
  els.baseUrlText.textContent = getBaseUrl();
}

function buildUrl(baseUrl, gbexp, gbvar) {
  const u = new URL(baseUrl);
  u.searchParams.delete("gbvar");
  u.searchParams.set("gbexp", `${gbexp}:${gbvar}`);
  return u.toString();
}

function buildMultiExperimentUrl(baseUrl, experiments) {
  const u = new URL(baseUrl);
  u.searchParams.delete("gbexp");
  u.searchParams.delete("gbvar");
  // Multi-experiment format: ?gbexp=exp1:var1,exp2:var2
  const encodedExperiments = experiments
    .map((exp) => `${exp.gbexp}:${exp.gbvar}`)
    .join(",");
  u.searchParams.set("gbexp", encodedExperiments);
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

// Validate and update "Go to page" button for multiple experiments mode
function validateMultipleExperiments() {
  try {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      els.goToPageMultiple.disabled = true;
      return;
    }

    const experiments = collectExperimentData();
    if (experiments.length === 0) {
      els.goToPageMultiple.disabled = true;
      return;
    }

    const url = buildMultiExperimentUrl(baseUrl, experiments);
    lastGeneratedUrlMultiple = url;
    els.goToPageMultiple.disabled = false;
  } catch (err) {
    els.goToPageMultiple.disabled = true;
  }
}

// Validate and update "Go to page" button for URL mode
function validateUrlMode() {
  const url = normalizeUrl(els.urlInput.value);
  if (url) {
    lastGeneratedUrlSingle = url;
    els.goToPageUrl.disabled = false;
  } else {
    els.goToPageUrl.disabled = true;
  }
}

function toggleMultipleExperiments() {
  const isMultiple = els.multipleExperiments.checked;
  els.singleExpMode.hidden = isMultiple;
  els.multipleExpMode.hidden = !isMultiple;
  
  if (isMultiple) {
    const existingGbexp = els.gbexp.value.trim();

    // Disable the variants field in single mode
    els.variantCount.disabled = true;
    
    // Only clear and create new fields if switching manually (not during load)
    if (experimentFields.length === 0) {
      // Retain gbexp value if filled, otherwise start fresh
      addExperimentField(existingGbexp);
      addExperimentField();
    } else if (existingGbexp) {
      // If fields already exist, backfill the first gbexp only when it is empty.
      const firstGbexpInput = experimentFields[0]?.querySelector('[data-field="gbexp"]');
      if (firstGbexpInput && !firstGbexpInput.value.trim()) {
        firstGbexpInput.value = existingGbexp;
      }
    }
    
    validateMultipleExperiments();
    saveExperimentFieldsState();
  } else {
    // Enable the variants field in single mode
    els.variantCount.disabled = false;
  }
  
  showError("");
  saveMultipleExperimentsState(isMultiple);
}

function addExperimentField(prefillGbexp = "") {
  if (experimentFields.length >= MAX_EXPERIMENTS) {
    showError(`Maximum ${MAX_EXPERIMENTS} experiments allowed`);
    return;
  }

  const index = experimentFields.length;
  const fieldDiv = document.createElement("div");
  fieldDiv.className = "experimentField";
  fieldDiv.dataset.index = index;
  
  fieldDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <label class="label" style="margin: 0;">Experiment ${index + 1}</label>
      ${index > 0 ? '<button class="removeExpBtn" type="button">✕</button>' : ''}
    </div>
    <div class="row" style="margin-bottom: 8px;">
      <input class="expInput" inputmode="numeric" placeholder="AB test id" data-field="gbexp" style="flex: 2;" />
      <input class="varInput" inputmode="numeric" placeholder="Cntrl=0, A=1 ..." data-field="gbvar" style="flex: 1; max-width: 80px;" />
    </div>
  `;

  els.experimentsContainer.appendChild(fieldDiv);
  experimentFields.push(fieldDiv);

  const removeBtn = fieldDiv.querySelector(".removeExpBtn");
  if (removeBtn) {
    removeBtn.onclick = () => removeExperimentField(index);
  }

  // Add input listeners to validate on change
  const gbexpInput = fieldDiv.querySelector('[data-field="gbexp"]');
  const gbvarInput = fieldDiv.querySelector('[data-field="gbvar"]');

  if (gbexpInput && prefillGbexp) {
    gbexpInput.value = prefillGbexp;
  }
  
  if (gbexpInput) {
    gbexpInput.addEventListener("input", () => {
      validateMultipleExperiments();
      saveExperimentFieldsState();
    });
  }
  
  if (gbvarInput) {
    gbvarInput.addEventListener("input", () => {
      validateMultipleExperiments();
      saveExperimentFieldsState();
    });
  }

  updateAddButtonState();
  validateMultipleExperiments();
}

function removeExperimentField(index) {
  const field = experimentFields.find(f => f.dataset.index == index);
  if (field) {
    field.remove();
    experimentFields = experimentFields.filter(f => f.dataset.index != index);
    
    experimentFields.forEach((f, i) => {
      f.dataset.index = i;
      const label = f.querySelector("label");
      if (label) label.textContent = `Experiment ${i + 1}`;
    });
  }
  
  updateAddButtonState();
  showError("");
  validateMultipleExperiments();
  saveExperimentFieldsState();
}

function updateAddButtonState() {
  els.addExperiment.disabled = experimentFields.length >= MAX_EXPERIMENTS;
}

function collectExperimentData() {
  const experiments = [];
  const seenGbexp = new Set();
  
  for (const field of experimentFields) {
    const gbexpInput = field.querySelector('[data-field="gbexp"]');
    const gbvarInput = field.querySelector('[data-field="gbvar"]');
    
    const gbexp = gbexpInput.value.trim();
    const gbvar = gbvarInput.value.trim();
    
    if (!gbexp || !gbvar) {
      throw new Error("All experiment fields must be filled");
    }
    
    if (!isValidExp(gbexp)) {
      throw new Error(`Invalid gbexp: ${gbexp}`);
    }

    if (seenGbexp.has(gbexp)) {
      throw new Error(`Duplicate gbexp is not allowed: ${gbexp}`);
    }
    seenGbexp.add(gbexp);
    
    if (!isValidExp(gbvar)) {
      throw new Error(`Invalid gbvar: ${gbvar}`);
    }
    
    experiments.push({ gbexp, gbvar });
  }
  
  return experiments;
}

async function handleMultipleExperiments() {
  showError("");
  clearGrid();

  try {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      showError("Please enter a valid base URL");
      return;
    }

    const experiments = collectExperimentData();
    
    if (experiments.length === 0) {
      showError("Please add at least one experiment");
      return;
    }

    const url = buildMultiExperimentUrl(baseUrl, experiments);
    lastGeneratedUrlMultiple = url;
    els.goToPageMultiple.disabled = false;
    
    const card = document.createElement("div");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "cardHeader";
    
    const title = document.createElement("div");
    title.innerHTML = `<strong>Multiple Experiments</strong> <span class="badge">${experiments.length} exp</span>`;
    header.appendChild(title);

    const details = document.createElement("div");
    details.style.fontSize = "11px";
    details.style.marginBottom = "8px";
    details.style.opacity = "0.8";
    experiments.forEach((exp, i) => {
      const line = document.createElement("div");
      line.textContent = `${i + 1}. gbexp=${exp.gbexp}, gbvar=${exp.gbvar}`;
      details.appendChild(line);
    });

    const qrWrap = document.createElement("div");
    qrWrap.className = "qr";
    
    const qrBox = document.createElement("div");
    qrBox.className = "qrBox";
    qrWrap.appendChild(qrBox);

    new QRCode(qrBox, {
      text: url,
      width: DEFAULTS.qrSize,
      height: DEFAULTS.qrSize,
      correctLevel: QRCode.CorrectLevel.M,
    });

    const urlEl = document.createElement("div");
    urlEl.className = "url";
    urlEl.textContent = url;

    const actions = document.createElement("div");
    actions.className = "actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn btn-secondary";
    copyBtn.textContent = "Copy URL";
    copyBtn.onclick = async () => {
      await copyText(url);
    };

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn btn-secondary";
    downloadBtn.textContent = "Download QR";
    downloadBtn.onclick = () => {
      const dataUrl = getQrDataUrl(qrBox);
      if (dataUrl) {
        downloadDataUrl(dataUrl, `qr-multi-exp.png`);
      }
    };

    actions.appendChild(copyBtn);
    actions.appendChild(downloadBtn);

    card.appendChild(header);
    card.appendChild(details);
    card.appendChild(qrWrap);
    card.appendChild(urlEl);
    card.appendChild(actions);

    els.grid.appendChild(card);

    els.copyAll.disabled = false;
    els.copyAll.textContent = "Copy URL";
    els.copyAll.onclick = async () => {
      await copyText(url);
    };

    saveExperimentFieldsState();

  } catch (err) {
    showError(err.message || "Error generating QR code");
  }
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
  if (modeSetByUser) return;
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

  const baseUrl = envKey === "custom" ? (els.customUrl?.value.trim() || "") : URLS[envKey];
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

    const goToPageBtn = document.createElement("button");
    goToPageBtn.className = "btn btn-secondary";
    goToPageBtn.textContent = "Go to page";
    goToPageBtn.addEventListener("click", () => {
      window.open(url, "_blank");
    });

    actions.appendChild(copyBtn);
    actions.appendChild(dlBtn);
    actions.appendChild(goToPageBtn);

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

function persistSingleModeInputs() {
  if (els.multipleExperiments?.checked) return;
  chrome.storage.local.set({
    gbexp: String(els.gbexp?.value || "").trim(),
    variantCount: String(els.variantCount?.value || "").trim(),
  });
}

async function loadState() {
  try {
    const data = await chrome.storage.local.get([
      "gbexp",
      "env",
      "variantCount",
      "lastUrl",
      "mode",
      "customUrl",
      "multipleExperiments",
      "experimentFields",
    ]);

    if (data.gbexp) els.gbexp.value = String(data.gbexp);
    els.env.value = ["dev", "staging", "custom"].includes(data.env) ? data.env : DEFAULTS.env;
    if (els.customUrl && data.customUrl) els.customUrl.value = String(data.customUrl);
    if (els.customUrlRow) els.customUrlRow.hidden = els.env.value !== "custom";

    const hasSavedVariantCount =
      data.variantCount !== undefined && data.variantCount !== null && String(data.variantCount).trim() !== "";
    const vc = hasSavedVariantCount ? parseVariantCount(data.variantCount) : null;
    els.variantCount.value = vc ? String(vc) : "";

    if (data.lastUrl && els.urlInput) els.urlInput.value = String(data.lastUrl);

  // Restore multiple experiments state
    if (data.multipleExperiments) {
      els.multipleExperiments.checked = true;
      els.singleExpMode.hidden = true;
      els.multipleExpMode.hidden = false;
      els.variantCount.disabled = true;
    
    // Restore experiment fields
      if (data.experimentFields && Array.isArray(data.experimentFields) && data.experimentFields.length > 0) {
        experimentFields = [];
        els.experimentsContainer.innerHTML = "";
        data.experimentFields.forEach(expData => {
          addExperimentField();
          const lastField = experimentFields[experimentFields.length - 1];
          const gbexpInput = lastField.querySelector('[data-field="gbexp"]');
          const gbvarInput = lastField.querySelector('[data-field="gbvar"]');
          const safeExp = expData && typeof expData === "object" ? expData : {};
          if (gbexpInput) gbexpInput.value = String(safeExp.gbexp ?? "");
          if (gbvarInput) gbvarInput.value = String(safeExp.gbvar ?? "");
        });
        validateMultipleExperiments();
      } else {
        // No saved fields, start with 2 empty fields
        experimentFields = [];
        els.experimentsContainer.innerHTML = "";
        addExperimentField();
        addExperimentField();
      }
    } else {
      // Not in multiple experiments mode, ensure variants field is enabled
      els.variantCount.disabled = false;
    }

    updateBaseUrlLabel();
    validateUrlMode();

    // In URL mode, restore the previously generated one-page QR card.
    if (data.mode === "url" && els.grid.children.length === 0) {
      const restoredUrl = normalizeUrl(data.lastUrl || "");
      if (restoredUrl) {
        renderSingleUrlCard(restoredUrl);
      }
    }

  // auto-render if we have a valid exp and NOT in multiple experiments mode
    if (
      data.mode !== "url" &&
      !els.multipleExperiments.checked &&
      els.grid.children.length === 0
    ) {
      const exp = String(els.gbexp.value || "").trim();
      const count = parseVariantCount(els.variantCount.value);
      if (exp && isValidExp(exp) && count) {
        renderCards({ exp, envKey: els.env.value, variantCount: count });
      }
    }
  } catch (err) {
    console.error("Failed to restore popup state:", err);
    showError("Could not restore previous state. You can continue or press RESET.");
  }
}

async function saveMultipleExperimentsState(isMultiple) {
  await chrome.storage.local.set({ multipleExperiments: isMultiple });
}

async function saveExperimentFieldsState() {
  const fieldsData = experimentFields.map(field => {
    const gbexpInput = field.querySelector('[data-field="gbexp"]');
    const gbvarInput = field.querySelector('[data-field="gbvar"]');
    return {
      gbexp: gbexpInput ? gbexpInput.value : "",
      gbvar: gbvarInput ? gbvarInput.value : "",
    };
  });
  await chrome.storage.local.set({ experimentFields: fieldsData });
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

  lastGeneratedUrlSingle = url;
  els.goToPageUrl.disabled = false;

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

  const goToPageBtn = document.createElement("button");
  goToPageBtn.className = "btn btn-secondary";
  goToPageBtn.textContent = "Go to page";
  goToPageBtn.addEventListener("click", () => {
    window.open(url, "_blank");
  });

  actions.appendChild(copyBtn);
  actions.appendChild(dlBtn);
  actions.appendChild(goToPageBtn);

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
  modeSetByUser = true;
  setMode("exp");
  await saveMode("exp");
});

els.modeUrl?.addEventListener("click", async () => {
  modeSetByUser = true;
  setMode("url");
  await saveMode("url");
});

// Env dropdown
els.env?.addEventListener("change", () => {
  if (els.customUrlRow) els.customUrlRow.hidden = els.env.value !== "custom";
  updateBaseUrlLabel();
  validateMultipleExperiments();

  // Persist env immediately since popup closes whenever focus shifts away.
  chrome.storage.local.set({
    env: els.env.value,
    customUrl: els.customUrl?.value.trim() || "",
  });
});

// Custom URL live label update
els.customUrl?.addEventListener("input", () => {
  updateBaseUrlLabel();
  validateMultipleExperiments();

  // Keep custom URL synced live so reopening popup restores in-progress value.
  chrome.storage.local.set({
    env: els.env.value,
    customUrl: els.customUrl?.value.trim() || "",
  });
});

// Experiment generate
els.gen.addEventListener("click", async () => {
  modeSetByUser = true;
  setMode("exp");
  saveMode("exp").catch((err) => {
    console.warn("Failed to persist mode:", err);
  });

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

  const envKey = els.env.value;

  if (envKey === "custom") {
    const customUrl = els.customUrl?.value.trim() || "";
    if (!customUrl) {
      showError("Please enter a custom base URL.");
      clearGrid();
      return;
    }
    saveState({ gbexp: exp, env: envKey, variantCount: count, customUrl }).catch((err) => {
      console.warn("Failed to persist single experiment state:", err);
    });
  } else {
    saveState({ gbexp: exp, env: envKey, variantCount: count }).catch((err) => {
      console.warn("Failed to persist single experiment state:", err);
    });
  }

  renderCards({ exp, envKey, variantCount: count });
});

els.gbexp?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.gen.click();
});

els.gbexp?.addEventListener("input", persistSingleModeInputs);
els.variantCount?.addEventListener("input", persistSingleModeInputs);

// Add input listener for URL mode validation
els.urlInput?.addEventListener("input", validateUrlMode);

// Go to page buttons (only for multiple experiments and URL mode)
els.goToPageMultiple?.addEventListener("click", () => {
  if (lastGeneratedUrlMultiple) {
    window.open(lastGeneratedUrlMultiple, "_blank");
  }
});

els.goToPageUrl?.addEventListener("click", () => {
  if (lastGeneratedUrlSingle) {
    window.open(lastGeneratedUrlSingle, "_blank");
  }
});

// Reset
els.reset?.addEventListener("click", async () => {
  await chrome.storage.local.remove([
    "gbexp",
    "env",
    "variantCount",
    "lastUrl",
    "customUrl",
    "mode",
    "multipleExperiments",
    "experimentFields",
  ]);
  els.gbexp.value = "";
  els.env.value = DEFAULTS.env;
  els.variantCount.value = "";
  if (els.urlInput) els.urlInput.value = "";
  if (els.customUrl) els.customUrl.value = "";
  if (els.customUrlRow) els.customUrlRow.hidden = true;
  
  els.multipleExperiments.checked = false;
  experimentFields = [];
  els.experimentsContainer.innerHTML = "";
  els.variantCount.disabled = false;
  els.singleExpMode.hidden = false;
  els.multipleExpMode.hidden = true;

  updateBaseUrlLabel();
  clearGrid();
  showError("");
  showErrorUrl("");
  setMode("exp");
  
  lastGeneratedUrlMultiple = null;
  lastGeneratedUrlSingle = null;
  if (els.goToPageMultiple) els.goToPageMultiple.disabled = true;
  if (els.goToPageUrl) els.goToPageUrl.disabled = true;
});

// One-page URL generate
els.genUrl?.addEventListener("click", async () => {
  modeSetByUser = true;
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

els.urlInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.genUrl.click();
});

// Multiple experiments listeners
els.multipleExperiments?.addEventListener("change", toggleMultipleExperiments);
els.addExperiment?.addEventListener("click", () => addExperimentField());
els.genMultiple?.addEventListener("click", handleMultipleExperiments);

// Init
updateBaseUrlLabel();
loadMode();
loadState();