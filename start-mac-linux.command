#!/bin/sh
# 맥/리눅스: 더블클릭(맥) 또는 터미널에서 실행
cd "$(dirname "$0")"
PORT=8642
( sleep 1; (open "http://localhost:$PORT/" 2>/dev/null || xdg-open "http://localhost:$PORT/" 2>/dev/null) ) &
echo "해부학 아틀라스 실행 중: http://localhost:$PORT/  (Ctrl+C로 종료)"
python3 -m http.server $PORT 2>/dev/null || python -m SimpleHTTPServer $PORT
