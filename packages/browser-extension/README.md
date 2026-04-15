# DriveMem Browser Extension

Chrome Extension (Manifest V3) for saving ChatGPT conversations to DriveMem and injecting knowledge briefings.

## Setup

1. Open `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked** → select this directory
4. Click the DriveMem 🧠 icon in the toolbar → enter your API Endpoint and API Key → click **Verify Connection**
5. Go to [chatgpt.com](https://chatgpt.com) → see the floating 🧠 button in the bottom right

## Features

- **📥 Save Conversation** — Captures the current ChatGPT conversation and saves it to DriveMem
- **📤 Get Briefing** — Fetches a knowledge briefing for a task and injects it into the ChatGPT input box

## Architecture

- `manifest.json` — Extension manifest (MV3)
- `popup/` — Configuration popup (API endpoint + key)
- `background/service-worker.js` — Handles all network requests (MV3 requirement)
- `content/content.js` — Injects floating action button on ChatGPT pages (Shadow DOM isolated)
- `icons/` — Placeholder icons (#4F5BD5 purple squares)

## Constraints

- Pure vanilla JavaScript, no build step
- No external dependencies
- All network requests go through the service worker
- Shadow DOM for content script UI (style isolation from ChatGPT)
