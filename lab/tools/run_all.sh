#!/bin/sh
# Полная проверка приложения без телефона. Запуск из папки tools: sh run_all.sh
# Требуется node (18+) и python3 с numpy — только для game_log.py, в этот прогон он не входит.
set -e
cd "$(dirname "$0")"
echo "== сборка совпадает с исходниками =="; python3 ../build.py --check
echo; echo "== синтетика с текущим зондом =="; node synth_probe.js
echo; echo "== длинная запись: стенд на синтетике =="; node eval_long.js --synth | tail -3
echo; echo "== автоуровень =="; node tests/test_autolevel.js
echo; echo "== подготовка без калибровки: норма =="; node tests/test_quick_start.js 44
echo; echo "== подготовка: зонда почти не слышно =="; node tests/test_quick_start.js 20
echo; echo "== центровка и физическая калибровка =="; node tests/test_center.js
echo; echo "== подстройка по взмахам перед стартом =="; node tests/test_autotune.js
echo; echo "== игра =="; node tests/test_game_flow.js
echo; echo "== журнал партии =="; node tests/test_log.js | tail -3
echo; echo "== журнал настройки =="; node tests/test_setup_log.js
echo; echo "== зонд пропал посреди партии =="; node tests/test_probe_lost.js
echo; echo "== всё в один экран (Chromium; без playwright пропускается) =="; python3 tests/test_layout.py | tail -8
echo; echo "== микрофон и звуковая сессия =="; node tests/test_mic_session.js
