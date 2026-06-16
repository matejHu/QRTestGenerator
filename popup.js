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
  customUrlInfo: document.getElementById("customUrlInfo"),
  alsoGenerateMaster: document.getElementById("alsoGenerateMaster"),
  customMasterEnv: document.getElementById("customMasterEnv"),
  customMasterUrlRow: document.getElementById("customMasterUrlRow"),
  alsoGenerateMasterRow: document.getElementById("alsoGenerateMasterRow"),
  localization: document.getElementById("localization"),
  flag: document.getElementById("flag"),

  // mode buttons
  modeExp: document.getElementById("modeExp"),
  multiExpBtn: document.getElementById("multiExpBtn"),
  modeUrl: document.getElementById("modeUrl"),
  sectionExp: document.getElementById("sectionExp"),
  sectionUrl: document.getElementById("sectionUrl"),
  errorUrl: document.getElementById("errorUrl"),

  // single vs multiple experiment views
  expMode: document.getElementById("expMode"),
  multipleExpMode: document.getElementById("multipleExpMode"),
  experimentsContainer: document.getElementById("experimentsContainer"),
  addExperiment: document.getElementById("addExperiment"),
  genMultiple: document.getElementById("genMultiple"),

  // go to page button (URL mode only)
  goToPageUrl: document.getElementById("goToPageUrl"),
};

let experimentFields = [];
let lastGeneratedUrlMultiple = null;
let lastGeneratedUrlSingle = null;
let modeSetByUser = false;
let currentMode = "exp";

function getBaseUrl() {
  if (els.env.value === "custom") return els.customUrl?.value.trim() || "";
  return URLS[els.env.value] || URLS.staging;
}

function updateBaseUrlLabel() {
  els.baseUrlText.textContent = getBaseUrl();
  updateCustomUrlState();
  updateAlternateBaseUrlRow();
}

function getAlternateBaseUrl() {
  if (!els.alsoGenerateMaster?.checked) return "";
  return URLS[els.customMasterEnv?.value] || URLS.staging;
}

function isCustomUrlMatchingKnownEnv() {
  const custom = (els.customUrl?.value.trim() || "").replace(/\/+$/, "").toLowerCase();
  return Object.values(URLS).some(url => url && url.replace(/\/+$/, "").toLowerCase() === custom);
}

function updateAlternateBaseUrlRow() {
  if (!els.customMasterUrlRow || !els.alsoGenerateMaster) return;
  const isCustom = els.env.value === "custom";
  const isKnown = isCustomUrlMatchingKnownEnv();

  if (els.alsoGenerateMasterRow) els.alsoGenerateMasterRow.hidden = !isCustom || isKnown;
  if (isKnown && els.alsoGenerateMaster.checked) els.alsoGenerateMaster.checked = false;

  els.customMasterUrlRow.hidden = !(isCustom && !isKnown && els.alsoGenerateMaster.checked);
}

const KNOWN_LOCALES = new Set(["en", "cs", "nl", "fr", "de", "hu", "it", "ja", "ko", "pl", "pt", "ru", "sk", "es", "tr"]);
const KNOWN_FLAGS = new Set(["f01", "m01", "welcome", "chm01", "chf01", "hopif"]);

function buildPathSegments() {
  const segments = [];
  const locale = els.localization?.value;
  if (locale) segments.push(locale);
  const flag = els.flag?.value;
  if (flag) segments.push(flag);
  return segments;
}

function parsePathSegments(url) {
  try {
    const u = new URL(url);
    return u.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
  } catch {
    return [];
  }
}

function detectCustomUrlSegments(customUrl) {
  const segments = parsePathSegments(customUrl);
  const result = { locale: "", flag: "" };
  if (segments.length === 0) return result;

  const first = segments[0];
  const second = segments[1];

  if (KNOWN_LOCALES.has(first)) {
    result.locale = first;
    if (KNOWN_FLAGS.has(second)) {
      result.flag = second;
    }
  } else if (KNOWN_FLAGS.has(first)) {
    result.flag = first;
  }

  return result;
}

function normalizeBaseUrl(baseUrl) {
  try {
    const u = new URL(baseUrl);
    const segments = u.pathname.split("/").filter(Boolean);
    let skip = 0;

    if (segments.length > 0 && KNOWN_LOCALES.has(segments[0])) {
      skip = 1;
    }
    if (segments.length > skip && KNOWN_FLAGS.has(segments[skip])) {
      skip += 1;
    }

    if (skip === 0) {
      return u.toString();
    }

    const remaining = segments.slice(skip).join("/");
    u.pathname = remaining ? `/${remaining}/` : "/";
    return u.toString();
  } catch {
    return baseUrl;
  }
}

function setCustomUrlInfo(message) {
  if (!els.customUrlInfo) return;
  els.customUrlInfo.hidden = !message;
  els.customUrlInfo.textContent = message || "";
}

function setCustomUrlModesEnabled(enableLocale, enableFlag) {
  if (els.localization) els.localization.disabled = !enableLocale;
  if (els.flag) els.flag.disabled = !enableFlag;
}

function updateCustomUrlState() {
  if (!els.customUrl || els.env.value !== "custom") {
    setCustomUrlInfo("");
    setCustomUrlModesEnabled(true, true);
    return;
  }

  const customUrl = els.customUrl.value.trim();
  if (!customUrl) {
    setCustomUrlInfo("");
    setCustomUrlModesEnabled(true, true);
    return;
  }

  const detected = detectCustomUrlSegments(customUrl);
  const parts = [];

  if (detected.locale) {
    if (els.localization) els.localization.value = detected.locale;
    parts.push(`locale: ${detected.locale}`);
  }

  // Always sync flag select to what the URL declares — clears stale selection
  // when user edits a custom URL to remove a flag that was previously detected.
  if (els.flag) els.flag.value = detected.flag || "";
  if (detected.flag) parts.push(`flag: ${detected.flag}`);

  setCustomUrlInfo(
    parts.length > 0
      ? `Detected ${parts.join(", ")} in custom URL. These options are locked to prevent duplication.`
      : ""
  );

  setCustomUrlModesEnabled(!detected.locale, !detected.flag);
}

function buildUrl(baseUrl, gbexp, gbvar) {
  const u = new URL(normalizeBaseUrl(baseUrl));
  const segments = buildPathSegments();
  if (segments.length > 0) {
    const base = u.pathname.endsWith("/") ? u.pathname : u.pathname + "/";
    u.pathname = base + segments.join("/") + "/";
  }
  u.searchParams.delete("gbvar");
  u.searchParams.set("gbexp", `${gbexp}:${gbvar}`);
  return u.toString();
}

function buildMultiExperimentUrl(baseUrl, experiments) {
  const u = new URL(normalizeBaseUrl(baseUrl));
  const segments = buildPathSegments();
  if (segments.length > 0) {
    const base = u.pathname.endsWith("/") ? u.pathname : u.pathname + "/";
    u.pathname = base + segments.join("/") + "/";
  }
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

function validateMultipleExperiments() {
  try {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return;
    const experiments = collectExperimentData();
    if (experiments.length === 0) return;
    lastGeneratedUrlMultiple = buildMultiExperimentUrl(baseUrl, experiments);
  } catch (err) {
    // ignore validation errors
  }
}

function ensureExperimentFields() {
  if (experimentFields.length === 0) {
    const existingGbexp = els.gbexp?.value.trim() || "";
    addExperimentField(existingGbexp);
    addExperimentField();
  }
  validateMultipleExperiments();
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
    ${index > 0 ? '<div style="display: flex; justify-content: flex-end; margin-bottom: 4px;"><button class="removeExpBtn" type="button">✕</button></div>' : ''}
    <div class="row" style="margin-bottom: 8px; gap: 8px; flex-wrap: nowrap; align-items: flex-end;">
      <div style="flex: 3 1 0; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end;">
        <label class="label" style="margin-bottom: 6px;">Experiment ${index + 1}</label>
        <input class="expInput" inputmode="numeric" placeholder="Test id" data-field="gbexp" style="width: 100%; min-width: 0;" />
      </div>
      <div style="flex: 1 1 0; min-width: 0; max-width: 110px; display: flex; flex-direction: column; justify-content: flex-end;">
        <label class="label" style="margin-bottom: 6px;">Variant</label>
        <input class="varInput" inputmode="numeric" placeholder="0" data-field="gbvar" style="width: 100%; min-width: 0;" />
      </div>
      <div style="flex: 1 1 0; min-width: 0; max-width: 120px; display: flex; flex-direction: column; justify-content: flex-end;">
        <label class="label" style="margin-bottom: 6px;">Var. count</label>
        <input class="countInput" inputmode="numeric" placeholder="Count" data-field="varCount" style="width: 100%; min-width: 0;" />
      </div>
    </div>
    <div class="small" style="margin-top: -4px; opacity: 0.8;">Fill either Variant or Variant count. Leave one empty.</div>
  `;

  els.experimentsContainer.appendChild(fieldDiv);
  experimentFields.push(fieldDiv);

  const removeBtn = fieldDiv.querySelector(".removeExpBtn");
  if (removeBtn) {
    removeBtn.onclick = () => removeExperimentField(index);
  }

  const gbexpInput = fieldDiv.querySelector('[data-field="gbexp"]');
  const gbvarInput = fieldDiv.querySelector('[data-field="gbvar"]');

  if (gbexpInput && prefillGbexp) {
    gbexpInput.value = prefillGbexp;
  }

  const expLabel = fieldDiv.querySelector(".label");
  const countInput = fieldDiv.querySelector('[data-field="varCount"]');

  if (gbexpInput) {
    gbexpInput.addEventListener("input", () => {
      const id = gbexpInput.value.trim();
      expLabel.textContent = id ? `Experiment ${id}` : `Experiment ${index + 1}`;
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

  if (countInput) {
    countInput.addEventListener("input", () => {
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
      const label = f.querySelector(".label");
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
    const varCountInput = field.querySelector('[data-field="varCount"]');

    const gbexp = String(gbexpInput?.value || "").trim();
    const gbvar = String(gbvarInput?.value || "").trim();
    const varCountValue = String(varCountInput?.value || "").trim();

    if (!gbexp) {
      throw new Error("Experiment id is required for every row");
    }

    if (!isValidExp(gbexp)) {
      throw new Error(`Invalid gbexp: ${gbexp}`);
    }

    if (seenGbexp.has(gbexp)) {
      throw new Error(`Duplicate gbexp is not allowed: ${gbexp}`);
    }
    seenGbexp.add(gbexp);

    if (gbvar && varCountValue) {
      throw new Error("Fill either Variant or Variant count, not both.");
    }

    if (!gbvar && !varCountValue) {
      throw new Error("Each experiment row needs either Variant or Variant count.");
    }

    let variants = [];
    if (gbvar) {
      if (!isValidExp(gbvar)) {
        throw new Error(`Invalid gbvar: ${gbvar}`);
      }
      variants = [gbvar];
    } else {
      const count = parseVariantCount(varCountValue);
      if (!count) {
        throw new Error(`Invalid variant count for experiment ${gbexp}.`);
      }
      variants = Array.from({ length: count }, (_, index) => String(index));
    }

    experiments.push({ gbexp, variants });
  }

  return experiments;
}

function buildExperimentCombinations(experiments) {
  return experiments.reduce(
    (acc, experiment) => {
      const combos = [];
      for (const combo of acc) {
        for (const gbvar of experiment.variants) {
          combos.push([...combo, { gbexp: experiment.gbexp, gbvar }]);
        }
      }
      return combos;
    },
    [[]]
  );
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

    const combos = buildExperimentCombinations(experiments);
    const alternateUrl = getAlternateBaseUrl();
    const groups = [{ url: baseUrl, label: "Primary" }];
    if (alternateUrl) {
      groups.push({ url: alternateUrl, label: "Alternate" });
    }

    const maxCards = 60;
    if (combos.length * groups.length > maxCards) {
      throw new Error(`Too many combinations (${combos.length * groups.length}). Reduce the number of variants or disable the alternate URL option.`);
    }

    const allUrls = [];
    groups.forEach((group) => {
      combos.forEach((combo, comboIndex) => {
        const url = buildMultiExperimentUrl(group.url, combo);
        allUrls.push(url);

        const card = document.createElement("div");
        card.className = "card";

        const header = document.createElement("div");
        header.className = "cardHeader";

        const title = document.createElement("div");
        title.innerHTML = `<strong>Combo ${comboIndex + 1}</strong> <span class="badge">${combo.length} exp</span> <span class="badge">${group.label}</span>`;
        header.appendChild(title);

        const testedLabel = document.createElement("label");
        testedLabel.className = "checkboxLabel";
        testedLabel.style.marginLeft = "auto";
        testedLabel.style.fontSize = "12px";
        const testedInput = document.createElement("input");
        testedInput.type = "checkbox";
        testedInput.style.margin = "0";
        testedLabel.appendChild(testedInput);
        testedLabel.appendChild(document.createTextNode("Tested"));
        header.appendChild(testedLabel);

        const details = document.createElement("div");
        details.style.fontSize = "11px";
        details.style.marginBottom = "8px";
        details.style.opacity = "0.8";
        combo.forEach((exp, i) => {
          const line = document.createElement("div");
          line.textContent = `${i + 1}. gbexp=${exp.gbexp}, gbvar=${exp.gbvar}`;
          details.appendChild(line);
        });

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
        copyBtn.onclick = async () => {
          await copyText(url);
        };

        const downloadBtn = document.createElement("button");
        downloadBtn.className = "btn btn-secondary";
        downloadBtn.textContent = "Download QR";
        downloadBtn.onclick = () => {
          const dataUrl = getQrDataUrl(qrBox);
          if (dataUrl) {
            downloadDataUrl(dataUrl, `qr-multi-exp-${group.label.toLowerCase()}.png`);
          }
        };

        const goToPageBtn = document.createElement("button");
        goToPageBtn.className = "btn btn-secondary";
        goToPageBtn.textContent = "Go to page";
        goToPageBtn.addEventListener("click", () => {
          chrome.windows.create({ url, incognito: true });
        });

        actions.appendChild(copyBtn);
        actions.appendChild(downloadBtn);
        actions.appendChild(goToPageBtn);

        card.appendChild(header);
        card.appendChild(details);
        card.appendChild(qrWrap);
        card.appendChild(urlEl);
        card.appendChild(actions);

        els.grid.appendChild(card);
      });
    });

    els.copyAll.disabled = false;
    els.copyAll.textContent = "Copy all URLs";
    els.copyAll.onclick = async () => {
      await copyText(allUrls.join("\n"));
    };

    saveExperimentFieldsState();
  } catch (err) {
    showError(err.message || "Error generating QR code");
  }
}

function setMode(mode) {
  currentMode = mode;
  const isExp = mode === "exp";
  const isMultiple = mode === "multiple";
  const isUrl = mode === "url";

  if (els.sectionExp) els.sectionExp.hidden = isUrl;
  if (els.sectionUrl) els.sectionUrl.hidden = !isUrl;
  if (els.expMode) els.expMode.hidden = !isExp;
  if (els.multipleExpMode) els.multipleExpMode.hidden = !isMultiple;

  if (els.modeExp) els.modeExp.classList.toggle("modeBtnActive", isExp);
  if (els.multiExpBtn) els.multiExpBtn.classList.toggle("modeBtnActive", isMultiple);
  if (els.modeUrl) els.modeUrl.classList.toggle("modeBtnActive", isUrl);

  showError("");
  showErrorUrl("");

  els.copyAll.textContent = isUrl ? "Copy URL" : "Copy all URLs";
  els.copyAll.hidden = isUrl;
}

async function saveMode(mode) {
  await chrome.storage.local.set({ mode });
}

async function loadMode() {
  const data = await chrome.storage.local.get(["mode"]);
  if (modeSetByUser) return;
  const mode = ["exp", "multiple", "url"].includes(data.mode) ? data.mode : "exp";
  setMode(mode);
}

function clearGrid() {
  els.grid.innerHTML = "";
  els.copyAll.disabled = true;
  els.copyAll.onclick = null;
  els.copyAll.textContent = currentMode === "exp" ? "Copy all URLs" : "Copy URL";
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
  if (i <= 26) return `${String.fromCharCode(64 + i)} (${i})`;
  return `Variant (${i})`;
}

function renderSingleExperimentGroup({ baseUrl, exp, variantCount, sourceLabel }) {
  const urls = [];

  for (let i = 0; i < variantCount; i++) {
    const url = buildUrl(baseUrl, exp, i);
    urls.push(url);

    const card = document.createElement("div");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "cardHeader";

    const title = document.createElement("div");
    title.innerHTML = `<strong>gbvar: ${i}</strong> <span class="badge">${variantLabel(i)}</span>${sourceLabel ? ` <span class="badge">${sourceLabel}</span>` : ""}`;
    header.appendChild(title);

    const checkedLabel = document.createElement("label");
    checkedLabel.className = "checkboxLabel";
    checkedLabel.style.marginLeft = "auto";
    checkedLabel.style.fontSize = "12px";
    const checkedInput = document.createElement("input");
    checkedInput.type = "checkbox";
    checkedInput.style.margin = "0";
    checkedLabel.appendChild(checkedInput);
    checkedLabel.appendChild(document.createTextNode("Tested"));
    header.appendChild(checkedLabel);

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
      downloadDataUrl(dataUrl, `gbexp-${exp}_gbvar-${i}_${sourceLabel || "primary"}.png`);
    });

    const goToPageBtn = document.createElement("button");
    goToPageBtn.className = "btn btn-secondary";
    goToPageBtn.textContent = "Go to page";
    goToPageBtn.addEventListener("click", () => {
      chrome.windows.create({ url, incognito: true });
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

  return urls;
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
  const alternateUrl = envKey === "custom" ? getAlternateBaseUrl() : "";
  els.baseUrlText.textContent = baseUrl;

  const urls = renderSingleExperimentGroup({ baseUrl, exp, variantCount, sourceLabel: "" });
  if (alternateUrl) {
    urls.push(...renderSingleExperimentGroup({ baseUrl: alternateUrl, exp, variantCount, sourceLabel: "Alternate" }));
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
  if (currentMode === "multiple") return;
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
      "customMasterEnv",
      "alsoGenerateMaster",
      "localization",
      "flag",
      "experimentFields",
    ]);

    if (data.gbexp) els.gbexp.value = String(data.gbexp);
    els.env.value = ["dev", "staging", "custom"].includes(data.env) ? data.env : DEFAULTS.env;
    if (els.customUrl && data.customUrl) els.customUrl.value = String(data.customUrl);
    if (els.customMasterEnv && data.customMasterEnv) els.customMasterEnv.value = data.customMasterEnv;
    if (els.alsoGenerateMaster) els.alsoGenerateMaster.checked = Boolean(data.alsoGenerateMaster);
    if (els.customUrlRow) els.customUrlRow.hidden = els.env.value !== "custom";
    updateAlternateBaseUrlRow();
    if (els.localization && data.localization) els.localization.value = String(data.localization);
    if (els.flag && data.flag) els.flag.value = String(data.flag);

    const hasSavedVariantCount =
      data.variantCount !== undefined && data.variantCount !== null && String(data.variantCount).trim() !== "";
    const vc = hasSavedVariantCount ? parseVariantCount(data.variantCount) : null;
    els.variantCount.value = vc ? String(vc) : "";

    if (data.lastUrl && els.urlInput) els.urlInput.value = String(data.lastUrl);

    // Restore experiment fields for multiple mode
    if (data.mode === "multiple") {
      if (data.experimentFields && Array.isArray(data.experimentFields) && data.experimentFields.length > 0) {
        experimentFields = [];
        els.experimentsContainer.innerHTML = "";
        data.experimentFields.forEach(expData => {
          addExperimentField();
          const lastField = experimentFields[experimentFields.length - 1];
          const gbexpInput = lastField.querySelector('[data-field="gbexp"]');
          const gbvarInput = lastField.querySelector('[data-field="gbvar"]');
          const countInput = lastField.querySelector('[data-field="varCount"]');
          const expLabel = lastField.querySelector(".label");
          const safeExp = expData && typeof expData === "object" ? expData : {};
          if (gbexpInput) gbexpInput.value = String(safeExp.gbexp ?? "");
          if (gbvarInput) gbvarInput.value = String(safeExp.gbvar ?? "");
          if (countInput) countInput.value = String(safeExp.varCount ?? "");
          if (expLabel && safeExp.gbexp) expLabel.textContent = `Experiment ${safeExp.gbexp}`;
        });
        validateMultipleExperiments();
      } else {
        experimentFields = [];
        els.experimentsContainer.innerHTML = "";
        addExperimentField();
        addExperimentField();
      }
    }

    updateBaseUrlLabel();
    updateCustomUrlState();
    validateUrlMode();

    // In URL mode, restore the previously generated one-page QR card.
    if (data.mode === "url" && els.grid.children.length === 0) {
      const restoredUrl = normalizeUrl(data.lastUrl || "");
      if (restoredUrl) {
        renderSingleUrlCard(restoredUrl);
      }
    }

    // Auto-render if we have a valid exp in single experiment mode
    if (
      data.mode !== "url" &&
      data.mode !== "multiple" &&
      els.grid.children.length === 0
    ) {
      const exp = String(els.gbexp.value || "").trim();
      const count = parseVariantCount(els.variantCount.value);
      if (exp && isValidExp(exp) && count) {
        renderCards({ exp, envKey: els.env.value, variantCount: count });
      }
    }

    // Auto-render multiple mode if all saved fields are valid
    if (data.mode === "multiple" && els.grid.children.length === 0) {
      validateMultipleExperiments();
      if (lastGeneratedUrlMultiple) {
        await handleMultipleExperiments();
      }
    }
  } catch (err) {
    console.error("Failed to restore popup state:", err);
    showError("Could not restore previous state. You can continue or press RESET.");
  }
}

async function saveExperimentFieldsState() {
  const fieldsData = experimentFields.map(field => {
    const gbexpInput = field.querySelector('[data-field="gbexp"]');
    const gbvarInput = field.querySelector('[data-field="gbvar"]');
    const countInput = field.querySelector('[data-field="varCount"]');
    return {
      gbexp: gbexpInput ? gbexpInput.value : "",
      gbvar: gbvarInput ? gbvarInput.value : "",
      varCount: countInput ? countInput.value : "",
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
    chrome.windows.create({ url, incognito: true });
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

els.multiExpBtn?.addEventListener("click", async () => {
  modeSetByUser = true;
  setMode("multiple");
  ensureExperimentFields();
  saveExperimentFieldsState();
  await saveMode("multiple");
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
  chrome.storage.local.set({
    env: els.env.value,
    customUrl: els.customUrl?.value.trim() || "",
  });
});

// Custom URL live label update
els.customUrl?.addEventListener("input", () => {
  updateBaseUrlLabel();
  validateMultipleExperiments();

  chrome.storage.local.set({
    env: els.env.value,
    customUrl: els.customUrl?.value.trim() || "",
  });
});

els.alsoGenerateMaster?.addEventListener("change", () => {
  updateAlternateBaseUrlRow();
  chrome.storage.local.set({ alsoGenerateMaster: els.alsoGenerateMaster.checked });
});

els.customMasterEnv?.addEventListener("change", () => {
  chrome.storage.local.set({ customMasterEnv: els.customMasterEnv.value });
});

// Localization and flags
els.localization?.addEventListener("change", () => {
  chrome.storage.local.set({ localization: els.localization.value });
});

els.flag?.addEventListener("change", () => {
  chrome.storage.local.set({ flag: els.flag.value });
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

// Go to page (URL mode)
els.goToPageUrl?.addEventListener("click", () => {
  if (lastGeneratedUrlSingle) {
    chrome.windows.create({ url: lastGeneratedUrlSingle, incognito: true });
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
    "customMasterEnv",
    "alsoGenerateMaster",
    "mode",
    "localization",
    "flag",
    "experimentFields",
  ]);
  els.gbexp.value = "";
  els.env.value = DEFAULTS.env;
  els.variantCount.value = "";
  if (els.urlInput) els.urlInput.value = "";
  if (els.customUrl) els.customUrl.value = "";
  if (els.customMasterEnv) els.customMasterEnv.value = "staging";
  if (els.alsoGenerateMaster) els.alsoGenerateMaster.checked = false;
  if (els.customUrlRow) els.customUrlRow.hidden = true;
  if (els.customMasterUrlRow) els.customMasterUrlRow.hidden = true;
  if (els.alsoGenerateMasterRow) els.alsoGenerateMasterRow.hidden = true;
  if (els.localization) els.localization.value = "";
  if (els.flag) els.flag.value = "";

  experimentFields = [];
  els.experimentsContainer.innerHTML = "";

  updateBaseUrlLabel();
  clearGrid();
  showError("");
  showErrorUrl("");
  setMode("exp");

  lastGeneratedUrlMultiple = null;
  lastGeneratedUrlSingle = null;
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
els.addExperiment?.addEventListener("click", () => addExperimentField());
els.genMultiple?.addEventListener("click", handleMultipleExperiments);

// Theme toggle
const themeToggleBtn = document.getElementById("themeToggle");

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (themeToggleBtn) themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}

async function loadTheme() {
  const { theme } = await chrome.storage.local.get("theme");
  if (theme) applyTheme(theme);
}

themeToggleBtn?.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme;
  const isDark = current === "dark" || (!current && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const next = isDark ? "light" : "dark";
  applyTheme(next);
  chrome.storage.local.set({ theme: next });
});

// Init
updateBaseUrlLabel();
loadMode();
loadTheme();
loadState();
