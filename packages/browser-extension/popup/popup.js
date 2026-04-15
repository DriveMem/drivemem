document.addEventListener('DOMContentLoaded', () => {
  const endpointInput = document.getElementById('endpoint');
  const apiKeyInput = document.getElementById('apiKey');
  const verifyBtn = document.getElementById('verify');
  const statusEl = document.getElementById('status');
  const statsEl = document.getElementById('stats');
  const lastSyncEl = document.getElementById('lastSync');
  const autoCaptureEl = document.getElementById('autoCapture');
  const autoInjectEl = document.getElementById('autoInject');

  // Load saved config
  chrome.storage.local.get(['endpoint', 'apiKey', 'lastSyncTime', 'autoCapture', 'autoInject'], (data) => {
    if (data.endpoint) endpointInput.value = data.endpoint;
    if (data.apiKey) apiKeyInput.value = data.apiKey;
    updateLastSync(data.lastSyncTime);
    autoCaptureEl.checked = data.autoCapture !== false;
    autoInjectEl.checked = data.autoInject !== false;

    // If already configured, auto-check connection and load stats
    if (data.endpoint && data.apiKey) {
      loadStats(data.endpoint, data.apiKey);
    }
  });

  // Update last sync display
  function updateLastSync(timestamp) {
    if (!timestamp) {
      lastSyncEl.textContent = '';
      return;
    }
    const mins = Math.round((Date.now() - timestamp) / 60000);
    if (mins < 1) lastSyncEl.textContent = 'Last synced: just now';
    else if (mins === 1) lastSyncEl.textContent = 'Last synced: 1 minute ago';
    else if (mins < 60) lastSyncEl.textContent = `Last synced: ${mins} minutes ago`;
    else lastSyncEl.textContent = `Last synced: ${Math.round(mins / 60)}h ago`;
  }

  // Load knowledge base stats
  function loadStats(endpoint, apiKey) {
    chrome.runtime.sendMessage({
      type: 'GET_STATS',
      endpoint,
      apiKey
    }, (response) => {
      if (response && response.success) {
        statsEl.textContent = `📚 ${response.fileCount} files in knowledge base`;
      } else {
        statsEl.textContent = '';
      }
    });
  }

  verifyBtn.addEventListener('click', async () => {
    const endpoint = endpointInput.value.trim() || 'https://drivemem.cloud';
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      statusEl.textContent = '❌ Please enter an API key';
      statusEl.className = 'status-error';
      return;
    }

    statusEl.textContent = '⏳ Checking...';
    statusEl.className = '';
    verifyBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'VERIFY_CONNECTION',
        endpoint,
        apiKey
      });

      if (response.success) {
        // Auto-save on successful verification
        chrome.storage.local.set({ endpoint, apiKey });
        statusEl.textContent = '✅ Connected & saved';
        statusEl.className = 'status-ok';
        loadStats(endpoint, apiKey);
      } else {
        statusEl.textContent = '❌ ' + (response.error || 'Connection failed');
        statusEl.className = 'status-error';
      }
    } catch (err) {
      statusEl.textContent = '❌ ' + err.message;
      statusEl.className = 'status-error';
    } finally {
      verifyBtn.disabled = false;
    }
  });

  // Auto-toggle handlers
  autoCaptureEl.addEventListener('change', () => {
    chrome.storage.local.set({ autoCapture: autoCaptureEl.checked });
  });
  autoInjectEl.addEventListener('change', () => {
    chrome.storage.local.set({ autoInject: autoInjectEl.checked });
  });

  // Refresh last sync every 30s while popup is open
  setInterval(() => {
    chrome.storage.local.get(['lastSyncTime'], (data) => {
      updateLastSync(data.lastSyncTime);
    });
  }, 30000);
});
