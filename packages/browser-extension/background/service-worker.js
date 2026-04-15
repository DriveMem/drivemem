// --- Centralized API call with error handling ---

async function apiCall(endpoint, apiKey, path, options = {}) {
  try {
    const url = `${endpoint}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error — check your connection and API endpoint');
    }
    throw error;
  }
}

// --- Message handlers ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VERIFY_CONNECTION') {
    handleVerify(message).then(sendResponse);
    return true;
  }
  if (message.type === 'CAPTURE_CONVERSATION') {
    handleCapture(message).then(sendResponse);
    return true;
  }
  if (message.type === 'GET_BRIEFING') {
    handleBriefing(message).then(sendResponse);
    return true;
  }
  if (message.type === 'GET_STATS') {
    handleStats(message).then(sendResponse);
    return true;
  }
});

async function handleVerify({ endpoint, apiKey }) {
  try {
    await apiCall(endpoint, apiKey, '/api/v1/search?q=test');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleCapture({ endpoint, apiKey, content, title }) {
  try {
    const data = await apiCall(endpoint, apiKey, '/api/v1/store', {
      method: 'POST',
      body: JSON.stringify({ content, title, tags: 'chatgpt,auto-capture' }),
    });
    // Track last sync time
    await chrome.storage.local.set({ lastSyncTime: Date.now() });
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleBriefing({ endpoint, apiKey, task }) {
  try {
    const data = await apiCall(endpoint, apiKey, '/api/v1/context/compile', {
      method: 'POST',
      body: JSON.stringify({ task, tokenBudget: 4000 }),
    });
    return { success: true, compiledContext: data.compiledContext || data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleStats({ endpoint, apiKey }) {
  try {
    const data = await apiCall(endpoint, apiKey, '/api/v1/files');
    const fileCount = Array.isArray(data) ? data.length : (data.files?.length ?? 0);
    return { success: true, fileCount };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// --- Periodic health check ---

chrome.alarms.create('healthCheck', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'healthCheck') {
    const config = await chrome.storage.local.get(['endpoint', 'apiKey']);
    if (config.endpoint && config.apiKey) {
      try {
        await apiCall(config.endpoint, config.apiKey, '/api/v1/search?q=test');
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setBadgeBackgroundColor({ color: '#4F5BD5' });
      } catch {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      }
    }
  }
});
