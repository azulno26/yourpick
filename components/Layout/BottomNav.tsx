'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function BottomNav({ role }: { role?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/analizar', label: 'Analizar', icon: '⚡' },
    { href: '/historial', label: 'Historial', icon: '📋' },
    { href: '/perfil', label: 'Perfil', icon: '⚙️' },
  ];

  if (role === 'admin') {
    links.push({ href: '/admin', label: 'Admin', icon: '👑' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-1/90 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] z-50 md:hidden">
      <div className="flex justify-around items-center h-16 px-1">
        {links.map((link) => {
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
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${isActive ? 'text-cyan' : 'text-muted'}`}
            >
              <span className="text-xl">{link.icon}</span>
              <span className="text-[10px] font-medium tracking-wide">{link.label}</span>
            </Link>
          );
        })}

        <button 
          onClick={handleLogout}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 text-muted hover:text-red"
        >
          <span className="text-xl">🚪</span>
          <span className="text-[10px] font-medium tracking-wide">Salir</span>
        </button>
      </div>
    </nav>
  );
}
