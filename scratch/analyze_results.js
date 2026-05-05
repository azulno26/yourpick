const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
});

console.log('Parsed env keys:', Object.keys(env));
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY
);

async function runAnalysis() {
  console.log('--- Iniciando Análisis de Datos ---');
  
  const { data, error } = await supabase
    .from('analyses')
    .select('id, created_at, match_name, league, ai_model, confidence_pct, status, winner_key, bet_type, best_bet, goals_expected, avg_goals_h2h');

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No hay datos disponibles.');
    return;
  }

  // 1. Resumen por Modelo
  const modelStats = {};
  data.forEach(row => {
    const model = row.ai_model || 'unknown';
    if (!modelStats[model]) {
      modelStats[model] = { total: 0, evaluated: 0, wins: 0, sumConf: 0 };
    }
    modelStats[model].total++;
    if (row.status !== 'pending') {
      modelStats[model].evaluated++;
      if (row.status === 'win') {
        modelStats[model].wins++;
      }
    }
    if (row.confidence_pct) {
      modelStats[model].sumConf += row.confidence_pct;
    }
  });

  console.log('\n--- RESUMEN POR MODELO ---');
  console.table(Object.keys(modelStats).map(model => ({
    Modelo: model,
    Total: modelStats[model].total,
    Evaluados: modelStats[model].evaluated,
    Aciertos: modelStats[model].wins,
    'Win Rate (%)': modelStats[model].evaluated ? ((modelStats[model].wins / modelStats[model].evaluated) * 100).toFixed(2) : '0.00',
    'Confianza Avg (%)': (modelStats[model].sumConf / modelStats[model].total).toFixed(2)
  })));

  // 2. Resumen por Liga (Top 10)
  const leagueStats = {};
  data.filter(r => r.status !== 'pending').forEach(row => {
    const league = row.league || 'Otra';
    if (!leagueStats[league]) leagueStats[league] = { total: 0, wins: 0 };
    leagueStats[league].total++;
    if (row.status === 'win') leagueStats[league].wins++;
  });

  console.log('\n--- TOP LIGAS POR PRECISIÓN ---');
  const sortedLeagues = Object.keys(leagueStats)
    .map(l => ({
      Liga: l,
      Evaluados: leagueStats[l].total,
      Aciertos: leagueStats[l].wins,
      'Win Rate (%)': ((leagueStats[l].wins / leagueStats[l].total) * 100).toFixed(2)
    }))
    .sort((a, b) => b.Evaluados - a.Evaluados)
    .slice(0, 10);
  console.table(sortedLeagues);

  // 3. Muestra de los últimos 5 análisis
  console.log('\n--- ÚLTIMOS 5 ANÁLISIS ---');
  const recent = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  console.table(recent.map(r => ({
    Fecha: new Date(r.created_at).toLocaleDateString(),
    Partido: r.match_name,
    IA: r.ai_model,
    Pred: r.winner_key,
    Status: r.status
  })));
}

runAnalysis();
