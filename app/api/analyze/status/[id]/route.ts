import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    const { data: analysis, error } = await supabaseServer
      .from('analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.sub)
      .single();

    if (error || !analysis) {
      return NextResponse.json({ error: 'Análisis no encontrado' }, { status: 404 });
    }

    // El frontend espera el objeto de análisis completo cuando el status es 'pending'
    // (que significa que la predicción ya se generó).
    return NextResponse.json(analysis);

  } catch (err) {
    console.error('Analyze Status GET Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
