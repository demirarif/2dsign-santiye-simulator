"""Yerel ESM kaynaklarını ağ kullanmadan konuşma içindeki önizlemeye paketle.

Bu küçük paketleyici yalnızca listedeki named import/export biçimlerini destekler.
Yeni bir modül biçiminde sessiz dönüşüm yerine hata verir. Tam uygulama paketleme
gereksinimi oluştuğunda bir bundler'a geçilebilir; model/takvim kodu değişmez.
"""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parent.parent
target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    r'C:\Users\arifdemir\.codex\visualizations\2026\11\02\01a19bd1-93aa-7fd0-bbae-c18ed66d5833\m2-calisma-alani.html'
)
paths = [
    'src/domain/workflows/scaffold.js',
    'src/data/pilot-project.js',
    'src/data/pilot-layout.js',
    'src/presentation/three/legacy/create-stocky-worker.js',
    'src/presentation/three/legacy/create-worker-animator.js',
    'src/presentation/three/worker-view.js',
    'src/presentation/three/room-view.js',
    'src/presentation/three/scaffold-view.js',
    'src/presentation/pilot-scene.js',
]
assembled = []
seen = set()
for relative in paths:
    path = (root / relative).resolve()
    source = path.read_text(encoding='utf-8-sig')
    imports = re.findall(r"^import \{[^}\n]+\} from ['\"]([^'\"]+)['\"];\s*$", source, re.M)
    for dependency in imports:
        if (path.parent / dependency).resolve() not in seen:
            raise RuntimeError(f'{relative}: dependency must appear earlier: {dependency}')
    source = re.sub(r"^import \{[^}\n]+\} from ['\"][^'\"]+['\"];\s*$", '', source, flags=re.M)
    source = re.sub(r'^export \{[^}\n]+\};\s*$', '', source, flags=re.M)
    source = re.sub(r'^export (function|const) ', r'\1 ', source, flags=re.M)
    if re.search(r'^\s*(import|export)\b', source, re.M):
        raise RuntimeError(f'{relative}: unsupported module declaration')
    assembled.append(f'// {relative}\n{source}')
    seen.add(path)

bundle = "(function(){\n'use strict';\n" + '\n'.join(assembled) + "\nmountPilotScene(document.getElementById('arabica-pilot-scene'), THREE);\n})();"
template = (root / 'src/presentation/pilot-scene.fragment.html').read_text(encoding='utf-8')
library = (root / 'output/worker-3d-v1/three-0.160.1.min.js').read_text(encoding='utf-8')
for name, content in [('three-runtime', library), ('pilot-bundle', bundle)]:
    marker = f'<script data-{name}></script>'
    if template.count(marker) != 1:
        raise RuntimeError(f'Expected one {name} placeholder')
    if '</script' in content.lower():
        raise RuntimeError(f'Unexpected script closing tag in {name}')
    template = template.replace(marker, '<script>\n' + content + '\n</script>')
if len(template.encode('utf-8')) >= 1_000_000:
    raise RuntimeError('Inline preview exceeds 1 MB')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(template, encoding='utf-8', newline='\n')
print(f'Prepared {target}: {len(template.encode("utf-8"))} bytes')
