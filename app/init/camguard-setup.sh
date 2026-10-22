#!/usr/bin/env bash
set -uo pipefail
# ─────────────────────────────────────────────────────────────────────────────
#  CamGuard realm setup (run AFTER init/tcinit.sh).
#
#  Creates the CamGuard roles + the demo cast, mints a Tide enrollment link for
#  each new user, files the role grants, and drains whatever the realm lets us
#  auto-approve.
#
#  IMPORTANT — the FirstAdmin → MultiAdmin cliff:
#    tcinit.sh grants `admin` tide-realm-admin, which flips the realm to
#    MultiAdmin. After that, governed writes (create role/user, grant role) are
#    captured as change-requests that a human must sign in the Admin Console
#    enclave — the simple server-side lane is refused. This script therefore
#    FILES everything and then tells you exactly what to approve where.
#
#    For the smoothest demo, add the cg roles to init/realm.json (already done in
#    this repo) and run a FRESH `npm run init`: the roles are then created in
#    FirstAdmin and auto-committed, leaving only user enrollment + the quorum
#    admin grants as human steps.
#
#  Run in WSL:
#    wsl bash -c "cd /mnt/d/RMIT_Hackathon/C2/app && bash init/camguard-setup.sh"
# ─────────────────────────────────────────────────────────────────────────────

TC="${TIDECLOAK_URL:-http://localhost:8080}"
REALM="${TIDECLOAK_REALM:-nextjs-test}"
KC_USER="${TC_ADMIN_USER:-admin}"
KC_PASSWORD="${TC_ADMIN_PASSWORD:-password}"
LIFESPAN="${ENROLL_LIFESPAN:-86400}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }; }
need curl; need jq

get_token() {
  curl -s -X POST "${TC}/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=${KC_USER}" -d "password=${KC_PASSWORD}" \
    -d "grant_type=password" -d "client_id=admin-cli" | jq -r .access_token
}

RESP_CODE=""; RESP_BODY=""
api() {
  local method="$1" url="$2"; shift 2
  local tmp; tmp="$(mktemp)"
  RESP_CODE=$(curl -s -o "${tmp}" -w "%{http_code}" -X "${method}" "${url}" \
    -H "Authorization: Bearer ${TOKEN}" "$@") || RESP_CODE="000"
  RESP_BODY="$(cat "${tmp}")"; rm -f "${tmp}"
}

TOKEN="$(get_token)"
if [[ -z "${TOKEN}" || "${TOKEN}" == "null" ]]; then
  echo "ERROR: could not get admin token. Is TideCloak up and KC_USER/KC_PASSWORD correct?" >&2
  exit 1
fi

echo "== CamGuard setup on realm '${REALM}' @ ${TC} =="

# ── Roles ────────────────────────────────────────────────────────────────────
ensure_role() {
  local name="$1" desc="$2"
  TOKEN="$(get_token)"
  api GET "${TC}/admin/realms/${REALM}/roles/${name}"
  if [[ "${RESP_CODE}" == "200" ]]; then echo "  role ${name}: exists"; return; fi
  TOKEN="$(get_token)"
  api POST "${TC}/admin/realms/${REALM}/roles" -H "Content-Type: application/json" \
    -d "{\"name\":\"${name}\",\"description\":\"${desc}\"}"
  echo "  role ${name}: create -> ${RESP_CODE}$( [[ ${RESP_CODE} == 202 ]] && echo ' (change-request parked)')"
}

echo "-- roles --"
ensure_role cg-board   "CamGuard board member"
ensure_role cg-resident "CamGuard resident/guard"
ensure_role cg-ingest  "CamGuard technical admin"
ensure_role cctv-viewer "CamGuard clip decryption authority (quorum-granted only)"

# ── Demo users + enrollment links ─────────────────────────────────────────────
declare -A LINKS
ensure_user() {
  local username="$1" email="$2" first="$3" last="$4"
  TOKEN="$(get_token)"
  api GET "${TC}/admin/realms/${REALM}/users?username=${username}&exact=true"
  local uid; uid="$(jq -r '.[0].id // empty' <<< "${RESP_BODY}")"
  if [[ -z "${uid}" ]]; then
    TOKEN="$(get_token)"
    api POST "${TC}/admin/realms/${REALM}/users" -H "Content-Type: application/json" \
      -d "{\"username\":\"${username}\",\"email\":\"${email}\",\"firstName\":\"${first}\",\"lastName\":\"${last}\",\"enabled\":true,\"emailVerified\":false,\"attributes\":{\"tideInvitable\":[\"true\"]}}"
    echo "  user ${username}: create -> ${RESP_CODE}"
    TOKEN="$(get_token)"
    api GET "${TC}/admin/realms/${REALM}/users?username=${username}&exact=true"
    uid="$(jq -r '.[0].id // empty' <<< "${RESP_BODY}")"
  else
    echo "  user ${username}: exists"
  fi
  if [[ -n "${uid}" ]]; then
    TOKEN="$(get_token)"
    api POST "${TC}/admin/realms/${REALM}/tideAdminResources/get-required-action-link?userId=${uid}&lifespan=${LIFESPAN}" \
      -H "Content-Type: application/json" -H "Accept: text/plain" -d '["link-tide-account-action"]'
    [[ "${RESP_CODE}" == 2* ]] && LINKS[$username]="${RESP_BODY}"
  fi
  echo "${uid}"
}

echo "-- demo users (each must enroll via its link) --"
LAN_ID="$(ensure_user lan      lan@camguard.demo      Lan     Resident | tail -n1)"
RES_ID="$(ensure_user resrep   resrep@camguard.demo   Res     Rep      | tail -n1)"
INV_ID="$(ensure_user invrep   invrep@camguard.demo   Inv     Rep      | tail -n1)"
TEC_ID="$(ensure_user techadmin techadmin@camguard.demo Tech   Admin    | tail -n1)"

# ── Role grants (filed; may need console approval in MultiAdmin) ──────────────
realm_role_rep() { TOKEN="$(get_token)"; api GET "${TC}/admin/realms/${REALM}/roles/$1"; echo "${RESP_BODY}"; }
grant_realm_role() {
  local uid="$1" role="$2"; [[ -z "${uid}" ]] && return
  local rep; rep="$(realm_role_rep "${role}")"
  local id name; id="$(jq -r '.id' <<< "${rep}")"; name="$(jq -r '.name' <<< "${rep}")"
  [[ -z "${id}" || "${id}" == "null" ]] && { echo "  (role ${role} missing, skip)"; return; }
  TOKEN="$(get_token)"
  api POST "${TC}/admin/realms/${REALM}/users/${uid}/role-mappings/realm" \
    -H "Content-Type: application/json" -d "[{\"id\":\"${id}\",\"name\":\"${name}\"}]"
  echo "  grant ${role} -> ${uid:0:8}… : ${RESP_CODE}"
}
grant_tide_admin() {
  local uid="$1"; [[ -z "${uid}" ]] && return
  TOKEN="$(get_token)"
  api GET "${TC}/admin/realms/${REALM}/clients?clientId=realm-management"
  local rm; rm="$(jq -r '.[0].id // empty' <<< "${RESP_BODY}")"
  TOKEN="$(get_token)"
  api GET "${TC}/admin/realms/${REALM}/clients/${rm}/roles/tide-realm-admin"
  local rep="${RESP_BODY}"
  TOKEN="$(get_token)"
  api POST "${TC}/admin/realms/${REALM}/users/${uid}/role-mappings/clients/${rm}" \
    -H "Content-Type: application/json" -d "[${rep}]"
  echo "  grant tide-realm-admin -> ${uid:0:8}… : ${RESP_CODE}"
}

echo "-- role grants --"
grant_realm_role "${LAN_ID}" cg-resident
grant_realm_role "${RES_ID}" cg-board
grant_realm_role "${INV_ID}" cg-board
grant_realm_role "${TEC_ID}" cg-ingest
# Board members + tech admin become quorum admins (the 3/4 story).
grant_tide_admin "${RES_ID}"
grant_tide_admin "${INV_ID}"
grant_tide_admin "${TEC_ID}"

# ── Best-effort drain (works only while the realm is FirstAdmin/Tideless) ─────
echo "-- draining auto-approvable change-requests --"
for pass in 1 2 3; do
  TOKEN="$(get_token)"
  ids=$(curl -s "${TC}/admin/realms/${REALM}/iga/change-requests?status=PENDING" \
    -H "Authorization: Bearer ${TOKEN}" \
    | jq -r 'if type=="array" then (.[] | select(.actionType | IN("DISABLE_IGA","DELETE_REALM","OFFBOARD_REALM") | not) | .id) else empty end' 2>/dev/null)
  [[ -z "${ids}" ]] && { echo "  nothing pending (or all need enclave approval)"; break; }
  for id in ${ids}; do
    TOKEN="$(get_token)"
    curl -s -o /dev/null -X POST "${TC}/admin/realms/${REALM}/iga/change-requests/${id}/authorize" \
      -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -d '{}'
    TOKEN="$(get_token)"
    curl -s -o /dev/null -X POST "${TC}/admin/realms/${REALM}/iga/change-requests/${id}/commit" \
      -H "Authorization: Bearer ${TOKEN}"
  done
done

# ── Report ────────────────────────────────────────────────────────────────────
TOKEN="$(get_token)"
PENDING=$(curl -s "${TC}/admin/realms/${REALM}/iga/change-requests?status=PENDING" \
  -H "Authorization: Bearer ${TOKEN}" | jq 'if type=="array" then length else 0 end' 2>/dev/null)

echo ""
echo "──────────────────────────────────────────────────────────────────────"
echo "Enrollment links (open each in a SEPARATE private window, enroll a Tide"
echo "account per user; write down each username + Tide password privately):"
for u in "${!LINKS[@]}"; do
  echo ""
  echo "  ${u}:"
  echo "    ${LINKS[$u]}"
done
echo ""
echo "Pending change-requests still needing approval: ${PENDING:-?}"
if [[ "${PENDING:-0}" != "0" ]]; then
  echo "  The realm is MultiAdmin, so these must be signed in the enclave:"
  echo "    ${TC}/admin/master/console/#/${REALM}  →  Change Requests"
  echo "  Approve the CREATE_ROLE / CREATE_USER / GRANT_ROLES requests there."
fi
echo "──────────────────────────────────────────────────────────────────────"
echo "Done."
