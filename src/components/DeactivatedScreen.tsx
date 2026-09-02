import React from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DeactivatedScreenProps {
  onSignOut?: () => void;
}

export const DeactivatedScreen: React.FC<DeactivatedScreenProps> = ({ onSignOut }) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (onSignOut) {
      onSignOut();
    } else {
      window.location.href = "/signin";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center bg-background"
    >
      <div className="w-full max-w-sm rounded-2xl p-6 border border-destructive/30 bg-card flex flex-col items-center gap-4 shadow-lg">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">Account Deactivated</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your account has been deactivated due to suspicious activity.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full h-12 mt-2 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default DeactivatedScreen;
