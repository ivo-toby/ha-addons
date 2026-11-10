# Picnic MCP

Home Assistant add-on for [ivo-toby/mcp-picnic](https://github.com/ivo-toby/mcp-picnic).

Provides a bearer-token-protected **Streamable HTTP** MCP endpoint. It runs **without an embedded tunnel**; connect it through your separately installed MCP Tunnel Manager if external access is needed.

- **Home Assistant add-on version:** `1.0.1`
- **Upstream Git tag:** `v1.15.1` (built from source, not a GHCR version tag)
- **Endpoint:** `http://<home-assistant-host>:3000/mcp` after explicitly publishing port 3000
- **Supported architectures declared:** `amd64`, `aarch64`

The product search and cart add/remove flow was tested successfully. Restart persistence and both architecture builds still require verification.

See [DOCS.md](DOCS.md) for installation, options, tunnel setup, SMS verification, security and test status.
