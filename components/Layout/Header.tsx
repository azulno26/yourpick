'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Header({ role }: { role?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/analizar', label: 'Analizar' },
    { href: '/historial', label: 'Historial' },
    { href: '/perfil', label: 'Perfil' },
  ];

  if (role === 'admin') {
    links.push({ href: '/admin', label: 'Admin' });
  }

  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-50 w-full bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 w-full px-4 md:px-6 max-w-[700px] mx-auto">
        <Link href={isAdminRoute ? '/admin' : '/dashboard'} className="flex items-center gap-2 active:scale-95 transition-transform select-none">
          <span className="text-2xl">⚡</span>
          <span className="font-bebas text-2xl tracking-wider text-text">YOURPICK</span>
        </Link>

        {/* Contenedor de Nav Desktop + Botón Logout */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Desktop Nav (Oculta en Mobile) */}
          {!isAdminRoute && (
            <nav className="hidden md:flex items-center space-x-6">
              {links.map(link => {
                let isActive = false;
                if (link.href === '/dashboard') {
                  isActive = pathname === '/dashboard';
                } else {
                  isActive = pathname.startsWith(link.href);
                }
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`font-medium transition-colors md:hover:text-cyan ${isActive ? 'text-cyan' : 'text-muted'}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
          
          <button 
            onClick={handleLogout} 
            className="text-muted hover:text-red transition-colors text-sm font-medium flex items-center gap-1 active:scale-95" 
            title="Cerrar sesión"
          >
            <span className="hidden md:inline uppercase tracking-wider text-xs">Salir</span>
            <span className="text-xl">🚪</span>
          </button>
        </div>
      </div>
    </header>
  );
}
