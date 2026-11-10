#!/usr/bin/with-contenv bashio
set -euo pipefail
PGDATA=/data/postgres
PGSOCKET=/run/postgresql
mkdir -p "$PGDATA" "$PGSOCKET"
chown -R postgres:postgres "$PGDATA" "$PGSOCKET"
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  su postgres -c "initdb -D '$PGDATA' --auth=trust --encoding=UTF8"
fi
su postgres -c "pg_ctl -D '$PGDATA' -o '-k $PGSOCKET -h 127.0.0.1' -w start"
su postgres -c "psql -h '$PGSOCKET' -d postgres -tc \"SELECT 1 FROM pg_roles WHERE rolname='postgram'\" | grep -q 1 || createuser -h '$PGSOCKET' postgram"
su postgres -c "psql -h '$PGSOCKET' -d postgres -v ON_ERROR_STOP=1 -c 'ALTER ROLE postgram CREATEDB;'"
su postgres -c "psql -h '$PGSOCKET' -d postgres -tc \"SELECT 1 FROM pg_database WHERE datname='postgram'\" | grep -q 1 || createdb -h '$PGSOCKET' -O postgram postgram"
su postgres -c "psql -h '$PGSOCKET' -d postgram -c 'CREATE EXTENSION IF NOT EXISTS vector;'"
export DATABASE_URL="postgresql://postgram@127.0.0.1:5432/postgram"
export POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5432 POSTGRES_DB=postgram POSTGRES_USER=postgram
export OPENAI_API_KEY="$(bashio::config 'openai_api_key')"
export LOG_LEVEL="$(bashio::config 'log_level')"
export EXTRACTION_ENABLED="$(bashio::config 'extraction_enabled')"
export EXTRACTION_PROVIDER=openai
export EXTRACTION_MODEL="$(bashio::config 'extraction_model')"
export EMBEDDING_PROVIDER=openai EMBEDDING_MODEL=text-embedding-3-small EMBEDDING_DIMENSIONS=1536
export PORT=3100
gen_key() { head -c 32 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n'; }
key_file=/data/admin_settings_key
if ! grep -Eq '^[A-Za-z0-9_-]{43}$' "$key_file" 2>/dev/null; then
  gen_key > "$key_file"
fi
if [ ! -s /data/admin_mfa_secret ]; then
  head -c 48 /dev/urandom | base64 | tr -d '\n' > /data/admin_mfa_secret
fi
export ADMIN_SETTINGS_ENCRYPTION_KEY="$(cat "$key_file")"
export ADMIN_MFA_SECRET_KEY="$(cat /data/admin_mfa_secret)"
cd /opt/postgram
node dist/index.js &
APP_PID=$!
nginx -g 'daemon off;' &
NGINX_PID=$!
cleanup() {
  kill "$APP_PID" "$NGINX_PID" 2>/dev/null || true
  su postgres -c "pg_ctl -D '$PGDATA' -m fast stop" 2>/dev/null || true
}
trap cleanup EXIT TERM INT
set +e
wait -n "$APP_PID" "$NGINX_PID"
status=$?
set -e
exit "$status"
