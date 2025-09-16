# server.py
# Minimal FastMCP server so FastMCP Cloud has a valid entrypoint (server.py:mcp)
# You can add real macOS tools here later.

from fastmcp import FastMCP, Tool
from typing import Optional

mcp = FastMCP("remote-macos-starter")

@mcp.tool()
def ping() -> str:
    """
    Health check. Returns 'pong' if the server is alive.
    """
    return "pong"

@mcp.tool()
def echo(message: str, tag: Optional[str] = None) -> dict:
    """
    Echo a message back. Use this to confirm argument passing.
    """
    return {"message": message, "tag": tag or "none"}

# --- PLACEHOLDER AREA ---
# After you confirm deploy, you can start adding 'real' tools here,
# e.g. get_screen(), mouse_click(), send_keys(), etc.
#
# Example signature you can fill in later:
# @mcp.tool()
# def macos_get_screen() -> str:
#     return "not yet implemented"
