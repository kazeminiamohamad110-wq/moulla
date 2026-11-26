#!/usr/bin/env python3
"""Stage byte-verified derived assets without altering owner originals. Run from any directory."""
import hashlib,json,shutil,tempfile
from pathlib import Path
R=Path(__file__).resolve().parents[1]; O=R/'optimization'; A=R/'app/src/main/assets'; out=R/'app/build/pmm-lossless-assets'
m=json.loads((O/'lossless-assets.json').read_text()); sha=lambda b:hashlib.sha256(b).hexdigest()
a={p.relative_to(A).as_posix():p for p in A.rglob('*') if p.is_file()}
if {n:sha(p.read_bytes()) for n,p in a.items()}!=m['source_assets']:raise SystemExit('Original assets changed; do not build stale derived assets.')
files={n:p.read_bytes() for n,p in a.items()}
for row in m['images']:
 old,new=row['original'],row['optimized'];b=(O/'derived'/new).read_bytes()
 if sha(b)!=row['optimized_sha256'] or new in files:raise SystemExit('Derived asset mismatch: '+new)
 del files[old];files[new]=b
for n in m['rewritten_files']:
 s=files[n].decode('utf-8')
 for row in m['images']:s=s.replace(row['original'],row['optimized'])
 files[n]=s.encode('utf-8')
if {n:sha(b) for n,b in files.items()}!=m['staged_assets']:raise SystemExit('Staged asset mismatch')
out.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(dir=out.parent) as tmp:
 t=Path(tmp)/'assets';t.mkdir()
 for n,b in files.items():
  p=t/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 if out.exists():shutil.rmtree(out)
 shutil.move(str(t),str(out))
print('PASS: staged',len(files),'verified assets; all owner originals retained.')
