const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '../..');
const port = Number(process.env.PLAYWRIGHT_TEST_PORT || 4173);
const mounts = new Set(['trip', 'other']);
let workerVersion = 'browser-v1';
let cacheableAssets = false;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function send(response, status, contentType, body) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024) {
        reject(new Error('Request body is too large'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);

  if (url.pathname === '/__test__/ready') {
    send(response, 200, 'text/plain; charset=utf-8', 'ready');
    return;
  }

  if (url.pathname === '/__test__/worker-version' && request.method === 'GET') {
    send(
      response,
      200,
      'application/json; charset=utf-8',
      JSON.stringify({ version: workerVersion }),
    );
    return;
  }

  if (url.pathname === '/__test__/worker-version' && request.method === 'POST') {
    try {
      const payload = await readJson(request);
      if (typeof payload.version !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(payload.version)) {
        send(response, 400, 'text/plain; charset=utf-8', 'Invalid worker version');
        return;
      }
      workerVersion = payload.version;
      cacheableAssets = payload.cacheableAssets === true;
      send(
        response,
        200,
        'application/json; charset=utf-8',
        JSON.stringify({ version: workerVersion }),
      );
    } catch {
      send(response, 400, 'text/plain; charset=utf-8', 'Invalid JSON');
    }
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    send(response, 405, 'text/plain; charset=utf-8', 'Method not allowed');
    return;
  }

  const pathParts = url.pathname.split('/').filter(Boolean);
  const mount = mounts.has(pathParts[0]) ? `/${pathParts.shift()}/` : '/';
  const relativePath = pathParts.join('/') || 'index.html';
  const filePath = path.resolve(repositoryRoot, relativePath);
  if (!filePath.startsWith(`${repositoryRoot}${path.sep}`)) {
    send(response, 404, 'text/plain; charset=utf-8', 'Not found');
    return;
  }

  let body;
  try {
    const baselineApp = process.env.BROWSER_TEST_BASELINE_APP;
    body =
      relativePath === 'assets/app.js' && baselineApp
        ? fs.readFileSync(baselineApp)
        : fs.readFileSync(filePath);
  } catch {
    send(response, 404, 'text/plain; charset=utf-8', 'Not found');
    return;
  }

  if (relativePath === 'sw.js') {
    const source = body.toString('utf8');
    const worker = source.replace(
      /const VERSION\s*=\s*(['"])[^'"]+\1;/,
      `const VERSION='${workerVersion}';`,
    );
    if (worker === source) {
      send(
        response,
        500,
        'text/plain; charset=utf-8',
        'Could not replace the service worker version',
      );
      return;
    }
    body = Buffer.from(worker);
  }

  if (relativePath === 'index.html') {
    const source = body.toString('utf8');
    const shell = source.replace(
      /<html\b([^>]*)>/i,
      `<html$1 data-test-shell-version="${workerVersion}">`,
    );
    if (shell === source) {
      send(response, 500, 'text/plain; charset=utf-8', 'Could not mark the test shell version');
      return;
    }
    body = Buffer.from(shell);
  }

  const contentType = mimeTypes[path.extname(filePath)] || 'application/octet-stream';
  response.writeHead(200, {
    'Cache-Control':
      cacheableAssets && relativePath !== 'sw.js' ? 'public, max-age=3600' : 'no-store',
    'Content-Type': contentType,
    'Service-Worker-Allowed': mount,
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch(() => {
    if (!response.headersSent) send(response, 500, 'text/plain; charset=utf-8', 'Server error');
    else response.destroy();
  });
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Browser test server listening on http://127.0.0.1:${port}\n`);
});

function stop() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
