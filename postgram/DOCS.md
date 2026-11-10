# Postgram add-on documentation

Add `https://github.com/ivo-toby/ha-addons` as a Home Assistant add-on repository, install Postgram and configure an OpenAI API key. Start the add-on and publish ports 3000 (UI) and 3100 (API/MCP) only on a trusted network if required.

Data is stored in `/data/postgres`; cold backups are enabled to avoid copying a live PostgreSQL data directory. The add-on generates and persists a 32-byte base64url admin settings encryption key. A malformed key from the original PR is replaced; do not rotate a valid key that protects stored secrets.

The Postgram application source is not patched. The MCP annotations and strict OpenAI schema changes from PR #111 are deliberately excluded; propose them separately upstream.

## Before merging

- Build both the Postgram server and UI from the same pinned upstream tag (`cli-v1.41.1`); verify the build and runtime on both architectures.
- Validate the image's startup/entrypoint assumptions and non-root runtime; this packaging launches Node directly.
- Test onboarding, saving provider secrets through the web UI, PostgreSQL persistence, cold backup/restore, UI, API, MCP and OAuth routing.
- Build and test both amd64 and aarch64.
- Review network exposure and embedding configuration precedence. Current environment settings force OpenAI embeddings.
