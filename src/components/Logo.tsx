import { site } from "@/lib/site";
import { usePublicData } from "@/hooks/usePublicData";
import logoSrc from "@/assets/hiplastics-logo.png";

export function Logo({ className = "" }: { className?: string }) {
  const { settings } = usePublicData();
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={settings.logo_url || logoSrc}
        alt={site.name}
        width={44}
        height={44}
        className="h-11 w-11 rounded-md object-contain"
      />
      <div className="leading-tight">
        <div className="text-[16px] font-semibold text-foreground" style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
          {site.name}
        </div>
        <div className="text-[11px] text-muted-foreground" style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
          {site.tagline}
        </div>
      </div>
    </div>
  );
}
