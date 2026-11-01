#!/usr/bin/env python3
"""Serve Snowball Siege on localhost and open it in the default browser."""

from __future__ import annotations

import argparse
import json
import os
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))


def default_port() -> int:
    path = os.path.join(ROOT, "arcade.json")
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        return int(data.get("port", 8805))
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return 8805


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        return


def make_server(port: int) -> ThreadingHTTPServer:
    if port == 0:
        return ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    last_error = None
    for candidate in range(port, port + 30):
        try:
            return ThreadingHTTPServer(("127.0.0.1", candidate), Handler)
        except OSError as exc:
            last_error = exc
    raise SystemExit(f"Could not bind 127.0.0.1 starting at {port} ({last_error})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve Snowball Siege locally")
    parser.add_argument("--port", type=int, default=None, help="Port to bind (0 chooses a free port)")
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser window")
    args = parser.parse_args()
    requested = default_port() if args.port is None else args.port
    httpd = make_server(requested)
    host, bound = httpd.server_address[:2]
    url = f"http://{host}:{bound}/"
    print(f"LISTENING {host}:{bound}", flush=True)
    if requested not in (0, bound):
        print(f"Port {requested} is busy; using {bound} instead.", flush=True)
    print(f"Snowball Siege is running at {url}", flush=True)
    if not args.no_browser:
        try:
            webbrowser.open(url)
        except Exception as exc:
            print(f"Could not open a browser ({exc}). Open {url} yourself.", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.", flush=True)
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
