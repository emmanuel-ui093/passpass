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

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

// Create the client once, outside the component
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  // Load Paystack Inline script dynamically if not present
  const loadPaystackScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.PaystackPop) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check the Paystack key first so a missing key gives a clear message
      const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_KEY;
      if (totalPrice > 0 && !paystackKey) {
        alert(
          'Paystack public key is missing in this deployment. Add NEXT_PUBLIC_PAYSTACK_KEY in Vercel and redeploy.'
        );
        setLoading(false);
        return;
      }

      // 1. Create a PENDING order record in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            event_id: event.id,
            buyer_name: fullName,
            buyer_email: email,
            buyer_phone: phone,
            total_amount: totalPrice,
            status: 'PENDING',
          },
        ])
        .select()
        .single();

      if (orderError || !order) {
        alert(`Could not initialize order: ${orderError?.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      // Handle Free Tickets directly without Paystack
      if (totalPrice === 0) {
        window.location.href = `/my-tickets`;
        return;
      }

      // 2. Load Paystack JS script
      const scriptLoaded = await loadPaystackScript();
      if (!scriptLoaded) {
        alert('Failed to load Paystack gateway. Check your internet connection.');
        setLoading(false);
        return;
      }

      // 3. Trigger Paystack Inline Popup
      const paystack = new window.PaystackPop();
      paystack.newTransaction({
        key: paystackKey,
        email: email,
        amount: Math.round(totalPrice * 100), // Paystack expects amount in kobo
        currency: 'NGN',
        metadata: {
          order_id: order.id,
          ticket_items: [
            {
              ticket_type_id: event.id, // Replace with ticket_type_id if using tier matrix
              quantity: quantity,
            },
          ],
        },
        onSuccess: async (transaction: { reference: string }) => {
          try {
            // 4. Verify payment with your backend route
            const verifyRes = await fetch('/api/paystack/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference: transaction.reference }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              window.location.href = `/my-tickets`;
            } else {
              alert(`Payment verification failed: ${verifyData.error}`);
              setLoading(false);
            }
          } catch (verifyErr: any) {
            console.error('Verify error:', verifyErr);
            alert(
              `Payment went through but verification failed: ${verifyErr?.message || 'Unknown error'}. Reference: ${transaction.reference}`
            );
            setLoading(false);
          }
        },
        onCancel: () => {
          setLoading(false);
        },
        onClose: () => {
          setLoading(false);
        },
      });
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(`Checkout error: ${err?.message || 'Unknown error'}`);
      setLoading(false);
    }
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
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">General Admission Pass</p>
              <p className="text-[10px] text-slate-400">Single Entry Ticket</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-indigo-400">
                {basePrice === 0 ? 'FREE' : `₦${basePrice.toLocaleString()}`}
              </p>
            </div>
          </div>

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
              <span className="text-sm font-bold w-4 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-slate-400 font-bold">Full Name</label>
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
              <label className="text-[11px] text-slate-400 font-bold">WhatsApp / Phone Number</label>
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
              <label className="text-[11px] text-slate-400 font-bold">Email Address</label>
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

          <div className="pt-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-slate-400 font-bold">Total Amount:</span>
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
                ? 'Initializing Paystack...'
                : totalPrice === 0
                ? 'Claim Free Pass'
                : 'Proceed to Pay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}