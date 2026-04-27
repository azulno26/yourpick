import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get('yp_session')?.value;
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  let table = '';
  if (type === 'analyses') table = 'analyses';
  else if (type === 'users') table = 'users';
  else if (type === 'learning') table = 'learning_log';
  else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  const { data, error } = await supabaseServer.from(table).select('*').limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) return new NextResponse('', { headers: { 'Content-Type': 'text/csv' } });

  const keys = Object.keys(data[0]);
  const csvRows = [
    keys.join(','),
    ...data.map(row => keys.map(k => `"${(row[k] || '').toString().replace(/"/g, '""')}"`).join(','))
  ];

  return new NextResponse(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type}_export.csv"`
    }
  });
}
