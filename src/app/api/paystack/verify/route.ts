import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/utils/client';


export async function POST(request: Request) {
  try {
    const { reference, ticketTierId, attendeeName, attendeeEmail, quantity } = await request.json();

    if (!reference || !ticketTierId || !attendeeEmail) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Verify transaction with Paystack API
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // 2. Generate unique ticket codes & insert into Supabase
    const ticketsToInsert = [];
    const generatedCodes = [];

    for (let i = 0; i < quantity; i++) {
      const code = `PASS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      generatedCodes.push(code);

      ticketsToInsert.push({
        ticket_tier_id: ticketTierId,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        ticket_code: code,
        payment_reference: reference,
        is_checked_in: false,
      });
    }

    const { data: createdTickets, error: dbError } = await supabase
      .from('tickets')
      .insert(ticketsToInsert)
      .select();

    if (dbError) {
      console.error('Database Error:', dbError);
    }

    return NextResponse.json({
      success: true,
      reference,
      ticketCodes: generatedCodes,
      tickets: createdTickets || [],
    });
  } catch (error) {
    console.error('Paystack verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}