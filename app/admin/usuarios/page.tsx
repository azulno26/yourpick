'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import { useToast } from '@/components/Toast';

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, userId: string, username?: string) => {
    if (action === 'delete') {
      const confirmText = prompt(`¿Borrar a ${username}? Esto eliminará todos sus análisis. Escribe DELETE para confirmar`);
      if (confirmText !== 'DELETE') return;
      await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      showToast('Usuario eliminado', 'success');
      fetchUsers();
      router.refresh();
    } else if (action === 'reset_quota') {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reset_daily_usage: true })
      });
      showToast('Cupo reseteado correctamente', 'success');
      fetchUsers();
      router.refresh();
    } else {
      showToast(`Acción ${action} en construcción`, 'info');
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-cyan font-mono">Cargando usuarios...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-bebas text-4xl text-text tracking-wide mb-1">USUARIOS</h1>
          <p className="text-sm text-muted">Gestión de cuentas y cuotas.</p>
        </div>
      </div>

      <div className="space-y-4">
        {users.map(u => (
          <Card key={u.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 md:p-6 hover:border-cyan/30 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bebas text-2xl tracking-wide">{u.display_name || u.username}</span>
                {u.role === 'admin' && <Badge variant="purple">ADMIN</Badge>}
                {!u.is_active && <Badge variant="red">INACTIVO</Badge>}
              </div>
              <div className="text-xs font-mono text-muted">
                {u.username} • Login: {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Nunca'}
              </div>
            </div>
            
            <div className="flex gap-4 md:gap-8 items-center bg-surface-2 p-3 rounded-xl border border-border w-full md:w-auto">
              <div className="text-center">
                <div className="text-[10px] text-muted uppercase font-mono mb-1">Cupo hoy</div>
                <div className="font-bebas text-xl text-cyan">{u.today_usage || 0}/3</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted uppercase font-mono mb-1">Análisis</div>
                <div className="font-bebas text-xl text-text">{u.total_analyses || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted uppercase font-mono mb-1">Acierto</div>
                <div className="font-bebas text-xl text-green">{u.win_rate ? Math.round(u.win_rate) : 0}%</div>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
              <Button variant="secondary" className="px-3 text-sm h-10 w-full md:w-auto" onClick={() => handleAction('reset_quota', u.id, u.username)}>🔄 CUPO</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
