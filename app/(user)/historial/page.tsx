import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import Card from '@/components/Card';
import Badge from '@/components/Badge';

export default async function HistorialPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const currentStatus = searchParams.status || 'all';

  let query = supabaseServer.from('analyses').select('*');
  if (user.role !== 'admin') {
    query = query.eq('user_id', user.sub);
  }
  if (currentStatus !== 'all') {
    query = query.eq('status', currentStatus);
  }
  
  query = query.order('created_at', { ascending: false });
  const { data: analyses } = await query;

  const tabs = [
    { id: 'all', label: 'Todos' },
    { id: 'pending', label: 'Pendientes' },
    { id: 'win', label: 'Acertados' },
    { id: 'loss', label: 'Fallados' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="mb-4">
        <h1 className="font-bebas text-4xl text-text tracking-wide mb-1">HISTORIAL</h1>
        <p className="text-sm text-muted">Registro de tus pronósticos y aciertos.</p>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
        {tabs.map(tab => {
          const isActive = currentStatus === tab.id;
          return (
            <Link key={tab.id} href={tab.id === 'all' ? '/historial' : `/historial?status=${tab.id}`}>
              <div className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm transition-colors ${isActive ? 'bg-cyan text-black font-bold' : 'bg-surface-1 text-muted border border-border hover:bg-surface-2'}`}>
                {tab.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* LISTA */}
      <div className="space-y-4">
        {!analyses || analyses.length === 0 ? (
          <div className="text-center py-12 px-4">
            <span className="text-5xl opacity-50 mb-4 block">👻</span>
            <h3 className="font-bebas text-2xl text-muted tracking-wider">NO HAY REGISTROS</h3>
            <p className="text-sm text-muted/70 mt-1">Aún no tienes pronósticos en esta categoría.</p>
            {currentStatus === 'all' && (
              <Link href="/analizar">
                <button className="mt-4 text-cyan text-sm underline underline-offset-4">Hacer mi primer análisis</button>
              </Link>
            )}
          </div>
        ) : (
          analyses.map(a => {
            const dateStr = new Date(a.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            return (
              <Link key={a.id} href={`/historial/${a.id}`} className="block group">
                <Card className="hover:border-cyan/50 transition-colors flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-mono text-muted bg-surface-2 px-2 py-0.5 rounded border border-border">{a.league}</span>
                      <span className="text-[10px] font-mono text-muted/50">{dateStr}</span>
                    </div>
                    <div className="font-bebas text-xl md:text-2xl tracking-wide group-hover:text-cyan transition-colors truncate">
                      {a.match_name}
                    </div>
                  </div>
                  <div>
                    {a.status === 'pending' && <Badge variant="yellow">PENDIENTE</Badge>}
                    {a.status === 'win' && <Badge variant="green">ACIERTO</Badge>}
                    {a.status === 'loss' && <Badge variant="red">FALLO</Badge>}
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
