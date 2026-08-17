import { AppShellProvider } from '@/lib/app-shell';
import { Sidebar } from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShellProvider>
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1">{children}</div>
      </div>
    </AppShellProvider>
  );
}
