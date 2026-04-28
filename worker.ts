import 'dotenv/config';
import { analyzeQueue, ANALYZE_JOB } from './lib/queue';
import { supabaseServer } from './lib/supabase';
import { generateAnalysis, parseAnalysisJSON } from './lib/ai';

console.log('🚀 Worker SCOUT AI iniciado y esperando tareas...');

analyzeQueue.process(ANALYZE_JOB, async (job) => {
  const { analysisId, match, model, weights } = job.data;
  console.log(`[${analysisId}] 🔍 Procesando análisis para: ${match} (${model})`);

  try {
    const aiResponse = await generateAnalysis(match, model, weights);
    const parsed = parseAnalysisJSON(aiResponse.text);

    if (!parsed) {
      console.error(`[${analysisId}] ❌ Error parseando JSON de la IA`);
      throw new Error('Error al procesar el análisis de la IA');
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

    const { error: updateError } = await supabaseServer
      .from('analyses')
      .update({
        league: parsed.league,
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
        goals_expected: parsed.goals_expected,
        avg_goals_h2h: parsed.avg_goals_h2h,
        goals_tendency: parsed.goals_tendency,
        both_teams_score: parsed.both_teams_score,
        over_under: parsed.over_under,
        winner_reason: parsed.winner_reason,
        best_bet_reason: parsed.best_bet_reason,
        recommended_analysis: parsed.recommended_analysis,
        status: 'pending' // Ya está listo para mostrar al usuario
      })
      .eq('id', analysisId);

    if (updateError) {
      console.error(`[${analysisId}] ❌ Error en Supabase update:`, updateError);
      throw updateError;
    }

    console.log(`[${analysisId}] ✅ Análisis completado con éxito`);
  } catch (err) {
    console.error(`[${analysisId}] 💥 Error crítico en worker:`, err);
    throw err;
  }
});
