# Changes

The game's version is in `VERSION`; `build.py` puts it into the game (title screen, logs) and into the service worker.
Bump it with every upload.

| version | date | what changed |
|---|---|---|
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
