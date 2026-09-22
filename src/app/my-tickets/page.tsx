'use client';

import Navbar from '@/components/Navbar';

const MY_PASSES = [
  {
    id: 'PASS-8921',
    eventTitle: 'SUG Grand Campus Rave & Awards',
    date: 'Fri, Oct 10 • 8:00 PM',
    venue: 'Convocation Arena, Awka',
    ticketType: 'VIP Regular',
    status: 'ACTIVE',
    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PASS-8921-VERIFIED',
  },
];

export default function MyTicketsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">My Ticket Wallet</h1>
          <p className="text-xs text-slate-400 mt-1">Show these QR passes at the gate for fast entry.</p>
        </div>

        <div className="space-y-4">
          {MY_PASSES.map((pass) => (
            <div
              key={pass.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl"
            >
              <div className="space-y-3 text-center sm:text-left w-full">
                <span className="inline-block px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold rounded-md uppercase">
                  ● {pass.status} PASS
                </span>
                <h3 className="text-lg font-black text-white">{pass.eventTitle}</h3>
                <p className="text-xs text-indigo-400 font-semibold">{pass.date}</p>
                <p className="text-xs text-slate-400">📍 {pass.venue}</p>
                <p className="text-[11px] text-slate-500 font-mono">Ticket Ref: {pass.id}</p>
              </div>

              {/* QR Code visual */}
              <div className="bg-white p-3 rounded-2xl shrink-0 flex flex-col items-center">
                <img src={pass.qrCode} alt="Ticket QR Pass" className="w-32 h-32" />
                <span className="text-[10px] font-bold text-slate-900 mt-1">SCAN AT GATE</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}