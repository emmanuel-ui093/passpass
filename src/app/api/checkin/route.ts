import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---- Adjust these if your table/column names differ ----
const TICKETS_TABLE = 'tickets';
const COL = {
  code: 'qr_code',             // the value encoded in the QR
  eventId: 'event_id',
  checkedInAt: 'checked_in_at',
  checkedInBy: 'checked_in_by',
};
// Columns tried (in order) to show the attendee's name
const NAME_FIELDS = ['holder_name', 'buyer_name', 'full_name', 'name'];
// --------------------------------------------------------

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// QR may hold a raw code, or a URL like https://site/ticket/ABC123?code=ABC123
function normalizeCode(raw: string): string {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get('code');
    if (fromQuery) return fromQuery.trim();
    const last = url.pathname.split('/').filter(Boolean).pop();
    if (last) return decodeURIComponent(last).trim();
  } catch {
    // not a URL, use as-is
  }
  return text;
}

export async function POST(req: Request) {
  const expected = process.env.CHECKIN_PASSCODE;
  if (!expected) {
    return NextResponse.json(
      { status: 'error', message: 'Server is missing CHECKIN_PASSCODE.' },
      { status: 500 }
    );
  }

  const provided = req.headers.get('x-checkin-passcode') ?? '';
  if (!safeEqual(provided, expected)) {
    return NextResponse.json(
      { status: 'unauthorized', message: 'Wrong passcode.' },
      { status: 401 }
    );
  }

  let body: { code?: string; eventId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Bad request.' }, { status: 400 });
  }

  if (!body.code || !body.eventId) {
    return NextResponse.json({ status: 'error', message: 'Missing code or event.' }, { status: 400 });
  }

  const code = normalizeCode(body.code);

  try {
    const { data: ticket, error } = await supabase
      .from(TICKETS_TABLE)
      .select('*')
      .eq(COL.code, code)
      .maybeSingle();

    if (error) {
      console.error('Check-in lookup error:', error);
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }

    if (!ticket) {
      return NextResponse.json({ status: 'invalid', message: 'Ticket not found.' });
    }

    const holder =
      NAME_FIELDS.map((f) => ticket[f]).find((v) => typeof v === 'string' && v) ?? 'Guest';

    if (String(ticket[COL.eventId]) !== String(body.eventId)) {
      return NextResponse.json({
        status: 'wrong_event',
        message: 'This ticket is for a different event.',
        holder,
      });
    }

    if (ticket[COL.checkedInAt]) {
      return NextResponse.json({
        status: 'already_used',
        message: 'Already checked in.',
        holder,
        checkedInAt: ticket[COL.checkedInAt],
      });
    }

    // Atomic: only updates if still unchecked, so two scanners can't both admit it
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from(TICKETS_TABLE)
      .update({ [COL.checkedInAt]: now, [COL.checkedInBy]: 'door-scanner' })
      .eq('id', ticket.id)
      .is(COL.checkedInAt, null)
      .select('id');

    if (updateError) {
      console.error('Check-in update error:', updateError);
      return NextResponse.json({ status: 'error', message: updateError.message }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json({
        status: 'already_used',
        message: 'Already checked in.',
        holder,
      });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Valid ticket. Let them in.',
      holder,
      checkedInAt: now,
    });
  } catch (err: any) {
    console.error('Check-in error:', err);
    return NextResponse.json(
      { status: 'error', message: err?.message ?? 'Unexpected error.' },
      { status: 500 }
    );
  }
}