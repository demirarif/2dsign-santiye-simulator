from pathlib import Path

root = Path(__file__).resolve().parent
viz = Path(r'C:\Users\arifdemir\.codex\visualizations\2026\11\02\01a19bd1-93aa-7fd0-bbae-c18ed66d5833')
source = (root / 'preview.fragment.html').read_text(encoding='utf-8')
files = {
    'three-runtime': root.parent / 'worker-3d-v1' / 'three-0.160.1.min.js',
    'worker-model': root.parent / 'worker-3d-v2' / 'create-worker.js',
    'worker-animator': root / 'worker-animator.js',
    'walk-controller': root / 'walk-controller.js',
}
for name, path in files.items():
    placeholder = f'<script data-{name}></script>'
    if source.count(placeholder) != 1:
        raise RuntimeError(f'Expected one {name} placeholder')
    source = source.replace(placeholder, '<script>\n' + path.read_text(encoding='utf-8') + '\n</script>', 1)
if len(source.encode('utf-8')) >= 1_000_000:
    raise RuntimeError('Preview too large')
target = viz / 'usta-yuruyus-45.html'
target.write_text(source, encoding='utf-8', newline='\n')
print(f'Prepared {target.name}: {len(source.encode("utf-8"))} bytes')
