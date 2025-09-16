# server.py
# Entrypoint: server.py:mcp

import base64
import io
import os
import tempfile
import time
from contextlib import contextmanager
from typing import Iterable, Literal, Optional
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

DEFAULT_VNC_PORT = 5900
DEFAULT_TIMEOUT_SECONDS = 8.0


def _resolve_host_port(raw_host: str, port_env: str) -> tuple[str, int]:
    host = raw_host.strip()
    port_candidate = port_env.strip()
    inline_port: Optional[str] = None

    if host.startswith("[") and "]" in host:
        closing = host.index("]")
        bracketed = host[: closing + 1]
        remainder = host[closing + 1 :]
        host = bracketed
        if remainder.startswith(":"):
            candidate = remainder[1:]
            if candidate.isdigit():
                inline_port = candidate
    else:
        if host.count(":") == 1:
            maybe_host, maybe_port = host.rsplit(":", 1)
            if maybe_port.isdigit():
                host = maybe_host
                inline_port = maybe_port
        elif "::" in host and host.count("::") == 1:
            maybe_host, maybe_port = host.split("::", 1)
            if maybe_port.isdigit():
                host = maybe_host
                inline_port = maybe_port

    port_str = inline_port or port_candidate or str(DEFAULT_VNC_PORT)

    try:
        port = int(port_str)
    except ValueError as exc:
        raise RuntimeError("MACOS_PORT must be an integer") from exc

    return host, port


def _get_env() -> tuple[str, int, str, Optional[str], float]:
    host_env = os.getenv("MACOS_HOST", "").strip()
    port_env = os.getenv("MACOS_PORT", "").strip()
    username = os.getenv("MACOS_USERNAME", "").strip() or None
    password = os.getenv("MACOS_PASSWORD", "").strip()
    timeout_env = os.getenv("MACOS_VNC_TIMEOUT", "").strip()

    if not host_env:
        raise RuntimeError("MACOS_HOST must be set")
    if not password:
        raise RuntimeError("MACOS_PASSWORD must be set")

    host, port = _resolve_host_port(host_env, port_env)

    if timeout_env:
        try:
            timeout = float(timeout_env)
        except ValueError as exc:
            raise RuntimeError("MACOS_VNC_TIMEOUT must be numeric") from exc
    else:
        timeout = DEFAULT_TIMEOUT_SECONDS

    return host, port, password, username, timeout


def _connect(timeout: Optional[float] = None):
    # lazy import so module import never breaks startup
    from vncdotool import api

    host, port, password, username, default_timeout = _get_env()
    effective_timeout = timeout if timeout is not None else default_timeout
    target = f"{host}::{port}"
    client = api.connect(target, password=password, username=username, timeout=effective_timeout)
    t0 = time.time()
    while not getattr(client, "connected", True) and time.time() - t0 < effective_timeout:
        time.sleep(0.05)
    return client


@contextmanager
def _client(timeout: Optional[float] = None):
    client = _connect(timeout=timeout)
    try:
        yield client
    finally:
        client.disconnect()


def _button_to_number(button: str) -> int:
    b = button.lower().strip()
    if b in {"left", "l", "button1", "1"}:
        return 1
    if b in {"middle", "m", "button2", "2"}:
        return 2
    if b in {"right", "r", "button3", "3"}:
        return 3
    raise ValueError("button must be 'left'|'middle'|'right'")


TEXT_SPECIAL_MAP = {
    "\n": "return",
    "\r": "return",
    "\t": "tab",
    "\b": "bsp",
    " ": "space",
}

SPECIAL_KEY_MAP = {
    "enter": "return",
    "return": "return",
    "backspace": "bsp",
    "delete": "delete",
    "del": "delete",
    "tab": "tab",
    "escape": "esc",
    "esc": "esc",
    "space": "space",
    "spacebar": "space",
    "home": "home",
    "end": "end",
    "page_up": "pgup",
    "pageup": "pgup",
    "page-down": "pgdn",
    "page_down": "pgdn",
    "pagedown": "pgdn",
    "left": "left",
    "up": "up",
    "right": "right",
    "down": "down",
}

MODIFIER_KEY_MAP = {
    "ctrl": "ctrl",
    "control": "ctrl",
    "shift": "shift",
    "alt": "alt",
    "option": "alt",
    "cmd": "super",
    "command": "super",
    "meta": "super",
    "super": "super",
}


def _normalise_special_key(key: str) -> str:
    normalized = key.strip().lower().replace(" ", "_")
    if not normalized:
        raise ValueError("special_key must be non-empty")
    return SPECIAL_KEY_MAP.get(normalized, normalized)


def _normalise_combo_part(part: str) -> str:
    part = part.strip()
    if not part:
        raise ValueError("Empty key in combination")
    lowered = part.lower().replace(" ", "_")
    if lowered in MODIFIER_KEY_MAP:
        return MODIFIER_KEY_MAP[lowered]
    if lowered in SPECIAL_KEY_MAP:
        return SPECIAL_KEY_MAP[lowered]
    if len(lowered) == 1:
        return part
    if lowered.startswith("f") and lowered[1:].isdigit():
        return lowered
    return part


def _type_text(client, text: str, delay: float) -> None:
    for ch in text:
        key = TEXT_SPECIAL_MAP.get(ch, ch)
        client.keyPress(key)
        if delay > 0:
            time.sleep(delay)


def _press_combination(client, keys: Iterable[str], delay: float) -> None:
    pressed: list[str] = []
    try:
        for key in keys:
            client.keyDown(key)
            pressed.append(key)
        if delay > 0:
            time.sleep(delay)
    finally:
        for key in reversed(pressed):
            client.keyUp(key)

# --- macOS control tools ---
@mcp.tool()
def remote_macos_get_screen() -> dict:
    """Capture the screen and return PNG data along with dimensions."""
    with _client() as client:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            client.captureScreen(tmp_path)
            from PIL import Image

            with Image.open(tmp_path) as img:
                width, height = img.size
                buf = io.BytesIO()
                img.save(buf, format="PNG")
            encoded = base64.b64encode(buf.getvalue()).decode("ascii")
            return {"image_base64": encoded, "width": width, "height": height}
        finally:
            try:
                os.unlink(tmp_path)
            except FileNotFoundError:
                pass


@mcp.tool()
def remote_macos_mouse_move(x: int, y: int) -> dict:
    """Move the mouse cursor to an absolute position."""
    with _client() as client:
        client.mouseMove(int(x), int(y))
    return {"ok": True, "x": int(x), "y": int(y)}


@mcp.tool()
def remote_macos_mouse_click(
    x: int,
    y: int,
    button: Literal["left", "middle", "right"] = "left",
    double: bool = False,
) -> dict:
    """Click at the requested coordinate. Set ``double=True`` for a double-click."""
    button_number = _button_to_number(button)
    clicks = 2 if double else 1
    with _client() as client:
        client.mouseMove(int(x), int(y))
        for i in range(clicks):
            client.mousePress(button_number)
            if double and i == 0:
                time.sleep(0.06)
    return {"ok": True, "x": int(x), "y": int(y), "button": button, "clicks": clicks}


@mcp.tool()
def remote_macos_mouse_double_click(
    x: int,
    y: int,
    button: Literal["left", "middle", "right"] = "left",
) -> dict:
    """Double-click at the requested coordinate."""
    return remote_macos_mouse_click.fn(x=x, y=y, button=button, double=True)


@mcp.tool()
def remote_macos_mouse_scroll(
    direction: Literal["up", "down"] = "down",
    amount: int = 1,
    x: Optional[int] = None,
    y: Optional[int] = None,
    delay_ms: int = 80,
) -> dict:
    """Scroll using PageUp/PageDown key events; optionally move before scrolling."""
    if amount < 1:
        raise ValueError("amount must be >= 1")
    if delay_ms < 0:
        raise ValueError("delay_ms must be >= 0")
    key = "pgup" if direction == "up" else "pgdn"
    delay = delay_ms / 1000.0
    with _client() as client:
        if x is not None and y is not None:
            client.mouseMove(int(x), int(y))
        for i in range(amount):
            client.keyPress(key)
            if delay > 0 and i < amount - 1:
                time.sleep(delay)
    return {"ok": True, "direction": direction, "amount": amount}


@mcp.tool()
def remote_macos_mouse_drag_n_drop(
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    ms: int = 400,
    button: Literal["left", "middle", "right"] = "left",
    steps: Optional[int] = None,
) -> dict:
    """Drag from (x0, y0) to (x1, y1) with a configurable duration."""
    if ms < 0:
        raise ValueError("ms must be non-negative")
    button_number = _button_to_number(button)
    total_steps = steps if steps is not None else max(8, int(ms / 16))
    total_steps = max(2, total_steps)
    delay = ms / max(total_steps, 1) / 1000.0 if ms else 0.0

    with _client() as client:
        client.mouseMove(int(x0), int(y0))
        client.mouseDown(button_number)
        try:
            dx = (int(x1) - int(x0)) / total_steps
            dy = (int(y1) - int(y0)) / total_steps
            for i in range(total_steps):
                nx = int(x0 + dx * (i + 1))
                ny = int(y0 + dy * (i + 1))
                client.mouseMove(nx, ny)
                if delay > 0:
                    time.sleep(delay)
        finally:
            client.mouseUp(button_number)

    return {
        "ok": True,
        "start": {"x": int(x0), "y": int(y0)},
        "end": {"x": int(x1), "y": int(y1)},
        "steps": total_steps,
        "duration_ms": ms,
        "button": button,
    }


@mcp.tool()
def remote_macos_send_keys(
    text: Optional[str] = None,
    special_key: Optional[str] = None,
    key_combination: Optional[str] = None,
    delay_ms: int = 10,
) -> dict:
    """Send text, a single special key, or a key combination to macOS."""
    if not any([text, special_key, key_combination]):
        raise ValueError("Provide text, special_key, or key_combination")
    if delay_ms < 0:
        raise ValueError("delay_ms must be >= 0")

    delay = delay_ms / 1000.0
    actions: list[dict[str, object]] = []

    with _client() as client:
        if text:
            _type_text(client, text, delay)
            actions.append({"type": "text", "characters": len(text)})

        if special_key:
            key_name = _normalise_special_key(special_key)
            client.keyPress(key_name)
            actions.append({"type": "special", "key": key_name})

        if key_combination:
            parts = [
                _normalise_combo_part(part)
                for part in key_combination.split("+")
                if part.strip()
            ]
            if not parts:
                raise ValueError("key_combination must contain at least one key")
            _press_combination(client, parts, delay)
            actions.append({"type": "combination", "keys": parts})

    return {"ok": True, "actions": actions}


@mcp.tool()
def remote_macos_open_application(name: str, wait_ms: int = 400) -> dict:
    """Open an application using Spotlight search."""
    if not name or not name.strip():
        raise ValueError("name must be non-empty")
    if wait_ms < 0:
        raise ValueError("wait_ms must be >= 0")

    with _client() as client:
        client.keyDown("super")
        client.keyPress("space")
        client.keyUp("super")
        time.sleep(0.25)
        _type_text(client, name, 0.01)
        if wait_ms:
            time.sleep(wait_ms / 1000.0)
        client.keyPress("return")

    return {"ok": True, "application": name}
