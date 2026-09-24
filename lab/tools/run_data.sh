#!/bin/sh
# Разбор всех присланных записей и журналов из одной папки. Запуск: sh tools/run_data.sh папка_с_wav
# Записи по метке — eval_recording.js; журналы настройки — setup_log.py и replay_game.js; журналы партий — game_log.py и replay_game.js.
cd "$(dirname "$0")"; D="$1"; [ -d "$D" ] || { echo "укажи папку с WAV"; exit 1; }
R=$(ls "$D"/sonar1h_*.wav "$D"/sonar_2*.wav 2>/dev/null | while read f; do grep -q '"single-landscape"' "$f" && echo "$f"; done)
G=$(ls "$D"/sonar_game_*.wav 2>/dev/null); S=$(ls "$D"/sonar_setup_*.wav 2>/dev/null)
[ -n "$R" ] && { echo "== записи по метке =="; node eval_recording.js $R; }
[ -n "$S" ] && { echo; echo "== журналы настройки =="; python3 setup_log.py $S; echo; echo "== повторный прогон журналов настройки =="; node replay_game.js $S; }
[ -n "$G" ] && { echo; echo "== журналы партий =="; python3 game_log.py $G; echo; echo "== повторный прогон журналов =="; node replay_game.js $G; }
