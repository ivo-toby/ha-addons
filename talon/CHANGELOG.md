# Changelog

## 1.0.3

- Update pinned upstream Talon source from commit `338ce66f` to release tag `v0.2.8`.
- Keep the Codex CLI version and Home Assistant storage configuration unchanged.
- Verify image build and existing workspace compatibility before merging.


## 1.0.0

- First release from the standalone `ivo-toby/ha-addons` repository.
- Build Talon from a pinned commit in `ivo-toby/talon`.
- Provide persistent private workspaces, Codex CLI, ingress terminal, and recovery access.
- Support Home Assistant-managed trusted attachment origins (requires compatible Talon upstream support).
- Keep the recovery terminal available if an existing IPC directory prevents creating the CLI bridge.
- Document safe handling of earlier experimental installations; fresh installations need no migration.
