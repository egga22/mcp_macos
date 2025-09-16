import base64

import base64

import pytest
from unittest.mock import MagicMock, patch

import server


@pytest.fixture
def set_env(monkeypatch):
    def _set(host: str = "example.com", password: str = "secret", **extra: str) -> None:
        monkeypatch.setenv("MACOS_HOST", host)
        monkeypatch.setenv("MACOS_PASSWORD", password)
        for key, value in extra.items():
            monkeypatch.setenv(key, str(value))

    return _set


def make_fake_client() -> MagicMock:
    fake = MagicMock()
    fake.disconnect = MagicMock()
    return fake


def tool_fn(obj):
    return getattr(obj, "fn", obj)


def test_resolve_host_port_defaults():
    host, port = server._resolve_host_port("localhost", "")
    assert host == "localhost"
    assert port == server.DEFAULT_VNC_PORT


def test_resolve_host_port_with_port_in_host():
    host, port = server._resolve_host_port("example.com:5901", "")
    assert host == "example.com"
    assert port == 5901


def test_resolve_host_port_with_env_port():
    host, port = server._resolve_host_port("example.com", "6001")
    assert host == "example.com"
    assert port == 6001


def test_resolve_host_port_ipv6_brackets():
    host, port = server._resolve_host_port("[2601::1]:5999", "")
    assert host == "[2601::1]"
    assert port == 5999


def test_resolve_host_port_invalid_port():
    with pytest.raises(RuntimeError):
        server._resolve_host_port("example.com", "abc")


def test_get_env_requires_host(monkeypatch):
    monkeypatch.delenv("MACOS_HOST", raising=False)
    monkeypatch.setenv("MACOS_PASSWORD", "secret")
    with pytest.raises(RuntimeError):
        server._get_env()


def test_get_env_requires_password(monkeypatch):
    monkeypatch.setenv("MACOS_HOST", "example.com")
    monkeypatch.delenv("MACOS_PASSWORD", raising=False)
    with pytest.raises(RuntimeError):
        server._get_env()


def test_get_env_full(monkeypatch, set_env):
    set_env(host="example.com:5901", password="secret")
    monkeypatch.setenv("MACOS_USERNAME", "tester")
    monkeypatch.setenv("MACOS_VNC_TIMEOUT", "12.5")
    host, port, password, username, timeout = server._get_env()
    assert host == "example.com"
    assert port == 5901
    assert password == "secret"
    assert username == "tester"
    assert timeout == 12.5


def test_button_to_number():
    assert server._button_to_number("left") == 1
    assert server._button_to_number("Right") == 3
    with pytest.raises(ValueError):
        server._button_to_number("invalid")


def test_remote_mouse_click(monkeypatch, set_env):
    set_env()
    fake = make_fake_client()
    with patch.object(server, "_connect", return_value=fake):
        result = tool_fn(server.remote_macos_mouse_click)(10, 20, button="right", double=True)
    assert result["clicks"] == 2
    fake.mouseMove.assert_called_with(10, 20)
    assert fake.mousePress.call_count == 2
    fake.mousePress.assert_called_with(3)
    fake.disconnect.assert_called_once()


def test_remote_mouse_double_click(monkeypatch, set_env):
    set_env()
    fake = make_fake_client()
    with patch.object(server, "_connect", return_value=fake):
        result = tool_fn(server.remote_macos_mouse_double_click)(5, 6, button="middle")
    assert result["clicks"] == 2
    assert fake.mousePress.call_count == 2
    fake.mousePress.assert_called_with(2)
    fake.disconnect.assert_called_once()


def test_remote_mouse_scroll(monkeypatch, set_env):
    set_env()
    fake = make_fake_client()
    with patch.object(server, "_connect", return_value=fake):
        result = tool_fn(server.remote_macos_mouse_scroll)(direction="up", amount=2, x=7, y=8, delay_ms=0)
    assert result == {"ok": True, "direction": "up", "amount": 2}
    fake.mouseMove.assert_called_with(7, 8)
    assert fake.keyPress.call_count == 2
    fake.keyPress.assert_called_with("pgup")
    fake.disconnect.assert_called_once()


def test_remote_mouse_scroll_amount_validation(monkeypatch, set_env):
    set_env()
    with pytest.raises(ValueError):
        tool_fn(server.remote_macos_mouse_scroll)(amount=0)
    with pytest.raises(ValueError):
        tool_fn(server.remote_macos_mouse_scroll)(delay_ms=-1)


def test_remote_mouse_drag(monkeypatch, set_env):
    set_env()
    fake = make_fake_client()
    monkeypatch.setattr(server.time, "sleep", lambda *_: None)
    with patch.object(server, "_connect", return_value=fake):
        result = tool_fn(server.remote_macos_mouse_drag_n_drop)(0, 0, 10, 10, ms=160, button="left", steps=4)
    assert result["steps"] == 4
    fake.mouseDown.assert_called_with(1)
    fake.mouseUp.assert_called_with(1)
    assert fake.mouseMove.call_count >= 5  # initial + steps
    fake.disconnect.assert_called_once()


def test_remote_send_keys_validation(monkeypatch, set_env):
    set_env()
    with pytest.raises(ValueError):
        tool_fn(server.remote_macos_send_keys)()


def test_remote_send_keys_combo_validation(monkeypatch, set_env):
    set_env()
    fake = make_fake_client()
    with patch.object(server, "_connect", return_value=fake):
        with pytest.raises(ValueError):
            tool_fn(server.remote_macos_send_keys)(key_combination="   ")
    fake.disconnect.assert_called_once()


def test_remote_send_keys_actions(monkeypatch, set_env):
    set_env()
    fake = make_fake_client()
    monkeypatch.setattr(server.time, "sleep", lambda *_: None)
    with patch.object(server, "_connect", return_value=fake):
        result = tool_fn(server.remote_macos_send_keys)(
            text="Hi",
            special_key="enter",
            key_combination="cmd+shift+3",
            delay_ms=0,
        )

    assert result["ok"] is True
    actions_types = {action["type"] for action in result["actions"]}
    assert {"text", "special", "combination"} <= actions_types
    fake.keyPress.assert_any_call("H")
    fake.keyPress.assert_any_call("i")
    fake.keyPress.assert_any_call("return")
    fake.keyDown.assert_any_call("super")
    fake.keyDown.assert_any_call("shift")
    fake.keyDown.assert_any_call("3")
    fake.keyUp.assert_any_call("3")
    fake.keyUp.assert_any_call("super")
    fake.disconnect.assert_called_once()


def test_remote_open_application(monkeypatch, set_env):
    set_env()
    fake = make_fake_client()
    monkeypatch.setattr(server.time, "sleep", lambda *_: None)
    with patch.object(server, "_connect", return_value=fake):
        result = tool_fn(server.remote_macos_open_application)("Safari", wait_ms=0)

    assert result == {"ok": True, "application": "Safari"}
    fake.keyDown.assert_called_with("super")
    fake.keyUp.assert_called_with("super")
    fake.keyPress.assert_any_call("space")
    fake.keyPress.assert_any_call("return")
    fake.disconnect.assert_called_once()


def test_remote_get_screen(monkeypatch, set_env):
    set_env()
    fake = make_fake_client()

    def capture(path: str) -> None:
        from PIL import Image

        Image.new("RGB", (4, 5), color=(255, 0, 0)).save(path)

    fake.captureScreen.side_effect = capture

    with patch.object(server, "_connect", return_value=fake):
        result = tool_fn(server.remote_macos_get_screen)()

    assert result["width"] == 4
    assert result["height"] == 5
    assert isinstance(result["image_base64"], str)
    assert base64.b64decode(result["image_base64"])  # decodes successfully
    fake.disconnect.assert_called_once()

