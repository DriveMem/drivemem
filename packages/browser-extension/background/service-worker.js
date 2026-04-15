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
});

async function handleVerify({ endpoint, apiKey }) {
  try {
    const res = await fetch(`${endpoint}/api/v1/search?q=test`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (res.ok) return { success: true };
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleCapture({ endpoint, apiKey, content, title }) {
  try {
    const res = await fetch(`${endpoint}/api/v1/store`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content, title, tags: 'chatgpt,auto-capture' })
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleBriefing({ endpoint, apiKey, task }) {
  try {
    const res = await fetch(`${endpoint}/api/v1/context/compile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task, tokenBudget: 4000 })
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, compiledContext: data.compiledContext || data };
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
