import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrivacyBadgeProps {
  online: boolean;
}

export function PrivacyBadge({ online }: PrivacyBadgeProps) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
      <div className="flex gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-primary">
              100% Client-Side Privacy
            </h3>
            <span
              className={cn(
                "mono rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                online
                  ? "bg-primary/10 text-primary"
                  : "bg-success/10 text-success",
              )}
            >
              {online ? "Online" : "Offline · still working"}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-primary/80">
            Files are decoded and processed in-memory. There is no backend
            endpoint to receive your data. Turn off your Wi-Fi to test our
            claims.
          </p>
        </div>
      </div>
    </div>
  );
}
