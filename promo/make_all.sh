#!/bin/sh
# All four promo GIFs (see make_gif.js). Run from the repository: sh promo/make_all.sh
set -e; cd "$(dirname "$0")/.."
for v in clean table hand both; do VARIANT=$v node promo/make_gif.js && VARIANT=$v python3 promo/make_gif.py; rm -rf promo/frames_$v; done
