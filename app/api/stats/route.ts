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
      .select('status, sections_hit, user_id');

    // Si no es admin, filtrar por user_id
    if (user.role !== 'admin') {
      query = query.eq('user_id', user.sub);
    }

    const { data, error } = await query;

    if (error || !data) {
      return NextResponse.json({
        totalAnalyses: 0,
        winRate: 0,
        winner_accuracy: 0,
        bet_accuracy: 0,
        scoreline_1_accuracy: 0,
        scoreline_2_accuracy: 0,
      });
    }

    // Filtrar solo los que ya han sido evaluados (status != 'pending')
    const evaluated = data.filter(a => a.status !== 'pending');
    const totalCount = data.length;
    const evaluatedCount = evaluated.length;

    if (evaluatedCount === 0) {
      return NextResponse.json({
        totalAnalyses: totalCount,
        winRate: 0,
        winner_accuracy: 0,
        bet_accuracy: 0,
        scoreline_1_accuracy: 0,
        scoreline_2_accuracy: 0,
      });
    }

    const winner_hits = evaluated.filter(a => a.sections_hit?.['Ganador'] === true).length;
    const bet_hits = evaluated.filter(a => a.sections_hit?.['Apuesta'] === true).length;
    const score1_hits = evaluated.filter(a => a.sections_hit?.['Marcador 1'] === true).length;
    const score2_hits = evaluated.filter(a => a.sections_hit?.['Marcador 2'] === true).length;

    return NextResponse.json({
      totalAnalyses: totalCount,
      winRate: (winner_hits / evaluatedCount) * 100,
      winner_accuracy: (winner_hits / evaluatedCount) * 100,
      bet_accuracy: (bet_hits / evaluatedCount) * 100,
      scoreline_1_accuracy: (score1_hits / evaluatedCount) * 100,
      scoreline_2_accuracy: (score2_hits / evaluatedCount) * 100,
    });
  } catch (err) {
    console.error('Stats API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
