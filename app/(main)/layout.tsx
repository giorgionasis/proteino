import { Header }        from "@/components/layout/Header";
import { BottomNav }      from "@/components/layout/BottomNav";
import { FAB }            from "@/components/ui/FAB";
import { OverlayManager } from "@/components/layout/OverlayManager";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto relative">
      {/* Top bar */}
      <Header isRegistered={false} />

      {/* Scrollable page content — clears fixed bottom nav */}
      <main className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>

      {/* Fixed bottom chrome */}
      <BottomNav />
      <FAB />

      {/* Full-screen slide-up overlays — renders on top of everything */}
      <OverlayManager />
    </div>
  );
}
