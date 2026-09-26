# Sonar lab

*English:* this folder is the development lab for the palm-height sonar control used by Sonaroids: the working test app `app/sonar_lab3.html`, its sources in `src/`, offline test benches in `tools/`. Detailed notes are in Russian — `HANDOVER.md`. Run `python3 build.py --check && sh tools/run_all.sh` (Node 18+, Python 3).


Веб-игра для iPhone: высота ладони сбоку от лежащего телефона управляет кораблём, измерение — ультразвуковым сонаром на встроенных динамике и микрофоне. Подробно всё — в **HANDOVER.md**.

## Состав
- `app/sonar_lab3.html` — текущее приложение (выкладывается на хостинг под этим именем).
- `src/` — исходники по частям; `build.py` склеивает их в приложение.
- `tools/` — инструменты разбора и проверки; все берут код из собранного приложения:
  - `eval_recording.js` — оценка механики на «Записи для меня»;
  - `game_log.py` — разбор журналов партии;
  - `synth_probe.js` — синтетическая запись с текущим зондом и её проверка;
  - `eval_variant.js` — то же, что `eval_recording.js`, но с изменённым движком (`--set параметр=значение`, `--patch правка.js`) — проверять идеи на записях с меткой;
  - `replay_game.js` — повторный прогон журнала партии или настройки через движок: сверка с телефоном и метрики вариантов (`--set`, `--patch`, `--phys` — старый журнал по новой схеме без калибровки); фон пустой комнаты оценивается средним за партию, рука считается видимой всегда;
  - `eval_side.js` — разбор «Записи вбок» (`sonarside_*.wav`, телефон вертикально): различает ли сонар лево и право или только «ушла от центра»; `--synth` — самопроверка на синтетике;
  - `run_data.sh` — разбор всей папки с присланными WAV: записи, журналы и повторный прогон;
  - `tests/test_layout.py` — всё ли влезает в один экран на размерах iPhone (Chromium; нужен python-пакет playwright);
  - `setup_log.py` — разбор журнала настройки (`sonar_setup_*.wav`): события, лента по времени, «рывки» руки;
  - `screen_linearity.js` — на какой доле экрана корабль при разных высотах метки (проверка растяжки низа);
  - `startmid.js` — «плохой старт»: обработка запускается посреди записи, когда ладонь уже рядом;
  - `tests/` — стенды страницы: подготовка без калибровки, центровка, подстройка по взмахам, игра, журнал партии, журнал настройки, пропажа зонда, автоуровень, запуск микрофона, запись вбок в портрете (`test_side_rec.js`);
  - `run_all.sh` — всё сразу;
  - `common.js` — общие помощники.
- `DATA_INDEX.md` — опись записей и журналов; сами WAV хранятся у пользователя.

## Быстрый старт
```
python3 build.py            # собрать app/sonar_lab3.html
python3 build.py --check    # проверить, что приложение совпадает с исходниками
sh tools/run_all.sh         # полный прогон без телефона
node tools/eval_recording.js запись.wav
python3 tools/game_log.py журнал.wav
sh tools/run_data.sh папка_с_wav   # всё присланное разом
node tools/eval_variant.js --set deadband=0 запись.wav
node tools/replay_game.js журнал.wav
```
Нужны node 18+ и python3; для `game_log.py` — numpy.
