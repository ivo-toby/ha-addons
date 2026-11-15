# Changelog

## 1.0.3

- Update Talon to v0.2.8, pinned to immutable commit `abf6c71722d61d3d24830419457d4f0b61633822` in both source-build Dockerfiles.
- Keep Codex CLI 0.159.0, persistent workspace configuration and the existing terminal ingress bridge.
- Correct the image version label used by standalone builds and CI.
- Test the previous workspace upgrade, retained data, CLI status and complete backup restore in CI.
- Document database migrations, backup/rollback and the unsupported browser voice ingress path.

## 1.0.0

- First release from the standalone `ivo-toby/ha-addons` repository.
- Build Talon from a pinned commit in `ivo-toby/talon`.
- Provide persistent private workspaces, Codex CLI, ingress terminal, and recovery access.
- Support Home Assistant-managed trusted attachment origins (requires compatible Talon upstream support).
- Keep the recovery terminal available if an existing IPC directory prevents creating the CLI bridge.
- Document safe handling of earlier experimental installations; fresh installations need no migration.
