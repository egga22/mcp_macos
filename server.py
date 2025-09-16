# server.py
# Entrypoint: server.py:mcp

import base64, io, os, time
from typing import Literal, Optional
from fastmcp import FastMCP

# IMPORTANT: export a variable literally named `mcp`
mcp = FastMCP("remote-macos")

# --- basic health tools so startup is verifiable ---
@mcp.tool()
def ping() -> str:
    return "pong"

@mcp.tool()
def echo(message: str, tag: Optional[str] = None) -> dict:
    return {"message": message, "tag": tag or "none"}

# --- helpers (lazy import vncdotool so module import never fails) ---
def _get_env() -> tuple[str, int, str]:
    host = os.getenv("MACOS_HOST", "").strip()
    pwd = os.getenv("MACOS_PASSWORD", "").strip()
    if not host or ":" not in host:
        raise RuntimeError("MACOS_HOST must be 'host:port' (e.g. 6.tcp.ngrok.io:17645)")
    if not pwd:
        raise RuntimeError("MACOS_PASSWORD must be set")
    h, p = host.rsplit(":", 1)
    try:
        port = int(p)
    except ValueError as e:
        raise RuntimeError("MACOS_HOST port must be an integer") from e
    return h, port, pwd

def _connect(timeout: float = 8.0):
    # lazy import so module import never breaks startup
    from vncdotool import api
    host, port, pwd = _get_env()
    target = f"{host}::{port}"  # vncdotool 1.2.0 format (no port kwarg)
    client = api.connect(target, password=pwd)
    t0 = time.time()
    while not getattr(client, "connected", True) and time.time() - t0 < timeout:
        time.sleep(0.05)
    return client

# --- macOS control tools ---
@mcp.tool()
def remote_macos_get_screen() -> dict:
    """
    Capture the screen; returns {"image_base64": "<PNG base64>"}.
    """
    client = _connect()
    try:
        tmp_path = "/tmp/capture.png"
        client.captureScreen(tmp_path)  # works on vncdotool 1.2.0
        from PIL import Image
        with Image.open(tmp_path) as img:
            buf = io.BytesIO()
            img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return {"image_base64": b64}
    finally:
        client.disconnect()

def _button_to_mask(button: str) -> int:
    b = button.lower()
    if b in ("left", "l"): return 1
    if b in ("middle", "m"): return 2
    if b in ("right", "r"): return 4
    raise ValueError("button must be 'left'|'middle'|'right'")

@mcp.tool()
def remote_macos_send_keys(text: str) -> dict:
    if not text:
        raise ValueError("text must be non-empty")
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
    if not name:
        raise ValueError("name must be non-empty")
    client = _connect()
    try:
        # Spotlight: Cmd+Space, type, Enter
        client.keyDown("super")
        client.keyPress("space")
        client.keyUp("super")
        time.sleep(0.25)
        for ch in name:
            client.keyPress("space" if ch == " " else ch)
            time.sleep(0.01)
        time.sleep(0.2)
        client.keyPress("enter")
        return {"ok": True}
    finally:
        client.disconnect()
