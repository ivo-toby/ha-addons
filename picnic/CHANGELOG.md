# Changelog

## 1.0.1

- Run the MCP server as the unprivileged upstream `mcp` user.
- Validate country and require a bearer token of at least 32 characters.
- Document separate MCP Tunnel Manager configuration and session persistence checks.
- Build directly from upstream Git tag `v1.15.1` instead of relying on an unavailable GHCR version tag.

## 1.0.0

- Initial Home Assistant add-on for Picnic MCP.
- Direct authenticated Streamable HTTP transport; no OpenAI tunnel.
- Persistent Picnic session and device ID in Home Assistant /data.
