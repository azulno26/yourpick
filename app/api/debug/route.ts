import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: users, error } = await supabaseServer
      .from('users')
      .select('id, username, role, display_name, password_hash, is_active');
    return NextResponse.json({ users, error });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) });
  }
}
