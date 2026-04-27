import type { Metadata } from 'next';
import { Bebas_Neue, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';

const bebas = Bebas_Neue({ 
  weight: '400', 
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'YourPick | IA Predictiva',
  description: 'Pronósticos de fútbol con IA adaptativa',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${bebas.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased min-h-screen selection:bg-cyan/30">
        <ToastProvider>
          {/* Contenedor responsive max 700px mobile, 1200px desktop */}
          <div className="max-w-[700px] md:max-w-[1200px] mx-auto px-4 md:px-6 relative pb-20 md:pb-0 min-h-screen flex flex-col">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
