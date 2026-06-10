import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ACTIVE_AI_MODEL, generateAnalysis, parseAnalysisJSON } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const FACTOR_KEYS = ['forma', 'h2h', 'local', 'xg', 'motivacion', 'bajas', 'cuotas'];
const VALID_WINNERS = ['local', 'empate', 'visitante'] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: any, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toPercent(value: any, fallback = 0) {
  const num = toNumber(value, fallback);
  const pct = num <= 1 ? num * 100 : num;
  return Number(clamp(pct, 0, 100).toFixed(1));
}

function getExpectedGoals(value: any) {
  if (typeof value === 'number') return Number(value.toFixed(2));
  if (value && typeof value === 'object') {
    const home = toNumber(value.home, 1.5);
    const away = toNumber(value.away, 1);
    return Number(((home + away) / 2).toFixed(2));
  }
  return Number(toNumber(value, 2.5).toFixed(2));
}

function normalizeScore(value: any, fallback: string) {
  const score = String(value || '').trim();
  return /^\d+\s*-\s*\d+$/.test(score) ? score.replace(/\s+/g, '') : fallback;
}

function normalizeWinnerKey(parsed: any, pLocal: number, pEmpate: number, pVisitante: number) {
  if (VALID_WINNERS.includes(parsed.winner_key)) return parsed.winner_key;
  const sorted = [
    { val: pLocal, winner: 'local' as const },
    { val: pEmpate, winner: 'empate' as const },
    { val: pVisitante, winner: 'visitante' as const }
  ].sort((a, b) => b.val - a.val);
  return sorted[0].winner;
}

function normalizeFactors(factors: any, probabilities: any, impliedProbability: any) {
  const source = factors && typeof factors === 'object' ? factors : {};
  const fallback = {
    forma: toPercent(probabilities?.home_win, 50),
    h2h: 50,
    local: 50,
    xg: 50,
    motivacion: 50,
    bajas: 50,
    cuotas: toPercent(impliedProbability, 50)
  };

  return Object.fromEntries(
    FACTOR_KEYS.map((key) => [key, Math.round(toPercent(source[key], fallback[key as keyof typeof fallback]))])
  );
}

function normalizeBetType(bestBet: any, betType: any) {
  const original = String(betType || '').toLowerCase();
  const bestBetLower = String(bestBet || '').toLowerCase();
  const text = `${original} ${bestBetLower}`;

  if (text.includes('over') || text.includes('under') || text.includes('goles')) return 'over_under';
  if (text.includes('btts') || text.includes('ambos')) return 'btts';
  if (text.includes('doble') || text.includes('oportunidad')) return 'doble_oportunidad';
  if (text.includes('asiatico') || text.includes('asiático') || text.includes('handicap')) return 'asiatico';
  if (text.includes('victoria') || text.includes('ganador') || text.includes('1x2')) return '1x2';
  return original || 'unknown';
}

function normalizeYesNo(value: any, bttsPct: number) {
  const text = String(value || '').trim().toLowerCase();
  if (['si', 'sí', 'yes', 'btts'].includes(text)) return 'Sí';
  if (['no', 'false'].includes(text)) return 'No';
  return bttsPct >= 50 ? 'Sí' : 'No';
}

function normalizeOverUnder(value: any, overPct: number) {
  const text = String(value || '').toLowerCase();
  if (text.includes('under')) return 'Under 2.5';
  if (text.includes('over')) return 'Over 2.5';
  return overPct >= 50 ? 'Over 2.5' : 'Under 2.5';
}

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

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayStr = formatter.format(new Date());

    const { data: usage } = await supabaseServer
      .from('daily_usage')
      .select('count')
      .eq('user_id', user.sub)
      .eq('date', todayStr)
      .single();

    if (user.role !== 'admin' && usage && usage.count >= 3) {
      return NextResponse.json({ error: 'Has usado tus 3 análisis de hoy' }, { status: 429 });
    }

    const model = ACTIVE_AI_MODEL;

    const { data: weightsData } = await supabaseServer
      .from('system_weights')
      .select('weights')
      .eq('id', model)
      .single();

    const weights = weightsData?.weights || null;
    const aiResponse = await generateAnalysis(match, model, weights);
    const parsed = parseAnalysisJSON(aiResponse.text);

    if (!parsed) {
      return NextResponse.json({ error: 'Error al procesar el análisis de la IA. Por favor, reintenta.' }, { status: 500 });
    }

    const probabilities = parsed.probabilities || {};
    const pLocalRaw = toPercent(probabilities.home_win ?? parsed.prob_local, 0);
    const pEmpateRaw = toPercent(probabilities.draw ?? parsed.prob_empate, 0);
    const pVisitanteRaw = toPercent(probabilities.away_win ?? parsed.prob_visitante, 0);
    const overPct = toPercent(probabilities.over_2_5, 0);
    const bttsPct = toPercent(probabilities.btts, 0);
    const goalsExpectedValue = getExpectedGoals(parsed.goals_expected);
    const avgGoalsH2h = toNumber(parsed.avg_goals_h2h, goalsExpectedValue);
    const homeGoals = Math.max(0, Math.round(goalsExpectedValue));
    const awayGoals = Math.max(0, Math.round(Math.max(0, avgGoalsH2h - homeGoals)));
    const score1 = normalizeScore(parsed.score_1, `${homeGoals}-${awayGoals}`);
    const score2 = normalizeScore(parsed.score_2, `${Math.max(0, homeGoals - 1)}-${awayGoals}`);
    const winnerKey = normalizeWinnerKey(parsed, pLocalRaw, pEmpateRaw, pVisitanteRaw);
    const overUnder = normalizeOverUnder(parsed.over_under, overPct);

    const analysisData = {
      user_id: user.sub,
      match_name: match,
      league: String(parsed.league || 'Liga no identificada'),
      analysis_date: new Date().toISOString(),
      ai_model: model,
      ai_model_version: aiResponse.version,
      winner: String(parsed.winner || (winnerKey === 'empate' ? 'Empate' : winnerKey)),
      winner_key: winnerKey,
      prob_local: pLocalRaw,
      prob_empate: pEmpateRaw,
      prob_visitante: pVisitanteRaw,
      score_1: score1,
      prob_1: Math.round(toPercent(parsed.prob_1, 0)),
      score_2: score2,
      prob_2: Math.round(toPercent(parsed.prob_2, 0)),
      bet_type: normalizeBetType(parsed.best_bet, parsed.bet_type),
      best_bet: String(parsed.best_bet || overUnder),
      confidence_pct: Math.round(toPercent(parsed.confidence_pct, 50)),
      factors: normalizeFactors(parsed.factors, probabilities, parsed.implied_probability),
      analysis: parsed.analysis || {},
      final_reasoning: String(parsed.final_reasoning || parsed.best_bet_reason || 'Análisis generado con el motor GPT-4o.'),
      weights_at_time: weights,
      goals_expected: goalsExpectedValue,
      avg_goals_h2h: Number(avgGoalsH2h.toFixed(2)),
      goals_tendency: parsed.goals_tendency || null,
      both_teams_score: normalizeYesNo(parsed.both_teams_score, bttsPct),
      over_under: overUnder,
      winner_reason: parsed.winner_reason || null,
      best_bet_reason: parsed.best_bet_reason || null,
      recommended_analysis: parsed.recommended_analysis || null,
      status: 'pending'
    };

    const { data: insertedAnalysis, error: insertError } = await supabaseServer
      .from('analyses')
      .insert([analysisData])
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
