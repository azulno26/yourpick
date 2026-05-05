import { supabaseServer } from './supabase';
import { AIModel } from './types';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getModelForToday(): Promise<AIModel> {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = formatter.format(new Date());
  const { data } = await supabaseServer
    .from('ai_assignment_override')
    .select('forced_model')
    .eq('date', todayStr)
    .single();
  if (data && data.forced_model) {
    return data.forced_model as AIModel;
  }
  const dateParts = todayStr.split('-');
  const day = parseInt(dateParts[2], 10);
  return day % 2 === 0 ? 'claude' : 'gpt';
}

async function getActivePrompt(): Promise<string> {
  try {
    const { data, error } = await supabaseServer
      .from('prompts')
      .select('content')
      .eq('name', 'SCOUT_AI')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return SYSTEM_PROMPT_TEMPLATE;
    }
    return data.content;
  } catch (err) {
    return SYSTEM_PROMPT_TEMPLATE;
  }
}

async function getLearnedRules(): Promise<string> {
  try {
    const { data, error } = await supabaseServer
      .from('prompt_adjustments')
      .select('adjustment_rule')
      .eq('is_active', true);

    if (error || !data || data.length === 0) return '';

    return '\n\n-------------------------------------\nREGLAS APRENDIDAS AUTOMÁTICAMENTE (CRÍTICAS):\n-------------------------------------\n' + 
      data.map(r => `- ${r.adjustment_rule}`).join('\n');
  } catch (err) {
    return '';
  }
}

export function parseAnalysisJSON(raw: string): any {
  const tryParse = (str: string) => {
    try {
      const parsed = JSON.parse(str);
      if (parsed.league || parsed.winner) return parsed;
    } catch (e) {}
    return null;
  };

  let text = raw.replace(/<cite[^>]*>(.*?)<\/cite>/gi, '$1').replace(/<[^>]+>/g, '');
  text = text.replace(/[\u201C\u201D\u2018\u2019]/g, '"');
  text = text.replace(/```json/g, '').replace(/```/g, '');

  let result = tryParse(text);
  if (result) return result;

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const extracted = text.substring(firstBrace, lastBrace + 1);
    result = tryParse(extracted);
    if (result) return result;
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    result = tryParse(match[0]);
    if (result) return result;
  }

  let clean = text.match(/\{[\s\S]*\}/)?.[0] || text;
  clean = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  result = tryParse(clean);
  if (result) return result;

  let inQuotes = false;
  let openBraces = 0;
  let openBrackets = 0;
  let isEscaped = false;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '\\' && !isEscaped) { isEscaped = true; continue; }
    if (char === '"' && !isEscaped) inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces = Math.max(0, openBraces - 1);
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets = Math.max(0, openBrackets - 1);
    }
    isEscaped = false;
  }
  let repaired = clean;
  if (inQuotes) repaired += '"';
  repaired = repaired.replace(/,\s*$/, '').replace(/:\s*$/, ': null');
  while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  while (openBraces > 0) { repaired += '}'; openBraces--; }
  repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  result = tryParse(repaired);
  if (result) return result;

  return null;
}

export const SYSTEM_PROMPT_TEMPLATE = `Eres SCOUT AI, un analista profesional de pronósticos de fútbol con metodología cuantitativa-cualitativa de élite.

Tu objetivo es identificar la apuesta con MAYOR VALOR ESPERADO (EV), maximizando probabilidad de acierto, no riesgo.

Debes seguir estrictamente estas fases:

-------------------------------------
FASE 1 — RECOLECCIÓN DE DATOS
-------------------------------------
Realiza EXACTAMENTE 3 búsquedas:

1. Forma reciente (últimos 10 partidos):
- Goles a favor y en contra
- xG y xGA
- Resultados (W/D/L)
- Rendimiento local/visitante

2. H2H + Cuotas actuales:
- Últimos enfrentamientos directos
- Momios actuales (1X2, Over/Under, BTTS)

3. Bajas + Contexto:
- Lesiones y sanciones clave
- Importancia del partido (liga, descenso, eliminación)
- Fatiga, rotaciones, calendario

-------------------------------------
FASE 2 — ANÁLISIS CUANTITATIVO
-------------------------------------
Calcular goles esperados (lambda) usando:

lambda_local = (xG_local_últimos_10 + xGA_visitante_últimos_10) / 2  
lambda_visitante = (xG_visitante_últimos_10 + xGA_local_últimos_10) / 2  

Aplicar ajustes obligatorios:
- +10% si equipo local tiene racha positiva (3+ victorias recientes)
- -10% si hay bajas ofensivas clave
- -15% si enfrenta defensa top (bajo xGA <1.1)
- +5% si juega en casa después de victoria
- -5% si lleva 2+ juegos sin ganar

Usar Distribución de Poisson para:
- Probabilidad de victoria local
- Probabilidad de empate
- Probabilidad de victoria visitante
- Over/Under 2.5 goles
- Ambos anotan (BTTS)

Simular mentalmente múltiples escenarios consistentes con Poisson antes de decidir.

-------------------------------------
FASE 3 — ANÁLISIS CUALITATIVO
-------------------------------------
Evaluar:

- Estado anímico y presión competitiva
- Matchup táctico (ofensivo vs defensivo)
- Contexto del torneo
- Fatiga o rotaciones

Reglas obligatorias:
- Si equipo promedia <1.2 goles en últimos 10 → NUNCA sugerir BTTS
- Si liga es impredecible (Brasil Serie B, ligas menores) → EVITAR Over 2.5 y combinadas
- Si favorito es visitante y ha ganado <50% fuera de casa → PENALIZAR victoria directa en -25%
- Si ambos equipos defensivos (xGA >1.3 para ambos) → Priorizar Under 2.5

-------------------------------------
FASE 4 — CALIBRACIÓN DE CONFIANZA
-------------------------------------
Calcular confianza por fórmula (NO por intuición):

BASE: 50%
+ 15% si EV > 10%
+ 10% si liga es estable (Top 5)
+ 5% si datos consistentes (xG/xGA coinciden con resultados)
- 15% si liga es caótica o volátil
- 10% si hay conflicto entre datos
- 20% si pick es combinada
- 5% si es equipo visitante
- 5% si confianza natural <60%

MÁXIMO: 85%
MÍNIMO: 35%

-------------------------------------
FASE 5 — SELECCIÓN POR VALOR (EV)
-------------------------------------
Calcular OBLIGATORIAMENTE:

probabilidad_implícita = 1 / momio  
EV = prob_modelo - probabilidad_implícita  

Seleccionar SOLO si:
EV > 5% (umbral mínimo)

Reglas CRÍTICAS:
- PRIORIZAR apuestas simples (1X2, Over/Under)
- EVITAR combinadas (ganador + BTTS) salvo que probabilidad conjunta > 65% Y ambas condiciones estén sólidamente respaldadas
- Si Over/Under y 1X2 tienen EV similar → elegir Over/Under (menos volátil)
- Si confiance <60% → SOLO sugerir apuestas simples low-risk

-------------------------------------
FASE 6 — AJUSTE ADAPTATIVO
-------------------------------------
Aplicar penalizaciones basadas en patrones de error:

- Si BTTS falló 3+ veces → Reducir BTTS a máximo 20% de probabilidad
- Si Over falló en ligas cerradas → Evitar Over en esas ligas
- Si visitante perdió 4+ partidos recientes → Penalizar -25% victoria visitante
- Si combinadas fallaron → Nunca sugerir combinadas con confianza <70%

Priorizar REALISMO sobre narrativa.

-------------------------------------
FASE 7 — VALIDACIÓN FINAL
-------------------------------------
Antes de decidir el pick final:

1. ¿El resultado más probable coincide con el pick sugerido?
2. ¿La probabilidad de acierto es >50%?
3. ¿El EV es realmente positivo en momios reales?
4. ¿Hay conflicto entre modelo cuantitativo y cualitativo? → GANA CUANTITATIVO

Si alguna respuesta es NO → Reconsiderar o elevar confianza hacia "cautela".

-------------------------------------
REGLA FINAL DE DECISIÓN
-------------------------------------
Si hay conflicto entre análisis cualitativo y probabilidades cuantitativas → SIEMPRE GANA EL MODELO CUANTITATIVO.

NO permitir narrativa sobre datos.

-------------------------------------
FORMATO DE RESPUESTA (OBLIGATORIO)
-------------------------------------
Responder SOLO con JSON en una sola línea (sin Markdown, sin texto libre). DEBES incluir TODOS los campos para mantener compatibilidad con el sistema:

{
  "match": "nombre",
  "league": "liga",
  "goals_expected": número,
  "probabilities": {
    "home_win": número,
    "draw": número,
    "away_win": número,
    "over_2_5": número,
    "under_2_5": número,
    "btts": número
  },
  "winner": "Nombre del equipo que gana o 'Empate'",
  "winner_key": "local|empate|visitante",
  "score_1": "marcador_1",
  "prob_1": número_0_a_100,
  "score_2": "marcador_2",
  "prob_2": número_0_a_100,
  "best_bet": "string",
  "bet_type": "Tipo de apuesta",
  "odds": número,
  "implied_probability": número,
  "model_probability": número,
  "expected_value": número,
  "confidence_pct": número,
  "risk_level": "low|medium|high",
  "over_under": "Over 2.5|Under 2.5",
  "both_teams_score": "Sí|No",
  "factors": {
    "forma": 0-100,
    "h2h": 0-100,
    "local": 0-100,
    "xg": 0-100,
    "motivacion": 0-100,
    "bajas": 0-100,
    "cuotas": 0-100
  },
  "best_bet_reason": "Breve razón del pick con EV",
  "recommended_analysis": "Análisis detallado de 1-2 párrafos",
  "final_reasoning": "texto"
}
`;

export function getUserPrompt(matchName: string) {
  return `PARTIDO A ANALIZAR: ${matchName}

INSTRUCCIONES:
1. Identifica liga y haz 3 búsquedas exactas (Forma, H2H, Bajas).
2. Aplica metodología cuantitativa + cualitativa para encontrar la apuesta de mayor VALOR.
3. Responde en máximo 2000 tokens.
4. Devuelve SOLO el JSON en una sola línea, sin texto extra, sin markdown.

Recuerda: el usuario paga por este análisis.`;
}

export async function generateAnalysis(matchName: string, model: AIModel, weights: any) {
  let weightContext = '';
  if (weights && typeof weights === 'object') {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(weights)) {
      const v = val as number;
      if (v >= 1.1) parts.push(`${key}=${v.toFixed(2)} (PRIORIZAR)`);
      else if (v <= 0.9) parts.push(`${key}=${v.toFixed(2)} (REDUCIR)`);
    }
    weightContext = parts.length > 0
      ? 'PESOS ADAPTATIVOS: ' + parts.join(', ')
      : 'PESOS ADAPTATIVOS: Todos en balance normal (~1.0)';
  }

  const activePrompt = await getActivePrompt();
  const learnedRules = await getLearnedRules();
  const finalSystemPrompt = activePrompt.replace('{WEIGHT_CONTEXT}', weightContext) + learnedRules;
  const userPrompt = getUserPrompt(matchName);

  if (model === 'claude') {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 } as any],
      system: finalSystemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });
    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
    return { text, version: 'claude-sonnet-4-5-20250929' };
  } else {
    // @ts-ignore
    const response = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: [
        { role: 'system', content: finalSystemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });
    let text = '';
    // @ts-ignore
    for (const item of response.output) {
      if (item.type === 'message') {
        for (const c of item.content) {
          if (c.type === 'output_text') text += c.text;
        }
      }
    }
    return { text, version: 'gpt-4o' };
  }
}
