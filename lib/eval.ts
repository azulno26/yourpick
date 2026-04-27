import { Analysis } from './types';

export function evaluateAnalysis(analysis: Analysis, real_score: string) {
  const match = real_score.match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!match) throw new Error("Marcador real inválido. Formato esperado: 2-1");
  
  const gl = parseInt(match[1], 10);
  const gv = parseInt(match[2], 10);
  
  let realWinner: 'local' | 'empate' | 'visitante';
  if (gl > gv) realWinner = 'local';
  else if (gv > gl) realWinner = 'visitante';
  else realWinner = 'empate';

  const sections_hit: Record<string, boolean> = {};

  // 1. Ganador
  sections_hit['Ganador'] = analysis.winner_key === realWinner;

  // 2 y 3. Marcadores
  sections_hit['Marcador 1'] = analysis.score_1 === `${gl}-${gv}`;
  sections_hit['Marcador 2'] = analysis.score_2 === `${gl}-${gv}`;

  // 4. Apuesta
  const betTypeLower = (analysis.bet_type || '').toLowerCase();
  const bestBetUpper = (analysis.best_bet || '').toUpperCase();

  if (betTypeLower.includes('ganador directo') || betTypeLower.includes('1x2')) {
    sections_hit['Apuesta'] = sections_hit['Ganador'];
  } else if (betTypeLower.includes('doble oportunidad')) {
    if (bestBetUpper.includes('1X')) sections_hit['Apuesta'] = realWinner !== 'visitante';
    else if (bestBetUpper.includes('X2')) sections_hit['Apuesta'] = realWinner !== 'local';
    else if (bestBetUpper.includes('12')) sections_hit['Apuesta'] = realWinner !== 'empate';
    else sections_hit['Apuesta'] = false;
  } else if (betTypeLower.includes('over') || betTypeLower.includes('under') || betTypeLower.includes('goles')) {
    const lineMatch = analysis.best_bet.match(/[\d.]+/);
    if (lineMatch) {
      const line = parseFloat(lineMatch[0]);
      const isOver = bestBetUpper.includes('OVER') || bestBetUpper.includes('MÁS');
      const isUnder = bestBetUpper.includes('UNDER') || bestBetUpper.includes('MENOS');
      const totalGoals = gl + gv;
      
      if (isOver) sections_hit['Apuesta'] = totalGoals > line;
      else if (isUnder) sections_hit['Apuesta'] = totalGoals < line;
      else sections_hit['Apuesta'] = false;
    } else {
      sections_hit['Apuesta'] = false;
    }
  } else if (betTypeLower.includes('asiático') || betTypeLower.includes('asiatico') || betTypeLower.includes('handicap')) {
    sections_hit['Apuesta'] = sections_hit['Ganador'];
  } else if (betTypeLower.includes('ambos anotan') || betTypeLower.includes('btts')) {
    const indicatesYes = bestBetUpper.includes('SÍ') || bestBetUpper.includes('SI') || bestBetUpper.includes('BTTS');
    const bothScored = gl > 0 && gv > 0;
    sections_hit['Apuesta'] = indicatesYes ? bothScored : !bothScored;
  } else {
    sections_hit['Apuesta'] = false;
  }

  const status = sections_hit['Ganador'] ? 'win' : 'loss';

  return { sections_hit, status };
}
