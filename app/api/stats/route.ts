import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let query = supabaseServer
      .from('analyses')
      .select('sections_hit, status, user_id')
      .neq('status', 'pending'); // Solo los ya evaluados (win o loss)

    // Si no es admin, filtrar por su user_id
    if (user.role !== 'admin') {
      query = query.eq('user_id', user.sub);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        totalAnalyses: 0,
        winRate: 0,
        winner_accuracy: 0,
        bet_accuracy: 0,
        scoreline_1_accuracy: 0,
        scoreline_2_accuracy: 0,
      });
    }

    const total = data.length;

    // MAPEO EXACTO BASADO EN /HISTORIAL Y EVAL.TS
    const ganador_aciertos = data.filter(a => a.sections_hit?.['Ganador'] === true).length;
    const apuesta_aciertos = data.filter(a => a.sections_hit?.['Apuesta'] === true).length;
    const marcador_1_aciertos = data.filter(a => a.sections_hit?.['Marcador 1'] === true).length;
    const marcador_2_aciertos = data.filter(a => a.sections_hit?.['Marcador 2'] === true).length;

    return NextResponse.json({
      totalAnalyses: total,
      winRate: (ganador_aciertos / total) * 100,
      winner_accuracy: (ganador_aciertos / total) * 100,
      bet_accuracy: (apuesta_aciertos / total) * 100,
      scoreline_1_accuracy: (marcador_1_aciertos / total) * 100,
      scoreline_2_accuracy: (marcador_2_aciertos / total) * 100,
    });
  } catch (err) {
    console.error('Stats API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
