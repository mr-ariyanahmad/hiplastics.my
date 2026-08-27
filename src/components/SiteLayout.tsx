import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppFab } from "./WhatsAppFab";

export function SiteLayout({ children, showContact = true }: { children: ReactNode; showContact?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="min-w-0 flex-1">{children}</main>
      <Footer />
      {showContact && <WhatsAppFab />}
    </div>
  );
}
