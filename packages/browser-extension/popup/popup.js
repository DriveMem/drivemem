document.addEventListener('DOMContentLoaded', () => {
  const endpointInput = document.getElementById('endpoint');
  const apiKeyInput = document.getElementById('apiKey');
  const verifyBtn = document.getElementById('verify');
  const statusEl = document.getElementById('status');

  // Load saved config
  chrome.storage.local.get(['endpoint', 'apiKey'], (data) => {
    if (data.endpoint) endpointInput.value = data.endpoint;
    if (data.apiKey) apiKeyInput.value = data.apiKey;
  });

  verifyBtn.addEventListener('click', async () => {
    const endpoint = endpointInput.value.trim() || 'https://drivemem.cloud';
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      statusEl.textContent = '❌ Please enter an API key';
      return;
    }

    statusEl.textContent = '⏳ Checking...';
    verifyBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'VERIFY_CONNECTION',
        endpoint,
        apiKey
      });

      if (response.success) {
        chrome.storage.local.set({ endpoint, apiKey });
        statusEl.textContent = '✅ Connected';
      } else {
        statusEl.textContent = '❌ Failed: ' + (response.error || 'Unknown error');
      }
    } catch (err) {
      statusEl.textContent = '❌ Failed: ' + err.message;
    } finally {
      verifyBtn.disabled = false;
    }
  });
});
