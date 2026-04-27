import { supabaseServer } from '@/lib/supabase';
import Card from '@/components/Card';
import Badge from '@/components/Badge';

export default async function AdminAprendizajePage() {
  const { data: logs } = await supabaseServer
    .from('learning_log')
    .select('id, analysis_id, ai_model, weights_before, weights_after, note, created_at, analyses(match_name)')
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-bebas text-4xl text-text tracking-wide mb-1">APRENDIZAJE AUTOMÁTICO</h1>
        <p className="text-sm text-muted">Timeline de ajustes de pesos de la IA.</p>
      </div>

      {!logs || logs.length === 0 ? (
        <Card className="text-center py-12 border-dashed border-border/50 bg-surface-1">
          <div className="text-4xl mb-4 opacity-50">🎓</div>
          <h2 className="font-bebas text-2xl text-muted tracking-wide">Sin aprendizaje aún</h2>
          <p className="text-sm text-muted/70 mt-2">La IA registrará aquí sus ajustes de pesos después de evaluar pronósticos.</p>
        </Card>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {logs.map((log, i) => {
            const prev = log.weights_before as any;
            const current = log.weights_after as any;
            const matchName = Array.isArray(log.analyses) ? log.analyses[0]?.match_name : log.analyses?.match_name;
            const target_model = log.ai_model;
            const change_reason = log.note;

            return (
              <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-bg bg-surface-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow z-10">
                  <span className="text-sm">{target_model === 'claude' ? '⚡' : '🤖'}</span>
                </div>
                <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] hover:border-cyan/30 transition-colors p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={target_model === 'claude' ? 'purple' : 'green'}>{target_model.toUpperCase()}</Badge>
                    <span className="font-mono text-xs text-muted">{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="font-bebas text-xl text-text mb-2">{matchName || 'Evaluación General'}</div>
                  <div className="bg-surface-2 p-3 rounded-lg border border-border/50 text-xs text-muted italic mb-3">
                    "{change_reason}"
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50">
                    {Object.keys(current || {}).slice(0, 4).map(k => {
                      const diff = current[k] - (prev[k] || 1);
                      if (Math.abs(diff) < 0.01) return null;
                      return (
                        <div key={k} className="flex justify-between items-center text-xs font-mono">
                          <span className="capitalize text-muted">{k}</span>
                          <span className={diff > 0 ? 'text-green' : 'text-red'}>
                            {diff > 0 ? '↑' : '↓'} {current[k].toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
