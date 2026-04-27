import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Layout/Header';
import BottomNav from '@/components/Layout/BottomNav';
import AdminTabs from './AdminTabs';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') redirect('/dashboard');

  return (
    <>
      <Header role="admin" />
      <AdminTabs />
      <main className="flex-1 w-full max-w-[900px] mx-auto pt-6 pb-24 md:pb-12 px-4 md:px-0">
        {children}
      </main>
      <BottomNav role="admin" />
    </>
  );
}
