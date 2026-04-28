export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const isGlobal = user.role === 'admin';
    let query = supabaseServer.from('learning_logs').select('*');
    
    if (!isGlobal) {
      query = query.eq('user_id', user.sub);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    const total = logs?.length || 0;
    
    const winnerHits = logs?.filter(l => l.type === 'winner' && l.prediction_correct === true).length || 0;
    const betHits = logs?.filter(l => l.bet_correct === true).length || 0;
    const score1Hits = logs?.filter(l => l.scoreline_1_correct === true).length || 0;
    const score2Hits = logs?.filter(l => l.scoreline_2_correct === true).length || 0;

    const stats = {
      totalAnalyses: total,
      winRate: total > 0 ? (winnerHits / total) * 100 : 0,
      winner_accuracy: total > 0 ? (winnerHits / total) * 100 : 0,
      bet_accuracy: total > 0 ? (betHits / total) * 100 : 0,
      scoreline_1_accuracy: total > 0 ? (score1Hits / total) * 100 : 0,
      scoreline_2_accuracy: total > 0 ? (score2Hits / total) * 100 : 0,
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error('Stats API Error:', err);
    return NextResponse.json({ error: 'Error al obtener estadísticas reales' }, { status: 500 });
  }
}
