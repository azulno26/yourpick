import { evaluateAnalysis } from '@/lib/eval';
import { supabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { analysisId } = await req.json();

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 });
    }

    // Obtener análisis
    const { data: analysis, error: fetchError } = await supabaseServer
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    if (!analysis.real_score) {
      return NextResponse.json({ error: 'Analysis does not have a real score yet' }, { status: 400 });
    }

    // Re-evaluar con lógica nueva
    let result;
    try {
      result = evaluateAnalysis(analysis, analysis.real_score);
    } catch (evalErr: any) {
      return NextResponse.json({ error: evalErr.message || 'Error evaluating' }, { status: 400 });
    }

    const { sections_hit, status } = result;

    // Guardar cambios
    const { error: updateError } = await supabaseServer
      .from('analyses')
      .update({ 
        sections_hit, 
        status,
        evaluated_at: new Date().toISOString() // Actualizamos también la fecha de evaluación
      })
      .eq('id', analysisId);

    if (updateError) {
      return NextResponse.json({ error: 'Error updating analysis' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      analysisId, 
      new_status: status, 
      sections_hit 
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
