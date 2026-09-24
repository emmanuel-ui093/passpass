// src/app/my-tickets/page.tsx
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PageProps {
  searchParams: Promise<{ orderId?: string }> | { orderId?: string };
  params?: Promise<{ orderId?: string }> | { orderId?: string };
}

export default async function MyTicketsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const orderId = searchParams?.orderId || params?.orderId;

  if (!orderId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">No Ticket Selected</h1>
        <p className="text-slate-400 mb-6">Please provide a valid order ID to view your ticket pass.</p>
        <Link href="/" className="bg-indigo-600 px-6 py-2 rounded-xl text-sm font-bold">
          Back to Events
        </Link>
      </div>
    );
  }

  // Fetch order, event details, and ticket records
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      quantity,
      total_amount,
      user_email,
      payment_reference,
      events ( title, venue, event_date, banner_url ),
      ticket_types ( name ),
      tickets ( id, qr_code_id, status )
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Ticket Pass Not Found</h1>
        <p className="text-slate-400 mb-6">We couldn't retrieve this order. Please check your link or contact support.</p>
        <Link href="/" className="bg-indigo-600 px-6 py-2 rounded-xl text-sm font-bold">
          Back to Events
        </Link>
      </div>
    );
  }

  // Safely extract single objects from Supabase relational arrays
  const event = Array.isArray(order.events) ? order.events[0] : order.events;
  const ticketType = Array.isArray(order.ticket_types) ? order.ticket_types[0] : order.ticket_types;
  const primaryTicket = Array.isArray(order.tickets) ? order.tickets[0] : order.tickets;

  const qrApiUrl = primaryTicket?.qr_code_id
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${primaryTicket.qr_code_id}`
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Banner */}
        {event?.banner_url ? (
          <img src={event.banner_url} alt={event.title || 'Event'} className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 bg-gradient-to-r from-indigo-900 to-slate-900 flex items-center justify-center p-4">
            <span className="text-indigo-200 font-bold text-center text-lg">{event?.title || 'PassPass Event'}</span>
          </div>
        )}

        {/* Ticket Details */}
        <div className="p-6 space-y-6">
          <div>
            <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold rounded-full mb-2">
              {ticketType?.name || 'Standard Pass'} ({order.quantity}x)
            </span>
            <h1 className="text-2xl font-extrabold text-white">{event?.title || 'Event Pass'}</h1>
            <p className="text-slate-400 text-sm mt-1">📍 {event?.venue || 'Venue TBA'}</p>
            <p className="text-slate-400 text-sm">
              📅 {event?.event_date ? new Date(event.event_date).toLocaleDateString('en-NG', { dateStyle: 'full' }) : 'Date TBA'}
            </p>
          </div>

          {/* QR Code Pass Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-inner">
            <p className="text-xs text-slate-400 font-medium mb-4 uppercase tracking-wider">Scan at Entrance</p>
            {qrApiUrl ? (
              <div className="bg-white p-3 rounded-xl border border-slate-700">
                <img src={qrApiUrl} alt="Entry QR Code" className="w-48 h-48" />
              </div>
            ) : (
              <div className="text-slate-500 text-sm">No QR code available</div>
            )}
            {primaryTicket?.qr_code_id && (
              <p className="text-xs font-mono text-slate-500 mt-4 break-all">
                ID: {primaryTicket.qr_code_id}
              </p>
            )}
          </div>

          {/* Attendee Info */}
          <div className="border-t border-slate-800 pt-4 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Attendee Email:</span>
              <span className="text-slate-200 font-medium">{order.user_email}</span>
            </div>
            <div className="flex justify-between">
              <span>Ref:</span>
              <span className="text-slate-200 font-mono">{order.payment_reference}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-950/50 p-4 border-t border-slate-800 text-center">
          <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300 font-bold">
            ← Find More Events
          </Link>
        </div>
      </div>
    </div>
  );
}