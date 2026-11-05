import { readdir, readFile } from 'node:fs/promises';
import { SourceTextModule } from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (entry.name.endsWith('.js')) files.push(absolute);
  }
}
for (const directory of ['src', 'scripts', 'tests']) await walk(path.join(root, directory));
for (const file of files) {
  try {
    // Yalnızca parse et: modüller bağlanmaz/çalıştırılmaz, alt süreç başlatılmaz.
    new SourceTextModule(await readFile(file, 'utf8'), { identifier: file });
  } catch (error) {
    console.error(file, error);
    process.exit(1);
  }
}
console.log(`${files.length} JavaScript dosyasında sözdizimi kontrolü başarılı. Bu bir tip kontrolü değildir.`);
