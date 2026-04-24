let detectedTools = [];

async function goToStep2() {
  const key = document.getElementById('driveMemKey').value.trim();
  if (!key.startsWith('ak_')) { alert('Invalid DriveMem API Key'); return; }
  switchStep('step2');
}

async function goToStep3() {
  const llmKey = document.getElementById('llmKey').value.trim();
  if (!llmKey) { alert('Please enter your LLM API Key'); return; }
  switchStep('step3');
  // Detect tools
  detectedTools = await window.electronAPI.detectTools();
  renderTools(detectedTools);
}

async function goToStep4() {
  const driveMemKey = document.getElementById('driveMemKey').value.trim();
  const llmProvider = document.getElementById('llmProvider').value;
  const llmKey = document.getElementById('llmKey').value.trim();
  
  // Start proxy
  await window.electronAPI.startProxy({ driveMemApiKey: driveMemKey, llmProvider, llmApiKey: llmKey });
  
  // Configure detected tools
  await window.electronAPI.configureTools({ tools: detectedTools, port: 7879 });
  
  switchStep('step4');
  
  // Poll stats
  setInterval(async () => {
    try {
      const res = await fetch('http://localhost:7879/health');
      const data = await res.json();
      document.getElementById('statInjections').textContent = data.contextInjections || 0;
      document.getElementById('statHarvests').textContent = data.harvests || 0;
    } catch {}
  }, 5000);
}

function renderTools(tools) {
  const el = document.getElementById('toolList');
  if (tools.length === 0) {
    el.innerHTML = '<p style="color:#6b7280;font-size:14px;">No supported tools detected. DriveMem will run as a proxy — configure your tools manually.</p>';
    return;
  }
  el.innerHTML = tools.map(t => `
    <div class="tool ${t.detected ? 'detected' : ''}">
      <div>
        <div class="tool-name">${t.name}</div>
        <div class="tool-status">${t.detected ? '✅ Detected' : '❌ Not found'}</div>
      </div>
    </div>
  `).join('');
}

function switchStep(stepId) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}

// Update banner handling
if (window.electronAPI && window.electronAPI.onUpdateAvailable) {
  let currentUpdateData = null;

  window.electronAPI.onUpdateAvailable((data) => {
    currentUpdateData = data;
    const banner = document.getElementById('update-banner');
    const text = document.getElementById('update-text');
    const summary = data.summary ? ` — ${data.summary}` : '';
    text.textContent = `DriveMem v${data.version} available${summary}`;
    banner.classList.add('visible');
  });

  document.getElementById('update-download').addEventListener('click', () => {
    if (currentUpdateData && currentUpdateData.downloadUrl) {
      window.electronAPI.openDownloadUrl(currentUpdateData.downloadUrl);
    }
  });

  document.getElementById('update-dismiss').addEventListener('click', () => {
    const banner = document.getElementById('update-banner');
    banner.classList.remove('visible');
    if (currentUpdateData) {
      window.electronAPI.dismissUpdate(currentUpdateData.version);
    }
  });
}
