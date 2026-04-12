const form = document.getElementById('form');
const apiUrlInput = document.getElementById('apiUrl');
const tokenInput = document.getElementById('token');
const statusEl = document.getElementById('status');

// Load saved settings
chrome.storage.sync.get({ apiUrl: 'https://api.drivemem.cloud', token: '' }, (data) => {
  apiUrlInput.value = data.apiUrl;
  tokenInput.value = data.token;
  updateStatus(data.token);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const apiUrl = apiUrlInput.value.trim() || 'https://api.drivemem.cloud';
  const token = tokenInput.value.trim();
  chrome.storage.sync.set({ apiUrl, token }, () => {
    updateStatus(token);
  });
});

function updateStatus(token) {
  if (token) {
    statusEl.textContent = '✅ 已配置';
    statusEl.className = 'ok';
  } else {
    statusEl.textContent = '⚠️ 请填写 Token';
    statusEl.className = 'warn';
  }
}
