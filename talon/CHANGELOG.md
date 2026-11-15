# Changelog

## 1.0.3

- Update Talon to v0.2.8, pinned to immutable commit `abf6c71722d61d3d24830419457d4f0b61633822` in both source-build Dockerfiles.
- Keep Codex CLI 0.159.0 and persistent workspace configuration.
- Add a landing page with terminal and browser voice through authenticated Home Assistant ingress.
- Adapt voice assets/API URLs, cookie paths and same-origin iframe headers to the ingress prefix; preserve upstream authentication and CSRF protection.
- Add private voice credential options and require a loopback voice listener.
- Test voice login/restore, SSE, microphone capture, bidirectional synthetic WebRTC audio, mute, hangup and logout in Chromium.
- Correct the image version label used by standalone builds and CI.
- Test the previous workspace upgrade, retained data, CLI status and complete backup restore in CI.
- Document database migrations, backup/rollback and voice configuration.

## 1.0.0

- First release from the standalone `ivo-toby/ha-addons` repository.
- Build Talon from a pinned commit in `ivo-toby/talon`.
- Provide persistent private workspaces, Codex CLI, ingress terminal, and recovery access.
- Support Home Assistant-managed trusted attachment origins (requires compatible Talon upstream support).
- Keep the recovery terminal available if an existing IPC directory prevents creating the CLI bridge.
- Document safe handling of earlier experimental installations; fresh installations need no migration.
