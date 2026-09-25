'use client'

import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/30">
            P
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
            PassPass<span className="text-indigo-500">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/my-tickets"
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            My Tickets
          </Link>
          <Link
            href="/organizer"
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20 active:scale-95"
          >
            + Host Event
          </Link>
        </div>
      </div>
    </nav>
  )
}