import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  
  // Borrar la cookie de sesión
  response.cookies.delete('yp_session');
  
  return response;
}
