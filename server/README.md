# Leaderboard server (api.sonaroids.app)

Plain Node, no npm packages: `node:http`, `node:sqlite`, `node:zlib`, `node:crypto`. Needs **Node 22.13 or newer**.
Every game the page sends is **replayed with the game's own rules** (`src/13_core.js`, the same file the browser runs);
only a score the replay reproduces is stored. Russian step-by-step guide: `docs/ru/server.md`.

| file | what it is |
|---|---|
| `server.js` | the server: `POST /v1/game`, `POST /v1/nick`, `GET /v1/top?period=day\|week\|all`, `GET /v1/health` |
| `backup.js` | a daily copy of the database (`VACUUM INTO`), keeps 14 |
| `sonaroids-api.service` | systemd unit: runs as user `sonaroids`, data in `/var/lib/sonaroids` |
| `Caddyfile` | HTTPS for api.sonaroids.app in front of the Node server |

**How a game travels.** Seed, field width, start height and the palm height of every 60 Hz step, rounded to 1/4000
(the page steps with exactly those numbers), as 16-bit values, raw-deflated, base64: a few KB for a few minutes of play.
The player is a random 128-bit secret kept on the phone; the database stores only its hash. Nicknames: 1–16 Latin
letters, digits and `_`, plus a small word filter. Tables: best game per named player, UTC day / week from Monday / all time.
Limits: 20 writes and 120 reads a minute per address, 256 KB per request, 45 minutes per game.

**Rules change → tag change.** When a change in `src/13_core.js` alters play, bump `TAG` there and update the server
together with the site: games played by other rules are refused (`409 core`), and the page asks for an update.

## Install (Ubuntu / Debian VPS)

```sh
# DNS first: an A record "api" → the server's IPv4 at the domain registrar
sudo apt update && sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs   # node -v → v22.13+
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

sudo useradd --system --home /var/lib/sonaroids --shell /usr/sbin/nologin sonaroids
sudo mkdir -p /var/lib/sonaroids && sudo chown sonaroids:sonaroids /var/lib/sonaroids
sudo git clone https://github.com/neokrasav4ik/sonaroids.git /opt/sonaroids

sudo cp /opt/sonaroids/server/sonaroids-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now sonaroids-api
curl http://127.0.0.1:8787/v1/health              # {"ok":true,"core":"rules-2"}

sudo cp /opt/sonaroids/server/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy   # or add the block to an existing Caddyfile
sudo ufw allow 80,443/tcp                          # only if ufw is on
curl https://api.sonaroids.app/v1/health

# daily backup at 04:15
( sudo crontab -u sonaroids -l 2>/dev/null; echo '15 4 * * * cd /opt/sonaroids && DB=/var/lib/sonaroids/sonaroids.db /usr/bin/node --no-warnings server/backup.js' ) | sudo crontab -u sonaroids -
```

**Update:** `cd /opt/sonaroids && sudo git pull && sudo systemctl restart sonaroids-api`.
**Logs:** `journalctl -u sonaroids-api -n 100`.
Already running nginx on ports 80/443? Put a `proxy_pass http://127.0.0.1:8787;` site for api.sonaroids.app there
(with certbot for HTTPS) instead of Caddy.

**Tests** (no server needed): `node --no-warnings tests/test_server.js` — a temporary database, a real replayed game,
a forged score, a duplicate, bad names, tables and ranks.
