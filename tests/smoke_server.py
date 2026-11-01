#!/usr/bin/env python3
"""Headless launch: server.py must answer on localhost and serve the game."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def wait_for_listen(proc: subprocess.Popen, timeout: float = 5) -> tuple[str, int]:
    import time

    start = time.time()
    while time.time() - start < timeout:
        line = proc.stdout.readline() if proc.stdout else ""
        if line.startswith("LISTENING"):
            host, port = line.strip().split()[1].split(":")
            return host, int(port)
        if proc.poll() is not None:
            err = proc.stderr.read() if proc.stderr else ""
            raise SystemExit(f"server exited early ({proc.returncode}): {err}")
    raise SystemExit("timed out waiting for LISTENING")


def stop(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=3)


def launch(args: list[str]) -> subprocess.Popen:
    return subprocess.Popen(
        [sys.executable, os.path.join(ROOT, "server.py"), "--no-browser", *args],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def fetch(port: int, path: str) -> tuple[int, bytes]:
    with urllib.request.urlopen(f"http://127.0.0.1:{port}{path}", timeout=5) as response:
        return response.status, response.read()


def check_pages(port: int) -> None:
    for path in ("/", "/index.html", "/arcade.json", "/src/main.js", "/assets/cover.jpg"):
        status, raw = fetch(port, path)
        if status != 200 or not raw:
            raise SystemExit(f"{path} returned {status}")
        if path.endswith(".jpg"):
            continue
        body = raw.decode("utf-8")
        if path in ("/", "/index.html"):
            if "Snowball Siege" not in body or "<canvas" not in body or "src/main.js" not in body:
                raise SystemExit(f"{path} is not the game page")
        if path == "/arcade.json" and '"snowballsiege"' not in body:
            raise SystemExit("arcade.json was not served")
        if path == "/src/main.js" and "createGame" not in body:
            raise SystemExit("main module was not served")


def main() -> None:
    proc = launch(["--port", "0"])
    try:
        host, port = wait_for_listen(proc)
        if host != "127.0.0.1":
            raise SystemExit(f"server bound {host}, expected 127.0.0.1")
        check_pages(port)
        print(f"smoke ok on {host}:{port}")
    finally:
        stop(proc)

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(("127.0.0.1", 8805))
    except OSError:
        print("port 8805 busy; skipped fallback check")
        sock.close()
        return
    sock.listen(1)
    fallback = launch([])
    try:
        host, port = wait_for_listen(fallback)
        if port == 8805:
            raise SystemExit("expected a fallback port when 8805 was taken")
        status, raw = fetch(port, "/index.html")
        if status != 200 or b"Snowball Siege" not in raw:
            raise SystemExit("fallback port did not serve the game")
        print(f"fallback ok on {host}:{port}")
    finally:
        stop(fallback)
        sock.close()


if __name__ == "__main__":
    main()
