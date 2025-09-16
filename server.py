# server.py
# FastMCP HTTP server that controls a remote macOS screen over VNC (ngrok/port-forward).
# Entrypoint for FastMCP Cloud:  server.py:mcp
#
# Tools exposed:
# - remote_macos_get_screen() -> { "image_base64": "<PNG base64>" }
# - remote_macos_send_keys(text: str) -> { "ok": true }
# - remote_macos_mouse_move(x: int, y: int) -> { "ok": true }
# - remote_macos_mouse_click(x: int, y: int, button: str = "left", double: bool = False) -> { "ok": true }
# - remote_macos_mouse_drag_n_drop(x0: int, y0: int, x1: int, y1: int, ms: int = 400) -> { "ok": true }
# - remote_macos_open_application(name: str) -> { "ok": true }
#
# Env required:
# - MACOS_HOST  e.g. "6.tcp.ngrok.io:17645"  (or "public.ip.addr:5900")
# - MACOS_PASSWORD  the macOS VNC password (Screen Sharing → VNC viewers may control...)
#
# Notes:
# - Keep your ngrok tunnel running:  ngrok tcp 5900
# - If your router is port-forwarded instead of ngrok, use your public IP:port.

import base64
import io
import os
import time
from typing import Literal

from fastmcp import FastMCP

# vncdotool API docs: https://github.com/sibson/vncdotool
from vncdotool import api

mcp = FastMCP("remote-macos")

# ---------- helpers ----------

def _get_env() -> tuple[str, int, str]:
    host = os.getenv("MACOS_HOST", "").strip()
    pwd = os.getenv("MACOS_PASSWORD", "").strip()

    if not host or ":" not in host:
        raise RuntimeError("MACOS_HOST must be set to 'host:port' (e.g. 6.tcp.ngrok.io:17645).")
    if not pwd:
        raise RuntimeError("MACOS_PASSWORD must be set to the VNC password from macOS Screen Sharing.")

    h, p = host.rsplit(":", 1)
    try:
        port = int(p)
    except ValueError as e:
        raise RuntimeError("MACOS_HOST port must be an integer.") from e
    return h, port, pwd


def _connect(timeout: float = 8.0):
    """Create a VNC connection; caller is responsible for client.disconnect()."""
    host, port, pwd = _get_env()
    # api.connect(host, port=5900, password='...')
    client = api.connect(host, port=port, password=pwd)
    # vncdotool connect may return immediately; give the server a beat to settle
    t0 = time.time()
    while not getattr(client, "connected", True) and time.time() - t0 < timeout:
        time.sleep(0.05)
    return client


def _press_keys(client, *keys):
    """Press keys in sequence using vncdotool keyPress semantics."""
    for k in keys:
        client.keyPress(k)


def _spotlight_open_app(client, name: str):
    """
    Open an app via Spotlight: Cmd+Space, type name, Enter.
    This is robust without needing Dock coordinates.
    """
    # macOS Spotlight shortcut (command + space)
    client.keyDown("super")     # 'super' is Cmd on macOS in vncdotool
    client.keyPress("space")
    client.keyUp("super")
    time.sleep(0.25)
    for ch in name:
        if ch == " ":
            client.keyPress("space")
        else:
            client.keyPress(ch)
        time.sleep(0.01)
    time.sleep(0.2)
    client.keyPress("enter")


def _button_to_mask(button: str) -> int:
    b = button.lower()
    if b in ("left", "l"):
        return 1
    if b in ("middle", "m"):
        return 2
    if b in ("right", "r"):
        return 4
    raise ValueError("button must be 'left'|'middle'|'right'.")


# ---------- tools ----------

@mcp.tool()
def remote_macos_get_screen() -> dict:
    """
    Capture the current macOS screen as PNG (base64).
    Returns: {"image_base64": "..."}
    """
    client = _connect()
    try:
        # captureScreen to a PIL Image via in-memory buffer
        buf = io.BytesIO()
        # vncdotool client has captureScreen(filename) and captureScreen() -> PIL.Image (newer)
        img = None
        try:
            img = client.captureScreen()  # returns PIL.Image in newer vncdotool
        except TypeError:
            # fallback to filename path if older API
            tmp_path = "/tmp/capture.png"
            client.captureScreen(tmp_path)
            import PIL.Image as Image  # lazy import
            img = Image.open(tmp_path)

        img.save(buf, format="PNG")
        data = base64.b64encode(buf.getvalue()).decode("ascii")
        return {"image_base64": data}
    finally:
        client.disconnect()


@mcp.tool()
def remote_macos_send_keys(text: str) -> dict:
    """
    Type a text string on the Mac (simple characters).
    """
    if not isinstance(text, str) or text == "":
        raise ValueError("text must be a non-empty string")
    client = _connect()
    try:
        for ch in text:
            if ch == " ":
                client.keyPress("space")
            elif ch == "\n":
                client.keyPress("enter")
            else:
                client.keyPress(ch)
            time.sleep(0.005)
        return {"ok": True}
    finally:
        client.disconnect()


@mcp.tool()
def remote_macos_mouse_move(x: int, y: int) -> dict:
    """
    Move mouse to absolute coordinates (x, y).
    """
    client = _connect()
    try:
        client.mouseMove(int(x), int(y))
        return {"ok": True}
    finally:
        client.disconnect()


@mcp.tool()
def remote_macos_mouse_click(
    x: int,
    y: int,
    button: Literal["left", "middle", "right"] = "left",
    double: bool = False,
) -> dict:
    """
    Click at (x, y). button = left|middle|right. Set double=True for double-click.
    """
    client = _connect()
    try:
        client.mouseMove(int(x), int(y))
        mask = _button_to_mask(button)
        if double:
            for _ in range(2):
                client.mousePress(mask)
                time.sleep(0.06)
        else:
            client.mousePress(mask)
        return {"ok": True}
    finally:
        client.disconnect()


@mcp.tool()
def remote_macos_mouse_drag_n_drop(x0: int, y0: int, x1: int, y1: int, ms: int = 400) -> dict:
    """
    Drag from (x0, y0) to (x1, y1) over ~ms milliseconds.
    """
    client = _connect()
    try:
        client.mouseMove(int(x0), int(y0))
        client.mouseDown(1)
        steps = max(8, int(ms / 16))
        dx = (int(x1) - int(x0)) / steps
        dy = (int(y1) - int(y0)) / steps
        for i in range(steps):
            client.mouseMove(int(x0 + dx * (i + 1)), int(y0 + dy * (i + 1)))
            time.sleep(ms / steps / 1000.0)
        client.mouseUp(1)
        return {"ok": True}
    finally:
        client.disconnect()


@mcp.tool()
def remote_macos_open_application(name: str) -> dict:
    """
    Open an application using Spotlight (Cmd+Space → type name → Enter).
    Example: name="TextEdit" or "Safari"
    """
    if not name:
        raise ValueError("name must be a non-empty string")
    client = _connect()
    try:
        _spotlight_open_app(client, name)
        return {"ok": True}
    finally:
        client.disconnect()
