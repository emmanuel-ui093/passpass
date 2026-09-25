'use client'

import { useRouter } from 'next/navigation'
import CreateTicketModal from '@/components/CreateTicketModal'

export default function CreateEventPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <CreateTicketModal isOpen={true} onClose={() => router.push('/organizer')} />
    </div>
  )
}