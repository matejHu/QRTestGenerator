# GB QR Chrome Extension

Chrome extension for QA/testing that generates QR codes for:

- **Experiment mode**: URLs with `gbexp` + `gbvar` (0..N-1) → QR per variant
- **One-page URL mode**: paste any URL (branch preview etc.) → single QR
- **Right-click mode**: generate a QR from any link / selected URL via context menu

---

## Features

- DEV / STAGING / CUSTOM environment switch
- Custom variant count (generates `gbvar=0..N-1`)
- Copy URL / Copy all URLs
- Download QR as PNG
- Saves last values to `chrome.storage.local` (until Reset)
- Right-click any link / selected URL → **Generate QR**

---

## URL Format

### Experiment mode

`<baseUrl>/?gbexp=<experimentId>&gbvar=<variantId>`

---

## Installation

1. Download/clone this project.
2. Make sure the QR library is included locally:
   - `vendor/qrcode.js` (from davidshimjs/qrcodejs)
3. Open Chrome and go to `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked**
6. Select the project folder (it must contain `manifest.json`)

---

## Usage

### Experiment mode

1. Select **Experiment**
2. Enter `gbexp` (experiment id)
3. Choose **Environment** (DEV / STAGING / CUSTOM)
4. Set **Variants** (e.g., 3 → `gbvar=0,1,2`)
5. Click **Generate**

### One-page URL mode

1. Select **One-page URL**
2. Paste a full URL (including `https://`)
3. Click **QR**

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

---

## License

This project uses the **qrcodejs** library (MIT). Include its LICENSE if required by your policy.
