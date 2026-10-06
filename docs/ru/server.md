# Сервер рекордов (api.sonaroids.app) — установка по шагам

Сервер — одна программа на Node без сторонних пакетов, база — один файл SQLite. Каждую присланную партию сервер
**переигрывает тем же кодом игры** (`src/13_core.js`, для гонок — `src/14_race.js`) и записывает только счёт, который повторился. С версии 1.01 у SonaRace свои таблицы рекордов; гонка, сыгранная с тестовыми переключателями, не принимается.
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

Ответ `{"ok":true,"core":"rules-3","race":"race-11"}` — сервер работает (с версии 1.01 в ответе и правила гонок). Служба перезапускается сама при сбое и после перезагрузки.

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
- **Когда меняются правила игры** (в `src/13_core.js` или `src/14_race.js` меняется `TAG`) — обновлять сервер сразу после сайта: партии по другим правилам сервер не принимает, а игра просит обновиться.
- **Журнал сервера:** `journalctl -u sonaroids-api -n 100`.
- **Какие телефоны играют и как на них работает сонар** (с версии 0.29): `cd /opt/sonaroids && sudo -u sonaroids DB=/var/lib/sonaroids/sonaroids.db node --no-warnings server/stats.js 30` — число после скрипта означает дни. По каждому виду телефона (система / браузер / модель) показывает число партий и игроков, медианный счёт, какую долю времени ладонь была видна, отношение сигнал/шум зонда и как часто были включены выравнивание полосы, шумодав (NS) и эхоподавление (EC) — по данным самого браузера. Вторая таблица — как прошла подготовка у **всех** игроков, в том числе у тех, кто так и не начал играть: поймана ли ладонь (caught) и за сколько секунд, ушёл ли человек с шага взмахов без этого (nocatch), не слышен ли зонд (quiet, noprobe), нет ли микрофона (nomic), пропадал ли зонд посреди партии (lost), предлагала ли игра другой конец телефона (flips). Базу не меняет.
- **Что хранится:** счёт, уровень, длительность, время, номер раскладки и запись высоты ладони (несколько КБ на партию), ник. С 0.29 ещё короткая справка о телефоне: iOS/Android, вид браузера, запущена ли игра с экрана «Домой», модель (только на Android, если Chrome её отдаёт), частота дискретизации, уровень и сигнал/шум зонда, выравнивание полосы, сбои входа, у какого конца телефона рука, включены ли шумодав, эхоподавление и автоусиление. Строка браузера (User-Agent) и IP в базу не попадают. Сервер берёт из справки только известные поля и отбрасывает остальное. Кроме того, nginx по умолчанию пишет IP и User-Agent в `/var/log/nginx/access.log` — если это не нужно, поставьте `access_log off;` в блоке сайта api.sonaroids.app. Игрок — случайный ключ с телефона, в базе только его хеш. Адреса не хранятся (ограничение частоты — только в памяти).
- **Ник:** 1–16 латинских букв, цифр и `_`, плюс фильтр мата.
- **Код переноса (с 0.32):** `/v1/link` выдаёт код из 6 знаков на 10 минут (хранится только в памяти — после перезапуска сервера старые коды не действуют), `/v1/claim` объединяет два ключа в одного игрока. Ввод кода — не больше 10 попыток в минуту с адреса.
- **Удалить лишнего игрока** (с 0.33a) — например, старый ключ, которого нет ни на одном устройстве, так что код переноса его не склеит. Игрок выбирается по началу ключа (колонка `who` в запросах шпаргалки, от 6 знаков). Без `--yes` команда только показывает, что удалит; с `--yes` сначала кладёт копию базы в `/var/lib/sonaroids/backup/`, потом удаляет партии, отчёты и имя:
  `cd /opt/sonaroids && sudo -u sonaroids DB=/var/lib/sonaroids/sonaroids.db node --no-warnings server/drop_player.js 3f9a1c` (затем то же с `--yes`).
- **Ограничения:** 20 отправок и 120 чтений в минуту с адреса, запрос до 256 КБ, партия до 45 минут.

## Боты (с 1.31)

Чтобы таблицы рекордов не пустовали, сервер сам играет за ~40 ботов: у каждого своё имя, своя сила (от новичка до сильного) и свои привычки — кто-то заходит каждый день, кто-то раз в несколько дней, днём и вечером по Москве чаще, ночью почти никогда. Партии настоящие: играет бот игры (`server/botplay.js`) по тем же правилам, с записью ладони, как у людей. Самые сильные остаются чуть ниже лучшего человека. Новички иногда заканчивают партию через паузу; слабые понемногу растут; раз в несколько дней приходит новый бот, старые со временем перестают играть (их рекорды остаются).

В игре таблица без ботов — долгое нажатие на версию на экране рекордов (с 1.34; в 1.31–1.33 — вкладки «ВСЕ ИГРОКИ | ТОЛЬКО ЛЮДИ»). `server/stats.js` ботов не считает.

**Включить** (после обновления кода и перезапуска службы):
```sh
cd /opt/sonaroids && sudo -u sonaroids DB=/var/lib/sonaroids/sonaroids.db node --no-warnings server/bots.js init 40 7
( sudo crontab -u sonaroids -l 2>/dev/null; echo '*/10 * * * * cd /opt/sonaroids && DB=/var/lib/sonaroids/sonaroids.db /usr/bin/node --no-warnings server/bots.js tick >> /var/lib/sonaroids/bots.log 2>&1' ) | sudo crontab -u sonaroids -
```
`init 40 7` — завести 40 ботов и сыграть за них последние 7 дней (около минуты); дальше раз в 10 минут `tick` решает, кто из них «зашёл», и играет их партии.

**Посмотреть:** `… server/bots.js list` — боты, их сила, число партий и лучшие очки; `tail /var/lib/sonaroids/bots.log` — кто что сыграл.
**Убрать всех ботов и их партии:** `… server/bots.js remove` (покажет), затем `… server/bots.js remove --yes` (сначала копия базы в `backup/`), и убрать строку из расписания: `sudo crontab -u sonaroids -e`.

## СонарЛинк: комната для двух телефонов (с 1.56c)

`server/pair.js`: один телефон открывает комнату (код из 4 цифр), второй входит по коду; дальше каждый слушает поток (Server-Sent Events — обычный долгий ответ, nginx и Caddy менять не нужно: сервер сам говорит nginx не копить ответ, `X-Accel-Buffering: no`) и шлёт свои сообщения, а сервер передаёт их другому телефону. Ничего не хранится: комнаты живут в памяти и пропадают через 30 минут тишины (и при перезапуске службы). Ограничения: открыть комнату — 10 раз в минуту с адреса, войти — 20, сообщений — 60 в секунду на телефон, сообщение до 2 КБ.

Нужно обновление сервера (как обычно): `cd /opt/sonaroids && sudo git pull && sudo systemctl restart sonaroids-api`.

**«Рядом» (с 1.56g):** `POST /v1/pair/near` — два нажатия из одной сети (один внешний IPv4-адрес или одна IPv6-подсеть /64) за полминуты попадают в одну комнату, без кода. Дальше телефоны сами открывают прямой канал (WebRTC) — сервер только знакомит их сообщениями комнаты.
