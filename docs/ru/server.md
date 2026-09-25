# Сервер рекордов (api.sonaroids.app) — установка по шагам

Сервер — одна программа на Node без сторонних пакетов, база — один файл SQLite. Каждую присланную партию сервер
**переигрывает тем же кодом игры** (`src/13_core.js`) и записывает только счёт, который повторился.
Нужен VPS на Ubuntu или Debian и **Node 22.13 или новее**. Английская версия с теми же командами — `server/README.md`.

## 0. DNS

У регистратора домена (Porkbun → sonaroids.app → DNS) добавь запись:
тип **A**, хост **api**, значение — IPv4-адрес сервера. Если у сервера есть IPv6 — ещё запись **AAAA** с ним.
Проверка через несколько минут: `ping api.sonaroids.app` показывает адрес сервера.

## 1. Node, git и Caddy

Заходишь на сервер по SSH и выполняешь по очереди:

```sh
sudo apt update && sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
node -v            # должно быть v22.13 или больше

sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Caddy сам получает и продлевает сертификат HTTPS. Если на сервере уже работает nginx на портах 80/443 (проверка: `sudo ss -tlnp | grep -E ':(80|443) '`), Caddy не нужен — в шаге 4 вариант для nginx.

## 2. Пользователь, папки, код

```sh
sudo useradd --system --home /var/lib/sonaroids --shell /usr/sbin/nologin sonaroids
sudo mkdir -p /var/lib/sonaroids && sudo chown sonaroids:sonaroids /var/lib/sonaroids
sudo git clone https://github.com/neokrasav4ik/sonaroids.git /opt/sonaroids
```

Код лежит в `/opt/sonaroids` (только чтение), база — `/var/lib/sonaroids/sonaroids.db`.

## 3. Запуск как служба

```sh
sudo cp /opt/sonaroids/server/sonaroids-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now sonaroids-api
curl http://127.0.0.1:8787/v1/health
```

Ответ `{"ok":true,"core":"rules-3"}` — сервер работает. Служба перезапускается сама при сбое и после перезагрузки.

## 4. HTTPS

```sh
sudo cp /opt/sonaroids/server/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy
sudo ufw allow 80,443/tcp          # только если включён ufw (sudo ufw status)
curl https://api.sonaroids.app/v1/health
```

Если Caddy уже обслуживает другие сайты — не заменяй файл, а допиши в `/etc/caddy/Caddyfile` блок из `server/Caddyfile`.

**Если порты 80/443 занимает nginx** (Caddy тогда падает с «address already in use»):

```sh
sudo systemctl disable --now caddy
sudo cp /opt/sonaroids/server/nginx-api.sonaroids.app.conf /etc/nginx/sites-available/api.sonaroids.app
sudo ln -s /etc/nginx/sites-available/api.sonaroids.app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.sonaroids.app
curl https://api.sonaroids.app/v1/health
```

certbot сам получит сертификат, допишет HTTPS в этот файл и будет его продлевать.

## 5. Ежедневная копия базы

```sh
( sudo crontab -u sonaroids -l 2>/dev/null; echo '15 4 * * * cd /opt/sonaroids && DB=/var/lib/sonaroids/sonaroids.db /usr/bin/node --no-warnings server/backup.js' ) | sudo crontab -u sonaroids -
```

Копии — в `/var/lib/sonaroids/backup/`, хранятся последние 14.

## Обновление и присмотр

- **Обновить:** `cd /opt/sonaroids && sudo git pull && sudo systemctl restart sonaroids-api`.
- **Когда меняются правила игры** (в `src/13_core.js` меняется `TAG`) — обновлять сервер сразу после сайта: партии по другим правилам сервер не принимает, а игра просит обновиться.
- **Журнал сервера:** `journalctl -u sonaroids-api -n 100`.
- **Какие телефоны играют и как на них работает сонар** (с версии 0.29): `cd /opt/sonaroids && sudo -u sonaroids DB=/var/lib/sonaroids/sonaroids.db node --no-warnings server/stats.js 30` — число после скрипта означает дни. По каждому виду телефона (система / браузер / модель) показывает число партий и игроков, медианный счёт, какую долю времени ладонь была видна, отношение сигнал/шум зонда и как часто были включены выравнивание полосы, шумодав (NS) и эхоподавление (EC) — по данным самого браузера. Вторая таблица — как прошла подготовка у **всех** игроков, в том числе у тех, кто так и не начал играть: поймана ли ладонь (caught) и за сколько секунд, ушёл ли человек с шага взмахов без этого (nocatch), не слышен ли зонд (quiet, noprobe), нет ли микрофона (nomic), пропадал ли зонд посреди партии (lost), предлагала ли игра другой конец телефона (flips). Базу не меняет.
- **Что хранится:** счёт, уровень, длительность, время, номер раскладки и запись высоты ладони (несколько КБ на партию), ник. С 0.29 ещё короткая справка о телефоне: iOS/Android, вид браузера, запущена ли игра с экрана «Домой», модель (только на Android, если Chrome её отдаёт), частота дискретизации, уровень и сигнал/шум зонда, выравнивание полосы, сбои входа, у какого конца телефона рука, включены ли шумодав, эхоподавление и автоусиление. Строка браузера (User-Agent) и IP в базу не попадают. Сервер берёт из справки только известные поля и отбрасывает остальное. Кроме того, nginx по умолчанию пишет IP и User-Agent в `/var/log/nginx/access.log` — если это не нужно, поставьте `access_log off;` в блоке сайта api.sonaroids.app. Игрок — случайный ключ с телефона, в базе только его хеш. Адреса не хранятся (ограничение частоты — только в памяти).
- **Ник:** 1–16 латинских букв, цифр и `_`, плюс фильтр мата.
- **Ограничения:** 20 отправок и 120 чтений в минуту с адреса, запрос до 256 КБ, партия до 45 минут.
