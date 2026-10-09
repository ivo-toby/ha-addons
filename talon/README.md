# Talon Home Assistant add-on

Run Talon in Home Assistant with a built-in management terminal.

## Features

- One Talon daemon and management CLI in a single add-on
- Private persistent configuration, workspace, and SQLite database
- Optional storage location within the add-on's private data directory
- Channel and model settings managed directly in each private workspace
- MCP integrations for external tools and files

## Installation

Add this repository to the Home Assistant add-on store and install **Talon**.
Start the add-on, then open **Talon → Open Web UI** to access its management terminal.
For a new workspace, the add-on invokes Talon's own configuration generator.
It does not select a model, provider, persona, or channel. Use the management
terminal to configure those in `talond.yaml` and authenticate your chosen
provider (for example, `codex login --device-auth` for Codex CLI).
Opening the terminal does not itself sign you in. The add-on does not provide
an OAuth login form.

If you select an existing workspace, its `talond.yaml` remains authoritative
for models, channels, and recipients. The Home Assistant options do not
silently replace those settings.

The default storage root is `/data/talon`. The optional `storage_path` accepts
another absolute path below private `/data`, such as `/data/assistant`.
The daemon state is stored in `<storage_path>/state`. The `instance` setting
selects a workspace by name under `<storage_path>/workspaces/`. Leave it empty
to use `default`, or enter the name of an existing workspace to reuse it.
For example, `instance: example` selects `/data/talon/workspaces/example` with the
default storage location.

Each installation runs one daemon. A chosen storage path does not share files
with other add-ons or automatically start multiple instances.

Changing `storage_path` selects a different private directory; it does not
move existing data. Leave the default unchanged unless you intentionally
manage a different private storage location.

## Trusted attachment download origins

Home Assistant exposes `attachment_allowed_origins` as a default-empty list of
trusted HTTP(S) origins for Telegram file downloads. This feature requires a Talon build supporting
`attachments.allowedOrigins` and `attachments.privateOrigins` (see
[upstream PR #289](https://github.com/ivo-toby/talon/pull/289) while it is under review).

Example add-on configuration (replace the example domain with the origin of your trusted file server):

```yaml
attachment_allowed_origins:
  - "https://files.example.org"
```

At startup, the add-on validates every origin and synchronizes a **marked
Home Assistant-managed block** in the selected workspace's `talond.yaml`.
This keeps the rest of the file intact. The trusted origins populate both
allowed and private origin lists; allowing a private origin is an explicit
per-server exception to Talon's public-IP restriction. Redirects remain blocked.
Removing all origins removes only the managed block.

If you already have an independently managed top-level `attachments:` block
in `talond.yaml`, configure origins there instead; the add-on refuses to
overwrite it when its HA origin list is nonempty. Invalid settings prevent
the daemon from starting, but the recovery terminal remains accessible.
Restart the add-on after changing these settings.

## Management

Open **Talon > Open Web UI** and use the terminal:

```sh
talonctl status
talonctl list-personas
talonctl reload
```

The add-on does not mount Home Assistant's shared directories. Connect external
files through explicitly configured MCP servers.

See [DOCS.md](DOCS.md) for more information.
