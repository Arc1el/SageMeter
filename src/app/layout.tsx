'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import Sidebar from '@/app/components/Sidebar';
import { SidebarProvider, useSidebar } from '@/app/contexts/SidebarContext';

const inter = Inter({ subsets: ['latin'] });

function MainContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();

  return (
    <main className={`transition-all duration-300 ease-in-out p-8 ${isOpen ? 'ml-64' : 'ml-0'}`}>
      {children}
    </main>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SidebarProvider>
          <Sidebar />
          <MainContent>{children}</MainContent>
        </SidebarProvider>
      </body>
    </html>
  );
}
