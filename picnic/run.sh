#!/bin/sh
set -eu
OPTIONS=/data/options.json
get_option() { jq -r --arg key "$1" '.[$key] // empty' "$OPTIONS"; }

export PICNIC_USERNAME="$(get_option picnic_username)"
export PICNIC_PASSWORD="$(get_option picnic_password)"
export PICNIC_COUNTRY_CODE="$(get_option picnic_country_code)"
export HTTP_AUTH_TOKEN="$(get_option http_auth_token)"

[ -n "$PICNIC_USERNAME" ] || { echo "ERROR: picnic_username is required"; exit 1; }
[ -n "$PICNIC_PASSWORD" ] || { echo "ERROR: picnic_password is required"; exit 1; }
[ -n "$HTTP_AUTH_TOKEN" ] || { echo "ERROR: http_auth_token is required"; exit 1; }
case "$PICNIC_COUNTRY_CODE" in NL|DE|FR) ;; *) echo "ERROR: invalid picnic_country_code"; exit 1 ;; esac
[ "${#HTTP_AUTH_TOKEN}" -ge 32 ] || { echo "ERROR: http_auth_token must be at least 32 characters"; exit 1; }

export ENABLE_HTTP_SERVER=true
export HTTP_HOST=0.0.0.0
export HTTP_PORT=3000
export PICNIC_SESSION_FILE=/data/picnic-session.json
export PICNIC_DEVICE_FILE=/data/picnic-device.json

# Home Assistant owns /data. Prepare only the two persisted files for the
# unprivileged upstream user; never log credentials or the auth token.
for file in "$PICNIC_SESSION_FILE" "$PICNIC_DEVICE_FILE"; do
  if [ -e "$file" ]; then chown mcp:mcp "$file"; fi
done
chown mcp:mcp /data
echo "Starting Picnic MCP as unprivileged user mcp"
exec su-exec mcp node /app/bin/mcp-server.js
