import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildPreview, projectRoot } from './lib/preview-bundle.js';

/**
 * Kullanım:
 *   npm run preview:build                         → dist/m2-calisma-alani.html
 *   npm run preview:build -- --out <dosya>        → bağımsız sayfa başka konuma
 *   npm run preview:build -- --fragment [--out <dosya>]
 *                                                 → Codex sohbeti için belge iskeletsiz parça
 */
const { values } = parseArgs({
  options: {
    fragment: { type: 'boolean', default: false },
    out: { type: 'string' },
  },
});

const mode = values.fragment ? 'fragment' : 'page';
const defaultName = mode === 'page' ? 'm2-calisma-alani.html' : 'm2-calisma-alani.fragment.html';
const target = path.resolve(values.out ?? path.join(projectRoot, 'dist', defaultName));

try {
  const html = buildPreview({ mode });
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, html, 'utf8');
  const kilobytes = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
  console.log(`Önizleme hazır (${mode === 'page' ? 'bağımsız sayfa' : 'Codex parçası'}, ${kilobytes} KB): ${target}`);
  if (mode === 'page') console.log('Dosyaya çift tıklayarak tarayıcıda açabilirsiniz; ağ bağlantısı gerekmez.');
} catch (error) {
  console.error(`Önizleme üretilemedi: ${error.message}`);
  process.exitCode = 1;
}
