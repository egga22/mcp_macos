# server.py
from fastmcp import FastMCP
from typing import Optional

mcp = FastMCP("remote-macos-starter")

@mcp.tool()
def ping() -> str:
    """Health check. Returns 'pong' if the server is alive."""
    return "pong"

@mcp.tool()
def echo(message: str, tag: Optional[str] = None) -> dict:
    """Echo a message back. Use this to confirm argument passing."""
    return {"message": message, "tag": tag or "none"}
