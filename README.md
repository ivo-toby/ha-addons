# Home Assistant Add-ons

Home Assistant add-on repository maintained by [@ivo-toby](https://github.com/ivo-toby) and [@lukkezen](https://github.com/lukkezen).

## Installation

[![Add repository to your Home Assistant instance.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fivo-toby%2Fha-addons)

Or add it manually: **Settings → Add-ons → Add-on Store → ⋮ → Repositories**, then enter:

```
https://github.com/ivo-toby/ha-addons
```

## Add-ons

| Add-on | Description |
| ------ | ----------- |
| [Talon](talon/) | Self-hosted autonomous AI agent daemon ([Talon](https://github.com/ivo-toby/talon)) with a built-in management terminal. |

## Layout

Each add-on lives in its own top-level directory containing at least a `config.yaml`, `Dockerfile`, `README.md` and `DOCS.md`. `repository.yaml` at the root makes this a Home Assistant add-on repository.

## Contributing

Open a pull request against `main`. Bump the add-on's `version` in its `config.yaml` and add a `CHANGELOG.md` entry for every user-facing change; Home Assistant only offers an update when the version changes.

## License

[AGPL-3.0](LICENSE), matching Talon.
