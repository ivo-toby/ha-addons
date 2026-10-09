# Changelog

## 1.0.0

- First release from the standalone `ivo-toby/ha-addons` repository.
- Build Talon from a pinned commit in `ivo-toby/talon`.
- Provide persistent private workspaces, Codex CLI, ingress terminal, and recovery access.
- Support Home Assistant-managed trusted attachment origins (requires compatible Talon upstream support).
- Keep the recovery terminal available if an existing IPC directory prevents creating the CLI bridge.
- Document safe handling of earlier experimental installations; fresh installations need no migration.
