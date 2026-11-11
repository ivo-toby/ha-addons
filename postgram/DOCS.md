# Postgram Home Assistant add-on

## Installation

1. Add `https://github.com/ivo-toby/ha-addons` in **Settings → Add-ons → Add-on Store → ⋮ → Repositories**.
2. Install **Postgram**. This branch packages add-on version **0.1.6**.
3. In the add-on configuration, supply an OpenAI API key if using the configured OpenAI extraction/embedding path.
4. Start the add-on. Publish port **3000** for the browser UI and/or **3100** for direct API/MCP access only when needed on a trusted network. Both ports are disabled by default.
5. Open the web UI on the configured port and complete Postgram onboarding, including administrator enrollment and MFA.

The server and browser UI are built from the same upstream Git tag, `cli-v1.41.1`. The application source is not patched by this add-on. MCP annotation and OpenAI strict-schema changes discussed in upstream PR #111 are separate work.

## Configuration

| Option | Default | Purpose |
| --- | --- | --- |
| `database_name` | `postgram` | Name of an **existing** PostgreSQL database to run against. |
| `openai_api_key` | empty | OpenAI API key passed to Postgram as an environment variable. |
| `log_level` | `info` | Application logging level. |
| `extraction_enabled` | `false` | Enable optional extraction. |
| `extraction_model` | empty | Optional extraction model setting. |

The current startup script forces `EMBEDDING_PROVIDER=openai`, `EMBEDDING_MODEL=text-embedding-3-small`, and `EMBEDDING_DIMENSIONS=1536`. This is a **current limitation**, not a general Postgram requirement. Do not change embedding models/dimensions on an existing database without planning a compatible migration.

## Data, secrets, and backups

PostgreSQL data lives in `/data/postgres`. Add-on encryption and MFA secrets are persisted under `/data` and should be preserved with the installation. The add-on generates a 32-byte base64url settings encryption key if the existing key is missing or malformed. **Do not delete or rotate valid secret files**: encrypted settings or MFA factors may become unreadable.

Home Assistant backups use `backup: cold` so the PostgreSQL data directory is not copied while running. Test restoration of a Home Assistant backup before relying on it as your sole recovery path. Postgram's own application backup/restore mechanism is separate.

### Postgram application restore and database selection

Postgram may restore an application backup into a new **staging database**. A successful staging health check does **not** automatically switch the add-on to that database.

To inspect a restored database:

1. Record the current `database_name` (normally `postgram`) and keep a working backup.
2. Complete the Postgram restore and note the exact staging database name.
3. Change the add-on's `database_name` option to that existing database, save, and restart.
4. Check login/MFA, provider settings, stored knowledge, and MCP operations.
5. If anything fails, restore the previous `database_name` and restart. This selection does not delete either database.

**Known migration caveat:** A restored staging database has been observed to fail admin MFA with `Stored TOTP factor is invalid`, while the original database continued to work. The cause has not been confirmed. Do not delete the original database or reset encryption keys until the restored login and data have been verified. This add-on does not yet offer an automated staging-database activation or deletion workflow.

## Network and security

Ports 3000 (UI) and 3100 (API/MCP) are opt-in and intended for trusted LAN access. Do not expose either directly to the public internet without an appropriate authenticated, TLS-protected reverse proxy. The add-on starts Postgram directly with Node rather than using the upstream Docker entrypoint; upstream startup validation and runtime privileges therefore do not automatically carry over. Review these assumptions before production deployment.

## Verification status

Reported on a running HAOS installation: add-on startup, original-database administrator MFA login, staging database creation/restore, database switching/rollback, and a successful Postgram MCP search against stored knowledge.

Not yet independently confirmed: a complete MFA-safe migration to a restored database, provider-secret saving through the UI, OAuth routing, end-to-end Home Assistant backup recovery, and successful builds/runtime on **both** amd64 and aarch64.

The PR remains a draft while these checks and maintainer review are pending.
