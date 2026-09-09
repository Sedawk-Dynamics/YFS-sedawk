#!/bin/sh
set -e

# Fail fast and clearly rather than surfacing a confusing error later.
if [ -z "$DATABASE_URL" ]; then
  echo "FATAL: DATABASE_URL is not set." >&2
  exit 1
fi
if [ -z "$AUTH_SECRET" ]; then
  echo "FATAL: AUTH_SECRET is not set. Generate one with: openssl rand -base64 48" >&2
  exit 1
fi
if [ -z "$ENCRYPTION_KEY" ]; then
  echo "FATAL: ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32" >&2
  exit 1
fi

UPLOADS="${UPLOAD_DIR:-/app/uploads}"
# `set -e` would abort on a failed mkdir with a bare error, so handle it here
# and say what to actually check.
if ! mkdir -p "$UPLOADS" 2>/dev/null; then
  echo "FATAL: could not create $UPLOADS. Check the volume mount path." >&2
  exit 1
fi
if [ ! -w "$UPLOADS" ]; then
  echo "FATAL: $UPLOADS is not writable. Check the volume mount and its ownership." >&2
  exit 1
fi
echo "Uploads directory ready: $UPLOADS"

# Bring the schema up to date before serving. `migrate deploy` only applies
# migrations that already exist, so it never generates or guesses anything.
#
# Invoked directly rather than through pnpm: corepack was enabled as root at
# build time, so resolving pnpm as the unprivileged runtime user would try to
# download it again and make startup depend on network egress.
echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting YFS Infinity portal..."
exec "$@"
