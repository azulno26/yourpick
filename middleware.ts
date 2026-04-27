import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// El secret debe decodificarse en Edge Runtime
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas permitidas
  if (pathname === '/' || pathname === '/login' || pathname === '/api/auth/login') {
    return NextResponse.next();
  }

  // Extraer token de las cookies
  const token = request.cookies.get('yp_session')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    
    // Verificación de rutas protegidas de administrador
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (payload.role !== 'admin') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Prohibido. Acceso exclusivo para administradores.' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', request.url)); // O cualquier otra ruta default de user
      }
    }
    
    return NextResponse.next();
  } catch (err) {
    // Si el token falló al verificar (inválido o expirado)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sesión expirada o inválida' }, { status: 401 });
    }
    // Borrar la cookie corrupta opcionalmente, pero redireccionar a login basta
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('yp_session');
    return response;
  }
}

export const config = {
  matcher: [
    // Ignorar assets y archivos estáticos de next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
