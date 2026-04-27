import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const status = searchParams.get('status') || 'all';
    const limit = 10;
    const offset = (page - 1) * limit;

    let query = supabaseServer.from('analyses').select('*', { count: 'exact' });

    if (user.role !== 'admin') {
      query = query.eq('user_id', user.sub);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: 'Error al obtener análisis' }, { status: 500 });

    return NextResponse.json({ 
      data, 
      total: count, 
      page, 
      totalPages: count ? Math.ceil(count / limit) : 0 
    });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
