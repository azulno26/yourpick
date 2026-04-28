export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (user.role === 'admin') {
      const { data: allAnalyses, error } = await supabaseServer.from('analyses').select('*');
      if (error) throw error;
      
      const totalAnalyses = allAnalyses?.length || 0;
      const evaluated = allAnalyses?.filter(a => a.status !== 'pending') || [];
      const globalWins = evaluated.filter(a => a.status === 'win').length;
      
      const claudeEval = evaluated.filter(a => a.ai_model === 'claude');
      const gptEval = evaluated.filter(a => a.ai_model === 'gpt');

      const stats = {
        totalAnalyses,
        totalEvaluated: evaluated.length,
        globalWinRate: evaluated.length > 0 ? (globalWins / evaluated.length) * 100 : 0,
        models: {
          claude: {
            total: claudeEval.length,
            winRate: claudeEval.length > 0 ? (claudeEval.filter(a => a.status === 'win').length / claudeEval.length) * 100 : 0
          },
          gpt: {
            total: gptEval.length,
            winRate: gptEval.length > 0 ? (gptEval.filter(a => a.status === 'win').length / gptEval.length) * 100 : 0
          }
        }
      };
      return NextResponse.json(stats);
    } else {
      const { data: userAnalyses, error } = await supabaseServer.from('analyses').select('*').eq('user_id', user.sub);
      if (error) throw error;
      
      const totalAnalyses = userAnalyses?.length || 0;
      const evaluated = userAnalyses?.filter(a => a.status !== 'pending') || [];
      const wins = evaluated.filter(a => a.status === 'win').length;

      let winnerHits = 0, score1Hits = 0, score2Hits = 0, betHits = 0;
      evaluated.forEach(a => {
        if (a.sections_hit?.['Ganador']) winnerHits++;
        if (a.sections_hit?.['Marcador 1']) score1Hits++;
        if (a.sections_hit?.['Marcador 2']) score2Hits++;
        if (a.sections_hit?.['Apuesta']) betHits++;
      });

      const stats = {
        totalAnalyses,
        totalEvaluated: evaluated.length,
        winRate: evaluated.length > 0 ? (wins / evaluated.length) * 100 : 0,
        sections: {
          winner: evaluated.length > 0 ? (winnerHits / evaluated.length) * 100 : 0,
          score1: evaluated.length > 0 ? (score1Hits / evaluated.length) * 100 : 0,
          score2: evaluated.length > 0 ? (score2Hits / evaluated.length) * 100 : 0,
          bet: evaluated.length > 0 ? (betHits / evaluated.length) * 100 : 0,
        }
      };
      return NextResponse.json(stats);
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
