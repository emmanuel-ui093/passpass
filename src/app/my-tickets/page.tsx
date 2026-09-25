// src/app/my-tickets/page.tsx
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PageProps {
  searchParams: Promise<{ orderId?: string }> | { orderId?: string };
}

function NoticeCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-slate-400 mb-6">{message}</p>
      <Link href="/" className="bg-indigo-600 px-6 py-2 rounded-xl text-sm font-bold">
        Back to Events
      </Link>
    </div>
  );
}

export default async function MyTicketsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const orderId = searchParams?.orderId;

  if (!orderId) {
    return (
      <NoticeCard
        title="No Ticket Selected"
        message="Please provide a valid order ID to view your ticket pass."
      />
    );
  }

  // 1. Load the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, event_id, buyer_name, buyer_email, buyer_phone, total_amount, status, paystack_reference')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order) {
    return (
      <NoticeCard
        title="Ticket Pass Not Found"
        message="We couldn't retrieve this order. Please check your link or contact support."
      />
    );
  }

  if (order.status !== 'SUCCESS') {
    return (
      <NoticeCard
        title="Payment Not Confirmed"
        message="This order hasn't been marked as paid yet. If you just paid, refresh this page in a few seconds."
      />
    );
  }

  // 2. Load the event
  const { data: event } = await supabase
    .from('events')
    .select('title, venue, location, city, date, banner')
    .eq('id', order.event_id)
    .maybeSingle();

  // 3. Load every ticket issued for this order (quantity > 1 means several rows)
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, qr_code, checked_in_at')
    .eq('order_id', order.id)
    .order('id', { ascending: true });

  const ticketList = tickets ?? [];

  if (ticketList.length === 0) {
    return (
      <NoticeCard
        title="Tickets Still Processing"
        message="Your payment was confirmed but your tickets haven't been issued yet. Refresh in a moment, or contact support with your reference below."
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 gap-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Banner */}
        {event?.banner ? (
          <img src={event.banner} alt={event?.title || 'Event'} className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 bg-gradient-to-r from-indigo-900 to-slate-900 flex items-center justify-center p-4">
            <span className="text-indigo-200 font-bold text-center text-lg">{event?.title || 'PassPass Event'}</span>
          </div>
        )}

        <div className="p-6 space-y-6">
          <div>
            <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold rounded-full mb-2">
              General Admission ({ticketList.length}x)
            </span>
            <h1 className="text-2xl font-extrabold text-white">{event?.title || 'Event Pass'}</h1>
            <p className="text-slate-400 text-sm mt-1">
              📍 {event?.venue || event?.location || 'Venue TBA'}
              {event?.city ? ` • ${event.city}` : ''}
            </p>
            <p className="text-slate-400 text-sm">📅 {event?.date || 'Date TBA'}</p>
          </div>

          {/* Attendee Info */}
          <div className="border-t border-slate-800 pt-4 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Attendee:</span>
              <span className="text-slate-200 font-medium">{order.buyer_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Email:</span>
              <span className="text-slate-200 font-medium">{order.buyer_email}</span>
            </div>
            <div className="flex justify-between">
              <span>Ref:</span>
              <span className="text-slate-200 font-mono break-all text-right">{order.paystack_reference}</span>
            </div>
          </div>
        </div>
      </div>

      {/* One QR pass card per ticket, since each one is a separate admission */}
      {ticketList.map((ticket, i) => {
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
          ticket.qr_code
        )}`;
        return (
          <div
            key={ticket.id}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center"
          >
            <p className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">
              Pass {i + 1} of {ticketList.length}
            </p>
            <p className="text-xs mb-4">
              {ticket.checked_in_at ? (
                <span className="text-amber-400 font-bold">Already checked in</span>
              ) : (
                <span className="text-emerald-400 font-bold">Not yet used</span>
              )}
            </p>
            <div className="bg-white p-3 rounded-xl border border-slate-700">
              <img src={qrApiUrl} alt={`Entry QR code ${i + 1}`} className="w-48 h-48" />
            </div>
            <p className="text-xs font-mono text-slate-500 mt-4 break-all">ID: {ticket.qr_code}</p>
          </div>
        );
      })}

      <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300 font-bold">
        ← Find More Events
      </Link>
    </div>
  );
}