#!/usr/bin/env python3
"""Validate the local candidate while retaining the old immutable v150 manifests."""
from pathlib import Path
import json, hashlib, csv, re
R=Path(__file__).resolve().parents[1]; A=R/'app/src/main/assets'
old=json.loads((R/'design/owner-v150-full-source-lock.json').read_text());new=json.loads((R/'design/owner-v152-candidate-lock.json').read_text());oldassets=json.loads((R/'docs/OWNER_V150_RUNTIME_SHA256.json').read_text())['asset_sha256']
def sha(b):return hashlib.sha256(b).hexdigest()
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
actual={p.relative_to(R).as_posix():p for parent in ['app','online-content'] for p in (R/parent).rglob('*') if p.is_file() and not any(x in p.relative_to(R).parts for x in ['build','.gradle','__pycache__'])}
for n in ['build.gradle','settings.gradle','gradle.properties']:actual[n]=R/n
assert set(actual)==set(new['git_blob_sha1']);assert set(old['git_blob_sha1'])<=set(actual)
assert {n for n,v in old['git_blob_sha1'].items() if v!=new['git_blob_sha1'][n]}==set(new['authorized_modified_original_files'])
for n,p in actual.items():assert blob(p.read_bytes())==new['git_blob_sha1'][n],n
assetfiles={p.relative_to(A).as_posix():p for p in A.rglob('*') if p.is_file()}
assert set(assetfiles)==set(new['asset_sha256']) and set(oldassets)<=set(assetfiles)
for n,p in assetfiles.items():assert sha(p.read_bytes())==new['asset_sha256'][n],n
assert sum(n.startswith('images/clips_posters/') for n in assetfiles)==201
for n,expected in oldassets.items():
 if n.startswith(('images/','fonts/')):assert new['asset_sha256'][n]==expected,n
prefix='window.PMM_NAHJ_TRANSCRIPT_ACCEPT(';data={}
for p in (A/'pmm-transcripts').rglob('*.js'):
 s=p.read_text().strip();assert s.startswith(prefix) and s.endswith(');');x=json.loads(s[len(prefix):-2]);assert x['group']==p.parent.name and x['number']==int(p.stem)
 for i,t in enumerate(x['parts'],1):data[x['group'],x['number'],i]=(len(t),sha(t.encode()),len(x['parts']))
with (R/'docs/OWNER_V152_TRANSCRIPT_MAPPING.csv').open(encoding='utf-8-sig') as f:
 expected={(r['group'],int(r['number']),int(r['part'])):(int(r['characters']),r['sha256'],int(r['source_part_count'])) for r in csv.DictReader(f)}
assert data==expected and len(data)==1016
assert len(actual)==new['tracked_file_count'] and len(assetfiles)==new['asset_count']
print(f"PASS candidate: {len(actual)} locked runtime/config files, {len(assetfiles)} assets, 201 original clip posters, all 1016 text part hashes, no missing v150 runtime source.")
