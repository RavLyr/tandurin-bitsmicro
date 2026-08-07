#!/usr/bin/env bash
# Tanduri setup script (T-004).
# 1. Validates .env.local (errors on any empty required var).
# 2. Applies supabase/migrations/001_init.sql to the linked project if a
#    Supabase CLI is available, else prints manual instructions.
# 3. Verifies storage buckets if SUPABASE_ACCESS_TOKEN is set, else checklist.
# Non-destructive and idempotent — safe to re-run.

set -euo pipefail

ENV_FILE=".env.local"
REQUIRED_VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  SUPABASE_SERVICE_ROLE_KEY
  GEMINI_API_KEY
  OPENWEATHER_API_KEY
  RESEND_API_KEY
  CRON_SECRET
)
OPTIONAL_VARS=(GEMINI_MODEL NEXT_PUBLIC_APP_URL)
MIGRATION_FILE="supabase/migrations/001_init.sql"

cd "$(dirname "$0")/.."

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.example to .env.local and fill values." >&2
  exit 1
fi

echo "==> Reading $ENV_FILE"

value() {
  local key="$1"
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -1
}

missing=0
for key in "${REQUIRED_VARS[@]}"; do
  val="$(value "$key")"
  if [[ -z "$val" ]]; then
    echo "  [missing] $key"
    missing=1
  fi
done
for key in "${OPTIONAL_VARS[@]}"; do
  val="$(value "$key")"
  if [[ -z "$val" ]]; then
    echo "  [optional, default] $key"
  fi
done

if [[ "$missing" -eq 1 ]]; then
  echo "ERROR: fill the missing vars in $ENV_FILE first." >&2
  exit 1
fi

echo "==> Applying database migration"

if command -v supabase >/dev/null 2>&1; then
  CLI=(supabase)
elif pnpm supabase --version >/dev/null 2>&1; then
  CLI=(pnpm supabase)
else
  CLI=()
fi

if [[ ${#CLI[@]} -gt 0 ]]; then
  echo "  Using Supabase CLI via: ${CLI[*]}"
  if [[ -f "$MIGRATION_FILE" ]]; then
    "${CLI[@]}" db push --include-all
  else
    echo "  WARN: $MIGRATION_FILE not found; nothing to apply."
  fi
else
  echo "  No Supabase CLI found."
  echo "  MANUAL STEP: open Dashboard -> SQL Editor, paste $MIGRATION_FILE, run."
fi

echo "==> Verifying storage buckets"

ACCESS_TOKEN="$(value SUPABASE_ACCESS_TOKEN)"
PROJECT_URL="$(value NEXT_PUBLIC_SUPABASE_URL)"
SECRET_KEY="$(value SUPABASE_SERVICE_ROLE_KEY)"

if [[ -n "$ACCESS_TOKEN" && -n "$PROJECT_URL" ]]; then
  REF="$(echo "$PROJECT_URL" | sed -E 's#https://([^.]+)\..*#\1#')"
  echo "  Querying management API for project $REF ..."
  BUCKETS="$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
    "https://api.supabase.com/v1/projects/$REF/storage/buckets" || true)"
  if echo "$BUCKETS" | grep -q '"name"'; then
    for bucket in avatars plant-images; do
      if echo "$BUCKETS" | grep -q "\"name\":\"$bucket\""; then
        echo "  [ok] bucket $bucket exists"
      else
        echo "  [missing] bucket $bucket — create it (see docs/DESIGN.md §6)"
      fi
    done
  else
    echo "  WARN: could not list buckets via management API (response: $BUCKETS)"
  fi
else
  echo "  No SUPABASE_ACCESS_TOKEN — checklist:"
  echo "    - avatars bucket (public)"
  echo "    - plant-images bucket (private)"
  echo "  (These are created by $MIGRATION_FILE itself.)"
fi

echo "==> Setup complete"
