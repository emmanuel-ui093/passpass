'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface TicketTier {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface EventData {
  id: string;
  title: string;
  venue: string;
  city: string;
  date: string;
  organizer: string;
}

interface TicketModalProps {
  event: EventData;
  onClose: () => void;
}

const SAMPLE_TIERS: TicketTier[] = [
  { id: 't1', name: 'Early Bird Pass', price: 1500, description: 'Single entry before 10:00 PM' },
  { id: 't2', name: 'Regular Pass', price: 3000, description: 'Standard entry access' },
  { id: 't3', name: 'VIP Access', price: 10000, description: 'Fast-track entry + VIP section lounge' },
];

export default function TicketModal({ event, onClose }: TicketModalProps) {
  const [selectedTier, setSelectedTier] = useState<TicketTier>(SAMPLE_TIERS[1]);
  const [quantity, setQuantity] = useState<number>(1);
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [step, setStep] = useState<'tier' | 'checkout' | 'pass'>('tier');
  const [loading, setLoading] = useState<boolean>(false);
  const [generatedTicketCode, setGeneratedTicketCode] = useState<string>('');

  const totalPrice = selectedTier.price * quantity;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate instant payment gateway response
    setTimeout(() => {
      const ticketCode = `PASS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      setGeneratedTicketCode(ticketCode);
      setLoading(false);
      setStep('pass');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-6 text-slate-100 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold"
        >
          ✕
        </button>

        {/* STEP 1: Select Tier & Quantity */}
        {step === 'tier' && (
          <div className="space-y-6 pt-2">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Select Ticket</span>
              <h2 className="text-xl font-extrabold text-white mt-1">{event.title}</h2>
              <p className="text-xs text-slate-400 mt-1">📍 {event.venue} • {event.date}</p>
            </div>

            {/* Ticket Tiers Stack */}
            <div className="space-y-3">
              {SAMPLE_TIERS.map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier)}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    selectedTier.id === tier.id
                      ? 'bg-indigo-600/10 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <h3 className="text-sm font-bold text-white">{tier.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{tier.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-indigo-400">
                      {tier.price === 0 ? 'FREE' : `₦${tier.price.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold text-slate-200"
                >
                  -
                </button>
                <span className="text-sm font-bold w-4 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold text-slate-200"
                >
                  +
                </button>
              </div>
            </div>

            {/* Next Action */}
            <button
              onClick={() => setStep('checkout')}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/25 flex items-center justify-between px-6"
            >
              <span>Continue to Checkout</span>
              <span>₦{totalPrice.toLocaleString()}</span>
            </button>
          </div>
        )}

        {/* STEP 2: Checkout Details & Pay */}
        {step === 'checkout' && (
          <form onSubmit={handleCheckout} className="space-y-5 pt-2">
            <div>
              <button
                type="button"
                onClick={() => setStep('tier')}
                className="text-xs text-indigo-400 hover:underline font-semibold"
              >
                ← Back to Ticket Tiers
              </button>
              <h2 className="text-xl font-extrabold text-white mt-2">Attendee Information</h2>
              <p className="text-xs text-slate-400">Your QR pass will be issued immediately after payment.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emmanuel Chukwu"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">WhatsApp / Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Order Summary Box */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>{quantity}x {selectedTier.name}</span>
                <span>₦{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Service Fee</span>
                <span className="text-emerald-400">FREE</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white text-sm">
                <span>Total Amount</span>
                <span className="text-indigo-400">₦{totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              {loading ? 'Generating Pass...' : `Pay ₦${totalPrice.toLocaleString()} (Bank Transfer / Card)`}
            </button>
          </form>
        )}

        {/* STEP 3: Live Digital QR Pass */}
        {step === 'pass' && (
          <div className="text-center space-y-5 pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span>✓</span> Ticket Confirmed
            </div>

            {/* Ticket Card Pass */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{selectedTier.name}</span>
                <h3 className="text-lg font-black text-white">{event.title}</h3>
                <p className="text-xs text-slate-400">📍 {event.venue}</p>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto my-2">
                <QRCodeSVG value={generatedTicketCode} size={180} level="H" />
              </div>

              <div className="space-y-1">
                <p className="font-mono text-xs text-indigo-300 font-bold tracking-widest">{generatedTicketCode}</p>
                <p className="text-xs font-bold text-slate-200">{fullName}</p>
                <p className="text-[10px] text-slate-500">Present this QR code at gate verification</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
              >
                Save to My Tickets
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}