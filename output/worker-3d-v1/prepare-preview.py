from pathlib import Path

root = Path(__file__).resolve().parent
fragment = Path(r'C:\Users\arifdemir\.codex\visualizations\2026\11\02\01a19bd1-93aa-7fd0-bbae-c18ed66d5833\maket-usta-360.html')
source = fragment.read_text(encoding='utf-8')
tag = '<script src="https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js"></script>'
library = (root / 'three-0.160.1.min.js').read_text(encoding='utf-8')
if tag in source:
    source = source.replace(tag, '<script>\n' + library + '\n</script>', 1)
    fragment.write_text(source, encoding='utf-8', newline='\n')
if len(source.encode('utf-8')) >= 1_000_000:
    raise RuntimeError('Preview too large')
if '<html' in source.lower() or '<!doctype' in source.lower():
    raise RuntimeError('Expected fragment')
print(f'Fragment: {len(source.encode("utf-8"))} bytes')
