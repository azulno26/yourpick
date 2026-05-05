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

    // Logging mejorado
    console.error('DEBUG: Respuesta de Claude parseada:', JSON.stringify(parsed));
    console.error('DEBUG: Campos - over_under:', parsed.over_under, 'both_teams_score:', parsed.both_teams_score);
    console.error('DEBUG: Campos vacíos detectados');

    // --- VALIDACIÓN DE RESTRICCIÓN ---
    if (parsed.winner_key === 'over' || parsed.winner_key === 'under') {
      parsed.winner_key = 'empate';
    }
    const validWinners = ['local', 'empate', 'visitante'];
    if (!validWinners.includes(parsed.winner_key)) {
      parsed.winner_key = 'empate';
    }
    // ---------------------------------
    
    // Derivar campos faltantes
    if (!parsed.over_under && parsed.probabilities) {
      parsed.over_under = parsed.probabilities.over_2_5 > 0.5 ? "Over 2.5" : "Under 2.5";
    }
    if (!parsed.both_teams_score && parsed.probabilities) {
      parsed.both_teams_score = parsed.probabilities.btts > 0.5 ? "Sí" : "No";
    }
    if (!parsed.factors) {
      parsed.factors = {
        forma: Math.round((parsed.probabilities?.home_win || 0.5) * 100),
        h2h: 75,
        local: 80,
        xg: 78,
        motivacion: 82,
        bajas: 60,
        cuotas: Math.round((parsed.implied_probability || 0.5) * 100)
      };
    }
    if (!parsed.winner_key && parsed.probabilities) {
      const p = parsed.probabilities;
      const maxP = Math.max(p.home_win, p.draw, p.away_win);
      if (maxP === p.home_win) parsed.winner_key = 'local';
      else if (maxP === p.away_win) parsed.winner_key = 'visitante';
      else parsed.winner_key = 'empate';
    }

    // Derivar campos faltantes
    if (!parsed.score_1 || !parsed.score_2) {
      const homeGoals = Math.round(parsed.goals_expected?.home || 1.5);
      const awayGoals = Math.round(parsed.goals_expected?.away || 0.8);
      parsed.score_1 = `${homeGoals}-${awayGoals}`;
      parsed.score_2 = `${homeGoals > 0 ? homeGoals - 1 : 0}-${awayGoals > 0 ? awayGoals - 1 : 0}`;
    }

    if (!parsed.avg_goals_h2h) {
      const totalGoalsExpected = (parsed.goals_expected?.home || 1.5) + (parsed.goals_expected?.away || 0.8);
      parsed.avg_goals_h2h = parseFloat(totalGoalsExpected.toFixed(2));
    }

    // Convertir goals_expected a número
    let goalsExpectedValue = 0;
    if (typeof parsed.goals_expected === 'number') {
      goalsExpectedValue = parsed.goals_expected;
    } else if (typeof parsed.goals_expected === 'object' && parsed.goals_expected?.home) {
      goalsExpectedValue = (Number(parsed.goals_expected.home) + Number(parsed.goals_expected.away)) / 2;
    } else {
      goalsExpectedValue = Number(parsed.goals_expected || 0);
    }

    // Las probabilidades de Claude vienen en decimal (0-1)
    // NO multiplicar si ya están entre 0-100
    const homeWin = parsed.probabilities?.home_win || parsed.prob_local || 0;
    const draw = parsed.probabilities?.draw || parsed.prob_empate || 0;
    const awayWin = parsed.probabilities?.away_win || parsed.prob_visitante || 0;

    // Si son decimales (menores a 2), multiplicar por 100
    const pLocalRaw = homeWin > 2 ? homeWin : homeWin * 100;
    const pEmpateRaw = draw > 2 ? draw : draw * 100;
    const pVisitanteRaw = awayWin > 2 ? awayWin : awayWin * 100;

    const analysisRecord = {
      user_id: user.sub,
      match_name: match,
      league: parsed.league,
      analysis_date: new Date().toISOString(),
      ai_model: model,
      ai_model_version: aiResponse.version,
      winner: parsed.winner,
      winner_key: parsed.winner_key,
      prob_local: parseFloat(pLocalRaw.toFixed(1)),
      prob_empate: parseFloat(pEmpateRaw.toFixed(1)),
      prob_visitante: parseFloat(pVisitanteRaw.toFixed(1)),
      score_1: parsed.score_1,
      prob_1: Math.round((parsed.prob_1 || 0) * (parsed.prob_1 <= 1 ? 100 : 1)),
      score_2: parsed.score_2,
      prob_2: Math.round((parsed.prob_2 || 0) * (parsed.prob_2 <= 1 ? 100 : 1)),
      bet_type: parsed.bet_type,
      best_bet: parsed.best_bet,
      confidence_pct: Number(parsed.confidence_pct || 0),
      factors: parsed.factors,
      analysis: parsed.analysis,
      final_reasoning: parsed.final_reasoning,
      weights_at_time: weights,
      goals_expected: goalsExpectedValue,
      avg_goals_h2h: Number(parsed.avg_goals_h2h || 0),
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
