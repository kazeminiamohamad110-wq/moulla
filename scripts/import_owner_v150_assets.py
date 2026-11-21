#!/usr/bin/env python3
"""Safely import owner-supplied v150 runtime delta into the native repository.
No secrets. Does not delete or rewrite any old app assets or Git history.
"""
from pathlib import Path
from zipfile import ZipFile
import hashlib, json, sys

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/src/main/assets"
META_PATH = "docs/OWNER_V150_RUNTIME_SHA256.json"
BASE = "app/src/main/assets/"

def fail(msg):
    raise SystemExit("V150 IMPORT REJECTED: " + msg)

def main():
    if len(sys.argv) != 2:
        fail("Usage: python scripts/import_owner_v150_assets.py imports/v150/v150-runtime-delta.zip")
    archive = Path(sys.argv[1]).resolve()
    if not archive.is_file(): fail("ZIP does not exist")
    with ZipFile(archive) as z:
        if z.testzip() is not None: fail("ZIP CRC error")
        names = z.namelist()
        if len(names) != len(set(names)): fail("Duplicate ZIP entries")
        if any(n.startswith("/") or ".." in Path(n).parts or "\\" in n for n in names):
            fail("Untrusted path in ZIP")
        if any(not (n.startswith(BASE) or n == META_PATH) for n in names):
            fail("ZIP contains out-of-scope files")
        if META_PATH not in names: fail("No source-of-truth manifest")
        manifest = json.loads(z.read(META_PATH).decode("utf-8"))
        expected = manifest.get("asset_sha256", {})
        if manifest.get("asset_count") != 395 or len(expected) != 395:
            fail("Expected exactly 395 runtime assets")
        if manifest.get("poster_count") != 201: fail("Expected 201 posters")
        poster_names = [f"images/clips_posters/clip_{i:03}.webp" for i in range(1, 202)]
        if any(p not in expected for p in poster_names): fail("Missing poster manifest entries")
        provided = {n[len(BASE):]:n for n in names if n.startswith(BASE) and not n.endswith("/")}
        if set(provided) - set(expected): fail("Unlisted asset in ZIP")
        # Verify every file *before changing anything*; original files fill delta gaps.
        for rel, sha in expected.items():
            if rel.startswith("/") or ".." in Path(rel).parts or "\\" in rel:
                fail("Unsafe asset path in manifest")
            filename = ASSETS / rel
            if rel in provided:
                payload = z.read(provided[rel])
            elif filename.is_file():
                payload = filename.read_bytes()
            else:
                fail("Missing asset: " + rel)
            if hashlib.sha256(payload).hexdigest() != sha:
                fail("SHA-256 mismatch: " + rel)
        existing = {p.relative_to(ASSETS).as_posix() for p in ASSETS.rglob("*") if p.is_file()}
        if existing - set(expected):
            fail("Unexpected older asset(s) requiring manual review: " + ", ".join(sorted(existing-set(expected))[:8]))
        for rel, entry in provided.items():
            dest = ASSETS / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(z.read(entry))
        meta = ROOT / META_PATH
        meta.parent.mkdir(parents=True, exist_ok=True)
        meta.write_bytes(z.read(META_PATH))
    print(f"PASS: verified 395 asset SHA-256 values, 201 distinct poster paths, imported {len(provided)} delta assets")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
