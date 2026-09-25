#!/bin/sh
# All game checks without a phone. From the repository root: sh tests/run.sh
# Needs node 18+ and python3. tests/flow.js and tests/screens.js also need Playwright with Chromium; without it they are skipped.
set -e
cd "$(dirname "$0")/.."
echo "== the built game matches src/ ==";        python3 build.py --check
echo; echo "== the font matches its drawing ==";  python3 font/make_font.py --check
echo; echo "== DSP2 is the lab's ==";              node tests/test_same_dsp.js
echo; echo "== flight core: deterministic ==";     node tests/test_core.js
echo; echo "== game rules and difficulty (bot) ==";  node tests/test_rules.js
echo; echo "== wave tuning on a synthetic palm =="; node tests/test_tune.js
echo; echo "== band equalizer (Android) ==";           node tests/test_eq.js
echo; echo "== is the probe heard: muted vs noisy =="; node tests/test_quiet.js
echo; echo "== strings and font ==";               node tests/test_text.js
echo; echo "== screens fit, all sizes (Chromium) =="; node tests/screens.js
echo; echo "== leaderboard server (temporary database) =="; node --no-warnings tests/test_server.js
echo; echo "== which end of the phone the hand plays at (Chromium) =="; node tests/side.js
echo; echo "== the whole game, synthetic microphone (Chromium) =="; node tests/flow.js
