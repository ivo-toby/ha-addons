# Picnic MCP — Home Assistant add-on

Runs [ivo-toby/mcp-picnic](https://github.com/ivo-toby/mcp-picnic) as a Home Assistant add-on, exposing its **Streamable HTTP** MCP endpoint. The add-on does **not** contain a tunnel: use your separate MCP Tunnel Manager to connect external clients.

## Install and configure

1. Add the Home Assistant add-on repository (see the [repository README](../README.md)) and install **Picnic MCP**.
2. In **Configuration**, set the following options:

   | Option | Meaning |
   | --- | --- |
   | `picnic_username` | Your Picnic account email |
   | `picnic_password` | Your Picnic password |
   | `picnic_country_code` | `NL`, `DE`, or `FR` |
   | `http_auth_token` | A unique random secret of **at least 32 characters** |

3. Save the options and start the add-on. Check **Logs** for startup errors. Do not share credentials or bearer tokens in logs or screenshots.
4. In the add-on's **Network** settings, publish container port `3000/tcp` on a host port (typically `3000`) **only if** your MCP Tunnel Manager needs to reach the add-on through the Home Assistant host. The port is **not published by default**.

## Connect your separate MCP Tunnel Manager

Configure the tunnel manager to forward to:

```text
http://<home-assistant-host>:3000/mcp
```

This assumes you mapped container port `3000/tcp` to host port `3000`. If you selected a different host port, change the URL accordingly. Set:

- `mcp_server_url`: the endpoint URL above
- `mcp_auth_type`: `bearer`
- Bearer token: the **same value** as `http_auth_token` in the Picnic add-on

The MCP endpoint also accepts `Authorization: Bearer <token>` or `x-mcp-token: <token>` from compatible clients. Use a trusted local network between the tunnel manager and the add-on. **Never forward the MCP port directly to the public internet.** Use TLS for connections outside the trusted local network.

## Picnic login and SMS verification

The HTTP server starting successfully does **not** mean Picnic authentication is complete. On first use, Picnic may require SMS/two-factor verification. Complete that flow using the Picnic MCP authentication tools exposed to your connected client. The add-on keeps the session and device identifier in Home Assistant's persistent `/data` directory:

- `/data/picnic-session.json`
- `/data/picnic-device.json`

After restarting the add-on, call a read-only tool such as `picnic_get_cart`. If it succeeds without another SMS verification, session persistence is confirmed. If it requests verification again, complete the flow and inspect the add-on logs. **Persistence after restart has not yet been verified for this build.**

## Functional verification

The following actions were successfully tested through the connected Picnic MCP tools with add-on version **1.0.1**:

1. Search for bananas.
2. Read the empty shopping cart.
3. Add one pack of Chiquita bananas.
4. Read the cart again and confirm the item.
5. Remove the bananas; the cart returned to empty.

This verifies the connected MCP search/cart workflow, **not** the ability to place orders, persistence after restart, or builds on both supported architectures. No order was placed.

## Versioning and build

- **Add-on version:** `1.0.1` (the Home Assistant version in `config.yaml`).
- **Upstream source:** Git tag **`v1.15.1`** of `ivo-toby/mcp-picnic`.
- **Build method:** a multi-stage Dockerfile clones that Git tag, builds the Node application and installs production dependencies. It does **not** pull `ghcr.io/ivo-toby/mcp-picnic:1.15.1`; a Git tag does not imply a matching GHCR image tag.
- **Declared architectures:** `amd64` and `aarch64`. Both architecture builds have not yet been independently verified.

The build needs network access to GitHub and npm. The upstream source tag is fixed, although npm dependencies and base-image resolution should also be considered when evaluating full build reproducibility.

## Security

The server can read and change your Picnic shopping cart and may expose ordering actions. Protect the bearer token, restrict network access and review actions in your MCP client. The `/health` endpoint is unauthenticated and is only a server-health check; it does not establish a valid Picnic login.
