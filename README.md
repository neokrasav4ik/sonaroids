# Sonaroids

A tiny retro space game for phones that you steer with one hand — **without touching the screen**.

The phone lies flat on the table. It plays an inaudible ultrasonic tone (18–20 kHz) through its own speaker and listens to the echo with its own microphone. The height of your palm next to the phone, 5–15 cm above the table, becomes the height of your ship. The ship fires on its own; you only choose where to be.

**Status:** early version at [sonaroids.app/play](https://sonaroids.app/play/): first-launch guide, calibration, the full game (splitting rocks, points by height, power-ups, saucers, growing difficulty), pause menu and logs. The sonar control comes from `lab/`. Design: `docs/design.md`, changes: `CHANGELOG.md`.

**Phones.** It works best on **iPhone** (add it to the Home Screen). On **Android** (Chrome) it depends on the phone's speaker and microphone: many phones pass the 18–20 kHz band poorly, and control can be noticeably worse or not work at all. Tried so far: OnePlus 13 — poor; Redmi Note 10 — the palm is heard only at the front-camera end, and not precisely. Details in `docs/design.md`, section 2.

- Web app: [sonaroids.app](https://sonaroids.app). An Android APK wrapper is postponed until the mechanics work well on Android.
- Target size: the whole game under 100 KB. Graphics, sound and font are generated in code.
- Shared leaderboards: today, this week, all time; every game on a freshly generated layout, no daily challenge. The server replays each game to check the score.

## Repository

| path | what's inside |
|---|---|
| `src/` | the game's source, in numbered parts. `build.py` joins them into one file, `game/play/index.html`. |
| `game/` | the published site (sonaroids.app): landing page, `play/` — the game (built file, icons, manifest, service worker), `proto/` — the style prototype, `font.js`. |
| `font/` | the game's own 5×7 pixel font (Latin and Cyrillic): `font5x7.txt` is the drawing, `make_font.py` packs it into `game/font.js`. |
| `tests/` | the game's checks, `sh tests/run.sh`. |
| `lab/` | the sonar lab: the working test app `lab/app/sonar_lab3.html`, its sources and offline test benches. Notes in Russian. |
| `docs/` | design document (`design.md`; Russian original in `docs/ru/`). |
| `server/` | the leaderboard server (api.sonaroids.app): plain Node + SQLite, replays every game with the game's own rules. Install: `server/README.md` (Russian: `docs/ru/server.md`). |

### The game's code (`src/`)

| part | what it does |
|---|---|
| `00_head.html`, `99_end.html` | the page around the script |
| `10_worklet.js`, `11_dsp.js` | microphone frames and the echo processing (DSP2) — moved over from the lab unchanged |
| `12_tune.js` | wave tuning: fits the screen to the player's palm range (pure, tested in Node) |
| `13_core.js` | the flight itself, deterministic: fixed 60 Hz steps, seeded RNG, no transcendental functions — so the server can replay a game |
| `20_sonar.js` | speakers and microphone: probes, side check, auto level, getting ready; `Sonar.simulate()` feeds synthetic frames in tests |
| `21_log.js` | setup and game logs (WAV + JSON), readable by the lab's tools |
| `22_sfx.js` | event sounds, all below 6 kHz |
| `23_net.js` | the leaderboard client: sends a game (seed + palm heights), the name, reads the tables |
| `30_lang_en.js`, `31_lang_ru.js` | UI strings |
| `40_gfx.js`, `41_sprites.js`, `42_guide.js`, `49_main.js` | drawing, first-launch pictures, screens and the game loop |

The game's version is in `VERSION` (shown on the title screen and written into the logs); `CHANGELOG.md` lists what each version changed. Bump it with every upload.

Edit the parts, then `python3 build.py` (and `python3 font/make_font.py` after changing the font). CI refuses a build that doesn't match its sources.

## How the sonar works, in short

- The probe is a periodic multi-tone signal (512 samples at 48 kHz, 23 tones between 18.4 and 20.4 kHz). An AudioWorklet delivers the microphone stream sample-exact, so the room's impulse response can be computed coherently every 10.7 ms.
- Palm **motion** is read from the phase change of the echo (sub-millimetre resolution, drifts slowly); palm **position** is read from where the echo sits relative to the empty room (noisy, but doesn't drift). The two are fused: motion drives the ship, position keeps it from wandering.
- No calibration: before each game you wave your palm a few times and the game fits the screen to your range.

Details, measurements and what didn't work: `lab/HANDOVER.md` (Russian).

## Running the checks

```
sh tests/run.sh              # the game: build matches src/, font, core determinism, tuning, strings, screens, the whole flow
cd lab && sh tools/run_all.sh   # the sonar lab
```

Node 18+ and Python 3. The screen and flow checks run the game in headless Chromium with a synthetic microphone and need Playwright; without it they are skipped (as on GitHub Actions).

## License

MIT — see `LICENSE`.
