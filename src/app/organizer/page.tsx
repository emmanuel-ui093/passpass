'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CreateTicketModal from '@/components/CreateTicketModal'

interface EventData {
  id: string
  title: string
  start_date: string
  venue: string
  ticketsSold: number
  totalCapacity: number
  totalRevenue: number
}

export default function OrganizerDashboardPage() {
  const supabase = createClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventData[]>([])
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTicketsSold: 0,
    activeEventsCount: 0,
  })

  useEffect(() => {
    async function loadOrganizerData() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // Fetch user owned events
      const { data: userEvents, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          venue,
          ticket_types (
            price,
            total_quantity,
            remaining_quantity
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching dashboard events:', error)
        setLoading(false)
        return
      }

      let grandRevenue = 0
      let grandSold = 0

      const parsedEvents: EventData[] = (userEvents || []).map((evt: any) => {
        let eventCapacity = 0
        let eventSold = 0
        let eventRevenue = 0

        if (Array.isArray(evt.ticket_types)) {
          evt.ticket_types.forEach((tier: any) => {
            const total = tier.total_quantity || 0
            const remaining = tier.remaining_quantity || 0
            const sold = Math.max(0, total - remaining)
            const price = tier.price || 0

            eventCapacity += total
            eventSold += sold
            eventRevenue += sold * price
          })
        }

        grandRevenue += eventRevenue
        grandSold += eventSold

        return {
          id: evt.id,
          title: evt.title,
          start_date: evt.start_date ? new Date(evt.start_date).toLocaleDateString() : 'Upcoming',
          venue: evt.venue,
          ticketsSold: eventSold,
          totalCapacity: eventCapacity || 100,
          totalRevenue: eventRevenue,
        }
      })

      setEvents(parsedEvents)
      setStats({
        totalRevenue: grandRevenue,
        totalTicketsSold: grandSold,
        activeEventsCount: parsedEvents.length,
      })
      setLoading(false)
    }

    loadOrganizerData()
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-lg mx-auto font-sans space-y-6 pb-20">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 pt-2">
        <div>
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            Host Control Center
          </span>
          <h1 className="text-xl font-black text-white">Organizer Dashboard</h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1 shadow-lg shadow-indigo-600/20"
        >
          <span>+</span> Create Event
        </button>
      </header>

      {/* Analytics Summary */}
      <section className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase block">Revenue</span>
          <p className="text-sm font-black text-emerald-400 truncate">
            ₦{stats.totalRevenue >= 1000 ? `${(stats.totalRevenue / 1000).toFixed(0)}k` : stats.totalRevenue}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase block">Sold</span>
          <p className="text-sm font-black text-indigo-400">{stats.totalTicketsSold}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase block">Active</span>
          <p className="text-sm font-black text-amber-400">{stats.activeEventsCount}</p>
        </div>
      </section>

      {/* Events List */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider">
            Your Hosted Events ({events.length})
          </h2>
        </div>

        {loading ? (
          <div className="text-xs text-slate-500 text-center py-8">Loading your events...</div>
        ) : events.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
            <p className="text-xs text-slate-400">You haven't published any events yet.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-bold text-indigo-400 hover:underline"
            >
              + Create Your First Event
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((evt) => {
              const percentSold = Math.round((evt.ticketsSold / evt.totalCapacity) * 100) || 0
              return (
                <div
                  key={evt.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-white">{evt.title}</h3>
                      <p className="text-[11px] text-slate-400">{evt.venue}</p>
                    </div>
                    <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg font-mono">
                      {evt.start_date}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">
                        {evt.ticketsSold} / {evt.totalCapacity} Tickets Sold
                      </span>
                      <span className="text-emerald-400">₦{evt.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentSold}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                    <Link
                      href={`/scanner?eventId=${evt.id}`}
                      className="text-[11px] text-indigo-400 hover:underline font-bold flex items-center gap-1"
                    >
                      📷 Launch Gate Scanner →
                    </Link>
                    <span className="text-[10px] text-slate-500 font-bold">{percentSold}% Sold</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <CreateTicketModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <footer className="pt-4 border-t border-slate-800 text-center">
        <Link href="/" className="text-xs text-slate-400 hover:text-white transition font-medium">
          ← Back to Event Discovery
        </Link>
      </footer>
    </main>
  )
}