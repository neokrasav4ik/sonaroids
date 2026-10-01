#!/usr/bin/env python3
"""All game checks, faster (v1.07; the maintainer: «пустить в несколько потоков и ускорить, без страдания качества тестов»).

Phase 1 — the checks that play the game in real time with the synthetic microphone (flow, race_flow, the sound ones): alone on the
machine, one at a time, as before (tried beside other checks: the calibration came out worse — so never in parallel). Phase 2 — the rest
in two lanes at once: the screens (which run their 28 sizes × languages × hands four at a time and wait for each screen's buttons), and
everything else. Each check's output is printed whole when it ends; a failed one again at the end. Non-zero exit if any failed.

  python3 tests/run_par.py           (tests/run.sh calls this)
  SERIAL=1 sh tests/run.sh           phase 2 one after another too
"""
import os, subprocess, sys, threading, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = 'node --no-warnings'
REALTIME = [  # phase 1: real time with the synthetic microphone — alone on the machine, one at a time (beside other checks the calibration came out worse)
    ('the whole game, synthetic microphone (Chromium)', f'{H} tests/flow.js'),
    ('SonaRace, synthetic microphone (Chromium)', f'{H} tests/race_flow.js'),
    ("the app's own sound: frames through the app, the service screen (Chromium)", f'{H} tests/native_audio.js'),
    ('a phone that does not hear its own probe (Chromium)', f'{H} tests/silent.js'),
    ('the media volume before getting ready (Chromium)', f'{H} tests/volume.js'),
    ('which end of the phone the hand plays at (Chromium)', f'{H} tests/side.js'),
]
LANE_A = [  # phase 2, beside lane B: the screens (their 28 sizes × languages × hands three at a time themselves)
    ('screens fit, all sizes (Chromium)', f'{H} tests/screens.js'),
]
LANE_B = [  # phase 2, beside lane A: the rest
    ('the built game matches src/', 'python3 build.py --check'),
    ('the font matches its drawing', 'python3 font/make_font.py --check'),
    ("DSP2 is the lab's", f'{H} tests/test_same_dsp.js'),
    ('flight core: deterministic', f'{H} tests/test_core.js'),
    ('wave tuning on a synthetic palm', f'{H} tests/test_tune.js'),
    ('band equalizer (Android)', f'{H} tests/test_eq.js'),
    ('is the probe heard: muted vs noisy', f'{H} tests/test_quiet.js'),
    ('strings and font', f'{H} tests/test_text.js'),
    ('leaderboard server (temporary database)', f'{H} tests/test_server.js'),
    ('first open shows the menu (Chromium)', f'{H} tests/first_open.js'),
    ('buttons light up under the finger (Chromium)', f'{H} tests/press.js'),
    ('skins: every object readable on its sky (Chromium)', f'{H} tests/skin_audit.js'),
    ('HD skins: every object readable on its sky (Chromium)', f'env HD=1 {H} tests/skin_audit.js'),
    ('graphics: pixels / HD (Chromium)', f'{H} tests/hd.js'),
    ('skins: objects drawn the size the game counts (Chromium)', f'{H} tests/skin_sizes.js'),
    ('game rules and difficulty (bot)', f'{H} tests/test_rules.js'),
    ('race core: deterministic, rules and length (bot)', f'{H} tests/test_race.js'),
]
lock = threading.Lock(); results = []; T0 = time.time()

def run(title, cmd, nice=False):
    t = time.time()
    p = subprocess.run(cmd, shell=True, cwd=ROOT, capture_output=True, text=True)
    out = (p.stdout + p.stderr).rstrip()
    ok = p.returncode == 0 and 'RESULT: FAIL' not in out
    with lock:
        results.append((title, ok, out))
        print(f'\n== {title} == [{time.time() - t:.0f} s]\n{out}', flush=True)

def lane(jobs):
    for title, cmd in jobs: run(title, cmd)

lane(REALTIME)
if os.environ.get('SERIAL'): lane(LANE_A + LANE_B)
else:
    a = threading.Thread(target=lane, args=(LANE_A,)); b = threading.Thread(target=lane, args=(LANE_B,))
    a.start(); b.start(); a.join(); b.join()
bad = [r for r in results if not r[1]]
for title, ok, out in bad: print(f'\n!! FAILED: {title}\n{out}')
print(f'\n{len(results) - len(bad)} of {len(results)} checks ok in {time.time() - T0:.0f} s' + (f'; FAILED: {", ".join(t for t, _, _ in bad)}' if bad else ''))
print('RESULT: ok' if not bad else 'RESULT: FAIL'); sys.exit(1 if bad else 0)
