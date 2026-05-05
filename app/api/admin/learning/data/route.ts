import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener patrones de error agrupados por patrón
    const { data: patternsRaw, error: patternError } = await supabaseServer
      .from('learning_patterns')
      .select('error_pattern, league, pick_type')
      .not('error_pattern', 'is', null)
      .eq('was_correct', false);

    if (patternError) throw patternError;

    const counts: Record<string, { count: number, league: string, pick_type: string, error_pattern: string }> = {};
    patternsRaw.forEach(p => {
      if (!counts[p.error_pattern]) {
        counts[p.error_pattern] = { count: 0, league: p.league, pick_type: p.pick_type, error_pattern: p.error_pattern };
      }
      counts[p.error_pattern].count++;
    });

    const patterns = Object.values(counts).sort((a, b) => b.count - a.count);

    // Obtener reglas de ajuste
    const { data: adjustments, error: adjError } = await supabaseServer
      .from('prompt_adjustments')
      .select('*')
      .order('created_at', { ascending: false });

    if (adjError) throw adjError;

    return NextResponse.json({ patterns, adjustments });
  } catch (err) {
    console.error('Learning Data Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
