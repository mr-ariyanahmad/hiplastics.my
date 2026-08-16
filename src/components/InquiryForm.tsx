import { useState } from "react";
import { z } from "zod";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { site } from "@/lib/site";
import { usePublicData } from "@/hooks/usePublicData";

const INQUIRY_WHATSAPP_NUMBER = "601115526527";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  company: z.string().trim().min(1, "Company is required").max(120),
  phone: z.string().trim().min(6, "Phone is required").max(30),
  email: z.string().trim().email("Valid email required").max(200),
  interest: z.string().trim().min(1, "Select a product").max(120),
  message: z.string().trim().min(5, "Message too short").max(1500),
});

export function InquiryForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { products: dbProducts } = usePublicData();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd) as Record<string, string>;
    const parsed = schema.safeParse(data);

    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setErrors(errs);
      return;
    }

    setErrors({});

    const text =
      `*New Inquiry — ${site.name}*\n\n` +
      `*Name:* ${parsed.data.name}\n` +
      `*Company:* ${parsed.data.company}\n` +
      `*Phone:* ${parsed.data.phone}\n` +
      `*Email:* ${parsed.data.email}\n` +
      `*Product Interest:* ${parsed.data.interest}\n\n` +
      `*Message:*\n${parsed.data.message}`;

    const whatsappUrl = `https://wa.me/${INQUIRY_WHATSAPP_NUMBER}?text=${encodeURIComponent(
      text
    )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  const field =
    "w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div>
        <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-foreground">
          Full Name *
        </label>
        <input id="name" name="name" type="text" autoComplete="name" maxLength={100} className={field} />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="company" className="mb-1.5 block text-xs font-medium text-foreground">
          Company Name *
        </label>
        <input id="company" name="company" type="text" autoComplete="organization" maxLength={120} className={field} />
        {errors.company && <p className="mt-1 text-xs text-destructive">{errors.company}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-xs font-medium text-foreground">
          Phone Number *
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={30} className={field} />
        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-foreground">
          Email *
        </label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={200} className={field} />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="interest" className="mb-1.5 block text-xs font-medium text-foreground">
          Product Interest *
        </label>
        <select id="interest" name="interest" defaultValue="" className={field}>
          <option value="" disabled>
            Select a product…
          </option>
          {dbProducts.map((p) => (
            <option key={p.slug} value={p.name}>
              {p.name}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
        {errors.interest && <p className="mt-1 text-xs text-destructive">{errors.interest}</p>}
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="message" className="mb-1.5 block text-xs font-medium text-foreground">
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          maxLength={1500}
          className={field}
          placeholder="Tell us about your requirements, quantity, delivery location…"
        />
        {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
      </div>

      <div className="sm:col-span-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-whatsapp px-5 py-3 text-sm font-semibold text-whatsapp-foreground shadow-soft transition-transform hover:scale-[1.02]"
        >
          <WhatsAppIcon className="h-4 w-4" /> Send via WhatsApp
        </button>
        <p className="text-xs text-muted-foreground">We typically respond within 1 business hour.</p>
      </div>
    </form>
  );
}
