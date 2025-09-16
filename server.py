def _connect(timeout: float = 8.0):
    """Create a VNC connection; caller is responsible for client.disconnect()."""
    host, port, pwd = _get_env()
    # vncdotool 1.2.0 expects "host::port" in a single string; no `port=` kwarg.
    target = f"{host}::{port}"
    client = api.connect(target, password=pwd)

    # Give the connection a moment to settle if needed
    t0 = time.time()
    while not getattr(client, "connected", True) and time.time() - t0 < timeout:
        time.sleep(0.05)
    return client
