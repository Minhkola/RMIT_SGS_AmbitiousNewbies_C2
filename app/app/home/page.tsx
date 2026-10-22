'use client'

// Legacy scaffold route. CamGuard's home is the AI assistant.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomeRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/assistant')
  }, [router])
  return (
    <div className="center">
      <span className="muted">Đang chuyển tới trợ lý…</span>
    </div>
  )
}
