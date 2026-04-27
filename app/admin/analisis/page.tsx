import { supabaseServer } from '@/lib/supabase';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Link from 'next/link';

export default async function AdminAnalisisPage() {
  const { data: analyses } = await supabaseServer
    .from('analyses')
    .select('*, users(username, display_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-bebas text-4xl text-text tracking-wide mb-1">TODOS LOS ANÁLISIS</h1>
        <p className="text-sm text-muted">Historial global del sistema.</p>
      </div>

      {(!analyses || analyses.length === 0) ? (
        <Card className="text-center py-12 border-dashed border-border/50 bg-surface-1">
          <div className="text-4xl mb-4 opacity-50">📂</div>
          <h2 className="font-bebas text-2xl text-muted tracking-wide">Sin análisis aún</h2>
          <p className="text-sm text-muted/70 mt-2">Los pronósticos generados aparecerán aquí.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden overflow-x-auto border-border bg-surface-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-2 border-b border-border text-[10px] uppercase font-mono text-muted tracking-wider">
                <th className="p-4 md:p-6 font-medium">Usuario</th>
                <th className="p-4 md:p-6 font-medium">Fecha</th>
                <th className="p-4 md:p-6 font-medium">Partido</th>
                <th className="p-4 md:p-6 font-medium">Modelo</th>
                <th className="p-4 md:p-6 font-medium">Predicción</th>
                <th className="p-4 md:p-6 font-medium">Real</th>
                <th className="p-4 md:p-6 font-medium text-center">Aciertos</th>
                <th className="p-4 md:p-6 font-medium text-center">Conf.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-sm">
              {analyses.map(a => {
                const hits = a.sections_hit ? Object.values(a.sections_hit).filter(Boolean).length : 0;
                const totalHits = a.sections_hit ? Object.keys(a.sections_hit).length : 0;
                const userObj = Array.isArray(a.users) ? a.users[0] : a.users;
                const userName = userObj?.display_name || userObj?.username || a.user_id.substring(0, 6);
                
                return (
                  <tr key={a.id} className="hover:bg-surface-2/50 transition-colors group">
                    <td className="p-4 md:p-6 whitespace-nowrap">
                      <div className="font-medium text-text">{userName}</div>
                    </td>
                    <td className="p-4 md:p-6 whitespace-nowrap text-muted font-mono text-xs">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 md:p-6">
                      <Link href={`/historial/${a.id}`} className="font-bebas text-lg tracking-wide group-hover:text-cyan transition-colors">
                        {a.match_name}
                      </Link>
                      <div className="text-[10px] font-mono text-muted uppercase mt-0.5">{a.league}</div>
                    </td>
                    <td className="p-4 md:p-6">
                      <Badge variant={a.ai_model === 'claude' ? 'purple' : 'green'}>
                        {a.ai_model === 'claude' ? '⚡ CLAUDE' : '🤖 GPT'}
                      </Badge>
                    </td>
                    <td className="p-4 md:p-6 max-w-[150px] truncate" title={a.best_bet}>
                      <span className="font-bold">{a.best_bet}</span>
                    </td>
                    <td className="p-4 md:p-6 font-bebas text-lg">
                      {a.real_score || '-'}
                    </td>
                    <td className="p-4 md:p-6 text-center">
                      {a.status === 'pending' ? (
                        <span className="text-yellow text-xs font-mono">PENDIENTE</span>
                      ) : (
                        <span className={`font-mono font-bold ${a.status === 'win' ? 'text-green' : 'text-red'}`}>
                          {hits}/{totalHits}
                        </span>
                      )}
                    </td>
                    <td className="p-4 md:p-6 text-center">
                      <span className={`font-bebas text-xl ${a.confidence_pct >= 70 ? 'text-green' : a.confidence_pct >= 55 ? 'text-yellow' : 'text-red'}`}>
                        {a.confidence_pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
