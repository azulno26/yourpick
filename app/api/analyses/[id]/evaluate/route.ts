import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { evaluateAnalysis } from '@/lib/eval';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { real_score } = await request.json();
    if (!real_score) return NextResponse.json({ error: 'Marcador real es requerido' }, { status: 400 });

    const { data: analysis, error: fetchError } = await supabaseServer
      .from('analyses')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (fetchError || !analysis) return NextResponse.json({ error: 'Análisis no encontrado' }, { status: 404 });

    if (user.role !== 'admin' && analysis.user_id !== user.sub) {
      return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
    }

    let evalResult;
    try {
      evalResult = evaluateAnalysis(analysis, real_score);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Error al evaluar el marcador' }, { status: 400 });
    }

    const { sections_hit, status } = evalResult;

    const prompt = `Analiza este pronóstico vs resultado real. Ajusta los pesos. Devuelve JSON exclusivo con esta estructura: { "weights": { "forma": 1.05, "h2h": 0.95, ... }, "note": "Breve explicación de 1 oración del ajuste" }
Pronóstico inicial (factores): ${JSON.stringify(analysis.factors)}
Marcador real ocurrido: ${real_score}
Estado general de la predicción: ${status}`;

    let suggestedWeights: Record<string, number> | null = null;
    let aiNote = "Evaluación automática completada.";

    try {
      if (analysis.ai_model === 'claude') {
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        });
        const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('');
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
        if (parsed.weights) {
          suggestedWeights = parsed.weights;
          aiNote = parsed.note || "Ajustes sugeridos por Claude.";
        }
      } else {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });
        const text = response.choices[0].message.content || '{}';
        const parsed = JSON.parse(text);
        if (parsed.weights) {
          suggestedWeights = parsed.weights;
          aiNote = parsed.note || "Ajustes sugeridos por GPT-4o.";
        }
      }
    } catch (e) {
      console.error("Error en evaluación IA post-partido (ignorando...):", e);
    }

    if (suggestedWeights) {
      const { data: sysWeights } = await supabaseServer
        .from('system_weights')
        .select('*')
        .eq('id', analysis.ai_model)
        .single();
      
      if (sysWeights) {
        const currentWeights = sysWeights.weights || {};
        const newWeights: Record<string, number> = {};
        
        const allKeys = new Set([...Object.keys(currentWeights), ...Object.keys(suggestedWeights)]);
        
        for (const key of allKeys) {
          const current = typeof currentWeights[key] === 'number' ? currentWeights[key] : 1.0;
          const suggested = typeof suggestedWeights[key] === 'number' ? suggestedWeights[key] : 1.0;
          
          let newValue = (current * 0.7) + (suggested * 0.3);
          newValue = Math.max(0.5, Math.min(2.0, newValue));
          newWeights[key] = Number(newValue.toFixed(3));
        }

        await supabaseServer.from('system_weights').update({
          weights: newWeights,
          total_iterations: (sysWeights.total_iterations || 0) + 1,
          last_learning_note: aiNote
        }).eq('id', analysis.ai_model);

        await supabaseServer.from('learning_log').insert({
          analysis_id: analysis.id,
          user_id: user.sub,
          ai_model: analysis.ai_model,
          weights_before: currentWeights,
          weights_after: newWeights,
          note: aiNote
        });
      }
    }

    const updatedData = {
      status,
      real_score,
      sections_hit,
      evaluated_at: new Date().toISOString(),
      ai_post_analysis: aiNote
    };

    const { data: finalAnalysis, error: updateError } = await supabaseServer
      .from('analyses')
      .update(updatedData)
      .eq('id', analysis.id)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: 'Error al actualizar análisis final' }, { status: 500 });

    return NextResponse.json(finalAnalysis);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
