import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { projectRoot } from './lib/preview-bundle.js';

/**
 * Bağımsız önizlemenin ekran görüntüsünü başsız Chrome/Edge ile alır.
 *
 * Pencere boyutu yerine DevTools protokolüyle gerçek cihaz öykünmesi yapılır;
 * böylece 360 px gibi dar ekranlarda da mobil CSS kuralları devreye girer. Koyu
 * tema prefers-color-scheme öykünmesiyle seçilir. WebGL, GPU olmadan da çalışsın
 * diye SwiftShader ile çizilir. Sahne `data-ready="true"` işaretini koyana kadar
 * beklenir; sayfada yakalanmamış hata veya `data-error` varsa komut başarısız olur.
 *
 *   npm run preview:capture -- [--out <png>] [--width 1280] [--height 900]
 *                              [--scale 1] [--dark] [--full] [--query "a=1"]
 *                              [--html <sayfa>]
 *
 * Tarayıcı bulunamazsa CHROME_PATH ortam değişkeniyle yol verilebilir.
 */
const { values } = parseArgs({
  options: {
    html: { type: 'string', default: path.join(projectRoot, 'dist', 'index.html') },
    out: { type: 'string', default: path.join(projectRoot, 'dist', 'captures', 'kafe.png') },
    width: { type: 'string', default: '1280' },
    height: { type: 'string', default: '900' },
    scale: { type: 'string', default: '1' },
    dark: { type: 'boolean', default: false },
    full: { type: 'boolean', default: false },
    query: { type: 'string', default: '' },
    timeout: { type: 'string', default: '30000' },
  },
});

function browserCandidates() {
  if (process.platform === 'win32') {
    const programFiles = process.env.PROGRAMFILES ?? 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)';
    const local = process.env.LOCALAPPDATA ?? '';
    return [
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      local && path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ];
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ];
  }
  return ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
}

function number(value, label, min, max) {
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max) throw new Error(`${label} ${min}–${max} arasında olmalı.`);
  return result;
}

function launch(browser, profile) {
  const child = spawn(browser, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--mute-audio',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  return new Promise((resolve, reject) => {
    let log = '';
    const fail = (error) => { clearTimeout(timer); reject(error); };
    const timer = setTimeout(() => fail(new Error(`Tarayıcı açılamadı.\n${log.slice(-1500)}`)), 30_000);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      log += chunk;
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(log);
      if (match) { clearTimeout(timer); resolve({ child, endpoint: match[1] }); }
    });
    child.once('error', fail);
    child.once('exit', (code) => fail(new Error(`Tarayıcı beklenmedik biçimde kapandı (${code}).\n${log.slice(-1500)}`)));
  });
}

async function connect(endpoint) {
  const socket = new WebSocket(endpoint);
  const pending = new Map();
  const listeners = new Set();
  let nextId = 1;
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve, reject, method } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${method}: ${message.error.message}`));
      else resolve(message.result);
    } else if (message.method) {
      for (const listener of listeners) listener(message);
    }
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('DevTools bağlantısı kurulamadı.')), { once: true });
  });
  return {
    send(method, params = {}, sessionId) {
      const id = nextId++;
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
    },
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() { socket.close(); },
  };
}

function waitForEvent(cdp, predicate, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const off = cdp.on((message) => {
      if (!predicate(message)) return;
      clearTimeout(timer);
      off();
      resolve(message);
    });
    const timer = setTimeout(() => { off(); reject(new Error(`${label} beklenirken süre doldu.`)); }, timeoutMs);
  });
}

const readyScript = (timeoutMs) => `new Promise((resolve) => {
  const started = performance.now();
  (function check() {
    const root = document.querySelector('[data-ready="true"], [data-error]');
    if (root) {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve({
        ready: root.dataset.ready === 'true', error: root.dataset.error ?? null,
      })));
    } else if (performance.now() - started > ${timeoutMs}) {
      resolve({ ready: false, error: 'Sahne hazır işareti gelmedi.' });
    } else {
      setTimeout(check, 50);
    }
  })();
})`;

function describeException(details) {
  const where = details.url ? ` (${path.basename(details.url)}:${details.lineNumber + 1})` : '';
  return `${details.exception?.description ?? details.text}${where}`;
}

let browserProcess;
let cdp;
let profile;
try {
  const width = number(values.width, 'Genişlik', 200, 4000);
  const height = number(values.height, 'Yükseklik', 200, 4000);
  const scale = number(values.scale, 'Ölçek', 0.5, 4);
  const timeout = number(values.timeout, 'Süre sınırı', 1000, 120_000);
  const browser = process.env.CHROME_PATH || browserCandidates().find((candidate) => candidate && existsSync(candidate));
  if (!browser) throw new Error('Chrome veya Edge bulunamadı; CHROME_PATH ile yol verin.');
  const html = path.resolve(values.html);
  if (!existsSync(html)) throw new Error(`Sayfa yok: ${html}. Önce "npm run preview:build" çalıştırın.`);
  const out = path.resolve(values.out);
  const url = pathToFileURL(html).href + (values.query ? `?${values.query.replace(/^\?/, '')}` : '');

  profile = mkdtempSync(path.join(tmpdir(), 'santiye-capture-'));
  const launched = await launch(browser, profile);
  browserProcess = launched.child;
  cdp = await connect(launched.endpoint);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  const problems = [];
  cdp.on((message) => {
    if (message.sessionId !== sessionId) return;
    if (message.method === 'Runtime.exceptionThrown') problems.push(describeException(message.params.exceptionDetails));
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      problems.push(`console.error: ${message.params.args.map((arg) => arg.value ?? arg.description).join(' ')}`);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: width <= 480 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: values.dark ? 'dark' : 'light' }] });
  const loaded = waitForEvent(cdp, (message) => message.sessionId === sessionId && message.method === 'Page.loadEventFired', timeout, 'Sayfanın yüklenmesi');
  const navigation = await send('Page.navigate', { url });
  if (navigation.errorText) throw new Error(`Sayfa açılamadı: ${navigation.errorText}`);
  await loaded;
  const { result } = await send('Runtime.evaluate', { expression: readyScript(timeout), awaitPromise: true, returnByValue: true });
  if (!result.value?.ready) throw new Error(`Sahne açılmadı: ${result.value?.error ?? 'bilinmeyen hata'}`);

  let clip;
  if (values.full) {
    const { cssContentSize } = await send('Page.getLayoutMetrics');
    clip = { x: 0, y: 0, width: Math.ceil(cssContentSize.width), height: Math.ceil(cssContentSize.height), scale: 1 };
  }
  const shot = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip, captureBeyondViewport: true } : {}) });
  mkdirSync(path.dirname(out), { recursive: true });
  const image = Buffer.from(shot.data, 'base64');
  writeFileSync(out, image);
  if (problems.length) throw new Error(`Sayfada hata yakalandı:\n- ${problems.join('\n- ')}`);
  console.log(`Ekran görüntüsü: ${out} (${width}×${height}${scale === 1 ? '' : ` @${scale}x`}${values.dark ? ', koyu' : ''}, ${Math.round(image.length / 1024)} KB)`);
} catch (error) {
  console.error(`Ekran görüntüsü alınamadı: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (cdp) {
    await Promise.race([cdp.send('Browser.close').catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2000))]);
    cdp.close();
  }
  if (browserProcess && browserProcess.exitCode === null) {
    await new Promise((resolve) => {
      const timer = setTimeout(() => { browserProcess.kill(); resolve(); }, 3000);
      browserProcess.once('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
  if (profile) {
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // Tarayıcının yardımcı süreci profili kısa süre tutabilir; geçici klasör kalabilir.
    }
  }
}
