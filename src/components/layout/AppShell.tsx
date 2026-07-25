import { SiteNav } from "@/components/layout/SiteNav";
import { OfflineSaveWarning } from "@/components/system/OfflineSaveWarning";
import { SupabaseStatusBanner } from "@/components/system/SupabaseStatusBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="site-header">
        <SiteNav />
      </header>
      <SupabaseStatusBanner />
      <OfflineSaveWarning />
      <div id="main-content">{children}</div>
    </>
  );
}
