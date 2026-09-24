# Sonaroids

A tiny retro space game for phones that you steer with one hand — **without touching the screen**.

The phone lies flat on the table. It plays an inaudible ultrasonic tone (18–20 kHz) through its own speaker and listens to the echo with its own microphone. The height of your palm next to the phone, 5–15 cm above the table, becomes the height of your ship. The ship fires on its own; you only choose where to be.

**Status:** the sonar control works (see `lab/`); the game itself is being built. Style and onboarding are agreed — see `docs/design.md` and the prototype at `game/proto/`.

- Web app: [sonaroids.app](https://sonaroids.app) — iPhone (add to Home Screen) and Android (Chrome). An Android APK wrapper will follow.
- Target size: the whole game under 100 KB. Graphics, sound and font are generated in code.
- Shared leaderboards: all-time and daily challenge.

## Repository

| folder | what's inside |
|---|---|
| `game/` | the game (static site, published to sonaroids.app). For now: a landing page and the style prototype. |
| `lab/` | the sonar lab: the working test app `lab/app/sonar_lab3.html`, its sources and offline test benches. Notes in Russian. |
| `font/` | the game's own 5×7 pixel font (Latin and Cyrillic): `font5x7.txt` is the drawing, `make_font.py` packs it into `game/font.js`. |
| `docs/` | design document (`design.md`; Russian original in `docs/ru/`). |
| `server/` | *(later)* leaderboard server. |

## How the sonar works, in short

- The probe is a periodic multi-tone signal (512 samples at 48 kHz, 23 tones between 18.4 and 20.4 kHz). An AudioWorklet delivers the microphone stream sample-exact, so the room's impulse response can be computed coherently every 10.7 ms.
- Palm **motion** is read from the phase change of the echo (sub-millimetre resolution, drifts slowly); palm **position** is read from where the echo sits relative to the empty room (noisy, but doesn't drift). The two are fused: motion drives the ship, position keeps it from wandering.
- No calibration: before each game you wave your palm a few times and the game fits the screen to your range.

Details, measurements and what didn't work: `lab/HANDOVER.md` (Russian).

## Running the checks

```
cd lab
python3 build.py --check     # the lab app matches its sources
sh tools/run_all.sh          # offline test benches (Node 18+, Python 3)
```

## License

MIT — see `LICENSE`.
