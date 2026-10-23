"""Freeze downloaded and local timing candidates before presentation changes."""
import hashlib
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = root / 'archive'
out.mkdir(exist_ok=True)
archive = out / 'lyrics-versions-2026-10-23.zip'
manifest_path = out / 'lyrics-versions-2026-10-23.manifest.json'
if archive.exists() or manifest_path.exists():
    raise SystemExit('Archive already exists; preserve the existing snapshot.')
files = sorted([
    root / 'data/lyrics.json', root / 'data/versions.json',
    *root.glob('data/versions/*.json'),
    *root.glob('analysis/online-lyrics/*'),
])
files = [p for p in files if p.is_file()]
manifest = {
    'createdOn': '2026-10-23',
    'selectedVersion': 'kugou-135049983',
    'selectionBasis': 'User selected Kugou KRC 3 after auditioning candidates.',
    'profiles': ['auto', 'kugou-223522842', 'kugou-191997125', 'kugou-135049983', 'kugou-826083305'],
    'note': 'Original source files; selection does not assert every character has been manually verified. Browser-only edits remain in their existing per-version localStorage profiles.',
    'files': [{'path': p.relative_to(root).as_posix(), 'bytes': p.stat().st_size,
               'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files],
}
with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED) as z:
    for p in files:
        z.write(p, p.relative_to(root).as_posix())
    z.writestr('snapshot-manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2))
manifest['archive'] = archive.name
manifest['archiveSha256'] = hashlib.sha256(archive.read_bytes()).hexdigest()
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Saved {len(files)} source files: {archive.name} ({archive.stat().st_size} bytes)')
