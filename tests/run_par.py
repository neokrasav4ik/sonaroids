#!/usr/bin/env python3
"""All game checks, faster (v1.07; the maintainer: «пустить в несколько потоков и ускорить, без страдания качества тестов»).

Phase 1 — the checks that play the game in real time with the synthetic microphone (flow, race_flow, the sound ones): alone on the
machine, one at a time, as before (tried beside other checks: the calibration came out worse — so never in parallel). Phase 2 — the rest
in two lanes at once: the screens (which run their 28 sizes × languages × hands four at a time and wait for each screen's buttons), and
everything else. Each check's output is printed whole when it ends; a failed one again at the end. Non-zero exit if any failed.

v1.51 (the maintainer, 5 Oct: «мы сегодня 80% времени потратили на тесты, большей частью зафейлинные и неправильные.. время — ценно»):
  * every check has a time limit (LIMIT, about three times its usual run); one that hangs is stopped and reported «HUNG», the rest go on —
    a check that hung on 5 Oct held the whole run for 33 minutes;
  * while a run is on, tests/.running holds its process id and build.py will not rewrite the game under it (a rebuild mid-run is what
    hung that check);
  * --changed: only the checks the changed files can break (git diff against HEAD, or against the given commit, plus new files), the
    screens then at two sizes instead of seven; the full run stays for before an upload (and GitHub runs it on every push to main).

  python3 tests/run_par.py                     everything (tests/run.sh calls this)
  python3 tests/run_par.py --changed [REV]     only what the changes since REV (default: the last commit) can break
  SERIAL=1 sh tests/run.sh                     phase 2 one after another too
"""
import atexit, fnmatch, os, signal, subprocess, sys, threading, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = 'node --no-warnings'
REALTIME = [  # phase 1: real time with the synthetic microphone — alone on the machine, one at a time (beside other checks the calibration came out worse)
    ('the whole game, synthetic microphone (Chromium)', f'{H} tests/flow.js'),
    ('SonaRace, synthetic microphone (Chromium)', f'{H} tests/race_flow.js'),
    ("the app's own sound: frames through the app, the service screen (Chromium)", f'{H} tests/native_audio.js'),
    ('a phone that does not hear its own probe (Chromium)', f'{H} tests/silent.js'),
    ('the media volume before getting ready (Chromium)', f'{H} tests/volume.js'),
    ('which end of the phone the hand plays at (Chromium)', f'{H} tests/side.js'),
    ('the live mode: a quick start, a noisier room mid-game (Chromium)', f'{H} tests/live_flow.js'),
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
    ('the live mode: the room changing mid-game (DSP2 alone)', f'{H} tests/test_live.js'),
    ('band equalizer (Android)', f'{H} tests/test_eq.js'),
    ('is the probe heard: muted vs noisy', f'{H} tests/test_quiet.js'),
    ('strings and font', f'{H} tests/test_text.js'),
    ('leaderboard server (temporary database)', f'{H} tests/test_server.js'),
    ('first open shows the menu (Chromium)', f'{H} tests/first_open.js'),
    ('buttons light up under the finger (Chromium)', f'{H} tests/press.js'),
    ('the settings: defaults, graphics, band, auto-calibration (Chromium)', f'{H} tests/settings.js'),
    ('skins «shuffle»: the rows, the changes in a game (Chromium)', f'{H} tests/mix.js'),
    ('skins: every object readable on its sky (Chromium)', f'{H} tests/skin_audit.js'),
    ('HD skins: every object readable on its sky (Chromium)', f'env HD=1 {H} tests/skin_audit.js'),
    ('graphics: pixels / HD (Chromium)', f'{H} tests/hd.js'),
    ('skins: objects drawn the size the game counts (Chromium)', f'{H} tests/skin_sizes.js'),
    ('obsidian (graphics chip): objects the size the game counts (Chromium)', f'{H} tests/obsidian_sizes.js'),
    ('game rules and difficulty (bot)', f'{H} tests/test_rules.js'),
    ('race core: deterministic, rules and length (bot)', f'{H} tests/test_race.js'),
]
# the time limit of a check, s — about three times its run on 5 Oct (2 cores, no other load); the rest 180
LIMIT = {'flow': 300, 'race_flow': 200, 'native_audio': 150, 'silent': 120, 'volume': 90, 'side': 60, 'live_flow': 260, 'screens': 1200,
         'test_live': 120, 'mix': 200, 'skin_audit': 120, 'obsidian_sizes': 180, 'test_race': 120}

def key(cmd):   # the check's script name: «flow», «screens», «build», «font»; HD=1 skin_audit is «skin_audit_hd»
    if 'build.py' in cmd: return 'build'
    if 'make_font' in cmd: return 'font'
    k = cmd.split('tests/')[-1].split('.js')[0]
    return k + '_hd' if 'HD=1' in cmd else k

# --changed: which checks each file can break. Patterns are matched in order; every pattern that matches adds its checks.
# A file under src/, server/, lab/src/ or font/ that no pattern knows runs everything (so a new part is never left unchecked).
ALWAYS = ['build', 'font']
MAP = [
    ('src/10_worklet.js src/11_dsp.js lab/src/*', 'test_same_dsp test_live test_quiet test_eq flow live_flow silent'),
    ('src/12_tune.js', 'test_tune flow live_flow'),
    ('src/13_core.js', 'test_core test_rules test_server flow'),
    ('src/14_race.js', 'test_race race_flow test_server'),
    ('src/20_sonar.js', 'flow native_audio silent volume side live_flow test_eq'),
    ('src/21_log.js', 'flow'),
    ('src/22_sfx.js', 'flow native_audio'),
    ('src/23_net.js server/*', 'test_server flow'),
    ('src/3?_lang_*.js font/* game/font.js', 'test_text screens first_open'),
    ('src/00_head.html src/99_end.html src/40_gfx.js src/41_sprites.js src/42_*.js src/44_thumbs.js', 'screens first_open press settings'),
    ('src/43_skins.js src/45_hd.js src/46_vecskins.js src/47_pixskins.js src/48_flight.js src/48_sizes.js',
     'skin_audit skin_audit_hd skin_sizes hd mix obsidian_sizes screens'),
    ('src/48_mix.js', 'mix screens'),
    ('src/48_obsidian.js', 'obsidian_sizes'),
    ('src/48_race*.js', 'race_flow mix skin_audit screens'),
    ('src/49_main.js', 'screens first_open press settings flow mix'),
    ('VERSION game/play/*', ''),   # the build check covers them
]
WATCHED = ('src/', 'server/', 'lab/src/', 'font/')

def changed_files(rev):
    out = subprocess.run(['git', 'diff', '--name-only', rev], cwd=ROOT, capture_output=True, text=True).stdout.split()
    out += subprocess.run(['git', 'ls-files', '--others', '--exclude-standard'], cwd=ROOT, capture_output=True, text=True).stdout.split()
    return sorted(set(out))

def pick(files):
    want, why = set(ALWAYS), {}
    for f in files:
        hit = False
        for pats, checks in MAP:
            if any(fnmatch.fnmatch(f, p) for p in pats.split()):
                hit = True
                for c in checks.split(): want.add(c); why.setdefault(c, f)
        if f.startswith('tests/') and f.endswith('.js'):   # a changed check runs itself
            k = f[6:-3]; hit = True; want.add(k); why.setdefault(k, f)
            if k == 'skin_audit': want.add('skin_audit_hd')
        if not hit and f.startswith(WATCHED): return None, f   # unknown part: everything
    return want, why

lock = threading.Lock(); results = []; T0 = time.time()
RUNNING = os.path.join(ROOT, 'tests', '.running')

def run(title, cmd, env=None):
    t = time.time(); lim = LIMIT.get(key(cmd).replace('_hd', ''), 180)
    p = subprocess.Popen(cmd, shell=True, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, start_new_session=True,
                         env=dict(os.environ, **(env or {})))
    try:
        out, _ = p.communicate(timeout=lim); hung = False
    except subprocess.TimeoutExpired:
        try: os.killpg(p.pid, signal.SIGKILL)   # the check and its browser with it
        except ProcessLookupError: pass
        out, _ = p.communicate(); hung = True
    out = (out or '').rstrip() + (f'\nHUNG: stopped after {lim} s (its limit)' if hung else '')
    ok = not hung and p.returncode == 0 and 'RESULT: FAIL' not in out
    with lock:
        results.append((title + (' — HUNG' if hung else ''), ok, out))
        print(f'\n== {title} == [{time.time() - t:.0f} s]\n{out}', flush=True)

def lane(jobs, env=None):
    for title, cmd in jobs: run(title, cmd, env)

def main():
    args = sys.argv[1:]; quick = None
    if args and args[0] == '--changed':
        rev = args[1] if len(args) > 1 else 'HEAD'; files = changed_files(rev); want, why = pick(files)
        if want is None:
            print(f'--changed: {why} is not in the map — everything runs')
        else:
            print(f'--changed since {rev}: {len(files)} file(s) → ' + (', '.join(sorted(k for k in want if k not in ALWAYS)) or 'only the build and font checks'))
            for k in sorted(why): print(f'  {k}  ← {why[k]}')
            quick = want
    if os.path.exists(RUNNING):
        try: pid = int(open(RUNNING).read().split()[0]); os.kill(pid, 0); print(f'another run is on (process {pid}) — wait for it, or remove tests/.running'); sys.exit(2)
        except (ValueError, ProcessLookupError, PermissionError, IndexError): pass   # a stale mark from a run that died
    open(RUNNING, 'w').write(f'{os.getpid()}\n'); atexit.register(lambda: os.path.exists(RUNNING) and os.remove(RUNNING))
    signal.signal(signal.SIGTERM, lambda *a: sys.exit(1))
    sel = (lambda L: [j for j in L if key(j[1]) in quick]) if quick is not None else (lambda L: L)
    lane(sel(REALTIME))
    envA = {'SCREENS_QUICK': '1'} if quick is not None else None   # --changed: the screens at two sizes
    if os.environ.get('SERIAL'): lane(sel(LANE_A), envA); lane(sel(LANE_B))
    else:
        a = threading.Thread(target=lane, args=(sel(LANE_A), envA)); b = threading.Thread(target=lane, args=(sel(LANE_B),))
        a.start(); b.start(); a.join(); b.join()
    bad = [r for r in results if not r[1]]
    for title, ok, out in bad: print(f'\n!! FAILED: {title}\n{out}')
    print(f'\n{len(results) - len(bad)} of {len(results)} checks ok in {time.time() - T0:.0f} s' + (' (only what the changes can break)' if quick is not None else '')
          + (f'; FAILED: {", ".join(t for t, _, _ in bad)}' if bad else ''))
    print('RESULT: ok' if not bad else 'RESULT: FAIL'); sys.exit(1 if bad else 0)

if __name__ == '__main__': main()
