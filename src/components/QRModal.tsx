import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Full-size QR viewer. Used instead of small inline QR thumbnails so codes
 * (WhatsApp / WeChat) are actually scannable — the old inline popovers were
 * ~160px and clipped near the screen edge on mobile.
 */
export function QRModal({
  open,
  onOpenChange,
  src,
  alt,
  caption,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt: string;
  caption?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs sm:max-w-sm">
        <DialogTitle className="text-center text-base font-bold text-foreground">{alt}</DialogTitle>
        <div className="mx-auto flex w-full max-w-[300px] flex-col items-center gap-3 rounded-lg bg-white p-4">
          <img src={src} alt={alt} className="h-full w-full max-h-[280px] max-w-[280px] object-contain" />
        </div>
        {caption && <p className="text-center text-sm text-muted-foreground">{caption}</p>}
      </DialogContent>
    </Dialog>
  );
}
