import { supabaseServer } from '@/lib/supabase';
import Card from '@/components/Card';
import Badge from '@/components/Badge';

export default async function AdminModelosPage() {
  // Obtenemos todos los datos relevantes
  const { data: allAnalyses } = await supabaseServer
    .from('analyses')
    .select('status, ai_model, confidence_pct, league, bet_type');
  
  const getStats = (model: string) => {
    const modelAnalyses = allAnalyses?.filter(a => a.ai_model === model) || [];
    const evaluated = modelAnalyses.filter(a => a.status !== 'pending');
    const wins = evaluated.filter(a => a.status === 'win').length;
    
    // Promedio de confianza
    const confidences = modelAnalyses.map(a => a.confidence_pct).filter(Boolean);
    const avgConf = confidences.length ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : null;
    
    return {
      totalEvaluated: evaluated.length,
      winRate: evaluated.length ? Math.round((wins / evaluated.length) * 100) : 0,
      avgConf: avgConf ? `${avgConf}%` : '—',
      modelAnalyses
    };
  };

  const claude = getStats('claude');
  const gpt = getStats('gpt');

  // Arrays únicos para mapear
  const leagues = Array.from(new Set(allAnalyses?.map(a => a.league).filter(Boolean) as string[]));
  const betTypes = Array.from(new Set(allAnalyses?.map(a => a.bet_type).filter(Boolean) as string[]));

  const getWinRate = (groupList: any[], fieldName: string, fieldValue: string) => {
    const evals = groupList.filter(a => a[fieldName] === fieldValue && a.status !== 'pending');
    const wins = evals.filter(a => a.status === 'win').length;
    return evals.length ? `${Math.round((wins / evals.length) * 100)}%` : '—';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6 text-center">
        <h1 className="font-bebas text-4xl text-text tracking-wide mb-2 flex items-center justify-center gap-4">
          <span className="text-purple">⚡ CLAUDE</span> 
          <span className="text-2xl text-muted lowercase">vs</span> 
          <span className="text-green">🤖 GPT-4o</span>
        </h1>
        <p className="text-sm text-muted">Comparativa de precisión en tiempo real con datos de BD.</p>
      </div>

      {(!allAnalyses || allAnalyses.length === 0) ? (
        <Card className="text-center py-12 border-dashed border-border/50 bg-surface-1">
          <div className="text-4xl mb-4 opacity-50">🤖</div>
          <h2 className="font-bebas text-2xl text-muted tracking-wide">Sin análisis aún</h2>
          <p className="text-sm text-muted/70 mt-2">Los modelos generarán métricas una vez que existan análisis evaluados.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-purple/30 bg-surface-2 md:p-8">
              <div className="text-center mb-6">
                <Badge variant="purple" className="mb-2">CLAUDE SONNET 4.5</Badge>
                <div className="font-bebas text-6xl text-text">{claude.totalEvaluated > 0 ? `${claude.winRate}%` : '—'}</div>
                <div className="text-xs font-mono text-muted uppercase">Tasa de Acierto</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted">Partidos Evaluados</span>
                  <span className="font-bold">{claude.totalEvaluated}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted">Confianza Promedio</span>
                  <span className="font-bold">{claude.avgConf}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-sm text-muted">Costo Estimado</span>
                  <span className="font-bold text-cyan">${(claude.modelAnalyses.length * 0.04).toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <Card className="border-green/30 bg-surface-2 md:p-8">
              <div className="text-center mb-6">
                <Badge variant="green" className="mb-2">GPT-4o</Badge>
                <div className="font-bebas text-6xl text-text">{gpt.totalEvaluated > 0 ? `${gpt.winRate}%` : '—'}</div>
                <div className="text-xs font-mono text-muted uppercase">Tasa de Acierto</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted">Partidos Evaluados</span>
                  <span className="font-bold">{gpt.totalEvaluated}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted">Confianza Promedio</span>
                  <span className="font-bold">{gpt.avgConf}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-sm text-muted">Costo Estimado</span>
                  <span className="font-bold text-cyan">${(gpt.modelAnalyses.length * 0.02).toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
            <Card className="md:p-8">
              <h3 className="font-mono text-xs text-muted uppercase mb-4 tracking-widest border-b border-border pb-2">Desglose por Liga</h3>
              <div className="grid grid-cols-3 gap-2 text-sm font-bold text-muted mb-2 px-2">
                <div>Liga</div>
                <div className="text-center text-purple">Claude</div>
                <div className="text-center text-green">GPT-4o</div>
              </div>
              <div className="space-y-2">
                {leagues.length === 0 && <div className="text-center text-sm text-muted py-4">Sin datos aún</div>}
                {leagues.map(liga => (
                  <div key={liga} className="grid grid-cols-3 gap-2 items-center bg-surface-2 p-3 rounded-xl border border-border">
                    <span className="font-sans text-sm truncate pr-2" title={liga}>{liga}</span>
                    <span className="font-mono text-center text-text">{getWinRate(claude.modelAnalyses, 'league', liga)}</span>
                    <span className="font-mono text-center text-text">{getWinRate(gpt.modelAnalyses, 'league', liga)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="md:p-8">
              <h3 className="font-mono text-xs text-muted uppercase mb-4 tracking-widest border-b border-border pb-2">Por Tipo de Apuesta</h3>
              <div className="grid grid-cols-3 gap-2 text-sm font-bold text-muted mb-2 px-2">
                <div>Apuesta</div>
                <div className="text-center text-purple">Claude</div>
                <div className="text-center text-green">GPT-4o</div>
              </div>
              <div className="space-y-2">
                {betTypes.length === 0 && <div className="text-center text-sm text-muted py-4">Sin datos aún</div>}
                {betTypes.map(bet => (
                  <div key={bet} className="grid grid-cols-3 gap-2 items-center bg-surface-2 p-3 rounded-xl border border-border">
                    <span className="font-sans text-sm truncate pr-2" title={bet}>{bet}</span>
                    <span className="font-mono text-center text-text">{getWinRate(claude.modelAnalyses, 'bet_type', bet)}</span>
                    <span className="font-mono text-center text-text">{getWinRate(gpt.modelAnalyses, 'bet_type', bet)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
