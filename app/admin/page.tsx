import { supabaseServer } from '@/lib/supabase';
import Card from '@/components/Card';
import StatsCard from '@/components/StatsCard';
import Badge from '@/components/Badge';
import Link from 'next/link';
import { getModelForToday } from '@/lib/ai';

export default async function AdminDashboardPage() {
  const { count: totalAnalyses } = await supabaseServer.from('analyses').select('*', { count: 'exact', head: true });
  const { data: evaluated } = await supabaseServer.from('analyses').select('status').neq('status', 'pending');
  
  const wins = evaluated?.filter(a => a.status === 'win').length || 0;
  const totalEval = evaluated?.length || 0;
  const globalWinRate = totalEval > 0 ? (wins / totalEval) * 100 : 0;

  const modelToday = await getModelForToday();

  // Top Ligas
  const { data: allLeagues } = await supabaseServer.from('analyses').select('league');
  const leagueCounts: Record<string, number> = {};
  allLeagues?.forEach(row => {
    if (row.league) {
      leagueCounts[row.league] = (leagueCounts[row.league] || 0) + 1;
    }
  });
  const topLeagues = Object.entries(leagueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Últimos 5 análisis
  const { data: recentAnalyses } = await supabaseServer
    .from('analyses')
    .select('id, match_name, ai_model, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="font-bebas text-4xl text-text tracking-wide mb-1">DASHBOARD GLOBAL</h1>
          <p className="text-sm text-muted">Centro de control del motor de IA.</p>
        </div>
        <Card className="px-4 py-3 flex items-center gap-3 border-cyan/30 bg-surface-2 shadow-lg w-full md:w-auto">
          <span className="text-xs font-mono text-muted uppercase font-bold">Modelo de hoy:</span>
          <Badge variant={modelToday === 'claude' ? 'purple' : 'green'}>
            {modelToday === 'claude' ? '⚡ CLAUDE' : '🤖 GPT-4o'}
          </Badge>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatsCard title="TOTAL ANÁLISIS" value={totalAnalyses || 0} />
        <StatsCard title="EVALUADOS" value={totalEval} />
        <StatsCard title="% ACIERTO GLOBAL" value={globalWinRate} suffix="%" className="col-span-2 md:col-span-1 border-cyan/30 shadow-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="flex flex-col h-full border-border">
          <h3 className="font-mono text-xs text-cyan uppercase mb-4 tracking-widest border-b border-border pb-2">Top 5 Ligas</h3>
          <div className="space-y-2 flex-1">
            {topLeagues.length > 0 ? topLeagues.map(([liga, count]) => (
              <div key={liga} className="flex justify-between items-center bg-surface-2 p-3 rounded-xl border border-border">
                <span className="font-sans text-sm font-medium">{liga}</span>
                <span className="font-mono text-xs text-cyan bg-surface-1 px-2 py-1 rounded">{count} picks</span>
              </div>
            )) : <div className="text-center text-sm text-muted py-4">Sin análisis aún</div>}
          </div>
        </Card>

        <Card className="flex flex-col h-full border-border">
          <h3 className="font-mono text-xs text-cyan uppercase mb-4 tracking-widest border-b border-border pb-2">Actividad Reciente</h3>
          <div className="space-y-3 flex-1">
            {recentAnalyses?.map(a => (
              <Link key={a.id} href={`/historial/${a.id}`} className="flex justify-between items-center group bg-surface-2 p-3 rounded-xl border border-border hover:border-cyan/30 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-xl shrink-0">{a.ai_model === 'claude' ? '⚡' : '🤖'}</span>
                  <span className="font-bebas text-xl group-hover:text-cyan transition-colors truncate">{a.match_name}</span>
                </div>
                <div className="shrink-0 ml-2">
                  {a.status === 'pending' ? <Badge variant="yellow">PENDING</Badge> : 
                   a.status === 'win' ? <Badge variant="green">WIN</Badge> : <Badge variant="red">LOSS</Badge>}
                </div>
              </Link>
            ))}
          </div>
          <Link href="/admin/analisis" className="mt-4 text-center text-xs font-mono text-cyan hover:underline underline-offset-4 uppercase tracking-widest w-full block bg-surface-2 p-3 rounded-xl border border-cyan/20">Ver todos ➔</Link>
        </Card>
      </div>
    </div>
  );
}
