import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

const DEFAULT_WEIGHTS = {
  forma: 1.0,
  h2h: 1.0,
  local: 1.0,
  xg: 1.0,
  motivacion: 1.0,
  bajas: 1.0,
  cuotas: 1.0
};

export async function GET(request: Request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabaseServer.from('system_weights').select('*');
    if (error) return NextResponse.json({ error: 'Error al obtener pesos' }, { status: 500 });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { model } = await request.json(); // 'claude' | 'gpt' | 'all'
    const targetModels = model === 'all' ? ['claude', 'gpt'] : [model];

    for (const m of targetModels) {
      await supabaseServer.from('system_weights').upsert({
        id: m,
        weights: DEFAULT_WEIGHTS,
        total_iterations: 0,
        last_learning_note: 'Reseteo manual de pesos por administrador'
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
