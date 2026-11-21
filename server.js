#!/usr/bin/env node
/*
 * Optional local server for the notepad (no dependencies, Node 18+).
 *
 * It serves the app AND lets it read/write files in one folder, so the editor
 * works with real files even in browsers that lack the File System Access API
 * (e.g. the Claude Code / Claude desktop built-in browser).
 *
 *   node server.js [folder]        default folder = current directory
 *   PORT=5173 node server.js
 *
 * Listens on 127.0.0.1 only. Files outside the folder are never touched.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = fs.realpathSync.native(path.resolve(process.argv[2] || process.env.NOTEPAD_ROOT || process.cwd()));
const PORT = Number(process.env.PORT) || 5173;
const APP = __dirname;
const MAX_BYTES = 20 * 1024 * 1024;

const STATIC = { '/': 'index.html', '/index.html': 'index.html', '/style.css': 'style.css', '/app.js': 'app.js' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const inside = (p) => p === ROOT || p.startsWith(ROOT + path.sep);

// Resolve a client path (relative to ROOT) and make sure it cannot escape ROOT,
// including through symlinks.
function resolveSafe(rel) {
  const clean = String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const full = path.resolve(ROOT, clean);
  if (!inside(full)) throw new HttpError(403, 'Path is outside the folder');
  let p = full;
  while (!fs.existsSync(p)) p = path.dirname(p);
  if (!inside(fs.realpathSync.native(p))) throw new HttpError(403, 'Path is outside the folder');
  return full;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BYTES) { reject(new HttpError(413, 'File too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}
const sendJson = (res, obj) => send(res, 200, JSON.stringify(obj), 'application/json');

const server = http.createServer(async (req, res) => {
  try {
    // Block DNS-rebinding: only accept requests addressed to localhost.
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host || '')) throw new HttpError(403, 'Bad host');
    const url = new URL(req.url, 'http://localhost');

    if (!url.pathname.startsWith('/api/')) {
      const f = STATIC[url.pathname];
      if (!f || req.method !== 'GET') throw new HttpError(404, 'Not found');
      return send(res, 200, fs.readFileSync(path.join(APP, f)), TYPES[path.extname(f)]);
    }

    // Custom header: a cross-origin page cannot send it without a CORS preflight, which we never allow.
    if (req.headers['x-notepad'] !== '1') throw new HttpError(403, 'Missing header');
    const rel = url.searchParams.get('path') || '';
    const route = req.method + ' ' + url.pathname;

    switch (route) {
      case 'GET /api/info':
        return sendJson(res, { local: true, root: path.basename(ROOT) || ROOT });

      case 'GET /api/tree': {
        const dir = resolveSafe(rel);
        if (!fs.statSync(dir).isDirectory()) throw new HttpError(400, 'Not a folder');
        const list = fs.readdirSync(dir, { withFileTypes: true }).map((d) => {
          let isDir = d.isDirectory();
          if (d.isSymbolicLink()) { try { isDir = fs.statSync(path.join(dir, d.name)).isDirectory(); } catch { /* broken link */ } }
          return { name: d.name, kind: isDir ? 'directory' : 'file' };
        });
        return sendJson(res, list);
      }

      case 'GET /api/file': {
        const file = resolveSafe(rel);
        const st = fs.statSync(file);
        if (!st.isFile()) throw new HttpError(400, 'Not a file');
        if (st.size > MAX_BYTES) throw new HttpError(413, 'File too large');
        const buf = fs.readFileSync(file);
        if (buf.subarray(0, 8000).includes(0)) throw new HttpError(415, 'Binary files cannot be opened');
        return send(res, 200, buf);
      }

      case 'PUT /api/file': {
        const file = resolveSafe(rel);
        if (!rel) throw new HttpError(400, 'Missing path');
        fs.writeFileSync(file, await readBody(req));
        return send(res, 200, 'ok');
      }

      case 'POST /api/new': { // create an empty file if it does not exist yet
        const file = resolveSafe(rel);
        if (!rel) throw new HttpError(400, 'Missing path');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        try { fs.writeFileSync(file, '', { flag: 'wx' }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
        return send(res, 200, 'ok');
      }

      case 'POST /api/mkdir': {
        const dir = resolveSafe(rel);
        if (!rel) throw new HttpError(400, 'Missing path');
        fs.mkdirSync(dir, { recursive: true });
        return send(res, 200, 'ok');
      }

      default:
        throw new HttpError(404, 'Not found');
    }
  } catch (e) {
    const status = e.status || (e.code === 'ENOENT' ? 404 : 500);
    send(res, status, e.message || 'Error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Notepad running at http://localhost:' + PORT);
  console.log('Editing files in: ' + ROOT);
});
