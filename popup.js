const BASE_URL = "https://onboarding-staging-fitify.vercel.app/"; // staging

const VARIANTS = [
  { id: 0, label: "Control (0)" },
  { id: 1, label: "A (1)" },
  { id: 2, label: "B (2)" },
];

const els = {
  gbexp: document.getElementById("gbexp"),
  gen: document.getElementById("gen"),
  grid: document.getElementById("grid"),
  error: document.getElementById("error"),
  copyAll: document.getElementById("copyAll"),
  reset: document.getElementById("reset"),
  baseUrlText: document.getElementById("baseUrlText"),
};

els.baseUrlText.textContent = BASE_URL;

function buildUrl(gbexp, gbvar) {
  const u = new URL(BASE_URL);
  u.searchParams.set("gbexp", String(gbexp));
  u.searchParams.set("gbvar", String(gbvar));
  return u.toString();
}

function isValidExp(value) {
  return /^[0-9]+$/.test(value);
}

function showError(msg) {
  els.error.hidden = !msg;
  els.error.textContent = msg || "";
}

function clearGrid() {
  els.grid.innerHTML = "";
  els.copyAll.disabled = true;
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

// qrcodejs renderuje buď canvas nebo img (podle prostředí).
function getQrDataUrl(qrBoxEl) {
  const canvas = qrBoxEl.querySelector("canvas");
  if (canvas) return canvas.toDataURL("image/png");

  const img = qrBoxEl.querySelector("img");
  if (img && img.src) return img.src; // často data:image/png;base64,...
  return null;
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function renderCards(exp) {
  clearGrid();
  showError("");

  const urls = [];

  for (const v of VARIANTS) {
    const url = buildUrl(exp, v.id);
    urls.push(url);

    const card = document.createElement("div");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "cardHeader";

    const title = document.createElement("div");
    title.innerHTML = `<strong>gbvar: ${v.id}</strong> <span class="badge">${v.label}</span>`;
    header.appendChild(title);

    const qrWrap = document.createElement("div");
    qrWrap.className = "qr";

    // qrcodejs potřebuje kontejner element, do kterého si QR vloží samo (canvas/img).
    const qrBox = document.createElement("div");
    qrBox.className = "qrBox";
    qrWrap.appendChild(qrBox);

    // QR render (qrcodejs)
    try {
      // Vyčisti případný předchozí obsah
      qrBox.innerHTML = "";

      // eslint-disable-next-line no-undef
      new QRCode(qrBox, {
        text: url,
        width: 220,
        height: 220,
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
        showError("Nepodařilo se získat QR obrazek pro stažení.");
        return;
      }
      downloadDataUrl(dataUrl, `gbexp-${exp}_gbvar-${v.id}.png`);
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

async function loadLast() {
  const data = await chrome.storage.local.get(["gbexp"]);
  if (data.gbexp) els.gbexp.value = data.gbexp;
  if (data.gbexp && isValidExp(String(data.gbexp))) renderCards(String(data.gbexp));
}

async function saveLast(exp) {
  await chrome.storage.local.set({ gbexp: exp });
}

els.gen.addEventListener("click", async () => {
  const exp = els.gbexp.value.trim();
  if (!isValidExp(exp)) {
    showError("Zadej prosím jen číslo experimentu (gbexp).");
    clearGrid();
    return;
  }
  await saveLast(exp);
  renderCards(exp);
});

els.gbexp.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.gen.click();
});

els.reset.addEventListener("click", async () => {
  await chrome.storage.local.remove(["gbexp"]);
  els.gbexp.value = "";
  clearGrid();
  showError("");
});

loadLast();
