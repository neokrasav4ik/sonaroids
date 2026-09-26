#!/bin/sh
# Разбор всех присланных записей и журналов из одной папки. Запуск: sh tools/run_data.sh папка_с_wav
# Записи по метке — eval_recording.js (с самокалибровкой и с калибровкой как в игре, --phys); журналы настройки — setup_log.py и replay_game.js;
# журналы партий — game_log.py и replay_game.js; длинные записи по метке (sonarlong_*) — eval_long.js; записи вбок (sonarside_*, телефон вертикально) — eval_side.js; «два динамика» (sonardual_*) — eval_dual.js; «ладонь справа»: запись по метке (sonar1r_*) — eval_recording.js, проба-игра (sonarright_*) — eval_right.js. Журналы и лабы (sonar_*), и самой игры (sonaroids_*).
cd "$(dirname "$0")"; D="$1"; [ -d "$D" ] || { echo "укажи папку с WAV"; exit 1; }
R=$(ls "$D"/sonar1h_*.wav "$D"/sonar1r_*.wav "$D"/sonar_2*.wav 2>/dev/null | while read f; do grep -q -e '"single-landscape"' -e '"right-portrait"' "$f" && echo "$f"; done)
RP=$(ls "$D"/sonarright_*.wav 2>/dev/null)
L=$(ls "$D"/sonarlong_*.wav 2>/dev/null); SD=$(ls "$D"/sonarside_*.wav 2>/dev/null); DU=$(ls "$D"/sonardual_*.wav 2>/dev/null)
G=$(ls "$D"/sonar_game_*.wav "$D"/sonaroids_game_*.wav 2>/dev/null); S=$(ls "$D"/sonar_setup_*.wav "$D"/sonaroids_setup_*.wav 2>/dev/null)
[ -n "$R" ] && { echo "== записи по метке =="; node eval_recording.js $R; echo; echo "== записи по метке, калибровка как в игре =="; node eval_recording.js --phys $R; }
[ -n "$RP" ] && { echo; echo "== ладонь справа: проба-игра =="; node eval_right.js $RP; }
[ -n "$DU" ] && { echo; echo "== два динамика: звучат ли каналы из разных торцов, есть ли вторая ось =="; node eval_dual.js $DU; }
[ -n "$SD" ] && { echo; echo "== записи вбок (телефон вертикально): различает ли сонар лево и право =="; node eval_side.js $SD; }
[ -n "$L" ] && { echo; echo "== длинные записи по метке (калибровка как в игре) =="; node eval_long.js $L; }
[ -n "$S" ] && { echo; echo "== журналы настройки =="; python3 setup_log.py $S; echo; echo "== повторный прогон журналов настройки =="; node replay_game.js $S; }
[ -n "$G" ] && { echo; echo "== журналы партий =="; python3 game_log.py $G; echo; echo "== повторный прогон журналов =="; node replay_game.js $G; }
