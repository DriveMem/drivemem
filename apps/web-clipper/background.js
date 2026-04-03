// AI Drive Web Clipper — Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-selection',
    title: '保存选中文本到 AI Drive',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'clip-page',
    title: '保存整页到 AI Drive',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'clip-selection') {
    await clipSelection(info, tab);
  } else if (info.menuItemId === 'clip-page') {
    await clipPage(tab);
  }
});

async function clipSelection(info, tab) {
  await sendClip({
    title: tab.title || '',
    url: tab.url || '',
    content: info.selectionText || '',
    selectedText: info.selectionText || '',
  });
}

async function clipPage(tab) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
    // content.js returns { title, content }
    const data = result?.result || {};
    await sendClip({
      title: data.title || tab.title || '',
      url: tab.url || '',
      content: data.content || '',
    });
  } catch (err) {
    notify('保存失败', '无法获取页面内容: ' + err.message);
  }
}

async function sendClip(body) {
  const { apiUrl, token } = await chrome.storage.sync.get({
    apiUrl: 'https://api.verrrnm.cloud',
    token: '',
  });

  if (!token) {
    notify('未配置', '请先在扩展设置中填写 Token');
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/api/clips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      notify('已保存', '内容已发送到 AI Drive');
    } else if (res.status === 404) {
      notify('接口未就绪', 'API /api/clips 尚未部署，请稍后再试');
    } else {
      notify('保存失败', `服务器返回 ${res.status}`);
    }
  } catch (err) {
    notify('网络错误', err.message);
  }
}

function notify(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon128.png',
    title,
    message,
  });
}
