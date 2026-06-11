import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ACTIVE_AI_MODEL, generateAnalysis, parseAnalysisJSON } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const FACTOR_KEYS = ['forma', 'h2h', 'local', 'xg', 'motivacion', 'bajas', 'cuotas'];
const VALID_WINNERS = ['local', 'empate', 'visitante'] as const;
const DISABLE_DAILY_LIMITS = true;

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

function scoreWinnerKey(score: string) {
  const [home, away] = score.split('-').map((part) => Number(part));
  if (home > away) return 'local';
  if (away > home) return 'visitante';
  return 'empate';
}

function scoreTotal(score: string) {
  return score.split('-').reduce((sum, part) => sum + Number(part), 0);
}

function buildScoresForWinner(winnerKey: 'local' | 'empate' | 'visitante', totalGoals: number) {
  const lowScoring = totalGoals <= 2.1;
  if (winnerKey === 'local') return lowScoring ? ['1-0', '2-0'] : ['2-1', '2-0'];
  if (winnerKey === 'visitante') return lowScoring ? ['0-1', '0-2'] : ['1-2', '0-2'];
  return lowScoring ? ['0-0', '1-1'] : ['1-1', '2-2'];
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

  if (
    text.includes('no apostar') ||
    text.includes('sin apuesta') ||
    text.includes('abstener') ||
    text.includes('avoid') ||
    text.includes('no bet')
  ) return 'no_bet';
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

function isNegativeEv(parsed: any) {
  const ev = parsed.expected_value;
  if (typeof ev === 'number') return ev < 0;
  if (typeof ev === 'string') {
    const evNumber = Number(ev.replace(',', '.').match(/-?\d+(\.\d+)?/)?.[0]);
    if (Number.isFinite(evNumber) && evNumber < 0) return true;
  }

  const finalText = `${parsed.final_reasoning || ''} ${parsed.best_bet_reason || ''}`.toLowerCase();
  return (
    finalText.includes('ev negativo') ||
    finalText.includes('valor esperado es negativo') ||
    finalText.includes('valor esperado negativo') ||
    finalText.includes('valor esperado es ligeramente negativo') ||
    finalText.includes('no ofrece un valor positivo') ||
    finalText.includes('no es favorable') ||
    finalText.includes('sin valor') ||
    finalText.includes('abstenerse')
  );
}

function normalizeWinnerName(parsedWinner: any, winnerKey: 'local' | 'empate' | 'visitante', localTeam: string, awayTeam: string) {
  const winner = String(parsedWinner || '').trim();
  if (!winner || winner.toLowerCase() === 'local') return winnerKey === 'local' ? localTeam : winnerKey === 'visitante' ? awayTeam : 'Empate';
  if (winner.toLowerCase() === 'visitante') return winnerKey === 'visitante' ? awayTeam : winnerKey === 'local' ? localTeam : 'Empate';
  if (winner.toLowerCase() === 'empate') return 'Empate';
  return winner;
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

    if (!DISABLE_DAILY_LIMITS && user.role !== 'admin' && usage && usage.count >= 3) {
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
    const winnerKey = normalizeWinnerKey(parsed, pLocalRaw, pEmpateRaw, pVisitanteRaw);
    const [localTeamRaw, awayTeamRaw] = String(match).split(/ vs | - | v /i);
    const localTeam = (localTeamRaw || 'Local').trim();
    const awayTeam = (awayTeamRaw || 'Visitante').trim();
    const suggestedScores = buildScoresForWinner(winnerKey, goalsExpectedValue);
    let score1 = normalizeScore(parsed.score_1, suggestedScores[0]);
    let score2 = normalizeScore(parsed.score_2, suggestedScores[1]);
    if (scoreWinnerKey(score1) !== winnerKey) score1 = suggestedScores[0];
    if (scoreWinnerKey(score2) !== winnerKey && winnerKey !== 'empate') score2 = suggestedScores[1];

    let overUnder = normalizeOverUnder(parsed.over_under, overPct);
    const lowGoalProfile = goalsExpectedValue < 2.2 && avgGoalsH2h < 2.2 && bttsPct < 50 && scoreTotal(score1) <= 2;
    if (lowGoalProfile) overUnder = 'Under 2.5';

    let betType = normalizeBetType(parsed.best_bet, parsed.bet_type);
    let bestBet = String(parsed.best_bet || overUnder);
    let confidencePct = Math.round(toPercent(parsed.confidence_pct, 50));
    let finalReasoning = String(parsed.final_reasoning || parsed.best_bet_reason || 'Análisis generado con el motor GPT-4o.');
    let bestBetReason = parsed.best_bet_reason || null;
    const negativeEv = isNegativeEv(parsed);
    if (negativeEv || betType === 'no_bet') {
      betType = 'no_bet';
      bestBet = 'No apostar';
      confidencePct = Math.min(confidencePct, 35);
      bestBetReason = 'No se recomienda apostar: el valor esperado no es positivo o la evidencia disponible no justifica un pick rentable.';
      finalReasoning = `${finalReasoning} Ajuste de control: no se emite apuesta recomendada porque no hay valor positivo suficiente.`;
    }

    const analysisData = {
      user_id: user.sub,
      match_name: match,
      league: String(parsed.league || 'Liga no identificada'),
      analysis_date: new Date().toISOString(),
      ai_model: model,
      ai_model_version: aiResponse.version,
      winner: normalizeWinnerName(parsed.winner, winnerKey, localTeam, awayTeam),
      winner_key: winnerKey,
      prob_local: pLocalRaw,
      prob_empate: pEmpateRaw,
      prob_visitante: pVisitanteRaw,
      score_1: score1,
      prob_1: Math.max(1, Math.round(toPercent(parsed.prob_1, 8))),
      score_2: score2,
      prob_2: Math.max(1, Math.round(toPercent(parsed.prob_2, 5))),
      bet_type: betType,
      best_bet: bestBet,
      confidence_pct: confidencePct,
      factors: normalizeFactors(parsed.factors, probabilities, parsed.implied_probability),
      analysis: parsed.analysis || {},
      final_reasoning: finalReasoning,
      weights_at_time: weights,
      goals_expected: goalsExpectedValue,
      avg_goals_h2h: Number(avgGoalsH2h.toFixed(2)),
      goals_tendency: parsed.goals_tendency || null,
      both_teams_score: normalizeYesNo(parsed.both_teams_score, bttsPct),
      over_under: overUnder,
      winner_reason: parsed.winner_reason || null,
      best_bet_reason: bestBetReason,
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

    if (!DISABLE_DAILY_LIMITS) {
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
    }

    return NextResponse.json(insertedAnalysis);
  } catch (err) {
    console.error('Analyze POST Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
