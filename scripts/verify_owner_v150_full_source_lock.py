#!/usr/bin/env python3
"""Verify all 420 owner v150 app/source/config/online-content files against a fixed git blob lock."""
from pathlib import Path
import hashlib, json, sys

root = Path(__file__).resolve().parents[1]
lock = json.loads((root / "design/owner-v150-full-source-lock.json").read_text(encoding="utf-8"))
wanted = lock["git_blob_sha1"]
def included(path):
    return (path.startswith("app/") or path.startswith("online-content/")
            or path in {"build.gradle", "settings.gradle", "gradle.properties"})
present = {}
for parent in ["app", "online-content"]:
    for p in (root / parent).rglob("*"):
        if p.is_file() and not any(x in p.parts for x in ["build", ".gradle", "__pycache__"]):
            present[p.relative_to(root).as_posix()] = p
for name in ["build.gradle", "settings.gradle", "gradle.properties"]:
    p = root / name
    if p.is_file(): present[name] = p
missing = sorted(set(wanted) - set(present))
added = sorted(set(present) - set(wanted))
changed = []
for name, expected_sha in wanted.items():
    file = present.get(name)
    if file:
        data = file.read_bytes()
        git_hash = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        if git_hash != expected_sha:
            changed.append(name)
if missing or added or changed:
    print("V150 SOURCE LOCK FAILED:")
    for category, values in [("missing", missing), ("added", added), ("modified", changed)]:
        for value in values[:30]: print(f"  {category}: {value}")
    sys.exit(1)
assert len(wanted) == lock["tracked_file_count"], "Lock manifest count mismatch"
assert sum(k.startswith("app/src/main/assets/") for k in wanted) == 395, "Runtime asset count mismatch"
assert sum(k.startswith("app/src/main/assets/images/clips_posters/") for k in wanted) == 201, "Poster count mismatch"
print(f"PASS: exact owner v150 full-source lock ({len(wanted)} files, 395 assets, 201 posters)")
