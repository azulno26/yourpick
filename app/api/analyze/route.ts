import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { getModelForToday } from '@/lib/ai';
import { analyzeQueue, ANALYZE_JOB } from '@/lib/queue';

export const dynamic = 'force-dynamic';

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

    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayStr = formatter.format(new Date());

    const { data: usage } = await supabaseServer
      .from('daily_usage')
      .select('count')
      .eq('user_id', user.sub)
      .eq('date', todayStr)
      .single();

    if (user.role !== 'admin') {
      if (usage && usage.count >= 3) {
        return NextResponse.json({ error: 'Has usado tus 3 análisis de hoy' }, { status: 429 });
      }
    }

    const model = await getModelForToday();
    
    const { data: weightsData } = await supabaseServer
      .from('system_weights')
      .select('weights')
      .eq('id', model)
      .single();
    
    const weights = weightsData?.weights || null;

    // Crear registro inicial en 'processing'
    const analysisRecord = {
      user_id: user.sub,
      match_name: match,
      analysis_date: new Date().toISOString(),
      ai_model: model,
      weights_at_time: weights,
      status: 'processing'
    };

    const { data: insertedAnalysis, error: insertError } = await supabaseServer
      .from('analyses')
      .insert([analysisRecord])
      .select()
      .single();

    if (insertError || !insertedAnalysis) {
      console.error('Error insertando en supabase:', JSON.stringify(insertError, null, 2));
      return NextResponse.json({ error: 'Error al iniciar el análisis' }, { status: 500 });
    }

    // Actualizar uso diario inmediatamente al encolar
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

    // Encolar trabajo en Bull
    await analyzeQueue.add(ANALYZE_JOB, {
      analysisId: insertedAnalysis.id,
      match,
      model,
      weights
    });

    return NextResponse.json({ 
      id: insertedAnalysis.id, 
      status: 'processing',
      message: 'Análisis encolado correctamente' 
    }, { status: 202 });

  } catch (err) {
    console.error('Analyze POST Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
