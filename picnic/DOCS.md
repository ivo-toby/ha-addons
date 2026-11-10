# Picnic MCP Home Assistant add-on

Configure `picnic_username`, `picnic_password`, `picnic_country_code` and a randomly generated `http_auth_token` of at least 32 characters in the add-on options.

The Streamable HTTP endpoint is `http://<home-assistant-host>:3000/mcp` if you explicitly publish container port 3000 in the add-on network settings. By default the port is not published to the host.

Authenticate with `Authorization: Bearer <http_auth_token>` or `x-mcp-token: <http_auth_token>`.

## Connecting through a separate MCP Tunnel Manager

Keep the tunnel in its own add-on. Point its `mcp_server_url` to `http://<home-assistant-host>:3000/mcp` and configure `mcp_auth_type: bearer` with the same token as `http_auth_token`. Publish the port only on a trusted network reachable by the tunnel manager. Never forward it directly to the internet.

## Authentication and persistence

The add-on stores the Picnic session and device ID in `/data` and starts the MCP process as the unprivileged `mcp` user. When Picnic requests 2FA, use the MCP 2FA tools from your connected client. A healthy HTTP server does **not** guarantee Picnic authentication is complete.

After restarting the add-on, call a read-only MCP tool such as `picnic_get_cart`. If it works without requesting 2FA again, session persistence is confirmed. If 2FA is required, complete it again and inspect the add-on logs. Never paste credentials or tokens into logs or support requests.

## Security and releases

The server can read and modify your Picnic cart and potentially perform ordering actions. Keep the HTTP endpoint private, use a strong bearer token, and use TLS on any connection outside the trusted local network. The `/health` endpoint is intentionally unauthenticated.

**Release blocker:** The Dockerfile currently uses upstream `:latest`. Before a production release, replace it with a verified immutable image digest that supports the Home Assistant architecture. Do not guess a digest or tag.
