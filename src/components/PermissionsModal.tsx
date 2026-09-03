import { Bell, MapPin, CheckCircle2, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";

const PermissionsModal = () => {
  const {
    showModal,
    notifStatus,
    locationStatus,
    requesting,
    acceptAll,
    requestNotifications,
    requestLocation,
    dismissModal,
  } = usePermissions();

  if (!showModal) return null;

  const allDone = notifStatus === "granted" && locationStatus === "granted";

  return (
    <div
      onClick={dismissModal}
      className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 cursor-default select-text"
      >
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-blue-400 to-green-400" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissModal();
              }}
              aria-label="Close permissions dialog"
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center mt-1 hover:bg-secondary/80 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          <h2 className="text-xl font-bold text-foreground">Enable Permissions</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            BookMe needs a couple of permissions to give you the best experience.
          </p>

          {/* Permission rows */}
          <div className="mt-5 space-y-3">
            {/* Notifications */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                notifStatus === "granted"
                  ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900"
                  : notifStatus === "denied"
                  ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900"
                  : "border-border bg-secondary/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    notifStatus === "granted" ? "bg-green-500/10" : "bg-primary/10"
                  }`}
                >
                  <Bell className={`w-5 h-5 ${notifStatus === "granted" ? "text-green-500" : "text-primary"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                  <p className="text-xs text-muted-foreground">Get alerts for new bookings & updates</p>
                </div>
                {notifStatus === "granted" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : notifStatus === "denied" ? (
                  <span className="text-xs text-red-500 font-medium shrink-0">Denied</span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestNotifications();
                    }}
                    disabled={requesting}
                    className="text-xs text-primary font-semibold bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Allow
                  </button>
                )}
              </div>
            </div>

            {/* Location */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                locationStatus === "granted"
                  ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900"
                  : locationStatus === "denied"
                  ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900"
                  : "border-border bg-secondary/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    locationStatus === "granted" ? "bg-green-500/10" : "bg-blue-500/10"
                  }`}
                >
                  <MapPin className={`w-5 h-5 ${locationStatus === "granted" ? "text-green-500" : "text-blue-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Location</p>
                  <p className="text-xs text-muted-foreground">Helps customers find your business nearby</p>
                </div>
                {locationStatus === "granted" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : locationStatus === "denied" ? (
                  <span className="text-xs text-red-500 font-medium shrink-0">Denied</span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestLocation();
                    }}
                    disabled={requesting}
                    className="text-xs text-blue-600 font-semibold bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-full shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Allow
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-5 space-y-2">
            {!allDone && (
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  acceptAll();
                }}
                disabled={requesting}
                className="w-full h-12 rounded-xl font-semibold cursor-pointer active:scale-[0.99] transition-transform"
              >
                {requesting ? "Requesting..." : "Allow All & Continue"}
              </Button>
            )}
            {allDone ? (
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissModal();
                }}
                className="w-full h-12 rounded-xl font-semibold cursor-pointer bg-green-600 hover:bg-green-700 text-white"
              >
                Done ✓
              </Button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissModal();
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-2 transition-colors cursor-pointer"
              >
                Skip for now
              </button>
            )}
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-3">
            You can change these anytime in your device settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;
