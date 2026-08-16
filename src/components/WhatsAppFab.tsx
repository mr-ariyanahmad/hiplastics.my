import { Mail, ArrowUp, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { WeChatIcon } from "./WeChatIcon";
import { QRModal } from "./QRModal";
import { usePublicData, waLinkFor } from "@/hooks/usePublicData";

export function WhatsAppFab() {
  const { settings } = usePublicData();
  const [showTop, setShowTop] = useState(false);
  const [open, setOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click outside (or Escape) collapses the panel back down.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQrOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setQrOpen(false); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const firstEmail = (settings.email || "").split(",")[0]?.trim();
  const wa = waLinkFor(settings.whatsapp_number || settings.phone, `Hi ${settings.name}, I'd like to enquire about your products.`);

  return (
    <div ref={rootRef} className="fixed bottom-5 right-3 z-40 flex flex-col items-end gap-3">
      {/* Expanding panel: hidden/collapsed by default, slides up + fades in on open */}
      <div
        className={`flex flex-col items-end gap-3 transition-all duration-300 ease-out ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
        aria-hidden={!open}
      >
        {settings.wechat_qr_url && (
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            aria-label="Show WeChat QR"
            aria-expanded={qrOpen}
            className="relative grid h-12 w-12 place-items-center rounded-full bg-[#07c160] text-white shadow-elevated transition-transform hover:scale-110"
          >
            <WeChatIcon className="h-6 w-6" />
          </button>
        )}
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="grid h-12 w-12 place-items-center rounded-full bg-[#25d366] text-white shadow-elevated transition-transform hover:scale-110"
        >
          <WhatsAppIcon className="h-5 w-5" />
        </a>
        {firstEmail && (
          <a
            href={`mailto:${firstEmail}`}
            aria-label="Email us"
            className="grid h-12 w-12 place-items-center rounded-full bg-[#1f8fd1] text-white shadow-elevated transition-transform hover:scale-110"
          >
            <Mail className="h-5 w-5" />
          </a>
        )}
      </div>

      {/* Collapsed toggle: text-only pill, no icon clutter */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQrOpen(false); }}
        aria-expanded={open}
        aria-label={open ? "Close contact options" : "Show contact options"}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform hover:scale-105"
      >
        {open ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
        {open ? "Close" : "Contact"}
      </button>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          className="grid h-11 w-11 place-items-center self-center rounded-md bg-white text-primary shadow-elevated transition-transform hover:scale-110"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {settings.wechat_qr_url && (
        <QRModal
          open={qrOpen}
          onOpenChange={setQrOpen}
          src={settings.wechat_qr_url}
          alt="Scan on WeChat"
          caption="Open WeChat and scan this code to chat with us."
        />
      )}
    </div>
  );
}
