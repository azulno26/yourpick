import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { supabaseServer } from '@/lib/supabase';
import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatsCard from '@/components/StatsCard';
import Badge from '@/components/Badge';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Obtener display_name desde la BD
  const { data: dbUser } = await supabaseServer
    .from('users')
    .select('display_name')
    .eq('id', user.sub)
    .single();

  const displayName = dbUser?.display_name || user.username;

  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = formatter.format(new Date());

  const { data: usage } = await supabaseServer
    .from('daily_usage')
    .select('count')
    .eq('user_id', user.sub)
    .eq('date', todayStr)
    .single();

  const countToday = usage?.count || 0;
  const limitsReached = countToday >= 3;

  // Obtener análisis del usuario
  const { data: analyses } = await supabaseServer
    .from('analyses')
    .select('*')
    .eq('user_id', user.sub)
    .order('created_at', { ascending: false });

  const allAnalyses = analyses || [];
  const pending = allAnalyses.filter(a => a.status === 'pending').slice(0, 3);
  const evaluated = allAnalyses.filter(a => a.status !== 'pending');
  const wins = evaluated.filter(a => a.status === 'win').length;
  const winRate = evaluated.length > 0 ? (wins / evaluated.length) * 100 : 0;

  const displayDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="font-bebas text-4xl md:text-5xl text-text tracking-wide uppercase">
            HOLA, {displayName}
          </h1>
          <p className="text-muted text-sm capitalize font-mono mt-1">{displayDate}</p>
        </div>
      </div>

      {/* Quota Card */}
      <Card elevated className="border-cyan/30 flex flex-col items-center justify-center py-8 shadow-[0_4px_30px_rgba(0,212,255,0.05)]">
        <span className="font-mono text-xs uppercase text-cyan mb-2 tracking-widest font-bold">CUPO DEL DÍA</span>
        <div className="flex items-baseline mb-5">
          <span className="font-bebas text-7xl text-text leading-none">{countToday}</span>
          <span className="font-bebas text-4xl text-muted ml-1">/3</span>
        </div>
        <Link href="/analizar" className="w-full max-w-[280px]">
          <Button 
            className="w-full shadow-lg" 
            disabled={limitsReached}
            variant={limitsReached ? 'secondary' : 'primary'}
          >
            {limitsReached ? 'LÍMITE ALCANZADO' : '📊 NUEVO ANÁLISIS'}
          </Button>
        </Link>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <StatsCard title="% ACIERTO" value={winRate} suffix="%" className="shadow-md" />
        <StatsCard title="EVALUADOS" value={evaluated.length} className="shadow-md" />
      </div>

      {/* Pending Analyses */}
      {pending.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="font-mono text-xs text-muted uppercase tracking-widest px-1 mb-3">Pendientes de evaluar</h2>
          {pending.map(analysis => (
            <Link key={analysis.id} href={`/historial/${analysis.id}`}>
              <Card className="hover:border-cyan/50 transition-colors cursor-pointer group shadow-sm bg-surface-2/50">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs text-muted bg-surface-1 px-2 py-1 rounded-md border border-border">{analysis.league}</span>
                  <Badge variant="yellow">PENDIENTE</Badge>
                </div>
                <div className="font-bebas text-2xl tracking-wide group-hover:text-cyan transition-colors leading-none mt-3">
                  {analysis.match_name}
                </div>
                <div className="mt-4 flex justify-between items-end border-t border-border/50 pt-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-mono text-muted mb-1">Apuesta recomendada</span>
                    <span className="font-bold text-text font-sans text-lg">{analysis.best_bet}</span>
                  </div>
                  <span className="text-cyan font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity">Ver detalle ➔</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
