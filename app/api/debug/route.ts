import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const summarize = (value?: string) => ({
    present: Boolean(value),
    length: value?.length || 0
  });

  return NextResponse.json({
    url: summarize(process.env.NEXT_PUBLIC_SUPABASE_URL),
    key: summarize(process.env.SUPABASE_SECRET_KEY),
    anon: summarize(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  });
}
