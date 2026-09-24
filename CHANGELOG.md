# Changes

The game's version is in `VERSION`; `build.py` puts it into the game (title screen, logs) and into the service worker.
Bump it with every upload.

| version | date | what changed |
|---|---|---|
| 0.14 | 24 Sep 2026 | Android (OnePlus 15, Chrome): the game's own sounds reached the microphone ~50 dB louder than on iPhone — now they are turned down automatically when the microphone nears its limit. Logs no longer clip on loud microphones (full scale chosen per device) and record what the browser really did with the microphone (gain/echo/noise processing). |
| 0.13 | 24 Sep 2026 | Smoother difficulty ("first empty, then crowded"): about 20% more rocks at the start, then slower growth — rocks per second 0.74 → 1.1 at 2 min → 1.35 at 3 min → 1.6 at 5 min (was 0.62 → 1.5 at 2.5 min → 2 at 5.5 min). Slow motion power-up from ~110 s. Saucers earlier: the large one from level 2 (~30 s), the small aiming one from level 4 (~1 min). The triple-shot power-up shows three diverging shots. |
| 0.12 | 24 Sep 2026 | Less work for the phone (it warmed up): the game is drawn on a small canvas and scaled by the browser, soft light on a half-resolution layer from ready-made sprites, the first-launch table drawn once, at most 60 frames a second in flight and 30 elsewhere. Buttons act when the finger lifts ("logs" needed two taps). Pause menu: "exit to menu". |
| 0.11 | 24 Sep 2026 | Sonar: the fast part is pulled back to the absolute one faster the further it has drifted (fast wide waving made the ship stick to an edge); the same change in the lab. The menu button moved further into the top corner. |
| 0.10 | 24 Sep 2026 | Getting ready is calmer: 2 s before listening to the empty room, "the room is quiet" stays 1.5 s, 2.5 s before catching the range, and waving must go on at least 5 s before the range counts (the ring fills over those 5 s). The service worker skips the browser cache, so a new upload reaches the phone on the next launch. |
| 0.9 | 24 Sep 2026 | Buttons 10% taller, more space between buttons in columns. Livelier start: the calm part 30 → 15 s with more rocks from the first second, rocks keep getting more frequent than faster later (pace^1.25). Slow motion power-up only once the game has sped up (~70 s). |
| 0.8 | 24 Sep 2026 | Before every game the wave step comes again ("Again" → "Wave your palm"); no tuning on the game-over screen; a range counts as waved from 5 cm. Version number on the title screen and in the logs. |
| 0.7 | 24 Sep 2026 | The microphone is re-opened after the app was in the background (iOS takes it away); a paused game continues after getting ready again. |
| 0.6 | 24 Sep 2026 | All buttons 16% larger and a little higher. |
| 0.5 | 24 Sep 2026 | Menu button in flight: pause, go on, end the game. |
| 0.4 | 24 Sep 2026 | "Too quiet" is decided by the probe's own level: a palm moving nearby no longer blocks the next start. |
| 0.3 | 24 Sep 2026 | The field starts right of the camera island; one sound screen: media volume 30–70% (silent mode does not mute the probe). |
| 0.2 | 24 Sep 2026 | Game rules: splitting rocks, points by height, streak, power-ups, saucers, growing difficulty. |
| 0.1 | 24 Sep 2026 | Game skeleton: first-launch screens, sonar from the lab, flight with test rocks, logs, home-screen icon. |
