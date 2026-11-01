#!/bin/sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  exec python3 server.py
fi
echo "Python 3 is required to launch Snowball Siege, but it was not found."
echo "Install Python 3 from https://www.python.org/downloads/ and run this launcher again."
if [ -t 0 ]; then
  printf "Press Enter to close..."
  read -r _
fi
exit 1
