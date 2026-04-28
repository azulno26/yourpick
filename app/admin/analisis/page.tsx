import { supabaseServer } from '@/lib/supabase';
import Card from '@/components/Card';
import AdminAnalysisList from '@/components/AdminAnalysisList';

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
        <p className="text-sm text-muted">Historial global del sistema. Haz clic en una fila para ver el desglose completo.</p>
      </div>

      {(!analyses || analyses.length === 0) ? (
        <Card className="text-center py-12 border-dashed border-border/50 bg-surface-1">
          <div className="text-4xl mb-4 opacity-50">📂</div>
          <h2 className="font-bebas text-2xl text-muted tracking-wide">Sin análisis aún</h2>
          <p className="text-sm text-muted/70 mt-2">Los pronósticos generados aparecerán aquí.</p>
        </Card>
      ) : (
        <AdminAnalysisList analyses={analyses} />
      )}
    </div>
  );
}
