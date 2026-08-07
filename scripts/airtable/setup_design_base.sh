#!/usr/bin/env bash
# setup_design_base.sh — create the Tanduri Design System base (tables + token seed)
#
# Requirements:
#   AIRTABLE_API_KEY  Personal Access Token (https://airtable.com/create/tokens)
#                     scopes: data.records:read, data.records:write, schema.bases:read
#                     + the target base added to the token's Access list
#   AIRTABLE_BASE_ID  Base id (app...) — create an empty base named "Tanduri Design System"
#
# Idempotent: existing tables are skipped, tokens are upserted by Name.
# Schema mirrors docs/DESIGN.md §11.2.

set -euo pipefail

: "${AIRTABLE_API_KEY:?set AIRTABLE_API_KEY (PAT) first}"
: "${AIRTABLE_BASE_ID:?set AIRTABLE_BASE_ID (app...) first}"

API="https://api.airtable.com/v0"
AUTH="Authorization: Bearer $AIRTABLE_API_KEY"
CT="Content-Type: application/json"

echo "== verifying token =="
code=$(curl -s -o /dev/null -w "%{http_code}" "$API/meta/bases" -H "$AUTH")
if [ "$code" != "200" ]; then
  echo "ERROR: token check failed (HTTP $code). Check PAT scopes and base access list." >&2
  exit 1
fi
echo "token OK"

table_id() { # $1 = table name -> prints table id or empty
  curl -s "$API/meta/bases/$AIRTABLE_BASE_ID/tables" -H "$AUTH" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next((t["id"] for t in d.get("tables",[]) if t["name"]==sys.argv[1]), ""))' "$1"
}

create_table() { # $1 = name, $2 = python-literal fields array, $3 = optional linked-table id substitution
  local name="$1" fields="$2" linkid="$3"
  local existing
  existing=$(table_id "$name")
  if [ -n "$existing" ]; then
    echo "table '$name' exists ($existing) — skipping"
    echo "$existing"
    return 0
  fi
  echo "creating table '$name'"
  local payload
  payload=$(python3 - "$name" "$fields" "$linkid" <<'PY'
import json, sys
name, fields, linkid = sys.argv[1], eval(sys.argv[2]), sys.argv[3]
s = json.dumps(fields)
if linkid:
    s = s.replace("LINKED_TABLE_ID", linkid)
print(json.dumps({"name": name, "fields": json.loads(s)}))
PY
)
  local resp newid
  resp=$(curl -s -X POST "$API/meta/bases/$AIRTABLE_BASE_ID/tables" -H "$AUTH" -H "$CT" -d "$payload")
  newid=$(echo "$resp" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("id",""))')
  if [ -z "$newid" ]; then
    echo "ERROR: table create failed:" >&2
    echo "$resp" >&2
    exit 1
  fi
  echo "  -> $name = $newid"
  echo "$newid"
}

tokens_id=$(create_table "Tokens" '[
  {"name": "Name", "type": "singleLineText"},
  {"name": "Type", "type": "singleSelect", "options": {"choices": [{"name": "color"}, {"name": "typography"}, {"name": "spacing"}, {"name": "radius"}, {"name": "shadow"}, {"name": "breakpoint"}]}},
  {"name": "Value", "type": "singleLineText"},
  {"name": "Usage", "type": "longText"},
  {"name": "Status", "type": "singleSelect", "options": {"choices": [{"name": "active"}, {"name": "draft"}, {"name": "deprecated"}]}},
  {"name": "UpdatedAt", "type": "date"}
]')

components_id=$(create_table "Components" '[
  {"name": "Name", "type": "singleLineText"},
  {"name": "Variants", "type": "longText"},
  {"name": "Spec", "type": "longText"},
  {"name": "Tokens", "type": "multipleRecordLinks", "options": {"linkedTableId": "LINKED_TABLE_ID", "isValid": true}},
  {"name": "Status", "type": "singleSelect", "options": {"choices": [{"name": "active"}, {"name": "draft"}, {"name": "deprecated"}]}}
]' "$tokens_id")

pages_id=$(create_table "Pages" '[
  {"name": "Name", "type": "singleLineText"},
  {"name": "Description", "type": "longText"},
  {"name": "Components", "type": "multipleRecordLinks", "options": {"linkedTableId": "LINKED_TABLE_ID", "isValid": true}},
  {"name": "StitchRef", "type": "url"},
  {"name": "Status", "type": "singleSelect", "options": {"choices": [{"name": "active"}, {"name": "draft"}, {"name": "deprecated"}]}}
]' "$components_id")

echo "== seeding Tokens (upsert by Name, batches of 10) =="
seed_payload() { # $1 = batch number (1-based)
  python3 - "$1" <<'PY'
import json, sys
batch = int(sys.argv[1])
colors = [
  ("--primary","color","#16A34A","Buttons, active states, links, active land badge"),
  ("--primary-strong","color","#15803D","Hover/active press, focus ring base"),
  ("--primary-soft","color","#DCFCE7","Phase badge bg, selected chip bg, success tint"),
  ("--primary-deep","color","#14532D","Text on soft backgrounds, logo mark"),
  ("--bg","color","#F8FAF7","Page background (green-tinted white)"),
  ("--surface","color","#FFFFFF","Cards, dialogs, inputs"),
  ("--earth-50","color","#FAF5EF","Column header bg, subtle section tint"),
  ("--earth-200","color","#E7DECD","Card border, dividers"),
  ("--text","color","#1F2A21","Primary text (near-black with green cast)"),
  ("--text-muted","color","#5B6B5F","Secondary text, placeholders"),
  ("--border","color","#E3E8E3","Default borders"),
  ("--success","color","#16A34A","Selesai, confirmation toasts"),
  ("--warning","color","#D97706","Terlambat upcoming, warnings"),
  ("--danger","color","#DC2626","Overdue highlight, delete actions"),
  ("--danger-soft","color","#FEE2E2","Overdue card bg tint, alert banners"),
]
typevals = [
  ("font-family","typography","Plus Jakarta Sans, ui-sans-serif, system-ui, Arial, sans-serif","Display/headings/body/button stack (Google Fonts)"),
  ("font-family-mono","typography","Space Mono, ui-monospace, Menlo, monospace","Labels/overline stack (Google Fonts)"),
  ("font-xs","typography","12px","text-xs"),
  ("font-sm","typography","14px","text-sm body"),
  ("font-base","typography","16px","text-base"),
  ("font-lg","typography","18px","text-lg"),
  ("font-xl","typography","20px","text-xl page titles"),
  ("font-2xl","typography","24px","text-2xl hero/login"),
  ("space-1","spacing","4px","4px base"),
  ("space-2","spacing","8px",""),
  ("space-3","spacing","12px",""),
  ("space-4","spacing","16px",""),
  ("space-6","spacing","24px",""),
  ("space-8","spacing","32px",""),
  ("space-12","spacing","48px",""),
  ("radius-sm","radius","6px","inputs"),
  ("radius-md","radius","8px","buttons/cards"),
  ("radius-lg","radius","12px","chat bubbles/columns"),
  ("radius-full","radius","9999px","pills/badges/avatars"),
  ("shadow-sm","shadow","0 1px 2px rgb(0 0 0 / 0.05)","cards"),
  ("shadow-md","shadow","0 4px 12px rgb(0 0 0 / 0.08)","floating chat widget"),
  ("shadow-lg","shadow","0 8px 24px rgb(0 0 0 / 0.12)","modals"),
  ("bp-mobile","breakpoint","<640px","mobile"),
  ("bp-tablet","breakpoint","640-1024px","tablet"),
  ("bp-desktop","breakpoint",">1024px","desktop"),
]
rows = [{"fields": {"Name": n, "Type": t, "Value": v, "Usage": u, "Status": "active"}} for n,t,v,u in (colors+typevals)]
start = (batch-1)*10
chunk = rows[start:start+10]
print(json.dumps({"performUpsert": {"fieldsToMergeOn": ["Name"]}, "records": chunk}))
PY
}

for batch in 1 2 3 4; do
  payload=$(seed_payload "$batch")
  n=$(echo "$payload" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["records"]))')
  [ "$n" = "0" ] && break
  curl -s -X PATCH "$API/$AIRTABLE_BASE_ID/Tokens" -H "$AUTH" -H "$CT" -d "$payload" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print("  batch upserted", len(d.get("records",[])))' \
    || { echo "ERROR: seed batch $batch failed" >&2; exit 1; }
done

echo "== done =="
echo "Base: $AIRTABLE_BASE_ID"
echo "Tables: Tokens ($tokens_id), Components ($components_id), Pages ($pages_id)"
echo "Next: import Stitch designs into Pages.StitchRef + Components.Spec (DESIGN.md §11.4), then mirror into DESIGN.md §4."
