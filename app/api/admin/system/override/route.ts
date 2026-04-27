import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { date, forced_model, notes } = await request.json();
    if (!date) return NextResponse.json({ error: 'La fecha es obligatoria' }, { status: 400 });

    if (forced_model === null) {
      await supabaseServer.from('ai_assignment_override').delete().eq('date', date);
    } else {
      await supabaseServer.from('ai_assignment_override').upsert({
        date,
        forced_model,
        notes: notes || 'Forzado por administrador'
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
