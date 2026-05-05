'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminTabs() {
  const pathname = usePathname();
  const tabs = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Usuarios', href: '/admin/usuarios' },
    { label: 'Análisis', href: '/admin/analisis' },
    { label: 'Modelos', href: '/admin/modelos' },
    { label: 'Aprendizaje', href: '/admin/learning-dashboard' },
    { label: 'Sistema', href: '/admin/sistema' },
    { label: 'Prompt', href: '/admin/prompt-editor' }
  ];

  return (
    <div className="bg-surface-1 border-b border-border sticky top-16 z-40 overflow-x-auto hide-scrollbar">
      <div className="flex px-4 md:px-0 max-w-[900px] mx-auto">
        {tabs.map(t => {
          const isActive = pathname === t.href || (t.href !== '/admin' && pathname.startsWith(t.href));
          return (
            <Link key={t.href} href={t.href} className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${isActive ? 'text-cyan border-cyan' : 'text-muted border-transparent hover:text-text'}`}>
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
