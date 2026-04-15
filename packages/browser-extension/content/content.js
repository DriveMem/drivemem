(() => {
  // Shadow DOM container
  const container = document.createElement('div');
  container.id = 'drivemem-fab-container';
  document.body.appendChild(container);
  const shadow = container.attachShadow({ mode: 'closed' });

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
    }
    .drivemem-fab-main {
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
    .drivemem-fab-main:hover {
      transform: scale(1.1);
    }
    .drivemem-fab-actions {
      display: none;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    .drivemem-fab-actions.open {
      display: flex;
    }
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
      transition: background 0.15s;
    }
    .drivemem-fab-action:hover {
      background: #f5f5ff;
    }
    .drivemem-toast {
      position: fixed;
      bottom: 140px;
      right: 24px;
      background: #1a1a1a;
      color: white;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 100000;
    }
    .drivemem-toast.visible {
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
    <button class="drivemem-fab-main">🧠</button>
  `;
  shadow.appendChild(fab);

  const mainBtn = fab.querySelector('.drivemem-fab-main');
  const actions = fab.querySelector('.drivemem-fab-actions');
  let isOpen = false;

  mainBtn.addEventListener('click', () => {
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
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    isOpen = false;
    actions.classList.remove('open');

    if (action === 'save') captureConversation();
    if (action === 'brief') getBriefing();
  });

  function captureConversation() {
    chrome.storage.local.get(['endpoint', 'apiKey'], (data) => {
      const messages = extractMessages();
      if (!messages) {
        showToast('❌ No conversation found on this page');
        return;
      }

      const title = document.title.replace(' | ChatGPT', '').trim() || 'ChatGPT Conversation';
      showToast('⏳ Saving conversation...');

      chrome.runtime.sendMessage({
        type: 'CAPTURE_CONVERSATION',
        endpoint: data.endpoint,
        apiKey: data.apiKey,
        content: messages,
        title
      }, (response) => {
        if (response && response.success) {
          showToast('✅ Conversation saved!');
        } else {
          showToast('❌ Save failed: ' + (response?.error || 'Unknown error'));
        }
      });
    });
  }

  function getBriefing() {
    const task = window.prompt('What task do you need a briefing for?');
    if (!task) return;

    chrome.storage.local.get(['endpoint', 'apiKey'], (data) => {
      showToast('⏳ Getting briefing...');

      chrome.runtime.sendMessage({
        type: 'GET_BRIEFING',
        endpoint: data.endpoint,
        apiKey: data.apiKey,
        task
      }, (response) => {
        if (response && response.success) {
          injectBriefing(response.compiledContext);
          showToast('✅ Briefing injected into input!');
        } else {
          showToast('❌ Briefing failed: ' + (response?.error || 'Unknown error'));
        }
      });
    });
  }

  function extractMessages() {
    // Try data-message-author-role attributes first
    let els = document.querySelectorAll('[data-message-author-role]');
    if (els.length > 0) {
      let md = '';
      els.forEach((el) => {
        const role = el.getAttribute('data-message-author-role');
        const label = role === 'user' ? 'User' : 'Assistant';
        const text = el.innerText.trim();
        if (text) md += `## ${label}\n${text}\n\n`;
      });
      return md || null;
    }

    // Fallback: article elements in main conversation
    els = document.querySelectorAll('main article');
    if (els.length > 0) {
      let md = '';
      els.forEach((el, i) => {
        const label = i % 2 === 0 ? 'User' : 'Assistant';
        const text = el.innerText.trim();
        if (text) md += `## ${label}\n${text}\n\n`;
      });
      return md || null;
    }

    return null;
  }

  function injectBriefing(text) {
    // Try #prompt-textarea first
    let input = document.querySelector('#prompt-textarea');
    if (input) {
      if (input.tagName === 'TEXTAREA') {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // contenteditable div
        input.innerText = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }
    // Fallback
    input = document.querySelector('textarea');
    if (input) {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function showToast(message) {
    let toast = shadow.querySelector('.drivemem-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'drivemem-toast';
      shadow.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), 3000);
  }
})();
