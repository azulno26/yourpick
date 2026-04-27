import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabaseServer.from('analyses').select('*').eq('id', params.id).single();

  if (error || !data) return NextResponse.json({ error: 'Análisis no encontrado' }, { status: 404 });

  if (user.role !== 'admin' && data.user_id !== user.sub) {
    return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Prohibido. Solo administradores pueden borrar.' }, { status: 403 });

  const { error } = await supabaseServer.from('analyses').delete().eq('id', params.id);
  
  if (error) return NextResponse.json({ error: 'Error al borrar el análisis' }, { status: 500 });
  
  return NextResponse.json({ ok: true });
}
