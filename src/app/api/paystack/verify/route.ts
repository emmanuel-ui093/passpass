import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client with Service Role Key to bypass RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    // 1. Verify payment directly with Paystack API
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

    const { status, metadata } = paystackData.data;

    if (status !== 'success') {
      return NextResponse.json(
        { error: 'Payment was not successful' },
        { status: 400 }
      );
    }

    const orderId = metadata?.order_id;
    const ticketItems = metadata?.ticket_items; // Expected structure: [{"ticket_type_id": "uuid", "quantity": 1}]

    if (!orderId || !ticketItems) {
      return NextResponse.json(
        { error: 'Missing order metadata from Paystack response' },
        { status: 400 }
      );
    }

    // 2. Call the atomic function in Supabase to fulfill order & issue passes
    const { data: fulfillmentResult, error: dbError } = await supabaseAdmin.rpc(
      'fulfill_order_atomically',
      {
        p_order_id: orderId,
        p_paystack_reference: reference,
        p_ticket_items: ticketItems,
      }
    );

    if (dbError) {
      console.error('[Paystack Verification DB Error]:', dbError);
      return NextResponse.json(
        { error: 'Failed to process ticket fulfillment' },
        { status: 500 }
      );
    }

    // 3. Return success and order ID to client
    return NextResponse.json({
      success: true,
      message: 'Order fulfilled successfully',
      orderId,
    });
  } catch (err) {
    console.error('[Paystack Verify Exception]:', err);
    return NextResponse.json(
      { error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}