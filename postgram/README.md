# Postgram Home Assistant add-on

Packages [Postgram](https://github.com/ivo-toby/postgram) for Home Assistant OS. Derived from [Postgram PR #111](https://github.com/ivo-toby/postgram/pull/111).

The official Postgram server image is used without overlaying code from a contributor fork. PostgreSQL 17, pgvector, and nginx run in the add-on container.

**Draft status:** upstream server image and UI source currently track main. Before release, pin both to one verified upstream release and test on HAOS. This draft is not ready to merge.

See [DOCS.md](DOCS.md) for installation, security and verification.
