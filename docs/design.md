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
- **Works best on iPhone; on Android it depends on the phone** (speaker and microphone at 18–20 kHz). Said so in the README and on the landing page. — agreed 25 Sep
- Android APK — a thin wrapper around the site, postponed: first the mechanics have to work well on Android phones (see below). — agreed
- No native iPhone app.
- **Android, first tries on 24 Sep (OnePlus 13 and Redmi Note 10, Chrome):** on the OnePlus control is poor already while getting ready. From the logs: the palm's echo relative to the direct signal is ~12 dB weaker than on iPhone (the palm flickers in and out), the fast and absolute parts hardly agree, and after loud game sounds the direct signal lost its steadiness in one game (−20 dB). The microphone does come without processing (the 0.14 log shows it). The Redmi is better, but the palm has to be held further to the side. Next: the lab's labelled recording on both phones, to measure against a known path. — open
  - Labelled recordings on the OnePlus (24 Sep, 22:27 hand as on iPhone, 22:28 hand further out): the cause is not the microphone but the speaker→microphone path, whose gain drifts 2–3 dB within seconds, while the tail of the direct sound near the phone is strong (−27 dB vs −55 on iPhone). The empty room then looked 20 dB "louder" than it is and the palm sank into it. Since 0.17 the echo is measured against the direct sound's own level and phase (learned only in a quiet empty room): shape agreement 0.73 → 0.99 and −0.05 → 0.93, iPhone unchanged. A still palm is still seen poorly on the OnePlus (its echo is only ~10 dB over the empty room) — next OnePlus logs will tell. — in progress
  - Redmi: the palm is heard only at the front-camera end, not at the port (checked 24 Sep, night). So the louder channel before 0.17 was right; the picture was wrong (it drew the port towards the hand). Since 0.18 the game learns which end of the phone the hand plays at: first guess from the louder channel; no palm for 6 s of waving → "wave on the other side"; once the range is caught that end (port or camera) is remembered for the phone and the pictures show it. — done, to check
  - OnePlus, recording 23:40: Android inserted 40 ms of silence into the input, the whole echo picture shifted in delay and the "hand" was seen forever. Since 0.18 silent frames are skipped and the direct sound is found again: shape 0.75 → 0.94. The palm echo on the OnePlus is still weak — a still hand is seen poorly. — done
  - OnePlus game 00:02 (0.18): while waving before the game the fast part and the echo range agree (0.84, as on iPhone), in flight they do not (about 0). In flight the game's sounds reach the microphone 20–35 dB louder than on iPhone (peaks up to 0.84) and in loud moments the range jumps half as much again; even without them the OnePlus range is 2.5× noisier than iPhone's. Since 0.19 the sounds are turned down sooner and further and the level is remembered. The deciding test: a OnePlus game with sounds off. — in progress
  - Redmi, recording 00:07: hand at the port (the lab chose that end) — the palm is barely seen, echo ~10 dB over empty. Needed: a recording with the hand at the camera. — open
  - 25 Sep: a OnePlus game with sounds off was no better — sounds are not the main thing. The main thing is in the spectrum: on the OnePlus and the Redmi the probe reaches the microphone 20–33 dB weaker at 20 kHz (iPhone ~11 dB), so the top half of the band is nearly lost. Since 0.20 the band is equalized (only on such phones): OnePlus against the label 81 → 13 mm, 109 → 42 mm, a still palm is seen; iPhone unchanged. Redmi at the camera (recording 00:24): the palm is seen, but shape 0.69–0.76 against 0.98 on iPhone — its echo is only ~15 dB over the empty room. — in progress
  - 25 Sep: Android is put aside — the focus is iPhone. — agreed
- **Screen and palm range (v0.21, iPhone game 00:44 "harder to steer, hardest to go down"):** the whole screen had grown to the 15 cm cap of palm travel — the palm was waved wide, also on the try-out screen, where tuning kept going; in flight the palm reached the lowest 15% of the screen only now and then. Now: the whole screen takes at most 12 cm; the lowest waved point lands on 6% of the screen (was 10%); tuning stops the moment the range is caught, and that step lands fully — the try-out screen shows exactly what the game will use. Not the sonar: the labelled recording 00:41 is fine (shape 0.95), and the pull towards the absolute part at the bottom hardly affected this game (checked by re-running the fusion). — agreed 25 Sep
- **The bottom near the table (v0.23, ruler recording 11:09 at 4–12 cm):** with the palm at 4–5 cm the sonar's absolute part reads 25–40 mm too high and quickly pulled the ship up — the rubber band at the bottom. Now below the middle it pulls up without speeding up and only past ±15 mm: shape on that recording 0.83 → 0.91, hold jitter 6.9 → 4.1 mm; the other iPhone recordings the same or better. Down there the sonar still sees motion weaker (66% of the real swing against 85–107% at 5–15 cm) — the wave tuning absorbs that. — agreed 25 Sep
- **Lag on sharp moves ("yo-yo", v0.23):** not the pull towards the absolute part — after quick moves it does not chase the ship (checked on 12 games). The chain palm → microphone → sonar → ship is ~0.1 s; the game's own smoothing in it is cut from 45 to 25 ms (fine ship jitter +8%). With a small range the hand travels less and sooner, so the same delay shows less; big fast swings also near the sonar's speed limit (~40 cm/s). — agreed 25 Sep

## 3. First screens

**Look — "volume":** the table seen from the front-left and above, the phone lying flat, the palm hovering by the edge with the charging port. The palm is drawn slightly smaller than real, the phone 1.6× larger than real so its screen is readable: a tiny ship on it follows the palm. The palm is face down and across the phone: fingers pointing away, the arm coming from the player. Under the palm — its shadow and a dotted height line; next to it a 5–15 cm ruler. Probe waves spread over the table from the phone. At the bottom — step squares, a pause ring, and a "Next" button on the free-hand side. — agreed
Rejected: "diagram" (top and side views) and "in-game" (a height rail at the screen edge with a ghost hand).

Each screen is a picture and one or two lines. A command appears, a pause ring fills (about 1.5 s), and only then the game starts listening.

1. **Language:** ENGLISH / РУССКИЙ. Only on first launch; later in the menu. — agreed
2. **Sound — one command:** "Set the volume to 30–70%", with "with the volume buttons" under it. A speaker and a 10-step scale with 3–7 lit. — agreed 24 Sep
   Checked on the maintainer's iPhone on 24 Sep: the probe follows the **media** volume (the one the side buttons change while the game plays); silent mode does **not** mute it, media volume at zero does. So the "turn off silent mode" and "ringer volume" screens are gone.
   If the probe is not heard at the "take your hand away" step, the command becomes more direct: "The volume is too low — turn it up to 30–70%". "Not heard" is decided by how loud the probe itself is, not by signal-to-noise. The auto-level adjusts the exact probe level, hence the wide range.
3. **Put the phone down:** screen up, charging port towards the hand you'll play with. The microphone is next to the port, so the phone actually decides the side; the app verifies it acoustically. Buttons move to the free-hand side. — agreed
4. **Microphone permission** — the system prompt, preceded by one line saying why.
5. **"Take your hand away"** — 2 seconds: probe level and the empty room.
6. **"Wave your palm, 5–15 cm above the table"** (4–12 was tried in v0.22–0.25; back to 5–15 in v0.26 — the sonar is weaker near the table) — the ship follows the hand right away while the game fits the screen to your range. Tutorial and first "wow" at once. — agreed Once the range is caught, the table picture goes and the real ship at game size follows the palm — you see at once whether calibration came out right; next to it "Play" and under it "Recalibrate" (the empty room again, then wave). "Recalibrate" is no longer in the title menu. — agreed 24 Sep, v0.17
7. The game.

Later launches: steps 5–6 and straight into the game. **Before every new game** ("Again") "take your hand away" (the empty room anew, v0.16) and the wave step come again: the screen is fitted to the range anew; only a range of 5 cm or more counts as waving, and the waving must go on for at least 5 s — the ring fills over that time (v0.10). No tuning on the game-over screen: on 24 Sep an idle wiggle after a game shrank the field from 118 to 66 mm and the ship got twitchy. — agreed 24 Sep

## 4. The game

- **The ship fires on its own**, always forward. The player only chooses height: rise to a rock — it's shot; leave its line — dodged. — agreed
- **Rocks split:** large → two medium → two small. 20 / 50 / 100 points, as in the original. — agreed
- **Points by height:** the middle of the screen ×3, then ×2, the edges ×1. **Not shown on screen.** — agreed
- **Streak:** every 5 hits in a row add +1 to the multiplier, up to ×4; getting hit resets it. — agreed
- **Power-ups** — you have to fly into them: shield (one hit, up to 15 s; shown as a ring of dots around the ship), triple shot (10 s), slow motion (6 s) — only once the game has sped up (~110 s). One every 12–18 s. — agreed Since v0.24 there is also a **life** (a heart): only after a life was lost, about one power-up in five, never above three lives; taking it shows the lives by the ship for a moment. — agreed 25 Sep
- **Pause** (the corner button): GO ON / START OVER / END THE GAME / EXIT TO MENU. "Start over" asks: PLAY NOW (a countdown with the same calibration) or RECALIBRATE (the empty room and waving); the dropped game's score counts for the best. — agreed 25 Sep, v0.24
- **Logs for analysis (v0.27):** always written, but the "logs" button after a game is hidden; a tap on the version number in the corner of the game-over screen shows it (until the game is restarted). "Early version" removed. — agreed 25 Sep
- **Site (v0.28):** sonaroids.app opens straight into the game (no landing page; the game stays at /play/, where home-screen icons point). The title screen has "Source code" (GitHub) above the version and, on Android, the note "on Android it does not work on every phone". The sonar lab stays at /lab/sonar_lab3.html and the style prototype at /proto/, unlinked and closed to search engines. — agreed 25 Sep
- **One difficulty that grows with time:** calm but not empty for the first 15 s, then a smooth rise: rocks per second 0.74 at the start → 1.1 at 2 min → 1.35 at 3 min → 1.6 at 5 min (speed ×1.7 by 3 min, ×2.2 by 7 min, frequency = pace to the power 1.125). — v0.13 — agreed
- **Levels** count base points (before the height and streak multipliers, which reach ×12): a level every 5000. The large saucer from level 2 (~30 s), the small aiming one from level 4 (~1 min); v0.13. The maintainer asked for saucers earlier: with the bot (v0.9) the first saucer comes at ~0.8 min and a middling bot lasts ~5 min; live games are shorter so far, ~3 min. — agreed 24 Sep
- **3 lives**, shown only at the moment of a hit — tiny ships above the ship. — trying
- **"Is the probe heard"** is decided by how loud the probe itself is, not by signal-to-noise: a noisy room must not send the player to "turn up the volume". — agreed 24 Sep
- **Flying saucer**, as in the original: shoots at the ship; you dodge by height. Large — 200 points, small aiming one — 1000. — agreed Since v0.17 the saucer is a mini-boss, a little harder: it sidesteps when the ship stays level with it (not always, not again right away), moves up and down faster, the large one takes two hits (flashes white after the first), and it cannot be shot off screen. With the bot a saucer lives 5.9 s instead of 3.8. — agreed 24 Sep
- **No breaks:** a game runs continuously, 5–10 minutes on average. The arm doesn't get tired with the elbow on an armrest. — agreed

## 5. Modes and leaderboards

- **One regular game:** every game is played on a freshly generated layout. No daily challenge (the same layout for everyone on a day). — agreed 25 Sep
- **Shared leaderboards:** three tabs — today, this week, all time (UTC: the day from midnight, the week from Monday); one line per player, their best game. — agreed 25 Sep, v0.25
- **Player name:** 1–16 Latin letters, digits and `_` only (25 Sep). No sign-up; the player is a random key on the phone, the name is asked once, at the first place in a table (top 100), changed on the high-scores screen. The server has a word filter and rate limits. — agreed
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
- **Leaderboard server (v0.25):** the maintainer's VPS (Ubuntu/Debian, no Docker): Node 22.13+ with no packages (`node:sqlite`), systemd, HTTPS by Caddy, `api.sonaroids.app`. A game travels as its layout seed and the palm height of every step (rounded to 1/4000 — the game steps with exactly those numbers); the server replays it with the same `src/13_core.js`. Install: `server/README.md`. Earlier note: on the maintainer's own VPS, a small Node + SQLite service at `api.sonaroids.app`. Games are verified with the same game code as in the browser. — agreed
- **The phone note (v0.29):** every game and every getting-ready attempt (from all players, also those who never get to play) carries a short note: iOS/Android, kind of browser, the model on Android, probe level and SNR, band equalizer, input trouble, the hand's end of the phone, whether noise suppression / echo cancelling / auto gain were really off. No user agent string or IP is stored. Summary: `server/stats.js`. Why: to see where the sonar works without asking for logs. — decided 25 Sep
- **Server code is in this repository too** (`server/`).
- **Repository layout:** `game/` — the game; `server/` — leaderboards; `lab/` — the sonar lab and its test benches; `docs/` — documents. UI strings — one file per language.
- **The mechanics move over from the lab as they are:** DSP2 (hand presence, fast and absolute parts, centring, wave-based auto-tuning, bottom stretch), auto-level, side detection, logs for analysis.

## 8. Order of work

1. ~~Choose style, ×3 display, pixel size and onboarding look~~ — "Dusk", ×3 hidden, medium pixels, "volume" onboarding.
2. ~~Repository foundation: docs, lab, landing page, publishing to sonaroids.app~~ — live since 24 Sep; our own 5×7 pixel font is done.
3. Game skeleton: first-launch screens, mechanics from the lab, rendering, sound, own font — built 24 Sep (`src/`, sonaroids.app/play), to be checked on phones.
4. Game rules: rocks, splitting, points, streak, power-ups, saucer, levels — built 24 Sep, difficulty tuned with a bot (`tests/bot.js`), to be checked by playing.
5. ~~Leaderboards: server, game verification, tables~~ — live since 25 Sep (v0.25–0.26, api.sonaroids.app on the maintainer's VPS, nginx + certbot).
6. Android (postponed 25 Sep): mechanics on phones with a weak 18–20 kHz path, then the APK.

## 9. Open questions

- ~~App icon and how it looks on the Home Screen~~ — agreed 25 Sep (v0.27): in the sonar lab's style — black space, a neon-orange outlined ship, white outlined rocks (like vector Asteroids); a separate one with margins for Android's round mask.
