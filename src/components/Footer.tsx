import { Linkedin, Facebook, Youtube, Phone, Mail, MapPin, ZoomIn } from "lucide-react";
import { useState } from "react";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { WeChatIcon } from "./WeChatIcon";
import { QRModal } from "./QRModal";
import { usePublicData, splitEmails } from "@/hooks/usePublicData";

const PRODUCT_COLUMNS: { heading: string; items: string[] }[] = [
  {
    heading: "Shelf Communication",
    items: ["Sign Holders", "Clip Strip & Hang Tab", "Plastic Dividers", "Plastic Frames and Pockets", "Frame Stands"],
  },
  {
    heading: "Plastic Frames & Stands",
    items: ["Shelf Talkers", "Poster Holders"],
  },
  {
    heading: "100% Biodegradable Products",
    items: ["100% Biodegradable", "PETG Products"],
  },
];

export function Footer() {
  const { settings } = usePublicData();
  const year = new Date().getFullYear();
  const phoneDigits = (settings.phone || "").replace(/\D/g, "");
  const emails = splitEmails(settings.email);
  const [qrModal, setQrModal] = useState<{ src: string; alt: string } | null>(null);

  return (
    <footer className="bg-[#0a1929] text-white">
      <div className="container-page py-12">
        {/* Phone + socials */}
        <div className="border-b border-white/10 pb-10 text-center">
          <a
            href={`tel:${phoneDigits}`}
            className="block text-4xl font-extrabold tracking-wider text-white sm:text-5xl"
          >
            {settings.phone}
          </a>
          <div className="mt-6 flex justify-center gap-3">
            {settings.linkedin_url && (
              <a href={settings.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                 className="grid h-11 w-11 place-items-center rounded-full bg-black text-white transition-colors hover:bg-white hover:text-black">
                <Linkedin className="h-5 w-5" />
              </a>
            )}
            {settings.facebook_url && (
              <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                 className="grid h-11 w-11 place-items-center rounded-full bg-black text-white transition-colors hover:bg-white hover:text-black">
                <Facebook className="h-5 w-5" />
              </a>
            )}
            {settings.youtube_url && (
              <a href={settings.youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                 className="grid h-11 w-11 place-items-center rounded-full bg-black text-white transition-colors hover:bg-white hover:text-black">
                <Youtube className="h-5 w-5" />
              </a>
            )}
            {phoneDigits && (
              <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                 className="grid h-11 w-11 place-items-center rounded-full bg-black text-white transition-colors hover:bg-white hover:text-black">
                <WhatsAppIcon className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

        {/* QR + Contact details */}
        <div className="grid gap-8 py-8 md:grid-cols-[auto_1fr]">
          {/* Left: QR codes (only if admin uploaded) */}
          {(settings.whatsapp_qr_url || settings.wechat_qr_url) && (
            <div className="flex flex-wrap items-start gap-4">
              {settings.whatsapp_qr_url && (
                <figure className="flex w-28 flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setQrModal({ src: settings.whatsapp_qr_url!, alt: "Scan on WhatsApp" })}
                    className="group relative rounded-lg bg-white p-2"
                    aria-label="Enlarge WhatsApp QR"
                  >
                    <img src={settings.whatsapp_qr_url} alt="WhatsApp QR" className="h-24 w-24 object-contain" />
                    <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </span>
                  </button>
                  <figcaption className="mt-2 flex items-center gap-1 text-xs text-white/80">
                    <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
                  </figcaption>
                </figure>
              )}
              {settings.wechat_qr_url && (
                <figure className="flex w-28 flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setQrModal({ src: settings.wechat_qr_url!, alt: "Scan on WeChat" })}
                    className="group relative rounded-lg bg-white p-2"
                    aria-label="Enlarge WeChat QR"
                  >
                    <img src={settings.wechat_qr_url} alt="WeChat QR" className="h-24 w-24 object-contain" />
                    <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </span>
                  </button>
                  <figcaption className="mt-2 flex items-center gap-1 text-xs text-white/80">
                    <WeChatIcon className="h-3.5 w-3.5" /> WeChat
                  </figcaption>
                </figure>
              )}
            </div>
          )}

          {/* Right: contact list */}
          <div className="grid gap-3 text-sm text-white/80 sm:grid-cols-2 lg:grid-cols-3">
            {emails.map((em) => (
              <div key={em} className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${em}`} className="truncate hover:text-white">{em}</a>
              </div>
            ))}
            {settings.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" /> <span>{settings.address}</span>
              </div>
            )}
            {settings.business_hours && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" /> <span>{settings.business_hours}</span>
              </div>
            )}
          </div>
        </div>

        {/* Product columns */}
        <div className="grid gap-10 border-t border-white/10 pt-10 md:grid-cols-3">
          {PRODUCT_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-base font-bold uppercase tracking-wide text-white">{col.heading}</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                {col.items.map((it) => (
                  <li key={it}><a href="/products" className="hover:text-white">{it}</a></li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-base font-bold uppercase tracking-wide text-white">Support</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li><a href="/track" className="hover:text-white">Track Your Order</a></li>
              <li><a href="/refund-policy" className="hover:text-white">Refund & Return Policy</a></li>
              <li><a href="/privacy-policy" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="/terms-of-service" className="hover:text-white">Terms of Service</a></li>
              <li><a href="/contact" className="hover:text-white">Contact Us</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="bg-[#1f8fd1]">
        <div className="container-page flex flex-col items-center justify-center gap-1.5 py-4 text-center text-sm text-white sm:flex-row sm:gap-3">
          <span>© Copyright {year} {settings.name}. All Rights Reserved.</span>
          <span className="hidden sm:inline text-white/50">·</span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("hp-open-cookie-preferences"))}
            className="underline decoration-white/40 underline-offset-2 hover:text-white/90"
          >
            Cookie preferences
          </button>
        </div>
      </div>

      {qrModal && (
        <QRModal open={!!qrModal} onOpenChange={(o) => !o && setQrModal(null)} src={qrModal.src} alt={qrModal.alt} />
      )}
    </footer>
  );
}
