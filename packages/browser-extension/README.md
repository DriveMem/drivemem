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
- **🔄 Connection Health Check** — Periodic background checks with badge indicator
- **📊 Knowledge Base Stats** — Shows file count in popup after connecting
- **🕐 Last Synced** — Tracks when the last save happened

## Architecture

```
packages/browser-extension/
├── manifest.json              # Extension manifest (MV3)
├── popup/
│   ├── popup.html             # Config popup UI
│   ├── popup.css              # Popup styles
│   └── popup.js               # Config logic, stats, last-sync
├── background/
│   └── service-worker.js      # All network requests + health check alarm
├── content/
│   └── content.js             # FAB + capture + injection (Shadow DOM)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

**Data flow:**
1. Content script (FAB) captures DOM → sends message to service worker
2. Service worker calls DriveMem API → returns result to content script
3. Content script shows toast / updates badge

**Key design decisions:**
- Shadow DOM isolates content script UI from ChatGPT styles
- All network requests go through the service worker (MV3 requirement)
- Multi-strategy DOM extraction handles ChatGPT UI changes gracefully
- MutationObserver provides auto-capture foundation for v2

## Development

```bash
# Load extension in Chrome
# 1. chrome://extensions → Developer Mode → Load unpacked → select this directory
# 2. After code changes, click the refresh icon on the extension card

# No build step needed — all vanilla JS
# No dependencies to install
```

**Testing changes:**
- Content script changes: reload the ChatGPT tab
- Service worker changes: click refresh on `chrome://extensions`
- Popup changes: close and reopen the popup

## Conversation Capture Strategies

The extension uses three fallback strategies to extract ChatGPT conversations:

1. **`[data-message-author-role]`** — Most reliable, uses ChatGPT's own role attributes
2. **`main article`** — Fallback using article elements, alternating user/assistant
3. **`[class*="agent-turn"]`** — Ultimate fallback using class-name patterns

## Known Limitations

- Only works on `chatgpt.com` and `chat.openai.com` (v1 scope)
- ChatGPT DOM structure may change without notice — multi-strategy mitigates this
- Auto-capture is detection-only in v1 (logs to console, no automatic saving)
- No conversation diff detection (saves full conversation each time)
- Briefing injection may not trigger ChatGPT's send button styling update

## v2 Roadmap

- Auto-capture: automatically save when conversation goes idle
- Multi-platform: Claude, Gemini, Perplexity support
- Conversation diff: only save new messages since last capture
- Side panel UI for browsing knowledge base
- Keyboard shortcuts

## Constraints

- Pure vanilla JavaScript, no build step
- No external dependencies
- All network requests go through the service worker
- Shadow DOM for content script UI (style isolation from ChatGPT)
