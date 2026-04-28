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
      .select('predicted_winner, actual_winner, predicted_scoreline_1, predicted_scoreline_2, actual_scoreline, bet_won, user_id');

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

    // Calcular porcentajes directamente desde analyses
    const total = data.length;
    if (total === 0) {
      return NextResponse.json({
        totalAnalyses: 0,
        winRate: 0,
        winner_accuracy: 0,
        bet_accuracy: 0,
        scoreline_1_accuracy: 0,
        scoreline_2_accuracy: 0,
      });
    }

    const winner_correct = data.filter(a => a.predicted_winner === a.actual_winner).length;
    const bet_correct = data.filter(a => a.bet_won === true).length;
    const scoreline_1_correct = data.filter(a => a.predicted_scoreline_1 === a.actual_scoreline).length;
    const scoreline_2_correct = data.filter(a => a.predicted_scoreline_2 === a.actual_scoreline).length;

    return NextResponse.json({
      totalAnalyses: total,
      winRate: (winner_correct / total) * 100,
      winner_accuracy: (winner_correct / total) * 100,
      bet_accuracy: (bet_correct / total) * 100,
      scoreline_1_accuracy: (scoreline_1_correct / total) * 100,
      scoreline_2_accuracy: (scoreline_2_correct / total) * 100,
    });
  } catch (err) {
    console.error('Stats API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
