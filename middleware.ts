import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Rutas públicas
  if (pathname === '/login' || pathname.startsWith('/api/auth') || pathname === '/') {
    return NextResponse.next();
  }

  // Verificar token simple (sin JWT validation en middleware)
  const token = request.cookies.get('yp_session')?.value;
  
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|login).*)'],
};
