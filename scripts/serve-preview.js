import { createServer } from 'node:http';
import { mkdirSync, watch, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildPreview, projectRoot } from './lib/preview-bundle.js';

/**
 * Lokal önizleme sunucusu: npm start
 *
 * Sayfayı http://localhost:5173 adresinden sunar; src/ altında bir dosya değişince
 * önizlemeyi yeniden derler ve açık sekmeleri kendiliğinden yeniler. Derleme hatası
 * sayfada kırmızı şeritle gösterilir. Yalnızca bu bilgisayardan erişilir (127.0.0.1).
 * dist/index.html de her başarılı derlemede güncellenir.
 */
const { values } = parseArgs({ options: { port: { type: 'string', default: '5173' } } });
const host = '127.0.0.1';
const liveReloadPath = '/__canli';
const clients = new Set();
let page = '';
let lastError = null;

const liveReload = `<script>
(() => {
  const banner = (message) => {
    let node = document.getElementById('canli-hata');
    if (!message) { node?.remove(); return; }
    if (!node) {
      node = document.createElement('pre');
      node.id = 'canli-hata';
      node.style.cssText = 'position:fixed;inset:auto 12px 12px 12px;z-index:9999;margin:0;padding:12px 14px;border-radius:10px;background:#7a1d1d;color:#fff;font:13px/1.45 ui-monospace,Consolas,monospace;white-space:pre-wrap;max-height:40vh;overflow:auto;box-shadow:0 10px 30px rgb(0 0 0/.35)';
      document.body.append(node);
    }
    node.textContent = 'Önizleme derlenemedi — son çalışan sürüm gösteriliyor.\\n' + message;
  };
  const source = new EventSource('${liveReloadPath}');
  source.addEventListener('reload', () => location.reload());
  source.addEventListener('build-error', (event) => banner(JSON.parse(event.data)));
  source.addEventListener('build-ok', () => banner(null));
})();
</script>`;

function broadcast(event, data = '') {
  for (const response of clients) response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function rebuild(reason) {
  const started = performance.now();
  try {
    const html = buildPreview({ mode: 'page' });
    mkdirSync(path.join(projectRoot, 'dist'), { recursive: true });
    writeFileSync(path.join(projectRoot, 'dist', 'index.html'), html, 'utf8');
    page = html.replace('</body>', () => `${liveReload}\n</body>`);
    lastError = null;
    console.log(`${new Date().toLocaleTimeString('tr-TR')}  derlendi (${Math.round(performance.now() - started)} ms)${reason ? ` · ${reason}` : ''}`);
    return true;
  } catch (error) {
    lastError = error.message;
    console.error(`${new Date().toLocaleTimeString('tr-TR')}  derleme hatası: ${error.message}`);
    return false;
  }
}

const server = createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === liveReloadPath) {
    response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    response.write('retry: 1000\n\n');
    if (lastError) response.write(`event: build-error\ndata: ${JSON.stringify(lastError)}\n\n`);
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }
  if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    if (!page) {
      response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(`Önizleme henüz derlenemedi:\n${lastError ?? 'bilinmeyen hata'}`);
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(page);
    return;
  }
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Bulunamadı');
});

const heartbeat = setInterval(() => {
  for (const response of clients) response.write(': canlı\n\n');
}, 20_000);

let pending = null;
const changed = new Set();
const watcher = watch(path.join(projectRoot, 'src'), { recursive: true }, (_event, file) => {
  if (file) changed.add(file.split(path.sep).join('/'));
  clearTimeout(pending);
  pending = setTimeout(() => {
    const reason = [...changed].slice(0, 3).join(', ');
    changed.clear();
    if (rebuild(reason)) {
      broadcast('build-ok');
      broadcast('reload');
    } else {
      broadcast('build-error', lastError);
    }
  }, 150);
});

function listen(port, attemptsLeft) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      listen(port + 1, attemptsLeft - 1);
      return;
    }
    console.error(`Sunucu açılamadı: ${error.message}`);
    process.exit(1);
  });
  server.listen(port, host, () => {
    console.log(`\nÖnizleme yayında: http://localhost:${port}/`);
    console.log('src/ altındaki değişiklikler sayfayı kendiliğinden yeniler. Kapatmak için Ctrl+C.\n');
  });
}

function shutdown() {
  clearInterval(heartbeat);
  watcher.close();
  for (const response of clients) response.end();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

rebuild('ilk derleme');
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('Port 1024–65535 arasında bir tam sayı olmalı.');
  process.exit(1);
}
listen(port, 10);
