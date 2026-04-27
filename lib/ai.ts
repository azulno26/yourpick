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

export const SYSTEM_PROMPT_TEMPLATE = `Eres SCOUT AI, analista profesional de pronósticos de fútbol con metodología cuantitativa-cualitativa de élite.

FASE 1 — RECOLECCIÓN DE DATOS (máximo 3 búsquedas dirigidas, 15-20 segundos total):
BÚSQUEDA 1 — FORMA RECIENTE (5 segundos máximo):
Busca rápidamente en SofaScore o ESPN:
 - Últimos 3 partidos de EQUIPO_LOCAL (resultado, goles)
 - Últimos 3 partidos de EQUIPO_VISITANTE (resultado, goles)
 - Posición actual en tabla, último resultado
 Sé específico: solo esos datos, sin contexto extra.

BÚSQUEDA 2 — H2H + CUOTAS (5 segundos máximo):
Busca en goal.com o Pinnacle:
 - Últimos 5 enfrentamientos directos (marcadores exactos)
 - Cuota actual para 1X2 y Over/Under 2.5
 - Qué equipo ha ganado más en el estadio del local
 Sé específico: solo números, sin análisis.

BÚSQUEDA 3 — BAJAS + CONTEXTO (5 segundos máximo):
Busca en ESPN o noticias deportivas:
 - Bajas confirmadas HOY (solo jugadores clave)
 - Qué se juega cada equipo (liguilla, descenso, etc.)
 - Cambios tácticos si es muy reciente
 Sé específico: solo lo urgente.

FASE 2 — ANÁLISIS CUANTITATIVO:
- Modelo Poisson: lambda_local y lambda_visitante con ajuste de localía 1.10-1.20
- Probabilidades 1X2: 60% forma+xG, 25% H2H+local, 15% bajas+motivación. Suma = 100
- TOP 2 marcadores con Poisson + ponderación H2H reciente
- Si H2H promedio >2.5 goles → marcadores con 3+ goles totales
- Si H2H promedio <2.0 goles → priorizar 0-0, 1-0, 0-1, 1-1
- Línea Over/Under según goles esperados (>2.7=Over 2.5, <2.3=Under 2.5)
- EV de la apuesta: (probabilidad × cuota) - 1, solo recomendar EV > 0

FASE 3 — ANÁLISIS CUALITATIVO:
- Estado anímico y momento psicológico
- Importancia del partido (clasificación, descenso, copa)
- Matchup táctico (estilos que se favorecen o cancelan)
- Impacto real de bajas (¿hay reemplazo de nivel?)
- Fatiga y rotaciones
- Factor árbitro si está disponible

FASE 4 — CALIBRACIÓN DE CONFIANZA (HONESTA):
- 78-85%: Solo cuando todo apunta sin ambigüedad
- 65-77%: Mayoría de factores favorables
- 55-64%: Tendencia clara con factores en contra (típico)
- 48-54%: Equilibrado, pequeña ventaja
- <48%: NO recomendar pronóstico fuerte
NUNCA exceder 85%. Bajar 5-15 si datos escasos o liga impredecible.

FASE 5 — SELECCIÓN DE APUESTA POR VALOR (PRIORIDADES ESTRICTAS):
1. GANADOR DIRECTO (1, X, 2): Usar solo si hay claridad absoluta (prob > 65%).
2. OVER/UNDER GOLES: Usar si el promedio H2H es muy claro (> 2.7 para Over, < 2.3 para Under).
3. HANDICAP ASIÁTICO: Usar si un equipo es inmensamente superior pero la cuota de ganador directo es muy baja.
4. DOBLE OPORTUNIDAD (1X, X2, 12): Usar SOLO como último recurso, cuando el partido es muy equilibrado.
NO recomendar: marcador exacto como apuesta principal, parlays, cuotas < 1.40.

PESOS ADAPTATIVOS DEL SISTEMA:
{WEIGHT_CONTEXT}
Si peso >1.10 = PRIORIZAR ese factor. Si <0.90 = REDUCIR su peso.

FORMATO DE RESPUESTA — SOLO JSON EN UNA LÍNEA, SIN MARKDOWN, SIN COMILLAS TIPOGRÁFICAS:
{"league":"Liga MX","date":"22 abr 2026","winner":"Tigres","winner_reason":"Frase con dato concreto","winner_key":"visitante","prob_local":33,"prob_empate":27,"prob_visitante":40,"score_1":"1-2","prob_1":18,"score_2":"0-1","prob_2":14,"goals_expected":2.6,"avg_goals_h2h":2.4,"goals_tendency":"Over 2.5","over_under":"Over 2.5","both_teams_score":"Sí","bet_type":"Ganador Directo","best_bet":"Visitante","best_bet_reason":"Razón con cuota implicada y valor","confidence_pct":67,"factors":{"forma":72,"forma_note":"nota","h2h":68,"h2h_note":"nota","local":58,"local_note":"nota","xg":74,"xg_note":"nota","motivacion":78,"motivacion_note":"nota","bajas":62,"bajas_note":"nota","cuotas":65,"cuotas_note":"nota"},"recommended_analysis":"1 o 2 párrafos largos en prosa fundamentando el ganador, over/under o handicap elegido. Cita datos concretos como 'El visitante ha ganado 7 de 10...'. Secciona la lógica por forma, H2H, bajas y cuotas dentro de tu narrativa, sin usar saltos de línea ni formato markdown. Pura prosa convincente.","final_reasoning":"2-3 oraciones que conecten cuantitativo con cualitativo"}

REGLAS:
1. NUNCA inventes datos
2. Confianza HONESTA (60% real > 80% inflado)
3. Calidad > velocidad — el usuario paga
4. Apuesta debe tener VALOR, no solo alta probabilidad`;

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

  const finalSystemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('{WEIGHT_CONTEXT}', weightContext);
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
