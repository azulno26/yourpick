import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Obtener patrones con 3 o más fallos
    const { data: patterns, error: patternError } = await supabaseServer
      .from('learning_patterns')
      .select('error_pattern, league, pick_type')
      .not('error_pattern', 'is', null)
      .eq('was_correct', false);

    if (patternError) throw patternError;

    // Agrupar por patrón
    const counts: Record<string, { count: number, league: string, pick_type: string }> = {};
    patterns.forEach(p => {
      if (!counts[p.error_pattern]) {
        counts[p.error_pattern] = { count: 0, league: p.league, pick_type: p.pick_type };
      }
      counts[p.error_pattern].count++;
    });

    const adjustments = [];
    for (const [pattern, data] of Object.entries(counts)) {
      if (data.count >= 3) {
        // Generar regla automática
        const rule = `REGLA DE APRENDIZAJE: El pick tipo "${data.pick_type}" ha fallado ${data.count} veces en la liga "${data.league}". Sé extremadamente cauteloso o EVITA este tipo de apuesta en esta liga salvo que el EV sea > 15%.`;
        
        const { data: adj, error: adjError } = await supabaseServer
          .from('prompt_adjustments')
          .upsert({
            error_pattern: pattern,
            adjustment_rule: rule,
            impact_score: 80,
            is_active: true
          }, { onConflict: 'error_pattern' })
          .select()
          .single();
        
        if (!adjError) adjustments.push(adj);
      }
    }

    return NextResponse.json({ 
      processed: Object.keys(counts).length,
      new_adjustments: adjustments.length,
      adjustments 
    });
  } catch (err) {
    console.error('Learning API Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
