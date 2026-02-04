# GB QR Chrome Extension

Chrome extension for QA/testing that generates QR codes for:

Experiment mode: URLs with gbexp + gbvar (0..N-1) → QR per variant

One-page URL mode: paste any URL (branch preview etc.) → single QR

Right-click mode: generate a QR from any link / selected URL via context menu

## Features

DEV / STAGING environment switch

Custom variant count (generates gbvar=0..N-1)

Copy URL / Copy all URLs

Download QR as PNG

Saves last values to chrome.storage.local (until Reset)

Right-click any link / selected URL → Generate QR

## URL Format

<baseUrl>/?gbexp=<experimentId>&gbvar=<variantId>

## Installation

Download/clone this project.

Make sure the QR library is included locally:

vendor/qrcode.js (from davidshimjs/qrcodejs)

Open Chrome and go to chrome://extensions

Enable Developer mode

Click Load unpacked

Select the project folder (it must contain manifest.json)

## Usage
### Experiment mode

Select Experiment

Enter gbexp (experiment id)

Choose Environment (DEV / STAGING)

Set Variants (e.g., 3 → gbvar=0,1,2)

Click Generate

### One-page URL mode

Select One-page URL

Paste a full URL (including https://)

Click QR

### Right-click QR (context menu)

On any webpage, right-click a link
(or select a URL text and right-click)

Choose Generate QR

A new tab opens with the generated QR code

## Troubleshooting
### QRCode is not defined

Ensure vendor/qrcode.js exists

Ensure the script order is correct:

vendor/qrcode.js must load before popup.js

Reload the extension in chrome://extensions
