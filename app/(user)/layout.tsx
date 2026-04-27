import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Layout/Header';
import BottomNav from '@/components/Layout/BottomNav';

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  
  if (user.role === 'admin') {
    redirect('/admin');
  }

  return (
    <>
      <Header role={user.role} />
      <main className="flex-1 w-full max-w-[700px] mx-auto pt-6 pb-24 md:pb-12">
        {children}
      </main>
      <BottomNav role={user.role} />
    </>
  );
}
