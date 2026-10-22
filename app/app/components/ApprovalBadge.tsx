'use client'

import type { QuorumState, RequestStatus } from '@/lib/types'

export function ApprovalBadge({ status, quorum }: { status: RequestStatus; quorum?: QuorumState }) {
  if (status === 'APPROVED' || quorum?.committed) {
    return <span className="badge approved">✓ 2/2 Quorum Reached — Unlocked</span>
  }
  if (status === 'VIEWED') {
    return <span className="badge viewed">👁 Decrypted & Viewed</span>
  }
  if (status === 'DENIED' || quorum?.crStatus === 'DENIED') {
    return <span className="badge denied">✕ Vetoed by Board</span>
  }

  const threshold = quorum?.threshold ?? 2
  const count = quorum?.authorizationCount ?? 0
  return (
    <span className="badge pending" title={quorum?.crId ? `TideCloak CR: ${quorum.crId}` : 'Pending Board Quorum'}>
      ⧗ {count}/{threshold} Board Signatures
    </span>
  )
}

export function statusBadge(status: RequestStatus, isRogue?: boolean) {
  if (isRogue && status === 'PENDING_QUORUM') {
    return <span className="badge denied">🔒 Frozen — Self-Grant Blocked</span>
  }
  const map: Record<RequestStatus, string> = {
    PENDING_QUORUM: 'pending',
    APPROVED: 'approved',
    DENIED: 'denied',
    VIEWED: 'viewed',
  }
  const label: Record<RequestStatus, string> = {
    PENDING_QUORUM: 'Awaiting Quorum',
    APPROVED: 'Quorum Approved',
    DENIED: 'Denied',
    VIEWED: 'Footage Reviewed',
  }
  return <span className={`badge ${map[status]}`}>{label[status]}</span>
}
