#!/bin/bash
# render.sh <pdf> <outdir> : every page as a PNG (longest side 2000 px) + Tesseract OCR text next to it.
# Needs poppler-utils (pdftoppm) and tesseract-ocr. OCR is a typing aid only; the image is the source of truth.
set -e
pdf="$1"; out="$2"; mkdir -p "$out"
pdftoppm -scale-to 2000 -png "$pdf" "$out/p" 2>/dev/null
for f in "$out"/p-*.png; do t="${f%.png}.txt"; [ -s "$t" ] || tesseract "$f" "${f%.png}" --psm 3 >/dev/null 2>&1 || true; done
