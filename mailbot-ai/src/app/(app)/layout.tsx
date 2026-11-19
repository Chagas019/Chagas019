import { Sidebar, TabBar } from '@/components/Nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <Sidebar />
      <main className="main"><div className="container">{children}</div></main>
      <TabBar />
    </div>
  );
}
