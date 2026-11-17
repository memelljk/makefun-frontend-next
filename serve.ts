// serve.ts — a tiny static file server for local preview and for the
// screenshot runs. It serves the app/ directory on 127.0.0.1:8080 and
// nothing else: no API keys, no writes, no directory listing.
//
// Run: node serve.ts

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = fileURLToPath(new URL('./app/', import.meta.url)).replace(/\/+$/, '');
const PORT = 8080;
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendText(res, status, text) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const filePath = resolve(join(APP_DIR, `.${pathname}`));
    if (filePath !== APP_DIR && !filePath.startsWith(APP_DIR + sep)) {
      sendText(res, 403, 'forbidden');
      return;
    }
    const info = await stat(filePath).catch(() => null);
    if (!info || !info.isFile()) {
      sendText(res, 404, 'not found');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'content-length': info.size,
      'cache-control': 'no-store',
    });
    const stream = createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) sendText(res, 500, 'read error');
      else res.destroy();
    });
    stream.pipe(res);
  } catch {
    sendText(res, 500, 'server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`serving ${APP_DIR} at http://${HOST}:${PORT}/`);
});
