import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import bcrypt from 'bcryptjs';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const updates: any = {};

    if (body.password) updates.password_hash = await bcrypt.hash(body.password, 10);
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

    if (Object.keys(updates).length > 0) {
      await supabaseServer.from('users').update(updates).eq('id', params.id);
    }

    if (body.reset_daily_usage) {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });
      const todayStr = formatter.format(new Date());
      await supabaseServer.from('daily_usage').update({ count: 0 }).eq('user_id', params.id).eq('date', todayStr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // En Supabase debería haber ON DELETE CASCADE, pero por seguridad borramos manualmente:
    await supabaseServer.from('analyses').delete().eq('user_id', params.id);
    await supabaseServer.from('daily_usage').delete().eq('user_id', params.id);
    await supabaseServer.from('learning_log').delete().eq('user_id', params.id);

    const { error } = await supabaseServer.from('users').delete().eq('id', params.id);
    if (error) return NextResponse.json({ error: 'Error al borrar' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
