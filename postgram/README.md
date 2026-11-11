# Postgram Home Assistant add-on

Run [Postgram](https://github.com/ivo-toby/postgram) on Home Assistant OS with PostgreSQL 17, pgvector, and nginx in a single add-on. This packaging originated from [Postgram PR #111](https://github.com/ivo-toby/postgram/pull/111) and is maintained in [ha-addons PR #3](https://github.com/ivo-toby/ha-addons/pull/3).

**Current add-on version:** 0.1.6. The server and browser UI are built from the same upstream tag, `cli-v1.41.1`. No contributor-fork overlay is used.

The add-on has been reported working on an HAOS installation, including MCP search. This is not a claim of complete automated testing or verification on both supported architectures. The PR remains a draft until its maintainer accepts it.

See [DOCS.md](DOCS.md) for setup, database selection, backup/restore guidance, security considerations, and verification.
