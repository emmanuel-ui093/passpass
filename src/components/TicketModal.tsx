'use client';

import { useState } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface TicketModalProps {
  event: {
    id: string;
    title: string;
    price: number | string;
    venue?: string;
    location?: string;
    date: string;
    banner?: string;
  };
  onClose: () => void;
}

export default function TicketModal({ event, onClose }: TicketModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Parse numeric price from event
  const basePrice =
    typeof event.price === 'number'
      ? event.price
      : parseFloat(String(event.price).replace(/[^0-9.]/g, '')) || 0;

  const totalPrice = basePrice * quantity;

  const generateTicketCode = () => {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PASS-${randomHex}`;
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const code = generateTicketCode();

    // 1. Save ticket details to Supabase database
    const { error: ticketError } = await supabase.from('tickets').insert([
      {
        ticket_code: code,
        event_id: event.id,
        buyer_name: fullName,
        buyer_email: email || null,
        buyer_phone: phone,
        quantity,
        total_price: totalPrice,
        status: 'VALID',
      },
    ]);

    if (ticketError) {
      console.error('Ticket Generation Error:', ticketError);
      alert(`Could not process ticket: ${ticketError.message}`);
      setLoading(false);
      return;
    }

    setLoading(false);

    // 2. Redirect straight to the ticket pass page
    // (If you placed your folder in myticket, change this to `/myticket/${code}`)
    window.location.href = `/ticket/${code}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-4 text-white shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-black truncate max-w-[280px]">
              {event.title}
            </h2>
            <p className="text-xs text-indigo-400 font-bold">{event.date}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handlePurchase} className="space-y-4">
          {/* Ticket Price Display */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">
                General Admission Pass
              </p>
              <p className="text-[10px] text-slate-400">Single Entry Ticket</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-indigo-400">
                {basePrice === 0 ? 'FREE' : `₦${basePrice.toLocaleString()}`}
              </p>
            </div>
          </div>

          {/* Ticket Quantity */}
          <div className="flex items-center justify-between bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-300 font-bold">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold flex items-center justify-center"
              >
                -
              </button>
              <span className="text-sm font-bold w-4 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* Buyer Details */}
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-slate-400 font-bold">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Emmanuel Chukwuemerie"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold">
                WhatsApp / Phone Number
              </label>
              <input
                type="tel"
                required
                placeholder="08012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold">
                Email (Optional)
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Total & Submit Button */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-slate-400 font-bold">
                Total Amount:
              </span>
              <span className="text-base font-black text-indigo-400">
                {totalPrice === 0 ? 'FREE' : `₦${totalPrice.toLocaleString()}`}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/30 text-white"
            >
              {loading
                ? 'Generating Pass...'
                : totalPrice === 0
                ? 'Claim Free Pass'
                : 'Get Pass'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}