# Sonaroids — game design

Agreed on 24 September 2026. The control mechanism is done and documented in `lab/HANDOVER.md` (Russian); this document is about the game, built from scratch. The Russian original is `docs/ru/design.md`.

Marks: **agreed** — decided; **trying** — to be decided live on the prototype; **open** — not discussed yet.

---

## 1. Principles

- **One hand, no touching while flying.** The height of your palm above the table, next to the phone, is the only control. Buttons exist only outside the flight: start, menu, retry. — agreed
- **Retro pixels, but beautiful.** Not a 1979 arcade cabinet and not a VHS tape: modern pixel art with light, particles and smooth motion. — agreed
- **Tiny.** The whole game under 100 KB. Graphics, sound and font are generated in code. — agreed
- **Few words.** Instructions are pixel pictures; after every command there is a pause so the player has time to get ready. — agreed

## 2. Platforms

- Web app at sonaroids.app: iPhone from the Home Screen icon, Android in Chrome. Updates itself on the next launch. — agreed
- Android APK — a thin wrapper around the site. First the mechanics are checked on 2–3 different Android phones with the lab's test recording: speakers and microphones differ, and not all of them handle 18–20 kHz. — agreed
- No native iPhone app.

## 3. First screens

**Look — "volume":** the table seen from the front-left and above, the phone lying flat, the palm hovering by the edge with the charging port. The palm is drawn slightly smaller than real, the phone 1.6× larger than real so its screen is readable: a tiny ship on it follows the palm. The palm is face down and across the phone: fingers pointing away, the arm coming from the player. Under the palm — its shadow and a dotted height line; next to it a 5–15 cm ruler. Probe waves spread over the table from the phone. At the bottom — step squares, a pause ring, and a "Next" button on the free-hand side. — agreed
Rejected: "diagram" (top and side views) and "in-game" (a height rail at the screen edge with a ghost hand).

Each screen is a picture and one or two lines. A command appears, a pause ring fills (about 1.5 s), and only then the game starts listening.

1. **Language:** ENGLISH / РУССКИЙ. Only on first launch; later in the menu. — agreed
2. **Sound — two plain commands in a row**, one picture each: — agreed
   - "Turn off silent mode" — the ring/silent switch on the side of the phone: the orange stripe disappears, the bell is no longer crossed out;
   - "Set the ringer volume to 30–70%" — a bell and a 10-step volume scale with the 3–7 range highlighted.
   If the probe is not heard at the "take your hand away" step, the first command becomes more direct: "Your phone is in silent mode — turn it off."
   On the maintainer's iPhone the probe follows the ringer volume, not the media volume; to be verified on the game skeleton. Shown on first launch and whenever the probe check finds the probe barely audible. The auto-level adjusts the exact probe level, hence the wide range.
3. **Put the phone down:** screen up, charging port towards the hand you'll play with. The microphone is next to the port, so the phone actually decides the side; the app verifies it acoustically. Buttons move to the free-hand side. — agreed
4. **Microphone permission** — the system prompt, preceded by one line saying why.
5. **"Take your hand away"** — 2 seconds: probe level and the empty room.
6. **"Wave your palm, 5–15 cm above the table"** — the ship follows the hand right away while the game fits the screen to your range. Tutorial and first "wow" at once. — agreed
7. The game.

Later launches: steps 5–6 and straight into the game.

## 4. The game

- **The ship fires on its own**, always forward. The player only chooses height: rise to a rock — it's shot; leave its line — dodged. — agreed
- **Rocks split:** large → two medium → two small. 20 / 50 / 100 points, as in the original. — agreed
- **Points by height:** middle of the screen ×3, then ×2, edges ×1 — otherwise hugging the edge pays off, since rocks can reach you there from one side only. **Not shown on screen** — the rule works silently. — agreed
- **Streak:** every 5 hits in a row add +1 to the multiplier; getting hit resets it. — agreed
- **Power-ups** — you have to fly into them: shield (one hit), triple shot (10 s), slow motion (6 s). Candidates for later: magnet, piercing laser. — agreed
- **Flying saucer**, as in the original: shoots at the ship; you dodge by height. Appears from level 5–6. Large — 200 points, small aiming one — 1000. — agreed
- **No breaks:** a game runs continuously, 5–10 minutes on average. The arm doesn't get tired with the elbow on an armrest. — agreed
- **Levels** by score: rock speed and density grow; saucers from level 5–6. 3 lives. — agreed
- **One difficulty:** the game gradually speeds up and gets harder; no easy/normal/hard choice. — agreed

## 5. Modes and leaderboards

- **Regular game** and **daily challenge** — the same rock layout for everyone on a given day. — agreed
- **Shared leaderboards:** all-time and today's challenge. — agreed
- **Player name** — a normal nickname, not three letters: up to 16 characters from Latin, Cyrillic, digits and simple symbols (everything the pixel font can draw). No registration; the nickname is stored on the device and asked once, at the first leaderboard score. Server side: a simple profanity filter and rate limiting. — agreed
- **Anti-cheat:** the game is deterministic given the layout seed. Together with the score the client sends the palm trajectory (a few KB); the server replays the game with the same game code and checks the score. — agreed

## 6. Look

Prototype: `game/proto/` — the ship follows your finger.

- **Rendering:** the game is drawn at low resolution in whole pixels and scaled up without smoothing. On top, at full resolution, soft light: shots, engine, explosions, power-ups. — agreed
- **Pixel size — medium:** about 215 pixels of screen height. Large (160) and small (280) rejected. — agreed
- **Style "Dusk":** lilac space with nebulae, pastel rocks, mint ship, apricot shots, lilac saucer, yellow power-ups. — agreed
  Rejected: "Midnight" (dark blue, orange ship) and "Outline" (near-monochrome rock outlines).
- **Rocks** have volume: light from the top left, craters, 16 rotation frames, tone transitions by ordered dithering. — trying
- **Font:** our own 5×7 pixel font with Latin, Cyrillic, digits and punctuation, 3.5 KB (`font/`). In the game, text is drawn with the same pixel as the picture, all one size, told apart by colour; a smaller text pixel was tried and looked worse. The site's landing page uses its own pixel, about 1.3 CSS px. — agreed
- **In flight, only the score is shown at the top.** No labels: no streak, multipliers, shield or floating points. — agreed
  How to show lives and shield without words (e.g. a glow around the ship) — to be decided on the skeleton. — open
- **Sound:** event sounds only — shot, split, power-up, hit, level. Synthesised in code in the spirit of old consoles, everything below 6 kHz so it doesn't disturb the probe. **No background music.** — agreed

## 7. Technology

- **The game is on GitHub Pages**, open repository. A static site: HTML, JS and a little data. GitHub Actions on every change to `main` runs the checks and publishes. A service worker keeps the game working offline and updates it on the next launch. — agreed
  Why not our own server: GitHub serves the site worldwide for free with HTTPS for sonaroids.app, and it doesn't depend on the leaderboard server — if that goes down, the game keeps working and only the tables disappear.
- **Leaderboard server** — on the maintainer's own VPS, a small Node + SQLite service at `api.sonaroids.app`. Games are verified with the same game code as in the browser. — agreed
- **Server code is in this repository too** (`server/`).
- **Repository layout:** `game/` — the game; `server/` — leaderboards; `lab/` — the sonar lab and its test benches; `docs/` — documents. UI strings — one file per language.
- **The mechanics move over from the lab as they are:** DSP2 (hand presence, fast and absolute parts, centring, wave-based auto-tuning, bottom stretch), auto-level, side detection, logs for analysis.

## 8. Order of work

1. ~~Choose style, ×3 display, pixel size and onboarding look~~ — "Dusk", ×3 hidden, medium pixels, "volume" onboarding.
2. ~~Repository foundation: docs, lab, landing page, publishing to sonaroids.app~~ — live since 24 Sep; our own 5×7 pixel font is done.
3. Game skeleton: first-launch screens, mechanics from the lab, rendering, sound, own font — built 24 Sep (`src/`, sonaroids.app/play), to be checked on phones.
4. Game rules: rocks, splitting, points, streak, power-ups, saucer, levels.
5. Leaderboards: server, game verification, tables, daily challenge.
6. Android: mechanics check on different phones, then the APK.

## 9. Open questions

- App icon and how it looks on the Home Screen.
