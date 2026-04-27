import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Usuario y contraseña son requeridos' }, { status: 400 });
    }

    // Obtener usuario activo
    const { data: user, error } = await supabaseServer
      .from('users')
      .select('id, username, password_hash, role, is_active')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return NextResponse.json({ ok: false, error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Verificar contraseña con bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return NextResponse.json({ ok: false, error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Actualizar última fecha de login
    await supabaseServer
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Generar JWT
    const token = await signToken({
      sub: user.id,
      role: user.role,
      username: user.username
    });

    const response = NextResponse.json({ ok: true, role: user.role });
    
    // Establecer la cookie HTTP-Only
    response.cookies.set({
      name: 'yp_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 días en segundos
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
