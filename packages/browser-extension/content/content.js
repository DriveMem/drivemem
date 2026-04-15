(() => {
  // Shadow DOM container
  const container = document.createElement('div');
  container.id = 'drivemem-fab-container';
  document.body.appendChild(container);
  const shadow = container.attachShadow({ mode: 'closed' });

  // State
  let isOpen = false;
  let isLoading = false;
  let captureCount = 0;
  let connectionStatus = 'unknown'; // 'connected' | 'disconnected' | 'unknown'
  let lastCaptureMessageCount = 0;

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    .drivemem-fab {
      position: fixed;
      bottom: 80px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .drivemem-fab-main {
      position: relative;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #4F5BD5;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    .drivemem-fab-main:hover { transform: scale(1.1); }
    .drivemem-fab-main.loading {
      opacity: 0.7;
      pointer-events: none;
      animation: drivemem-pulse 1.2s ease-in-out infinite;
    }
    @keyframes drivemem-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .drivemem-fab-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #22c55e;
      color: white;
      font-size: 10px;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }
    .drivemem-fab-auto {
      position: absolute;
      top: -6px;
      left: -8px;
      background: #4F5BD5;
      color: white;
      font-size: 8px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .drivemem-fab-main.flash-green {
      animation: drivemem-flash-green 0.8s ease;
    }
    @keyframes drivemem-flash-green {
      0% { background: #4F5BD5; }
      30% { background: #22c55e; }
      100% { background: #4F5BD5; }
    }
    .drivemem-fab-status {
      position: absolute;
      bottom: -2px;
      left: -2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      background: #9ca3af;
    }
    .drivemem-fab-status.connected { background: #22c55e; }
    .drivemem-fab-status.disconnected { background: #ef4444; }
    .drivemem-fab-actions {
      display: none;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    .drivemem-fab-actions.open { display: flex; }
    .drivemem-fab-action {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: white;
      border: 1px solid #e5e5e5;
      border-radius: 24px;
      cursor: pointer;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      white-space: nowrap;
      transition: background 0.15s, opacity 0.15s;
    }
    .drivemem-fab-action:hover { background: #f5f5ff; }
    .drivemem-fab-action:disabled {
      opacity: 0.5;
      pointer-events: none;
    }
    .drivemem-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a1a1a;
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      transform: translateX(120%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
      opacity: 0;
      z-index: 100000;
      max-width: 320px;
    }
    .drivemem-toast.visible {
      transform: translateX(0);
      opacity: 1;
    }
  `;
  shadow.appendChild(style);

  // FAB HTML
  const fab = document.createElement('div');
  fab.className = 'drivemem-fab';
  fab.innerHTML = `
    <div class="drivemem-fab-actions">
      <button class="drivemem-fab-action" data-action="save">📥 Save Conversation</button>
      <button class="drivemem-fab-action" data-action="brief">📤 Get Briefing</button>
    </div>
    <button class="drivemem-fab-main">
      🧠
      <span class="drivemem-fab-status"></span>
    </button>
  `;
  shadow.appendChild(fab);

  const mainBtn = fab.querySelector('.drivemem-fab-main');
  const actions = fab.querySelector('.drivemem-fab-actions');
  const actionButtons = fab.querySelectorAll('.drivemem-fab-action');
  const statusDot = fab.querySelector('.drivemem-fab-status');

  // Check connection status on load
  checkConnectionStatus();

  mainBtn.addEventListener('click', () => {
    if (isLoading) return;
    chrome.storage.local.get(['endpoint', 'apiKey'], (data) => {
      if (!data.endpoint || !data.apiKey) {
        showToast('⚙️ Please configure DriveMem in the extension popup first');
        return;
      }
      isOpen = !isOpen;
      actions.classList.toggle('open', isOpen);
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target) && isOpen) {
      isOpen = false;
      actions.classList.remove('open');
    }
  });

  // Action handlers
  fab.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn || actionBtn.disabled) return;

    const action = actionBtn.dataset.action;
    isOpen = false;
    actions.classList.remove('open');

    if (action === 'save') captureConversation();
    if (action === 'brief') getBriefing();
  });

  // --- Conversation Extraction (multi-strategy) ---

  function extractConversation() {
    const messages = [];

    // Strategy 1: data-message-author-role attribute (most reliable)
    const roleElements = document.querySelectorAll('[data-message-author-role]');
    if (roleElements.length > 0) {
      roleElements.forEach(el => {
        const role = el.getAttribute('data-message-author-role');
        const textEl = el.querySelector('.markdown, .whitespace-pre-wrap') || el;
        const text = textEl.innerText?.trim();
        if (text) messages.push({ role, text });
      });
    }

    // Strategy 2: fallback — article elements
    if (messages.length === 0) {
      const articles = document.querySelectorAll('main article, [data-testid*="conversation"] article');
      articles.forEach((article, i) => {
        const role = i % 2 === 0 ? 'user' : 'assistant';
        const text = article.innerText?.trim();
        if (text) messages.push({ role, text });
      });
    }

    // Strategy 3: ultimate fallback — turn containers
    if (messages.length === 0) {
      const turns = document.querySelectorAll('[class*="agent-turn"], [class*="user-turn"]');
      turns.forEach(turn => {
        const role = turn.className.includes('user') ? 'user' : 'assistant';
        const text = turn.innerText?.trim();
        if (text) messages.push({ role, text });
      });
    }

    if (messages.length === 0) return null;

    // Format as markdown
    const title = document.title
      .replace(' | ChatGPT', '')
      .replace(' - ChatGPT', '')
      .trim() || 'ChatGPT Conversation';

    let markdown = `# ${title}\n\n`;
    messages.forEach(m => {
      markdown += `## ${m.role === 'user' ? '👤 User' : '🤖 Assistant'}\n\n${m.text}\n\n---\n\n`;
    });

    return { title, markdown, messageCount: messages.length };
  }

  // --- Input Injection (multi-strategy) ---

  function injectToInput(text) {
    // Strategy 1: contenteditable div (ChatGPT's current approach)
    const contentEditable = document.querySelector('#prompt-textarea, [contenteditable="true"]');
    if (contentEditable) {
      contentEditable.focus();
      contentEditable.textContent = text;
      contentEditable.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    // Strategy 2: textarea fallback
    const textarea = document.querySelector('textarea[data-id="root"], textarea');
    if (textarea) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      nativeInputValueSetter.call(textarea, text);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    return false;
  }

  // --- Auto-capture (v2) ---

  let lastActivityTime = Date.now();
  let autoCapturePending = false;
  const IDLE_THRESHOLD = 10000;

  function autoCapture() {
    const conversation = extractConversation();
    if (!conversation) return;
    if (conversation.messageCount <= lastCaptureMessageCount) return;
    if (conversation.messageCount < 2) return;

    lastCaptureMessageCount = conversation.messageCount;

    chrome.storage.local.get(['endpoint', 'apiKey', 'autoCapture'], (config) => {
      if (!config.endpoint || !config.apiKey) return;
      if (config.autoCapture === false) return;

      chrome.runtime.sendMessage({
        type: 'CAPTURE_CONVERSATION',
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        content: conversation.markdown,
        title: conversation.title,
      }, (response) => {
        if (response?.success) {
          captureCount++;
          updateBadge();
          showToast('✓ Auto-saved to DriveMem');
          mainBtn.classList.add('flash-green');
          setTimeout(() => mainBtn.classList.remove('flash-green'), 800);
        }
      });
    });
  }

  function setupAutoDetection() {
    const mainArea = document.querySelector('main') || document.body;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          lastActivityTime = Date.now();
          autoCapturePending = true;
        }
      }
    });
    observer.observe(mainArea, { childList: true, subtree: true });

    setInterval(() => {
      if (autoCapturePending && (Date.now() - lastActivityTime) > IDLE_THRESHOLD) {
        autoCapturePending = false;
        autoCapture();
      }
    }, 5000);
  }

  setupAutoDetection();

  // --- Auto-inject (v2) ---

  function setupAutoInject() {
    document.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target;
        const isInputArea = target?.closest('#prompt-textarea') ||
                            target?.closest('[contenteditable="true"]') ||
                            target?.tagName === 'TEXTAREA';

        if (!isInputArea) return;

        const config = await new Promise(resolve =>
          chrome.storage.local.get(['endpoint', 'apiKey', 'autoInject'], resolve)
        );

        if (!config.endpoint || !config.apiKey || config.autoInject === false) return;

        const currentText = target.textContent || target.value || '';
        if (!currentText.trim()) return;
        if (currentText.includes('[DriveMem Context]')) return;

        const messageCount = document.querySelectorAll('[data-message-author-role]').length;
        if (messageCount > 0) return;

        e.preventDefault();
        e.stopPropagation();

        try {
          const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'GET_BRIEFING',
              endpoint: config.endpoint,
              apiKey: config.apiKey,
              task: currentText,
            }, (res) => res?.error ? reject(new Error(res.error)) : resolve(res));
          });

          if (response?.briefing || response?.compiledContext) {
            const briefingText = response.briefing || response.compiledContext;
            const contextBlock = `[DriveMem Context]\n${briefingText}\n[/DriveMem Context]\n\n`;

            if (target.contentEditable === 'true') {
              target.textContent = contextBlock + currentText;
            } else {
              const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
              if (setter) setter.call(target, contextBlock + currentText);
            }
            target.dispatchEvent(new Event('input', { bubbles: true }));

            showToast('✓ Context injected from DriveMem');

            setTimeout(() => {
              target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            }, 100);
          }
        } catch (err) {
          console.warn('[DriveMem] Auto-inject failed:', err);
        }
      }
    }, true);
  }

  setupAutoInject();

  // --- Auto-mode badge ---

  function updateAutoBadge() {
    chrome.storage.local.get(['autoCapture', 'autoInject'], (config) => {
      let autoBadge = mainBtn.querySelector('.drivemem-fab-auto');
      const autoEnabled = config.autoCapture !== false && config.autoInject !== false;
      if (autoEnabled) {
        if (!autoBadge) {
          autoBadge = document.createElement('span');
          autoBadge.className = 'drivemem-fab-auto';
          autoBadge.textContent = 'AUTO';
          mainBtn.appendChild(autoBadge);
        }
      } else if (autoBadge) {
        autoBadge.remove();
      }
    });
  }

  updateAutoBadge();
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.autoCapture || changes.autoInject) updateAutoBadge();
  });

  // --- Loading state management ---

  function setLoading(loading) {
    isLoading = loading;
    mainBtn.classList.toggle('loading', loading);
    actionButtons.forEach(btn => btn.disabled = loading);
  }

  function updateBadge() {
    let badge = mainBtn.querySelector('.drivemem-fab-badge');
    if (captureCount > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'drivemem-fab-badge';
        mainBtn.appendChild(badge);
      }
      badge.textContent = captureCount;
    } else if (badge) {
      badge.remove();
    }
  }

  function checkConnectionStatus() {
    chrome.storage.local.get(['endpoint', 'apiKey'], (data) => {
      if (!data.endpoint || !data.apiKey) {
        connectionStatus = 'unknown';
      } else {
        chrome.runtime.sendMessage({ type: 'VERIFY_CONNECTION', endpoint: data.endpoint, apiKey: data.apiKey }, (resp) => {
          connectionStatus = (resp && resp.success) ? 'connected' : 'disconnected';
          statusDot.className = 'drivemem-fab-status ' + connectionStatus;
        });
      }
      statusDot.className = 'drivemem-fab-status ' + connectionStatus;
    });
  }

  // --- Actions ---

  function captureConversation() {
    chrome.storage.local.get(['endpoint', 'apiKey'], (data) => {
      const result = extractConversation();
      if (!result) {
        showToast('❌ No conversation found on this page');
        return;
      }

      setLoading(true);
      showToast(`⏳ Saving ${result.messageCount} messages...`);

      chrome.runtime.sendMessage({
        type: 'CAPTURE_CONVERSATION',
        endpoint: data.endpoint,
        apiKey: data.apiKey,
        content: result.markdown,
        title: result.title
      }, (response) => {
        setLoading(false);
        if (response && response.success) {
          captureCount++;
          updateBadge();
          showToast(`✅ Saved ${result.messageCount} messages!`);
        } else {
          showToast('❌ ' + (response?.error || 'Save failed'));
        }
      });
    });
  }

  function getBriefing() {
    const task = window.prompt('What task do you need a briefing for?');
    if (!task) return;

    chrome.storage.local.get(['endpoint', 'apiKey'], (data) => {
      setLoading(true);
      showToast('⏳ Getting briefing...');

      chrome.runtime.sendMessage({
        type: 'GET_BRIEFING',
        endpoint: data.endpoint,
        apiKey: data.apiKey,
        task
      }, (response) => {
        setLoading(false);
        if (response && response.success) {
          const injected = injectToInput(response.compiledContext);
          showToast(injected ? '✅ Briefing injected!' : '⚠️ Briefing ready but could not inject — check input field');
        } else {
          showToast('❌ ' + (response?.error || 'Briefing failed'));
        }
      });
    });
  }

  // --- Toast ---

  function showToast(message) {
    let toast = shadow.querySelector('.drivemem-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'drivemem-toast';
      shadow.appendChild(toast);
    }
    toast.textContent = message;
    // Force reflow for re-animation
    toast.classList.remove('visible');
    void toast.offsetWidth;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), 3500);
  }
})();
