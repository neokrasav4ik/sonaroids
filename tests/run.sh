#!/bin/sh
# All game checks without a phone. From the repository root: sh tests/run.sh
# Needs node 18+ and python3. The Chromium checks also need Playwright with Chromium; without it they are skipped.
# v1.07: tests/run_par.py — the real-time checks alone first, then the rest in two lanes at once; SERIAL=1 for one after another.
set -e
cd "$(dirname "$0")/.."
exec python3 tests/run_par.py
