# Picnic MCP Home Assistant add-on

Configure `picnic_username`, `picnic_password`, `picnic_country_code` and a long, randomly generated `http_auth_token` in the add-on options.

The Streamable HTTP endpoint is `http://<home-assistant-host>:3000/mcp` if you explicitly publish container port 3000 in the add-on network settings. By default the port is not published to the host.

Authenticate with `Authorization: Bearer <http_auth_token>` or `x-mcp-token: <http_auth_token>`.

The add-on persists the Picnic authentication session and device ID in `/data`, surviving restarts. When Picnic requests 2FA, use the MCP 2FA tools from your connected client.

**Security:** The server can read and modify your Picnic cart and potentially perform ordering actions. Never expose the HTTP port directly to the internet. Use a trusted LAN or authenticated reverse proxy with TLS. The `/health` endpoint is intentionally unauthenticated for container health checks.

This add-on uses the upstream container image. Its current `latest` tag should be pinned to a tested immutable digest before a production release. Ensure the upstream image supports the architecture of your Home Assistant machine.
