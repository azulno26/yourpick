import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return NextResponse.json({
    ok: false,
    error: 'El override diario fue desactivado. YourPick usa siempre GPT-4o.'
  }, { status: 410 });
}
