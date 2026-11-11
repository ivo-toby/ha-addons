# Changelog

## 0.1.6

- Build the Postgram server and browser UI from the same pinned upstream tag, `cli-v1.41.1`, instead of following `main`.

## 0.1.5

- Add the `database_name` option to select an existing database, including a restored staging database, without deleting the original.

## 0.1.4

- Initialize pgvector in PostgreSQL `template1` so new staging databases can inherit the extension.

## 0.1.3

- Grant the Postgram PostgreSQL role permission to create databases needed by staging restore.

## 0.1.2

- Allow Postgram backup uploads up to 1 GiB through the add-on nginx reverse proxy.

## 0.1.1

- Fix admin session cookies for LAN HTTP access by forwarding a localhost Host header to the Postgram backend.

## 0.1.0

- Initial Home Assistant add-on packaging of Postgram, migrated from ivo-toby/postgram#111.
