import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { buildPreview, createBundle } from '../scripts/lib/preview-bundle.js';

// Önizleme paketinin yapısal sözleşmeleri. Sahnenin görsel kalitesi tarayıcıda,
// ekran görüntüsüyle ayrıca incelenir.

function inlineScripts(html) {
  return [...html.matchAll(/<script>\n([\s\S]*?)\n<\/script>/g)].map((match) => match[1]);
}

function withFixture(files, run) {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'santiye-paket-'));
  try {
    for (const [name, source] of Object.entries(files)) {
      const file = path.join(rootDir, name);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, source);
    }
    return run(rootDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

test('bağımsız önizleme tek dosyalık, dış kaynaksız ve ayrıştırılabilir bir sayfadır', () => {
  const page = buildPreview({ mode: 'page' });
  assert.match(page, /^<!doctype html>/);
  assert.equal(page.match(/<canvas class="cafe-canvas/g)?.length, 1);
  assert.doesNotMatch(page, /<script[^>]*\ssrc=|<link[^>]*\shref=/i, 'Sayfa ağdan kaynak yüklememeli.');
  assert.doesNotMatch(page, /<!-- cafe-scene -->/, 'Yer tutucu doldurulmalı.');
  const scripts = inlineScripts(page);
  assert.equal(scripts.length, 2, 'Three.js ve uygulama paketi satır içinde olmalı.');
  for (const source of scripts) assert.doesNotThrow(() => new vm.Script(source));
  assert.match(scripts[1], /\.mountCafeScene\(document\.getElementById\('arabica-cafe-scene'\), THREE\);\n\}\)\(\);$/);
});

test('Codex parçası belge iskeleti taşımaz ve 1 MB sınırının altındadır', () => {
  const fragment = buildPreview({ mode: 'fragment' });
  assert.doesNotMatch(fragment, /<!doctype|<html|<body/i);
  assert.ok(Buffer.byteLength(fragment, 'utf8') < 1_000_000);
  assert.equal(inlineScripts(fragment).length, 2);
});

test('paketleyici bağımlılık sırasını kendisi çıkarır ve modül kapsamlarını ayırır', () => {
  withFixture({
    'a.js': "export const clamp = (value) => Math.min(1, value);\nexport function label() { return 'a'; }\n",
    'lib/b.js': "import { clamp as limit } from '../a.js';\nconst clamp = (value) => Math.max(0, value);\nexport { clamp, limit };\n",
    'main.js': "import { label } from './a.js';\r\nimport { clamp, limit } from './lib/b.js';\r\nexport function run(report) { report([label(), clamp(-2), limit(5)]); }\r\n",
  }, (rootDir) => {
    const bundle = createBundle({ rootDir, entry: 'main.js', start: { exportName: 'run', args: 'report' } });
    assert.deepEqual([...bundle.matchAll(/^\/\/ (.+\.js)$/gm)].map((match) => match[1]), ['a.js', 'lib/b.js', 'main.js']);
    let result;
    vm.runInNewContext(bundle, { report: (value) => { result = Array.from(value); } });
    // İki modülde aynı adlı "clamp" bulunur; düz birleştirmede bu sözdizimi hatası olurdu.
    assert.deepEqual(result, ['a', 0, 1]);
  });
});

test('paketleyici eksik adı, döngüyü, göreli olmayan ve desteklenmeyen biçimleri reddeder', () => {
  withFixture({
    'a.js': 'export const yes = 1;\n',
    'missing.js': "import { nope } from './a.js';\nexport const x = 1;\n",
    'cycle-a.js': "import { b } from './cycle-b.js';\nexport const x = 1;\n",
    'cycle-b.js': "import { x } from './cycle-a.js';\nexport const b = 2;\n",
    'default.js': 'export default function x() {}\n',
    'bare.js': "import { Vector3 } from 'three';\nexport const x = 1;\n",
    'no-start.js': 'export const y = 1;\n',
  }, (rootDir) => {
    const bundle = (entry) => createBundle({ rootDir, entry, start: { exportName: 'x', args: '' } });
    assert.throws(() => bundle('missing.js'), /"a\.js" modülü "nope" adını dışa açmıyor/);
    assert.throws(() => bundle('cycle-a.js'), /Döngüsel bağımlılık: cycle-a\.js → cycle-b\.js → cycle-a\.js/);
    assert.throws(() => bundle('default.js'), /desteklenmeyen modül bildirimi/);
    assert.throws(() => bundle('bare.js'), /yalnızca göreli içe aktarım/);
    assert.throws(() => bundle('no-start.js'), /başlangıç fonksiyonu "x"/);
    assert.throws(() => bundle('yok.js'), /modül okunamadı: yok\.js/);
  });
});
