import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("[SW] Registered:", swUrl);
      // Check for updates every 60 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("[SW] Registration error:", error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:bottom-6 md:w-80">
      <div className="bg-card border border-border rounded-xl p-4 shadow-2xl flex items-start gap-3">
        <div className="shrink-0 mt-0.5 h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
          <RefreshCw className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Update available</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            A new version of AuthentiSeal is ready.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => updateServiceWorker(true)}
            >
              Update now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setNeedRefresh(false)}
            >
              Later
            </Button>
          </div>
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
