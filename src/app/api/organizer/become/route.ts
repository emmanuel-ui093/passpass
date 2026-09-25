import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

// Service-role client: only this route may write to profiles.role
const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role === 'organizer' || profile?.role === 'admin') {
    return NextResponse.json({ success: true, alreadyOrganizer: true });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'organizer' })
    .eq('id', user.id);

  if (error) {
    console.error('[become-organizer] error:', error);
    return NextResponse.json({ error: 'Could not upgrade account' }, { status: 500 });
  }

  return NextResponse.json({ success: true, alreadyOrganizer: false });
}