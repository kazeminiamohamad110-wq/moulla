#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/verify_owner_v152_candidate.py
for f in app/src/main/assets/*.js online-content/*.js; do node --check "$f"; done
node - <<'JS'
const fs=require('fs'),vm=require('vm');const s=fs.readFileSync('app/src/main/assets/index.html','utf8');let count=0;for(const m of s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim()){new vm.Script(m[1]);count++}console.log('PASS inline JS syntax: '+count+' blocks; all standalone top-level app and Worker modules parsed.');
JS
for t in test_v152_transcript_audio.cjs test_v152_bundled_content.cjs test_owner_all_native_content_parity.cjs test_owner_online_life_visual_match.cjs test_owner_v124_seven_fixes.cjs test_owner_v128_recent_task_audio.cjs test_owner_v129_touch97.cjs test_v16_back_navigation.js test_owner_v118_back_notes.cjs test_course_state_compat.js test_owner_v122_content_startup.cjs test_v152_worker.mjs test_v152_online_transcripts.mjs test_v152_reader_r4.cjs; do echo "=== $t"; node "scripts/$t"; done
node scripts/test_pmm_content_server.mjs
node scripts/test_pmm_content_server.mjs --single-file
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test_v152_archive.py
bash scripts/test_native_compile.sh
clock=$(mktemp -d); trap 'rm -rf "$clock"' EXIT
LC_ALL=C.UTF-8 javac -encoding UTF-8 -sourcepath app/src/main/java -d "$clock" app/src/main/java/ir/nahj/towhidkarbordi/PmmReminderClock.java scripts/TestReminderClock.java
java -cp "$clock" TestReminderClock
python3 scripts/owner_version_inventory.py --self-test
python3 scripts/owner_cleanup_plan.py --self-test
