# GB QR Chrome Extension

A lightweight Chrome extension for QA/testing that generates QR codes for:

- **Experiment mode**: builds URLs with `gbexp` + `gbvar` (0..N-1) and shows a QR for each variant
- **One-page URL mode**: paste any URL (e.g., preview/branch link) and generate a single QR

## Features

- DEV / STAGING environment switch
- Configurable number of variants (generates `gbvar=0..N-1`)
- Copy URL / Copy all URLs
- Download QR as PNG
- Remembers last values via `chrome.storage.local` (unless you reset/clear)

## URL Format

Experiment URLs are generated as:

<baseUrl>/?gbexp=<experimentId>&gbvar=<variantId>

## Setup

1. Clone/download this folder.
2. Make sure the QR library is present locally (Chrome extensions can’t load remote scripts):
   - `vendor/qrcode.js` (from davidshimjs/qrcodejs)
3. Open Chrome → `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked**
6. Select the project folder (must contain `manifest.json`)

## Usage

### Experiment mode
1. Enter `gbexp` (experiment id)
2. Choose **Environment** (DEV/STAGING)
3. Set **Variants** count (e.g., 3 → generates `gbvar` 0,1,2)
4. Click **Generate**

### One-page URL mode
1. Switch to **One-page URL**
2. Paste a full URL (including `https://`)
3. Click **QR**

## Troubleshooting

- **“QRCode is not defined”**
  - Ensure `vendor/qrcode.js` exists
  - Ensure `popup.html` loads it before `popup.js`:
    ```html
    <script src="vendor/qrcode.js"></script>
    <script src="popup.js"></script>
    ```
  - Reload the extension in `chrome://extensions`

## License

This project uses the `qrcodejs` library (MIT). Include the library’s LICENSE if required by your policy.
