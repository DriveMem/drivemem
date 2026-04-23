const http = require('http');
let server = null;

async function startProxy(driveMemApiKey, port, upstreamUrl) {
  const DRIVEMEM_API = 'https://api.drivemem.cloud';
  let contextCount = 0;
  let harvestCount = 0;
  
  server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
    
    if (req.method === 'POST' && req.url?.startsWith('/v1/chat/completions')) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const messages = data.messages || [];
          const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
          const query = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : '';
          
          let contextSnippet = '';
          if (query && query.length > 5) {
            try {
              const searchRes = await fetch(`${DRIVEMEM_API}/api/v1/search?q=${encodeURIComponent(query)}&limit=5`, {
                headers: { 'Authorization': `Bearer ${driveMemApiKey}` }
              });
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                const results = searchData.results || [];
                if (results.length > 0) {
                  contextSnippet = results.map((r, i) => `[${i+1}] ${r.fileName}: ${r.text?.slice(0, 300)}`).join('\n\n');
                  contextCount++;
                }
              }
            } catch {}
          }
          
          const injectedMessages = [...messages];
          if (contextSnippet) {
            const contextMsg = { role: 'system', content: `[DriveMem Context]\n\n${contextSnippet}\n\nUse when relevant.` };
            const lastSystemIdx = injectedMessages.reduce((acc, m, i) => m.role === 'system' ? i : acc, -1);
            injectedMessages.splice(lastSystemIdx + 1, 0, contextMsg);
          }
          
          const authHeader = req.headers['authorization'] || '';
          const targetUrl = `${upstreamUrl}/v1/chat/completions`;
          const llmRes = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
            body: JSON.stringify({ ...data, messages: injectedMessages }),
          });
          
          if (data.stream && llmRes.body) {
            res.writeHead(llmRes.status, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
            const reader = llmRes.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              res.write(chunk);
              chunk.split('\n').filter(l => l.startsWith('data: ') && !l.includes('[DONE]')).forEach(line => {
                try { fullResponse += JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || ''; } catch {}
              });
            }
            res.end();
            if (fullResponse.length > 100) {
              harvestCount++;
              fetch(`${DRIVEMEM_API}/api/v1/store`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${driveMemApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `Q: ${query.slice(0, 200)}\nA: ${fullResponse.slice(0, 2000)}`, tags: ['proxy'] })
              }).catch(() => {});
            }
          } else {
            const responseData = await llmRes.text();
            res.writeHead(llmRes.status, { 'Content-Type': 'application/json' });
            res.end(responseData);
          }
        } catch (err) {
          res.writeHead(502);
          res.end(JSON.stringify({ error: { message: 'Proxy error' } }));
        }
      });
    } else if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', contextInjections: contextCount, harvests: harvestCount }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  return new Promise(resolve => server.listen(port, resolve));
}

function stopProxy() {
  if (server) { server.close(); server = null; }
}

module.exports = { startProxy, stopProxy };
