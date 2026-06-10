import { supabaseServer } from '@/lib/supabase';
import Card from '@/components/Card';
import Badge from '@/components/Badge';

function getWinRate(items: any[]) {
  const evaluated = items.filter(a => a.status !== 'pending');
  const wins = evaluated.filter(a => a.status === 'win').length;
  return evaluated.length ? Math.round((wins / evaluated.length) * 100) : 0;
}

export default async function AdminModelosPage() {
  const { data: allAnalyses } = await supabaseServer
    .from('analyses')
    .select('status, ai_model, confidence_pct, league, bet_type');

  const analyses = allAnalyses || [];
  const gptAnalyses = analyses.filter(a => a.ai_model === 'gpt');
  const legacyAnalyses = analyses.filter(a => a.ai_model !== 'gpt');
  const gptEvaluated = gptAnalyses.filter(a => a.status !== 'pending');
  const confidences = gptAnalyses.map(a => Number(a.confidence_pct || 0)).filter(Boolean);
  const avgConf = confidences.length ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : null;

  const leagues = Array.from(new Set(gptAnalyses.map(a => a.league).filter(Boolean) as string[]));
  const betTypes = Array.from(new Set(gptAnalyses.map(a => a.bet_type).filter(Boolean) as string[]));

  const groupedRate = (fieldName: 'league' | 'bet_type', fieldValue: string) => {
    const group = gptAnalyses.filter(a => a[fieldName] === fieldValue);
    return group.filter(a => a.status !== 'pending').length ? `${getWinRate(group)}%` : '-';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6 text-center">
        <h1 className="font-bebas text-4xl text-text tracking-wide mb-2">MOTOR GPT-4o</h1>
        <p className="text-sm text-muted">YourPick usa un solo motor para generar analisis consistentes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green/30 bg-surface-2 text-center">
          <Badge variant="green" className="mb-3">ACTIVO</Badge>
          <div className="font-bebas text-5xl text-text">GPT-4o</div>
          <div className="text-xs font-mono text-muted uppercase">Modelo de analisis</div>
        </Card>
        <Card className="text-center">
          <div className="font-bebas text-5xl text-text">{gptEvaluated.length ? `${getWinRate(gptAnalyses)}%` : '-'}</div>
          <div className="text-xs font-mono text-muted uppercase">Tasa de acierto GPT</div>
        </Card>
        <Card className="text-center">
          <div className="font-bebas text-5xl text-text">{avgConf ? `${avgConf}%` : '-'}</div>
          <div className="text-xs font-mono text-muted uppercase">Confianza promedio</div>
        </Card>
      </div>

      <Card>
        <h3 className="font-mono text-xs text-cyan uppercase mb-4 tracking-widest border-b border-border pb-2">Resumen</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted">Analisis GPT</div>
            <div className="font-bebas text-3xl">{gptAnalyses.length}</div>
          </div>
          <div>
            <div className="text-muted">Evaluados GPT</div>
            <div className="font-bebas text-3xl">{gptEvaluated.length}</div>
          </div>
          <div>
            <div className="text-muted">Historicos legacy</div>
            <div className="font-bebas text-3xl">{legacyAnalyses.length}</div>
          </div>
          <div>
            <div className="text-muted">Costo estimado GPT</div>
            <div className="font-bebas text-3xl text-cyan">${(gptAnalyses.length * 0.02).toFixed(2)}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-mono text-xs text-cyan uppercase mb-4 tracking-widest border-b border-border pb-2">GPT por liga</h3>
          <div className="space-y-2">
            {leagues.length === 0 && <div className="text-center text-sm text-muted py-4">Sin datos aun</div>}
            {leagues.map(liga => (
              <div key={liga} className="flex justify-between items-center bg-surface-2 p-3 rounded-xl border border-border">
                <span className="font-sans text-sm truncate pr-2" title={liga}>{liga}</span>
                <span className="font-mono text-text">{groupedRate('league', liga)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-mono text-xs text-cyan uppercase mb-4 tracking-widest border-b border-border pb-2">GPT por tipo de apuesta</h3>
          <div className="space-y-2">
            {betTypes.length === 0 && <div className="text-center text-sm text-muted py-4">Sin datos aun</div>}
            {betTypes.map(bet => (
              <div key={bet} className="flex justify-between items-center bg-surface-2 p-3 rounded-xl border border-border">
                <span className="font-sans text-sm truncate pr-2" title={bet}>{bet}</span>
                <span className="font-mono text-text">{groupedRate('bet_type', bet)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
