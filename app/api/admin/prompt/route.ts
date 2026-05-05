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

    const { data, error } = await supabaseServer
      .from('prompts')
      .select('*')
      .eq('name', 'SCOUT_AI')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is not found
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompt: data || null });
  } catch (err) {
    console.error('Prompt GET Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ error: 'El contenido es requerido' }, { status: 400 });
    }

    // Desactivar prompts anteriores
    await supabaseServer
      .from('prompts')
      .update({ is_active: false })
      .eq('name', 'SCOUT_AI');

    // Insertar nueva versión
    const { data: latestVersion } = await supabaseServer
      .from('prompts')
      .select('version')
      .eq('name', 'SCOUT_AI')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const newVersion = (latestVersion?.version || 0) + 1;

    const { data, error } = await supabaseServer
      .from('prompts')
      .insert([
        {
          name: 'SCOUT_AI',
          content,
          version: newVersion,
          is_active: true,
          updated_by: user.sub // assuming user.sub is the ID
        }
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompt: data });
  } catch (err) {
    console.error('Prompt POST Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
