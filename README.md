# GB QR Chrome Extension

Chrome extension for QA/testing that generates QR codes for:

- **Single Experiment mode**: URLs with `gbexp` + `gbvar` (0..N-1) → QR per variant
- **Multiple experiments mode**: combine multiple experiments into a single QR
- **One-page URL mode**: paste any URL (branch preview etc.) → single QR
- **Right-click mode**: generate a QR from any link / selected URL via context menu

---

## Features

- DEV / STAGING / CUSTOM environment switch (custom lets you enter any base URL)
- **Localization**: optional locale path prefix added to the URL (e.g. `/en/`, `/cs/`)
- **Flags**: optional path segment injected before query params — `/f01/`, `/m01/`, `/welcome/` (mutually exclusive — only one can be active at a time)
- Custom variant count (generates `gbvar=0..N-1`)
- Download QR as PNG
- **Go to page** opens the URL in a new **private (incognito)** window
- Saves last values to `chrome.storage.local` (until Reset)
- Right-click any link / selected URL → **Generate QR**

---

## Configuration

Base URLs are defined in `config.js` (excluded from version control — copy from `config.example.js`):

```js
const URLS = {
  dev: "https://your-dev-url.vercel.app/",
  staging: "https://your-staging-url.vercel.app/",
  custom: ""
};
```

---

## URL Format

### Single experiment mode

```
<baseUrl>/<locale?>/<flag?>/?gbexp=<experimentId>:<variantId>
```

Examples:
- `https://example.com/?gbexp=42:0`
- `https://example.com/en/f01/?gbexp=42:1`

### Multiple experiments mode

```
<baseUrl>/<locale?>/<flag?>/?gbexp=<exp1>:<var1>,<exp2>:<var2>,...
```

Example:
- `https://example.com/?gbexp=42:0,99:1`

---

## Installation

1. Download/clone this project.
2. Copy `config.example.js` to `config.js` and fill in your base URLs.
3. Make sure the QR library is included locally:
   - `vendor/qrcode.js` (from davidshimjs/qrcodejs)
4. Open Chrome and go to `chrome://extensions`
5. Enable **Developer mode**
6. Click **Load unpacked**
7. Select the project folder (it must contain `manifest.json`)

---

## Usage

### Single experiment mode

1. Click **Experiment**
2. Choose **Environment** (DEV / STAGING / CUSTOM)
   - For **Custom**: a base URL input appears — paste any URL (e.g. a branch preview)
3. Optionally select a **Localization** locale
4. Optionally check one **Flag** (`/f01/`, `/m01/`, `/welcome/`) — flags are mutually exclusive
5. Enter `gbexp` (experiment id) and number of variants
6. Click **Generate** — one QR card per variant is shown
7. Each card has **Copy URL**, **Download QR**, and **Go to page** (opens incognito)

### Multiple experiments mode

1. Click **Multiple**
2. Configure environment, locale, and flag as above
3. Fill in experiment id and variant for each row
4. Click **+ Add Experiment** to add more (up to 5)
5. Click **Generate QR** — a single QR covering all experiments is shown

### One-page URL mode

1. Click **One-page URL**
2. Paste a full URL (including `https://`)
3. Click **QR**
4. Use **Go to page** to open the URL in an incognito window

### Right-click QR (context menu)

1. On any webpage, right-click a link
   *(or select a URL text and right-click)*
2. Choose **Generate QR**
3. A new tab opens with the generated QR code

---

## Troubleshooting

### `QRCode is not defined`

- Ensure `vendor/qrcode.js` exists
- Ensure the script order in `popup.html` is correct:
  - `vendor/qrcode.js` must load **before** `popup.js`
- Reload the extension in `chrome://extensions`

### Incognito windows not opening

- Chrome may require you to enable **Allow in incognito** for the extension in `chrome://extensions`

---

## License

This project uses the **qrcodejs** library (MIT). Include its LICENSE if required by your policy.