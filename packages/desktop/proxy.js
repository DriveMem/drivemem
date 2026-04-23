const http = require('http');

let server = null;

async function startProxy(driveMemApiKey, port, upstreamUrl) {
  const DRIVEMEM_API = 'https://api.drivemem.cloud';
  let contextCount = 0;
  let harvestCount = 0;

  // Lazy-import the shared proxy core (ESM)
  const {
    forwardChatCompletion,
    collectStreamedText,
  } = await import('@ai-drive/shared');

  /** @type {import('@ai-drive/shared').ProxyAdapter} */
  const adapter = {
    async searchContext(query) {
      const res = await fetch(
        `${DRIVEMEM_API}/api/v1/search?q=${encodeURIComponent(query)}&limit=5`,
        { headers: { Authorization: `Bearer ${driveMemApiKey}` } },
      );
      if (!res.ok) return [];
      const data = await res.json();
      contextCount++;
      return (data.results || []).map((r) => ({
        fileName: r.fileName,
        text: r.text || '',
      }));
    },
    async harvest(query, response) {
      harvestCount++;
      await fetch(`${DRIVEMEM_API}/api/v1/store`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${driveMemApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `Q: ${query.slice(0, 200)}\nA: ${response.slice(0, 2000)}`,
          tags: ['proxy'],
        }),
      });
    },
  };

  server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url?.startsWith('/v1/chat/completions')) {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const authHeader = req.headers['authorization'] || '';

          const result = await forwardChatCompletion({
            targetUrl: `${upstreamUrl}/v1/chat/completions`,
            authorization: authHeader,
            body: data,
            adapter,
          });

          if (result.isStream && result.streamResponse?.body) {
            res.writeHead(result.status, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
            });
            const reader = result.streamResponse.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              res.write(chunk);
              fullText = collectStreamedText(chunk, fullText);
            }
            res.end();
            result.afterStream?.(fullText);
          } else {
            res.writeHead(result.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result.jsonBody));
          }
        } catch (err) {
          res.writeHead(502);
          res.end(JSON.stringify({ error: { message: 'Proxy error' } }));
        }
      });
    } else if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          contextInjections: contextCount,
          harvests: harvestCount,
        }),
      );
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => server.listen(port, resolve));
}

function stopProxy() {
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = { startProxy, stopProxy };
