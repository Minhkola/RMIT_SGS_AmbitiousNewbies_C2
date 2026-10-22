// Central config + the CamGuard role vocabulary. Values come from the
// environment (see .env.example) with dev-friendly fallbacks that match the
// realm provisioned by init/tcinit.sh + init/camguard-setup.sh.

export const TC_URL = (process.env.TIDECLOAK_URL ?? 'http://localhost:8080').replace(/\/$/, '')
export const REALM = process.env.TIDECLOAK_REALM ?? 'nextjs-test'

// Master-realm admin-cli credentials used ONLY to PROPOSE governed writes
// (filing a role-grant change-request). They can never approve on behalf of a
// board member: IGA credits an approval to whoever signs in the browser, so
// approvals happen in the Admin Console, not here. See lib/tcAdmin.ts.
export const ADMIN_USER = process.env.TC_ADMIN_USER ?? 'admin'
export const ADMIN_PASSWORD = process.env.TC_ADMIN_PASSWORD ?? 'password'

// Optional confidential service account (production path). If both are set,
// tcAdmin uses the client_credentials grant instead of the master password.
export const BACKEND_CLIENT_ID = process.env.TC_BACKEND_CLIENT_ID || ''
export const BACKEND_CLIENT_SECRET = process.env.TC_BACKEND_CLIENT_SECRET || ''

// Realm roles created by init/camguard-setup.sh.
export const ROLES = {
  /** Sees the board approval screen (building-board members). */
  board: 'cg-board',
  /** Can chat with the AI and file view requests (residents / guards). */
  resident: 'cg-resident',
  /** Can run clip ingest. */
  ingest: 'cg-ingest',
  /**
   * THE decryption authority. A plain realm role granted ONLY by committing an
   * IGA change-request that needs board quorum. Holding it is the sole thing
   * that unlocks clip plaintext server-side.
   */
  viewer: 'cctv-viewer',
} as const

export const CCTV_VIEWER_ROLE = ROLES.viewer

// tide-realm-admin is a CLIENT role on realm-management, not a realm role.
export const ADMIN_CLIENT = 'realm-management'
export const ADMIN_ROLE = 'tide-realm-admin'

/** Deep link to this realm's Admin Console (where board members sign CRs). */
export function adminConsoleUrl(): string {
  return `${TC_URL}/admin/master/console/#/${REALM}`
}

/** The IGA Change Requests view operators approve in. */
export function changeRequestsConsoleUrl(): string {
  return `${TC_URL}/admin/master/console/#/${REALM}/change-requests`
}
