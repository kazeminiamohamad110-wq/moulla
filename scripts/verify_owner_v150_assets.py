#!/usr/bin/env python3
"""Fail closed unless complete v150 runtime sources exactly match the verified archive."""
from pathlib import Path
import hashlib, json, re
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/"app/src/main/assets"
meta=ROOT/"docs/OWNER_V150_RUNTIME_SHA256.json"
if not meta.is_file(): raise SystemExit("BLOCKED: owner v150 SHA manifest not imported")
manifest=json.loads(meta.read_text(encoding="utf-8"))
expected=manifest["asset_sha256"]
actual={p.relative_to(ASSETS).as_posix():p for p in ASSETS.rglob("*") if p.is_file()}
assert len(expected)==len(actual)==395,(len(expected),len(actual))
assert set(expected)==set(actual),"Missing or extra asset files"
for name,path in actual.items():
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest==expected[name],f"Modified content: {name}"
poster_names=[f"images/clips_posters/clip_{i:03}.webp" for i in range(1,202)]
assert all(p in expected for p in poster_names)
assert all(actual[p].read_bytes()[:4]==b"RIFF" for p in poster_names)
clips=(ASSETS/"pmm_video_clips_v144.js").read_text(encoding="utf-8")
assert "Object.freeze(" in clips and "video-clip" in clips
assert (ASSETS/"index.html").is_file()
print("PASS: exactly 395 v150 source assets and 201 posters, byte-for-byte SHA-256 matched")
