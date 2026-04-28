import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: users, error } = await supabaseServer
      .from('users')
      .select('id, username, role, display_name, is_active, created_at, last_login');

    if (error) return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });

    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayStr = formatter.format(new Date());

    const { data: usages } = await supabaseServer.from('daily_usage').select('user_id, count').eq('date', todayStr);
    const { data: analyses } = await supabaseServer.from('analyses').select('user_id, status');

    const usersWithStats = users.map(u => {
      const userAnalyses = analyses?.filter(a => a.user_id === u.id) || [];
      const evaluated = userAnalyses.filter(a => a.status === 'win' || a.status === 'loss');
      const wins = evaluated.filter(a => a.status === 'win').length;
      const todayUsage = usages?.find(us => us.user_id === u.id)?.count || 0;

      return {
        ...u,
        total_analyses: userAnalyses.length,
        win_rate: evaluated.length > 0 ? (wins / evaluated.length) * 100 : 0,
        today_usage: todayUsage
      };
    });

    return NextResponse.json(usersWithStats);
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { username, password, display_name, role } = await request.json();
    if (!username || !password) return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });

    const password_hash = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabaseServer.from('users').insert([{
      username,
      password_hash,
      display_name: display_name || username,
      role: role || 'user',
      is_active: true
    }]).select('id, username, role, display_name').single();

    if (error) return NextResponse.json({ error: 'Error creando usuario' }, { status: 500 });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
