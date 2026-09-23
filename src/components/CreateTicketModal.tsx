'use client';

import { useState, useEffect } from 'react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
}

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

interface IssuedTicket {
  ticketCode: string;
  buyerName: string;
  tierName: string;
  quantity: number;
  totalPrice: number;
}

export default function TicketModal({ event, onClose }: TicketModalProps) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTier, setSelectedTier] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState<IssuedTicket | null>(null);

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch ticket tiers for this event
  useEffect(() => {
    async function fetchTicketTypes() {
      setLoading(true);
      const { data, error } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', event.id)
        .order('price', { ascending: true });

      if (!error && data && data.length > 0) {
        setTicketTypes(data);
        setSelectedTier(data[0]);
      } else {
        const basePrice =
          typeof event.price === 'number'
            ? event.price
            : parseFloat(String(event.price).replace(/[^0-9.]/g, '')) || 0;

        const defaultTier: TicketType = {
          id: 'default',
          name: 'General Admission',
          price: basePrice,
          quantity: 500,
          sold: 0,
        };
        setTicketTypes([defaultTier]);
        setSelectedTier(defaultTier);
      }
      setLoading(false);
    }

    fetchTicketTypes();
  }, [event.id, event.price]);

  const activePrice = selectedTier ? selectedTier.price : 0;
  const totalPrice = activePrice * quantity;

  // Generate unique ticket reference token
  const generateTicketCode = () => {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PASS-${randomHex}`;
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const code = generateTicketCode();

    // 1. Write purchase record to 'tickets' table in Supabase
    const { error: ticketError } = await supabase.from('tickets').insert([
      {
        ticket_code: code,
        event_id: event.id,
        ticket_type_id: selectedTier?.id !== 'default' ? selectedTier?.id : null,
        buyer_name: fullName,
        buyer_email: email,
        buyer_phone: phone,
        quantity,
        total_price: totalPrice,
        status: 'VALID',
      },
    ]);

    if (ticketError) {
      console.error('Ticket Generation Error:', ticketError);
      alert(`Could not process ticket: ${ticketError.message}`);
      setSubmitting(false);
      return;
    }

    // 2. Increment 'sold' count in ticket_types table
    if (selectedTier && selectedTier.id !== 'default') {
      await supabase
        .from('ticket_types')
        .update({ sold: selectedTier.sold + quantity })
        .eq('id', selectedTier.id);
    }

    setSubmitting(false);

    // 3. Switch to Digital Ticket Pass view
    setIssuedTicket({
      ticketCode: code,
      buyerName: fullName,
      tierName: selectedTier?.name || 'General Admission',
      quantity,
      totalPrice,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-4 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* HEADER */}
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

        {/* CONDITION A: IF TICKET ISSUED -> SHOW DIGITAL PASS WITH QR */}
        {issuedTicket ? (
          <div className="space-y-4 text-center py-2 animate-fadeIn">
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold py-1.5 px-3 rounded-full inline-block">
              ✓ PASS CONFIRMED & ISSUED
            </div>

            {/* DIGITAL PASS TICKET CARD */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4 text-left relative overflow-hidden shadow-inner">
              <div className="flex justify-between items-start border-b border-slate-800/80 pb-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                    Pass Holder
                  </p>
                  <p className="text-sm font-black text-white">
                    {issuedTicket.buyerName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                    Category
                  </p>
                  <p className="text-xs font-bold text-indigo-400">
                    {issuedTicket.tierName} (x{issuedTicket.quantity})
                  </p>
                </div>
              </div>

              {/* QR CODE GENERATOR DISPLAY WITH PASSPASS LOGO OVERLAY */}
              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <div className="relative p-3 bg-white rounded-2xl shadow-lg border-4 border-slate-800 flex items-center justify-center">
                  
                  {/* High Error Correction QR Code */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=${issuedTicket.ticketCode}`}
                    alt="Ticket QR Code"
                    className="w-36 h-36 rounded-lg"
                  />

                  {/* Centered PassPass Badge Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-slate-950 border-2 border-indigo-500 rounded-full w-9 h-9 flex items-center justify-center shadow-lg">
                      <span className="text-[10px] font-black tracking-tighter text-indigo-400">
                        P<span className="text-white">P</span>
                      </span>
                    </div>
                  </div>

                </div>

                <p className="font-mono text-xs font-bold tracking-widest text-indigo-300">
                  {issuedTicket.ticketCode}
                </p>
              </div>

              <div className="border-t border-slate-800/80 pt-3 flex justify-between text-[11px] text-slate-400 font-semibold">
                <span>Location: {event.location || event.venue || 'Main Gate'}</span>
                <span className="text-emerald-400 font-bold">STATUS: VALID</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Screenshot this pass or save your Ticket Code for entry at the gate.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl text-white transition"
            >
              Done & Close
            </button>
          </div>
        ) : (
          /* CONDITION B: CHECKOUT FORM */
          <form onSubmit={handlePurchase} className="space-y-4">
            {/* Category selection */}
            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-2">
                Select Ticket Category
              </label>

              {loading ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  Loading available passes...
                </div>
              ) : (
                <div className="space-y-2">
                  {ticketTypes.map((tier) => (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedTier(tier)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        selectedTier?.id === tier.id
                          ? 'bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-white">
                          {tier.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {tier.quantity - tier.sold > 0
                            ? `${tier.quantity - tier.sold} remaining`
                            : 'Sold Out'}
                        </p>
                      </div>
                      <p className="text-sm font-black text-indigo-400">
                        {tier.price === 0
                          ? 'FREE'
                          : `₦${tier.price.toLocaleString()}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity */}
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

            {/* Buyer Contact Form */}
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
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Total and Submit */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-400 font-bold">
                  Total Amount:
                </span>
                <span className="text-base font-black text-indigo-400">
                  {totalPrice === 0
                    ? 'FREE'
                    : `₦${totalPrice.toLocaleString()}`}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/30 text-white"
              >
                {submitting
                  ? 'Generating Pass...'
                  : totalPrice === 0
                  ? 'Claim Free Pass'
                  : `Get Pass (₦${totalPrice.toLocaleString()})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}