import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client: server-only, bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const MAX_TICKETS_PER_ORDER = 100;

function parsePrice(v: unknown): number {
  if (typeof v === 'number') return v;
  return parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reference = body?.reference;

    if (!reference || typeof reference !== 'string') {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    // 1. Verify payment directly with Paystack
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      return NextResponse.json(
        { error: paystackData.message || 'Failed to verify transaction' },
        { status: 400 }
      );
    }

    const { status, amount, currency, metadata } = paystackData.data;

    if (status !== 'success') {
      return NextResponse.json({ error: 'Payment was not successful' }, { status: 400 });
    }

    if (currency !== 'NGN') {
      return NextResponse.json({ error: 'Unexpected payment currency' }, { status: 400 });
    }

    const orderId = metadata?.order_id;
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order reference on payment' }, { status: 400 });
    }

    // 2. Load the order from OUR database (never trust browser-supplied metadata)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, event_id, total_amount, status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('[Verify] Order lookup failed:', orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Already fulfilled (retry, or webhook got there first): treat as success
    if (order.status === 'SUCCESS') {
      return NextResponse.json({
        success: true,
        message: 'Order already fulfilled',
        orderId: order.id,
      });
    }

    // 3. The amount Paystack actually collected must equal the order total
    const expectedKobo = Math.round(Number(order.total_amount) * 100);
    if (!Number.isFinite(expectedKobo) || expectedKobo <= 0 || amount !== expectedKobo) {
      console.error('[Verify] Amount mismatch', { paid: amount, expected: expectedKobo, orderId });
      return NextResponse.json(
        { error: 'Amount paid does not match the order.' },
        { status: 400 }
      );
    }

    // 4. Work out the quantity on the server from the event's real price
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('price')
      .eq('id', order.event_id)
      .maybeSingle();

    const unitKobo = Math.round(parsePrice(event?.price) * 100);
    if (eventError || !event || unitKobo <= 0) {
      console.error('[Verify] Event price lookup failed:', eventError);
      return NextResponse.json({ error: 'Could not confirm ticket price.' }, { status: 400 });
    }

    const quantity = expectedKobo / unitKobo;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TICKETS_PER_ORDER) {
      console.error('[Verify] Order total does not match ticket price', { expectedKobo, unitKobo });
      return NextResponse.json(
        { error: 'Order total does not match the ticket price.' },
        { status: 400 }
      );
    }

    // 5. Atomically mark the order paid and issue the tickets
    const { data: fulfillment, error: dbError } = await supabaseAdmin.rpc(
      'fulfill_order_atomically',
      {
        p_order_id: String(order.id),
        p_paystack_reference: reference,
        p_ticket_items: [{ quantity }],
      }
    );

    if (dbError) {
      console.error('[Paystack Verification DB Error]:', dbError);
      return NextResponse.json({ error: 'Failed to process ticket fulfillment' }, { status: 500 });
    }

    // 6. Email the ticket link so the buyer can find it again later.
    // Never let an email problem fail the purchase — log and move on.
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
      const ticketUrl = `${appUrl}/my-tickets?orderId=${order.id}`;
      const resendKey = process.env.RESEND_API_KEY;

      if (resendKey) {
        const { data: buyer } = await supabaseAdmin
          .from('orders')
          .select('buyer_email, buyer_name')
          .eq('id', order.id)
          .maybeSingle();

        if (buyer?.buyer_email) {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL || 'PassPass <onboarding@resend.dev>',
              to: buyer.buyer_email,
              subject: 'Your PassPass ticket is ready',
              html: `
                <div style="font-family:sans-serif;max-width:480px;margin:auto">
                  <h2>You're in, ${buyer.buyer_name || 'there'}! 🎟️</h2>
                  <p>Your payment was confirmed and your ticket is ready.</p>
                  <p>
                    <a href="${ticketUrl}"
                       style="display:inline-block;background:#4f46e5;color:#fff;
                              padding:12px 20px;border-radius:10px;text-decoration:none;
                              font-weight:bold">
                      View my ticket
                    </a>
                  </p>
                  <p style="color:#888;font-size:12px">
                    Save this email — you'll need this link to find your ticket again.<br/>
                    Reference: ${reference}
                  </p>
                </div>
              `,
            }),
          });

          if (!emailRes.ok) {
            console.error('[Ticket Email Error]:', await emailRes.text());
          }
        }
      } else {
        console.warn('[Ticket Email] RESEND_API_KEY not set, skipping email.');
      }
    } catch (emailErr) {
      console.error('[Ticket Email Exception]:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Order fulfilled successfully',
      orderId: order.id,
      ticketsCreated: fulfillment?.tickets_created ?? quantity,
    });
  } catch (err) {
    console.error('[Paystack Verify Exception]:', err);
    return NextResponse.json(
      { error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}