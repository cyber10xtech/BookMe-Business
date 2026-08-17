import { useState, useEffect } from "react";
import { Lock, LogOut, FileText, Shield, MessageCircle, ChevronRight, ExternalLink, CheckCircle2, Circle, ChevronDown, ChevronUp, Trash2, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";

const MorePage = () => {
  const { signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const navigate = useNavigate();
  const { percentage, missingItems, completedItems } = useProfileCompletion(profile, 0);

  const [autoAccept, setAutoAccept] = useState(false); // kept for future booking automation
  const [completionExpanded, setCompletionExpanded] = useState(false);
  const [prefs, setPrefs] = useState({
    bookingAlerts: true,
    bookingCancellations: true,
    newReviews: true,
    smsAlerts: false,
  });
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // ── Delete account state ──────────────────────────────────────────────────
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const DELETE_CONFIRM_PHRASE = "DELETE";

  // Load preferences from profile
  useEffect(() => {
    if (!profile) return;
    const notifPrefs = (profile as any).notification_preferences || {};
    setAutoAccept(!!(notifPrefs as any).auto_accept_bookings ?? false);
    setPrefs({
      bookingAlerts:         notifPrefs.push ?? true,
      bookingCancellations:  notifPrefs.booking_cancellations ?? true,
      newReviews:            notifPrefs.new_reviews ?? true,
      smsAlerts:             notifPrefs.sms ?? false,
    });
  }, [profile]);

  const handleLogout = async () => {
    await signOut();
    navigate("/signin");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password changed successfully!");
    setPasswordDialog(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  /**
   * Permanently deletes the currently authenticated business account.
   *
   * FLOW:
   *  1. User types "DELETE" to confirm intent (guards against accidental taps).
   *  2. We call the delete-own-account Edge Function with the current session
   *     token. The function derives the user ID from the JWT — never from
   *     the client. This prevents deleting any other account.
   *  3. On success: sign out locally → clear session → navigate to /signin.
   *  4. On failure: show error, keep the account intact, keep user logged in.
   *
   * The Edge Function calls auth.admin.deleteUser(authUserId) which triggers
   * the database ON DELETE CASCADE chain:
   *   auth.users → profiles → services, bookings, reviews, notifications,
   *   availability, documents, favorites, gallery_photos, fcm_tokens,
   *   clients, promotions, chat_conversations, chat_messages, etc.
   *
   * The cascade is handled entirely by the database — no client-side
   * table-by-table deletion is performed here.
   */
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== DELETE_CONFIRM_PHRASE) {
      toast.error(`Please type "${DELETE_CONFIRM_PHRASE}" to confirm`);
      return;
    }

    setDeleting(true);

    try {
      // Get the current session token to authenticate the Edge Function call.
      // The token is validated server-side; the user ID is never trusted from
      // the client body.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("No active session — please sign in again.");
        setDeleting(false);
        return;
      }

      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const edgeFnUrl = `${supabaseUrl}/functions/v1/delete-own-account`;

      const response = await fetch(edgeFnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // The Edge Function reads the user identity from this header ONLY.
          // No user ID is sent in the body.
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": (supabase as any).supabaseKey as string,
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Deletion failed server-side — do NOT sign the user out.
        const message: string =
          result?.error ??
          "Account deletion failed. Please try again or contact support@bookmebusiness.com.";
        toast.error(message);
        setDeleting(false);
        return;
      }

      // ── Success: account is gone ──────────────────────────────────────────
      // Sign out locally to clear the now-invalid session token and any
      // cached state. The signOut() in AuthContext also removes the FCM
      // token from fcm_tokens (already deleted by the cascade, but the
      // cleanup call is harmless).
      toast.success("Your account has been permanently deleted.");

      // Small delay so the toast is readable before the screen transitions.
      await new Promise(resolve => setTimeout(resolve, 800));

      await signOut();
      navigate("/signin", { replace: true });

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      console.error("[DeleteAccount] Error:", message);
      toast.error("An unexpected error occurred. Your account has not been deleted.");
      setDeleting(false);
    }
  };

  const openDeleteDialog = () => {
    setDeleteConfirmText("");
    setDeleteDialog(true);
  };

  return (
    <AppLayout>
      <div className="px-5 pt-5 pb-6">
        <h1 className="text-2xl font-bold text-foreground mb-5">Settings</h1>

        {/* ── Profile Completion ── */}
        {percentage < 100 && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
            <button
              onClick={() => setCompletionExpanded((p) => !p)}
              className="w-full px-5 py-4 flex items-center gap-3 hover:bg-secondary/40 transition-colors"
            >
              {/* Mini ring */}
              <div className="relative w-10 h-10 flex-shrink-0">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="15" fill="none" stroke="hsl(220 13% 91%)" strokeWidth="4" />
                  <circle cx="20" cy="20" r="15" fill="none"
                    stroke={percentage < 50 ? "#f43f5e" : percentage < 75 ? "#f59e0b" : "#10b981"}
                    strokeWidth="4"
                    strokeDasharray={`${(percentage / 100) * 94.2} 94.2`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground rotate-0">
                  {percentage}%
                </span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground text-sm">Profile Completion</p>
                <p className="text-xs text-muted-foreground">
                  {completedItems.length}/{completedItems.length + missingItems.length} items complete
                </p>
              </div>
              {completionExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {completionExpanded && (
              <div className="border-t border-border px-5 py-3 space-y-2">
                {[...completedItems, ...missingItems].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => item.route && navigate(item.route)}
                    className="w-full flex items-start gap-3 py-2.5 text-left hover:bg-secondary/40 rounded-xl px-2 transition-colors"
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {item.label}
                      </p>
                      {!item.done && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>
                      )}
                    </div>
                    {!item.done && item.route && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Booking Automation — hidden until fully operational ── */}
        {/* Uncomment when booking automation is ready:
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
          ...
        </div>
        */}

        {/* ── Notification Preferences ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Notification Preferences</p>
          </div>
          <div className="px-5 py-2">
            {[
              { key: "bookingAlerts",        label: "New booking alerts" },
              { key: "bookingCancellations", label: "Booking cancellations" },
              { key: "newReviews",           label: "New reviews" },
              { key: "smsAlerts",            label: "SMS alerts" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{item.label}</span>
                <Switch
                  checked={prefs[item.key as keyof typeof prefs]}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [item.key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Account ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
          </div>
          <button onClick={() => setPasswordDialog(true)}
            className="w-full flex items-center gap-4 px-5 py-4 border-b border-border hover:bg-secondary/50 transition-colors">
            <div className="w-11 h-11 rounded-full bg-primary/5 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-foreground text-sm">Change Password</p>
              <p className="text-xs text-muted-foreground">Update your login credentials</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 border-b border-border hover:bg-destructive/5 transition-colors">
            <div className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-destructive text-sm">Log Out</p>
              <p className="text-xs text-muted-foreground">Sign out of your account</p>
            </div>
          </button>
          <button onClick={openDeleteDialog}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-destructive/5 transition-colors">
            <div className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-destructive text-sm">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your business profile and all data</p>
            </div>
          </button>
        </div>

        {/* ── Legal ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">BookMe App</p>
          </div>
          {[
            { icon: FileText, label: "Terms & Conditions",  sub: "Read our terms of service" },
            { icon: Shield,   label: "Privacy Policy",      sub: "Read our privacy policy" },
          ].map((item, i) => (
            <button key={item.label}
              onClick={() => toast.info(`${item.label} — contact legal@bookme.ng`)}
              className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors ${i === 0 ? "border-b border-border" : ""}`}>
              <div className="w-11 h-11 rounded-full bg-primary/5 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* ── Help ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Help Center</p>
          </div>
          <a href="https://wa.me/2348000000000"
            className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors">
            <div className="w-11 h-11 rounded-full bg-success/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">WhatsApp Support</p>
              <p className="text-xs text-muted-foreground">Chat with our team directly</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">BookMe Business v1.0.0</p>
      </div>

      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input type="password" placeholder="New password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} className="h-12 rounded-xl bg-secondary border-0" />
            <Input type="password" placeholder="Confirm new password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 rounded-xl bg-secondary border-0" />
            <Button onClick={handleChangePassword} disabled={changingPw} className="w-full h-12 rounded-xl">
              {changingPw ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account confirmation dialog ─────────────────────────────── */}
      <Dialog open={deleteDialog} onOpenChange={(open) => {
        // Block closing the dialog while deletion is in progress
        if (!deleting) {
          setDeleteDialog(open);
          if (!open) setDeleteConfirmText("");
        }
      }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive">This action is permanent and cannot be undone.</p>
              <p className="text-xs text-muted-foreground">
                Deleting your account will permanently remove:
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Your business profile and all settings</li>
                <li>All your services and availability</li>
                <li>Your booking history</li>
                <li>All client records and messages</li>
                <li>Reviews received on your profile</li>
                <li>Gallery photos and promotions</li>
              </ul>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5 block">
                Type <span className="text-destructive font-extrabold">{DELETE_CONFIRM_PHRASE}</span> to confirm
              </label>
              <Input
                type="text"
                placeholder={DELETE_CONFIRM_PHRASE}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                disabled={deleting}
                className="h-12 rounded-xl bg-secondary border-0 font-mono tracking-widest"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => { setDeleteDialog(false); setDeleteConfirmText(""); }}
                disabled={deleting}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText.trim().toUpperCase() !== DELETE_CONFIRM_PHRASE}
                className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-white"
              >
                {deleting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : "Delete Forever"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MorePage;
