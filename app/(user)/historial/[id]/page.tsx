import { supabaseServer } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import AnalysisResult from '@/components/AnalysisResult';
import EvaluateForm from '@/components/EvaluateForm';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import Link from 'next/link';

export default async function AnalysisDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: analysis } = await supabaseServer
    .from('analyses')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!analysis) {
    notFound();
  }

  if (user.role !== 'admin' && analysis.user_id !== user.sub) {
    notFound();
  }

  return (
    <div className="animate-fade-in pb-8">
      <Link href="/historial" className="inline-block mb-6 text-sm text-cyan hover:underline underline-offset-4">
        ← Volver al historial
      </Link>

      <div className="flex items-center gap-3 mb-6">
        {analysis.status === 'pending' && <Badge variant="yellow">PENDIENTE</Badge>}
        {analysis.status === 'win' && <Badge variant="green">ACIERTO</Badge>}
        {analysis.status === 'loss' && <Badge variant="red">FALLO</Badge>}
      </div>

      <AnalysisResult analysis={analysis} showSaveButton={false} />

      {/* EVALUATION SECTION */}
      {analysis.status === 'pending' ? (
        <EvaluateForm analysisId={analysis.id} />
      ) : (
        <Card className="mt-8 border-border bg-surface-1 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🎓</span>
            <h3 className="font-bebas text-2xl tracking-wide text-text">EVALUACIÓN Y APRENDIZAJE</h3>
          </div>
          
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <span className="block text-[10px] uppercase font-mono text-muted mb-1">Marcador Real</span>
              <span className="font-bebas text-3xl">{analysis.real_score}</span>
            </div>
            
            <div className="text-right">
              <span className="block text-[10px] uppercase font-mono text-muted mb-1">Resultado de la Apuesta</span>
              <span className={`font-bold ${analysis.status === 'win' ? 'text-green' : 'text-red'}`}>
                {analysis.status === 'win' ? '✅ GANADA' : '❌ PERDIDA'}
              </span>
            </div>
          </div>

          {analysis.sections_hit && (
            <div className="mb-4">
              <span className="block text-[10px] uppercase font-mono text-muted mb-2">Métricas Acertadas</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analysis.sections_hit).map(([key, hit]) => (
                  <Badge key={key} variant={hit ? 'green' : 'red'}>
                    {hit ? '✓' : '✗'} {key}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {analysis.ai_post_analysis && (
            <div className="mt-4 bg-surface-2 p-4 rounded-xl border border-border">
              <span className="block text-[10px] uppercase font-mono text-cyan mb-2">Evolución del pronóstico</span>
              <p className="text-sm text-text/90 italic">
                "{analysis.ai_post_analysis}"
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
