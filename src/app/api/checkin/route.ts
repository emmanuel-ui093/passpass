import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---- Upstash Redis Rate Limiter ----
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Limit to 30 requests per 10 seconds per IP address
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '10 s'),
  prefix: 'ratelimit:checkin',
});

// ---- Table configuration ----
const TICKETS_TABLE = 'tickets';
const COL = {
  code: 'qr_code',
  eventId: 'event_id',
  checkedInAt: 'checked_in_at',
  checkedInBy: 'checked_in_by',
};

const NAME_FIELDS = ['holder_name', 'buyer_name', 'full_name', 'name'];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function normalizeCode(raw: string): string {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get('code');
    if (fromQuery) return fromQuery.trim();
    const last = url.pathname.split('/').filter(Boolean).pop();
    if (last) return decodeURIComponent(last).trim();
  } catch {
    // raw ticket code string
  }
  return text;
}

export async function POST(req: Request) {
  // 1. Upstash Rate Limiting Guard
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { status: 'error', message: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  // 2. Passcode Auth Guard
  const expected = process.env.CHECKIN_PASSCODE;
  if (!expected || !expected.trim()) {
    console.error('SERVER ERROR: CHECKIN_PASSCODE environment variable is not set.');
    return NextResponse.json(
      { status: 'error', message: 'Server configuration error.' },
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

  // 3. Payload Validation
  let body: { code?: string; eventId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!body.code || !body.eventId) {
    return NextResponse.json({ status: 'error', message: 'Missing code or event ID.' }, { status: 400 });
  }

  const code = normalizeCode(body.code);

  // 4. Ticket Lookup & Check-In Execution
  try {
    const { data: ticket, error } = await supabase
      .from(TICKETS_TABLE)
      .select('*')
      .eq(COL.code, code)
      .maybeSingle();

    if (error) {
      console.error('Check-in lookup database error:', error);
      return NextResponse.json({ status: 'error', message: 'Database lookup failed.' }, { status: 500 });
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

    // Atomic update to prevent duplicate check-ins
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from(TICKETS_TABLE)
      .update({ [COL.checkedInAt]: now, [COL.checkedInBy]: 'door-scanner' })
      .eq('id', ticket.id)
      .is(COL.checkedInAt, null)
      .select('id');

    if (updateError) {
      console.error('Check-in update database error:', updateError);
      return NextResponse.json({ status: 'error', message: 'Failed to record check-in.' }, { status: 500 });
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
    console.error('Unexpected check-in error:', err);
    return NextResponse.json(
      { status: 'error', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}