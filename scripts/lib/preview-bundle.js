import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Tarayıcı önizlemesi için bağımlılıksız küçük paketleyici.
 *
 * Girişten başlayıp göreli `import { … } from './x.js'` bağlarını izler, modülleri
 * bağımlılık sırasına dizer ve her birini kendi kapsamında çalıştırır. Böylece iki
 * modüldeki aynı adlı yardımcılar çakışmaz; olmayan bir adı içe aktarmak, ESM'de
 * olduğu gibi paketleme anında hata verir.
 *
 * Desteklenen biçimler bilinçli olarak dar tutuldu: tek satırlık named import,
 * `export function|const|let|class` ve `export { … };`. Başka bir biçim görülünce
 * sessizce dönüştürmek yerine hata verilir.
 */

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

/** Prototipten gelen son UMD sürümü; global `THREE` tanımlar. */
export const threeRuntimeFile = 'output/worker-3d-v1/three-0.160.1.min.js';

const sceneEntry = 'src/presentation/pilot-scene.js';
const fragmentTemplate = 'src/presentation/pilot-scene.fragment.html';
const pageTemplate = 'src/presentation/pilot-scene.page.html';
const pageMarker = '<!-- pilot-scene -->';
const sceneStart = { exportName: 'mountPilotScene', args: "document.getElementById('arabica-pilot-scene'), THREE" };

const IMPORT_LINE = /^import \{([^}\n]*)\} from (['"])([^'"\n]+)\2;[ \t]*$/gm;
const EXPORT_DECLARATION = /^export (async function\*?|function\*?|const|let|class) ([A-Za-z_$][\w$]*)/gm;
const EXPORT_LIST = /^export \{([^}\n]*)\};[ \t]*$/gm;
const LEFTOVER_MODULE_SYNTAX = /^[ \t]*(?:import|export)\b.*$/m;
const BINDING = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/;

function readText(file) {
  return readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/** `a, b as c` → [{ source: 'a', name: 'a' }, { source: 'b', name: 'c' }] */
function parseBindings(list, where) {
  const bindings = [];
  for (const part of list.split(',')) {
    const text = part.trim();
    if (!text) continue;
    const match = BINDING.exec(text);
    if (!match) throw new Error(`${where}: anlaşılamayan bağ "${text}".`);
    bindings.push({ source: match[1], name: match[2] ?? match[1] });
  }
  return bindings;
}

function collectModules(rootDir, entry) {
  const root = path.resolve(rootDir);
  const ordered = [];
  const state = new Map();
  const stack = [];
  const idOf = (file) => path.relative(root, file).split(path.sep).join('/');

  function visit(file, importer) {
    const id = idOf(file);
    if (id.startsWith('../') || path.isAbsolute(id)) throw new Error(`${importer}: proje dışındaki modül içe aktarılamaz: ${id}`);
    if (state.get(id) === 'done') return id;
    if (state.get(id) === 'visiting') throw new Error(`Döngüsel bağımlılık: ${[...stack, id].join(' → ')}`);
    state.set(id, 'visiting');
    stack.push(id);
    let source;
    try {
      source = readText(file);
    } catch (error) {
      throw new Error(`${importer}: modül okunamadı: ${id} (${error.code ?? error.message})`);
    }
    const dependencies = new Map();
    for (const match of source.matchAll(IMPORT_LINE)) {
      const specifier = match[3];
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
        throw new Error(`${id}: yalnızca göreli içe aktarım desteklenir: "${specifier}"`);
      }
      dependencies.set(specifier, visit(path.resolve(path.dirname(file), specifier), id));
    }
    stack.pop();
    state.set(id, 'done');
    ordered.push({ id, source, dependencies });
    return id;
  }

  visit(path.resolve(root, entry), 'giriş');
  return ordered;
}

function transform(module, modules) {
  const where = module.id;
  let body = module.source.replace(IMPORT_LINE, (_line, list, _quote, specifier) => {
    const dependency = modules.get(module.dependencies.get(specifier));
    const bindings = parseBindings(list, where);
    if (bindings.length === 0) throw new Error(`${where}: boş içe aktarım desteklenmez: "${specifier}"`);
    for (const { source } of bindings) {
      if (!dependency.exports.has(source)) {
        throw new Error(`${where}: "${dependency.id}" modülü "${source}" adını dışa açmıyor.`);
      }
    }
    const pattern = bindings.map(({ source, name }) => (source === name ? name : `${source}: ${name}`)).join(', ');
    return `const { ${pattern} } = ${dependency.variable};`;
  });

  const exports = new Map();
  const addExport = (name, local) => {
    if (exports.has(name)) throw new Error(`${where}: "${name}" iki kez dışa açılmış.`);
    exports.set(name, local);
  };
  body = body.replace(EXPORT_LIST, (_line, list) => {
    for (const { source, name } of parseBindings(list, where)) addExport(name, source);
    return '';
  });
  body = body.replace(EXPORT_DECLARATION, (_match, kind, name) => {
    addExport(name, name);
    return `${kind} ${name}`;
  });
  const leftover = LEFTOVER_MODULE_SYNTAX.exec(body);
  if (leftover) throw new Error(`${where}: desteklenmeyen modül bildirimi: ${leftover[0].trim()}`);

  const returned = [...exports].map(([name, local]) => (name === local ? name : `${name}: ${local}`)).join(', ');
  return { ...module, body: body.trim(), exports, returned };
}

/**
 * Girişi ve bağımlılıklarını tek bir IIFE'ye paketler; en sonda girişin
 * `start.exportName` fonksiyonunu `start.args` ile çağırır.
 * @param {{ rootDir?: string, entry: string, start: { exportName: string, args: string } }} options
 * @returns {string}
 */
export function createBundle({ rootDir = projectRoot, entry, start }) {
  const modules = new Map();
  collectModules(rootDir, entry).forEach((module, index) => {
    modules.set(module.id, transform({ ...module, variable: `__module${index}` }, modules));
  });
  const entryModule = [...modules.values()].at(-1);
  if (!entryModule.exports.has(start.exportName)) {
    throw new Error(`${entryModule.id}: başlangıç fonksiyonu "${start.exportName}" dışa açılmamış.`);
  }
  const lines = ['(function () {', "'use strict';"];
  for (const module of modules.values()) {
    lines.push(
      `// ${module.id}`,
      `const ${module.variable} = (function () {`,
      module.body,
      `return Object.freeze({ ${module.returned} });`,
      '})();',
    );
  }
  lines.push(`${entryModule.variable}.${start.exportName}(${start.args});`, '})();');
  return lines.join('\n');
}

function fillScript(template, name, content) {
  const marker = `<script data-${name}></script>`;
  const count = template.split(marker).length - 1;
  if (count !== 1) throw new Error(`"${marker}" yer tutucusu tam bir kez bulunmalı; bulunan: ${count}.`);
  if (/<\/script|<!--/i.test(content)) throw new Error(`${name}: satır içi betiği bozacak HTML dizgisi var.`);
  // Fonksiyonlu replace: içerikteki `$&`, `$1` gibi dizgiler kalıp olarak yorumlanmasın.
  return template.replace(marker, () => `<script>\n${content}\n</script>`);
}

/**
 * M2 önizlemesini üretir.
 * - `page`: tarayıcıda doğrudan açılan, ağ gerektirmeyen tek dosyalık sayfa.
 * - `fragment`: Codex sohbetinin önizleme alanına konan, belge iskeleti olmayan parça.
 * @param {{ mode?: 'page'|'fragment', rootDir?: string }} [options]
 * @returns {string}
 */
export function buildPreview({ mode = 'page', rootDir = projectRoot } = {}) {
  if (mode !== 'page' && mode !== 'fragment') throw new Error(`Bilinmeyen önizleme türü: ${mode}`);
  const bundle = createBundle({ rootDir, entry: sceneEntry, start: sceneStart });
  let fragment = readText(path.join(rootDir, fragmentTemplate));
  fragment = fillScript(fragment, 'three-runtime', readText(path.join(rootDir, threeRuntimeFile)));
  fragment = fillScript(fragment, 'pilot-bundle', bundle);
  if (mode === 'fragment') {
    const bytes = Buffer.byteLength(fragment, 'utf8');
    if (bytes >= 1_000_000) throw new Error(`Codex önizlemesi 1 MB sınırını aşıyor: ${bytes} bayt.`);
    return fragment;
  }
  const page = readText(path.join(rootDir, pageTemplate));
  const count = page.split(pageMarker).length - 1;
  if (count !== 1) throw new Error(`"${pageMarker}" işareti sayfa şablonunda tam bir kez bulunmalı; bulunan: ${count}.`);
  return page.replace(pageMarker, () => fragment);
}
