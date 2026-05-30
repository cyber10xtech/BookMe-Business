import { useState, ReactNode } from "react";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";
import BottomNav from "@/components/dashboard/BottomNav";

interface AppLayoutProps { children: ReactNode; }

const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))" }}>
      <AppHeader onMenuOpen={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
