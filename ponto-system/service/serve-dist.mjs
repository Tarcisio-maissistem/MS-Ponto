import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

function parseArgs(argv) {
  const out = { host: '127.0.0.1', port: 4173 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--host') out.host = argv[++i] ?? out.host;
    if (arg === '--port') out.port = Number(argv[++i] ?? out.port);
  }
  return out;
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.ico': return 'image/x-icon';
    case '.txt': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

const { host, port } = parseArgs(process.argv.slice(2));

// Resolve dist/ relative to this script (stable for service execution).
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

function safeJoin(baseDir, urlPath) {
  // Remove query/hash and normalize.
  const clean = urlPath.split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(clean);
  const rel = decoded.replace(/^\/+/, '');
  const full = path.resolve(baseDir, rel);
  if (!full.startsWith(baseDir + path.sep) && full !== baseDir) return null;
  return full;
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  let filePath = safeJoin(distDir, pathname);

  // If path escapes dist, block.
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Directory -> index.html (Vite output is SPA).
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (stat && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    // ignore
  }

  // Serve file if exists, otherwise SPA fallback to dist/index.html.
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = indexHtmlPath;
  }

  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
    res.setHeader('Content-Type', contentTypeFor(filePath));
    res.setHeader('Cache-Control', 'no-cache');
    res.writeHead(200);
    res.end(buf);
  });
});

server.listen(port, host, () => {
  // Keep logs minimal; service managers capture stdout.
  console.log(`MS Ponto V1.0 running on http://${host}:${port}`);
});

