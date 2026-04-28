import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { getModelForToday, generateAnalysis, parseAnalysisJSON } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { match } = await request.json();
    if (!match) {
      return NextResponse.json({ error: 'El partido es requerido' }, { status: 400 });
    }

    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayStr = formatter.format(new Date());

    const { data: usage } = await supabaseServer
      .from('daily_usage')
      .select('count')
      .eq('user_id', user.sub)
      .eq('date', todayStr)
      .single();

    if (user.role !== 'admin') {
      if (usage && usage.count >= 3) {
        return NextResponse.json({ error: 'Has usado tus 3 análisis de hoy' }, { status: 429 });
      }
    }

    const model = await getModelForToday();
    
    const { data: weightsData } = await supabaseServer
      .from('system_weights')
      .select('weights')
      .eq('id', model)
      .single();
    
    const weights = weightsData?.weights || null;

    // Generación síncrona (ahora con 60s de timeout en Vercel)
    const aiResponse = await generateAnalysis(match, model, weights);
    
    const parsed = parseAnalysisJSON(aiResponse.text);
    if (!parsed) {
      return NextResponse.json({ error: 'Error al procesar el análisis de la IA. Por favor, reintenta.' }, { status: 500 });
    }

    // --- VALIDACIÓN DE RESTRICCIÓN ---
    if (parsed.winner_key === 'over' || parsed.winner_key === 'under') {
      parsed.winner_key = 'empate';
    }
    const validWinners = ['local', 'empate', 'visitante'];
    if (!validWinners.includes(parsed.winner_key)) {
      parsed.winner_key = 'empate';
    }
    // ---------------------------------

    const analysisRecord = {
      user_id: user.sub,
      match_name: match,
      league: parsed.league,
      analysis_date: new Date().toISOString(),
      ai_model: model,
      ai_model_version: aiResponse.version,
      winner: parsed.winner,
      winner_key: parsed.winner_key,
      prob_local: parsed.prob_local,
      prob_empate: parsed.prob_empate,
      prob_visitante: parsed.prob_visitante,
      score_1: parsed.score_1,
      prob_1: parsed.prob_1,
      score_2: parsed.score_2,
      prob_2: parsed.prob_2,
      bet_type: parsed.bet_type,
      best_bet: parsed.best_bet,
      confidence_pct: parsed.confidence_pct,
      factors: parsed.factors,
      analysis: parsed.analysis,
      final_reasoning: parsed.final_reasoning,
      weights_at_time: weights,
      goals_expected: parsed.goals_expected,
      avg_goals_h2h: parsed.avg_goals_h2h,
      goals_tendency: parsed.goals_tendency,
      both_teams_score: parsed.both_teams_score,
      over_under: parsed.over_under,
      winner_reason: parsed.winner_reason,
      best_bet_reason: parsed.best_bet_reason,
      recommended_analysis: parsed.recommended_analysis,
      status: 'pending'
    };

    const { data: insertedAnalysis, error: insertError } = await supabaseServer
      .from('analyses')
      .insert([analysisRecord])
      .select()
      .single();

    if (insertError || !insertedAnalysis) {
      console.error('Error insertando en supabase:', JSON.stringify(insertError, null, 2));
      return NextResponse.json({ error: 'Error al guardar el análisis en la base de datos' }, { status: 500 });
    }

    if (usage) {
      await supabaseServer
        .from('daily_usage')
        .update({ count: usage.count + 1 })
        .eq('user_id', user.sub)
        .eq('date', todayStr);
    } else {
      await supabaseServer
        .from('daily_usage')
        .insert({ user_id: user.sub, date: todayStr, count: 1 });
    }

    return NextResponse.json(insertedAnalysis);
  } catch (err) {
    console.error('Analyze POST Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
